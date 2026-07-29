import {
  DataSnapshot,
  Unsubscribe,
  get,
  onValue,
  push,
  ref,
  remove,
  set,
  update
} from 'firebase/database'
import {
  deleteObject,
  getDownloadURL,
  getMetadata,
  listAll,
  ref as storageRef,
  uploadBytesResumable
} from 'firebase/storage'
import { useEffect, useMemo, useState } from 'react'
import { database, storage } from '../store/Firebase'
import { extractYouTubeVideoId, fetchYouTubeVideo } from './youtube'

// ---------------------------------------------------------------------------
// Public types (previously the entire file)
// ---------------------------------------------------------------------------

export enum ResourceType {
  PDF = 'pdf',
  AUDIO = 'audio',
  IMAGE = 'image',
  YOUTUBE = 'youtube'
}

export interface Resource {
  id: string
  title: string
  type: ResourceType
  url: string
  fileName?: string
  storagePath?: string
  size?: number
  tags: Record<string, string>
  createdAt: string
}

// ---------------------------------------------------------------------------
// Internal DB record (id is the RTDB key, not stored in the record itself)
// ---------------------------------------------------------------------------

interface ResourceDbRecord {
  title: string
  type: ResourceType
  url: string
  fileName?: string
  storagePath?: string
  size?: number
  tags: Record<string, string>
  createdAt: string
}

function toResource(id: string, record: ResourceDbRecord): Resource {
  return { id, ...record, tags: record.tags ?? {} }
}

function snapshotToResources(snapshot: DataSnapshot): Resource[] {
  if (!snapshot.exists()) return []
  const raw = snapshot.val() as Record<string, ResourceDbRecord>
  return Object.entries(raw).map(([id, record]) => toResource(id, record))
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

const resourcesPath = (teacherId: string) => `resources/teachers/${teacherId}`
const resourcePath = (teacherId: string, resourceId: string) =>
  `${resourcesPath(teacherId)}/${resourceId}`
const deletedResourcePath = (teacherId: string, resourceId: string) =>
  `deleted/resources/teachers/${teacherId}/${resourceId}`
const sharedPath = (teacherId: string, studentId: string) =>
  `shared-resources/${teacherId}/students/${studentId}`
async function getStudentIds(teacherId: string): Promise<string[]> {
  const snap = await get(ref(database, `teachers/${teacherId}/students`))
  if (!snap.exists()) return []
  return Object.keys(snap.val() as Record<string, unknown>)
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useTeacherResources(teacherId: string | undefined): {
  resources: Resource[]
  loading: boolean
} {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teacherId) {
      setResources([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe: Unsubscribe = onValue(
      ref(database, resourcesPath(teacherId)),
      (snapshot) => {
        setResources(snapshotToResources(snapshot))
        setLoading(false)
      },
      () => {
        setResources([])
        setLoading(false)
      }
    )
    return unsubscribe
  }, [teacherId])

  return { resources, loading }
}

export function useSharedResources(
  teacherId: string | undefined,
  studentId: string | undefined
): { resources: Resource[]; loading: boolean } {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teacherId || !studentId) {
      setResources([])
      setLoading(false)
      return
    }
    setLoading(true)

    let unsubscribeResources: Unsubscribe | null = null

    const unsubscribeShared: Unsubscribe = onValue(
      ref(database, sharedPath(teacherId, studentId)),
      (sharedSnap) => {
        if (unsubscribeResources) {
          unsubscribeResources()
          unsubscribeResources = null
        }

        if (!sharedSnap.exists()) {
          setResources([])
          setLoading(false)
          return
        }

        const sharedIds = new Set(Object.keys(sharedSnap.val() as Record<string, true>))

        unsubscribeResources = onValue(
          ref(database, resourcesPath(teacherId)),
          (resourceSnap) => {
            const all = snapshotToResources(resourceSnap)
            setResources(all.filter((r) => sharedIds.has(r.id)))
            setLoading(false)
          },
          () => {
            setResources([])
            setLoading(false)
          }
        )
      },
      () => {
        setResources([])
        setLoading(false)
      }
    )

    return () => {
      unsubscribeShared()
      unsubscribeResources?.()
    }
  }, [teacherId, studentId])

  return { resources, loading }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export interface ResourceMetadata {
  title: string
  tags: Record<string, string>
}

export type UploadConfirmData =
  | { mode: 'youtube'; url: string; title: string; tags: Record<string, string> }
  | { mode: 'file'; file: File; title: string; tags: Record<string, string> }

export interface UploadResourceParams {
  teacherId: string
  file: File
  metadata: ResourceMetadata
  onProgress?: (progress: number) => void
}

export function uploadResource({
  teacherId,
  file,
  metadata,
  onProgress
}: UploadResourceParams): Promise<Resource> {
  return new Promise((resolve, reject) => {
    const newRef = push(ref(database, resourcesPath(teacherId)))
    const resourceId = newRef.key
    if (!resourceId) {
      reject(new Error('Failed to generate resource ID'))
      return
    }
    const path = `resources/${teacherId}/${resourceId}/${file.name}`
    const fileRef = storageRef(storage, path)
    const uploadTask = uploadBytesResumable(fileRef, file)

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        onProgress?.((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
      },
      reject,
      () => {
        getDownloadURL(uploadTask.snapshot.ref)
          .then((url) => {
            const record: ResourceDbRecord = {
              title: metadata.title,
              type: inferFileType(file),
              url,
              fileName: file.name,
              storagePath: path,
              size: file.size,
              tags: metadata.tags,
              createdAt: new Date().toISOString()
            }
            return set(newRef, record).then(() => resolve(toResource(resourceId, record)))
          })
          .catch(reject)
      }
    )
  })
}

export async function addYouTubeResource(
  teacherId: string,
  url: string,
  metadata: ResourceMetadata,
  existingResources?: Resource[]
): Promise<string> {
  const videoId = extractYouTubeVideoId(url)
  if (videoId && existingResources) {
    const dup = existingResources.find(
      (r) => r.type === ResourceType.YOUTUBE && extractYouTubeVideoId(r.url) === videoId
    )
    if (dup) return dup.id
  }
  const newRef = push(ref(database, resourcesPath(teacherId)))
  const resourceId = newRef.key
  if (!resourceId) throw new Error('Failed to generate resource ID')
  const record: ResourceDbRecord = {
    title: metadata.title,
    type: ResourceType.YOUTUBE,
    url,
    tags: metadata.tags,
    createdAt: new Date().toISOString()
  }
  await set(newRef, record)
  return resourceId
}

export async function shareResource(
  teacherId: string,
  studentId: string,
  resourceId: string
): Promise<void> {
  await set(ref(database, `${sharedPath(teacherId, studentId)}/${resourceId}`), true)
}

export async function unshareResource(
  teacherId: string,
  studentId: string,
  resourceId: string
): Promise<void> {
  await remove(ref(database, `${sharedPath(teacherId, studentId)}/${resourceId}`))
}

export async function deleteResource(teacherId: string, resourceId: string): Promise<void> {
  const source = ref(database, resourcePath(teacherId, resourceId))
  const snapshot = await get(source)
  if (!snapshot.exists()) return

  const record = snapshot.val() as ResourceDbRecord

  // Soft-delete
  await set(ref(database, deletedResourcePath(teacherId, resourceId)), record)
  await remove(source)

  // Remove from all shared-resources entries
  const studentIds = await getStudentIds(teacherId)
  await Promise.all(
    studentIds.map((studentId) =>
      remove(ref(database, `${sharedPath(teacherId, studentId)}/${resourceId}`))
    )
  )

  // Hard-delete Storage file if present
  if (record.storagePath) {
    await deleteObject(storageRef(storage, record.storagePath))
  }
}

export function useHomeworkResources(
  teacherId: string | undefined,
  studentId: string | undefined
): { resources: Resource[]; loading: boolean } {
  const [allResources, setAllResources] = useState<Resource[]>([])
  const [resourceIds, setResourceIds] = useState<Set<string>>(new Set())
  const [loadingResources, setLoadingResources] = useState(true)
  const [loadingIds, setLoadingIds] = useState(true)

  useEffect(() => {
    if (!teacherId) {
      setAllResources([])
      setLoadingResources(false)
      return
    }
    setLoadingResources(true)
    const unsub = onValue(
      ref(database, resourcesPath(teacherId)),
      (snap) => {
        setAllResources(snapshotToResources(snap))
        setLoadingResources(false)
      },
      () => {
        setAllResources([])
        setLoadingResources(false)
      }
    )
    return unsub
  }, [teacherId])

  useEffect(() => {
    if (!teacherId || !studentId) {
      setResourceIds(new Set())
      setLoadingIds(false)
      return
    }
    setLoadingIds(true)

    let publishedIds: Set<string> = new Set()
    let draftIds: Set<string> = new Set()
    let publishedLoaded = false
    let draftsLoaded = false

    function extractIds(snap: DataSnapshot): Set<string> {
      if (!snap.exists()) return new Set()
      const hws = snap.val() as Record<string, { resources?: Record<string, string> }>
      const ids = new Set<string>()
      for (const hw of Object.values(hws)) {
        for (const id of Object.keys(hw.resources ?? {})) ids.add(id)
      }
      return ids
    }

    function syncIds() {
      if (!publishedLoaded || !draftsLoaded) return
      setResourceIds(new Set([...publishedIds, ...draftIds]))
      setLoadingIds(false)
    }

    const unsubPublished = onValue(
      ref(database, `homework/teachers/${teacherId}/students/${studentId}`),
      (snap) => {
        publishedIds = extractIds(snap)
        publishedLoaded = true
        syncIds()
      },
      () => {
        publishedLoaded = true
        syncIds()
      }
    )
    const unsubDrafts = onValue(
      ref(database, `homework/teachers/${teacherId}/drafts/students/${studentId}`),
      (snap) => {
        draftIds = extractIds(snap)
        draftsLoaded = true
        syncIds()
      },
      () => {
        draftsLoaded = true
        syncIds()
      }
    )

    return () => {
      unsubPublished()
      unsubDrafts()
    }
  }, [teacherId, studentId])

  const resources = useMemo(
    () => allResources.filter((r) => resourceIds.has(r.id)),
    [allResources, resourceIds]
  )

  return { resources, loading: loadingResources || loadingIds }
}

export async function updateResourceMetadata(
  teacherId: string,
  resourceId: string,
  patch: Partial<ResourceMetadata>
): Promise<void> {
  const updates: Partial<ResourceDbRecord> = {}
  if (patch.title !== undefined) updates.title = patch.title
  if (patch.tags !== undefined) updates.tags = patch.tags
  await update(ref(database, resourcePath(teacherId, resourceId)), updates)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function inferFileType(file: File): ResourceType {
  if (file.type === 'application/pdf') return ResourceType.PDF
  if (file.type.startsWith('audio/')) return ResourceType.AUDIO
  return ResourceType.IMAGE
}

export interface ResourceHomeworkReference {
  studentId: string
  studentName: string
  homeworkId: string
  homeworkTitle: string
  isDraft: boolean
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

export interface DeduplicateResult {
  groupsFound: number
  resourcesRemoved: number
}

export interface DuplicateGroup {
  canonical: Resource
  duplicates: Resource[]
}

interface FileBackedResource extends Resource {
  storagePath: string
  fileName: string
}

function isFileBacked(r: Resource): r is FileBackedResource {
  return typeof r.storagePath === 'string' && typeof r.fileName === 'string'
}

// Strips the 10-char alphanumeric suffix added by quill.ts processFile uploads:
// "photo_WSSN7Wb8F3.jpeg" → "photo.jpeg", "photo.jpeg" → "photo.jpeg"
function stripUploadSuffix(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  const base = lastDot > 0 ? fileName.slice(0, lastDot) : fileName
  const ext = lastDot > 0 ? fileName.slice(lastDot) : ''
  return base.replace(/_[A-Za-z0-9]{10}$/, '') + ext
}

// Files under users/ have the 10-char suffix; files under resources/ use the original name.
function deduplicationKey(r: FileBackedResource, size: number): string {
  const name = r.storagePath.startsWith('users/') ? stripUploadSuffix(r.fileName) : r.fileName
  return `${name}::${size}`
}

function replaceUrlInHtml(html: string, oldUrl: string, newUrl: string): string {
  const oldEncoded = oldUrl.replace(/&/g, '&amp;')
  const newEncoded = newUrl.replace(/&/g, '&amp;')
  return html.split(oldUrl).join(newUrl).split(oldEncoded).join(newEncoded)
}

async function mergeDuplicate(
  teacherId: string,
  dup: FileBackedResource,
  canonical: Resource
): Promise<void> {
  const dbUpdates: Record<string, unknown> = {}

  // Re-point shared-resources: add canonical for any student that had dup, remove dup
  const studentIds = await getStudentIds(teacherId)
  await Promise.all(
    studentIds.map(async (studentId) => {
      const dupSharedRef = ref(database, `${sharedPath(teacherId, studentId)}/${dup.id}`)
      const dupSharedSnap = await get(dupSharedRef)
      if (!dupSharedSnap.exists()) return
      const canonSharedRef = ref(database, `${sharedPath(teacherId, studentId)}/${canonical.id}`)
      const canonSharedSnap = await get(canonSharedRef)
      if (!canonSharedSnap.exists()) await set(canonSharedRef, true)
      await remove(dupSharedRef)
    })
  )

  // Re-point homework: update resources map and replace embedded URLs
  function collectHomeworkUpdates(snap: DataSnapshot, basePath: string) {
    if (!snap.exists()) return
    const students = snap.val() as Record<
      string,
      Record<string, { resources?: Record<string, string>; content?: string; editContent?: string }>
    >
    for (const [studentId, homeworks] of Object.entries(students)) {
      for (const [hwId, hw] of Object.entries(homeworks)) {
        const hwPath = `${basePath}/${studentId}/${hwId}`

        if (hw.resources?.[dup.id] !== undefined) {
          dbUpdates[`${hwPath}/resources/${dup.id}`] = null
          if (hw.resources[canonical.id] === undefined) {
            dbUpdates[`${hwPath}/resources/${canonical.id}`] = canonical.url
          }
        }

        const dupEncoded = dup.url.replace(/&/g, '&amp;')
        if (hw.content && (hw.content.includes(dup.url) || hw.content.includes(dupEncoded))) {
          dbUpdates[`${hwPath}/content`] = replaceUrlInHtml(hw.content, dup.url, canonical.url)
        }
        if (
          hw.editContent &&
          (hw.editContent.includes(dup.url) || hw.editContent.includes(dupEncoded))
        ) {
          dbUpdates[`${hwPath}/editContent`] = replaceUrlInHtml(
            hw.editContent,
            dup.url,
            canonical.url
          )
        }
      }
    }
  }

  const [pubSnap, draftSnap] = await Promise.all([
    get(ref(database, `homework/teachers/${teacherId}/students`)),
    get(ref(database, `homework/teachers/${teacherId}/drafts/students`))
  ])
  collectHomeworkUpdates(pubSnap, `homework/teachers/${teacherId}/students`)
  collectHomeworkUpdates(draftSnap, `homework/teachers/${teacherId}/drafts/students`)

  if (Object.keys(dbUpdates).length > 0) {
    await update(ref(database), dbUpdates)
  }

  // Soft-delete the duplicate resource entry
  const dupResRef = ref(database, resourcePath(teacherId, dup.id))
  const dupResSnap = await get(dupResRef)
  if (dupResSnap.exists()) {
    await set(ref(database, deletedResourcePath(teacherId, dup.id)), dupResSnap.val())
    await remove(dupResRef)
  }

  // Hard-delete the duplicate Storage file
  try {
    await deleteObject(storageRef(storage, dup.storagePath))
  } catch {
    // File may already be deleted; continue
  }
}

function groupByDeduplicationKey(
  resources: Array<FileBackedResource & { size: number }>
): DuplicateGroup[] {
  const groups = new Map<string, Array<FileBackedResource & { size: number }>>()
  for (const r of resources) {
    const key = deduplicationKey(r, r.size)
    const group = groups.get(key) ?? []
    group.push(r)
    groups.set(key, group)
  }
  return [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) => {
      g.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      const [canonical, ...duplicates] = g
      return { canonical, duplicates }
    })
}

export function computeDuplicateGroups(resources: Resource[]): DuplicateGroup[] {
  const sizedFileBacked = resources.filter(
    (r): r is FileBackedResource & { size: number } => isFileBacked(r) && typeof r.size === 'number'
  )
  return groupByDeduplicationKey(sizedFileBacked)
}

export async function findDuplicateGroups(teacherId: string): Promise<DuplicateGroup[]> {
  const allSnap = await get(ref(database, resourcesPath(teacherId)))
  if (!allSnap.exists()) return []

  const all = snapshotToResources(allSnap)
  const fileBacked = all.filter(isFileBacked)

  // Use stored size when available; fall back to Storage metadata for older records.
  const withSize = await Promise.all(
    fileBacked.map(async (r) => {
      if (typeof r.size === 'number') return { ...r, size: r.size }
      try {
        const meta = await getMetadata(storageRef(storage, r.storagePath))
        return { ...r, size: meta.size }
      } catch {
        return null
      }
    })
  )
  const valid = withSize.filter((r): r is FileBackedResource & { size: number } => r !== null)

  return groupByDeduplicationKey(valid)
}

export async function deduplicateSingleGroup(
  teacherId: string,
  group: DuplicateGroup
): Promise<number> {
  let removed = 0
  for (const dup of group.duplicates) {
    if (!isFileBacked(dup)) continue
    await mergeDuplicate(teacherId, dup, group.canonical)
    removed++
  }
  return removed
}

export async function deduplicateResources(teacherId: string): Promise<DeduplicateResult> {
  const dupGroups = await findDuplicateGroups(teacherId)
  if (dupGroups.length === 0) return { groupsFound: 0, resourcesRemoved: 0 }

  let resourcesRemoved = 0
  for (const group of dupGroups) {
    resourcesRemoved += await deduplicateSingleGroup(teacherId, group)
  }
  return { groupsFound: dupGroups.length, resourcesRemoved }
}

// ---------------------------------------------------------------------------
// Import existing uploads
// ---------------------------------------------------------------------------

export interface ImportResult {
  imported: number
  skipped: number
}

function inferTypeFromMime(contentType: string): ResourceType | null {
  if (contentType === 'application/pdf') return ResourceType.PDF
  if (contentType.startsWith('audio/')) return ResourceType.AUDIO
  if (contentType.startsWith('image/')) return ResourceType.IMAGE
  return null
}

function inferTypeFromExtension(fileName: string): ResourceType {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  if (ext === 'pdf') return ResourceType.PDF
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return ResourceType.AUDIO
  return ResourceType.IMAGE
}

function cleanFileName(fileName: string): string {
  const extIndex = fileName.lastIndexOf('.')
  const base = extIndex > 0 ? fileName.slice(0, extIndex) : fileName
  const cleaned = base.replace(/_[A-Za-z0-9]{10}$/, '')
  return cleaned.replace(/[_-]+/g, ' ').trim() || base
}

function extractYouTubeUrlsFromHtml(html: string): string[] {
  const urls: string[] = []
  const re = /(?:src|href)="(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^"]+)"/gi
  let m
  while ((m = re.exec(html)) !== null) {
    urls.push(m[1])
  }
  return urls
}

function collectYouTubeVideoIds(snap: DataSnapshot): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>()
  if (!snap.exists()) return result
  const students = snap.val() as Record<
    string,
    Record<string, { content?: string; editContent?: string }>
  >
  for (const homeworks of Object.values(students)) {
    for (const hw of Object.values(homeworks)) {
      for (const html of [hw.content, hw.editContent]) {
        if (!html) continue
        for (const url of extractYouTubeUrlsFromHtml(html)) {
          const videoId = extractYouTubeVideoId(url)
          if (!videoId) continue
          const existing = result.get(videoId) ?? new Set<string>()
          existing.add(url)
          result.set(videoId, existing)
        }
      }
    }
  }
  return result
}

function collectHomeworkUrlReferences(
  snap: DataSnapshot,
  basePath: string,
  resourceId: string,
  url: string,
  updates: Record<string, unknown>
): void {
  if (!snap.exists()) return
  const urlEncoded = url.replace(/&/g, '&amp;')
  const students = snap.val() as Record<
    string,
    Record<string, { resources?: Record<string, string>; content?: string; editContent?: string }>
  >
  for (const [studentId, homeworks] of Object.entries(students)) {
    for (const [hwId, hw] of Object.entries(homeworks)) {
      if (hw.resources?.[resourceId] !== undefined) continue
      const inContent = !!(
        hw.content &&
        (hw.content.includes(url) || hw.content.includes(urlEncoded))
      )
      const inEdit = !!(
        hw.editContent &&
        (hw.editContent.includes(url) || hw.editContent.includes(urlEncoded))
      )
      if (inContent || inEdit) {
        updates[`${basePath}/${studentId}/${hwId}/resources/${resourceId}`] = url
      }
    }
  }
}

export async function importExistingUploads(
  teacherId: string,
  accessToken?: string
): Promise<ImportResult> {
  const [listResult, existingSnap, pubHwSnap, draftHwSnap] = await Promise.all([
    listAll(storageRef(storage, `users/${teacherId}/files`)),
    get(ref(database, resourcesPath(teacherId))),
    get(ref(database, `homework/teachers/${teacherId}/students`)),
    get(ref(database, `homework/teachers/${teacherId}/drafts/students`))
  ])

  const existingUrls = new Set<string>()
  const existingVideoIds = new Set<string>()
  if (existingSnap.exists()) {
    for (const record of Object.values(existingSnap.val() as Record<string, ResourceDbRecord>)) {
      existingUrls.add(record.url)
      if (record.type === ResourceType.YOUTUBE) {
        const vid = extractYouTubeVideoId(record.url)
        if (vid) existingVideoIds.add(vid)
      }
    }
  }

  let imported = 0
  let skipped = 0
  const hwUpdates: Record<string, unknown> = {}

  // Import files from Storage
  await Promise.all(
    listResult.items.map(async (item) => {
      try {
        const [url, meta] = await Promise.all([getDownloadURL(item), getMetadata(item)])

        if (existingUrls.has(url)) {
          skipped++
          return
        }

        const fileName = item.name
        const type = inferTypeFromMime(meta.contentType ?? '') ?? inferTypeFromExtension(fileName)
        const newRef = push(ref(database, resourcesPath(teacherId)))
        if (!newRef.key) return
        const resourceId = newRef.key
        const record: ResourceDbRecord = {
          title: cleanFileName(fileName),
          type,
          url,
          fileName,
          storagePath: item.fullPath,
          size: meta.size,
          tags: {},
          createdAt: meta.timeCreated
        }
        await set(newRef, record)
        imported++

        collectHomeworkUrlReferences(
          pubHwSnap,
          `homework/teachers/${teacherId}/students`,
          resourceId,
          url,
          hwUpdates
        )
        collectHomeworkUrlReferences(
          draftHwSnap,
          `homework/teachers/${teacherId}/drafts/students`,
          resourceId,
          url,
          hwUpdates
        )
      } catch {
        // Skip inaccessible files
      }
    })
  )

  // Import YouTube links found in homework content
  const videoIdMap = new Map<string, Set<string>>()
  for (const [videoId, urls] of [
    ...collectYouTubeVideoIds(pubHwSnap),
    ...collectYouTubeVideoIds(draftHwSnap)
  ]) {
    const existing = videoIdMap.get(videoId) ?? new Set<string>()
    for (const u of urls) existing.add(u)
    videoIdMap.set(videoId, existing)
  }

  for (const [videoId, foundUrls] of videoIdMap) {
    if (existingVideoIds.has(videoId)) {
      skipped++
      continue
    }

    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`
    let title = 'YouTube Video'
    try {
      const meta = await fetchYouTubeVideo(videoId, accessToken)
      title = meta.snippet.title
    } catch {
      // Fall back to default title
    }

    const newRef = push(ref(database, resourcesPath(teacherId)))
    if (!newRef.key) continue
    const resourceId = newRef.key
    const record: ResourceDbRecord = {
      title,
      type: ResourceType.YOUTUBE,
      url: canonicalUrl,
      tags: {},
      createdAt: new Date().toISOString()
    }
    await set(newRef, record)
    imported++
    existingVideoIds.add(videoId)

    for (const rawUrl of foundUrls) {
      collectHomeworkUrlReferences(
        pubHwSnap,
        `homework/teachers/${teacherId}/students`,
        resourceId,
        rawUrl,
        hwUpdates
      )
      collectHomeworkUrlReferences(
        draftHwSnap,
        `homework/teachers/${teacherId}/drafts/students`,
        resourceId,
        rawUrl,
        hwUpdates
      )
    }
  }

  if (Object.keys(hwUpdates).length > 0) {
    await update(ref(database), hwUpdates)
  }

  return { imported, skipped }
}

export async function findResourceUsageInHomework(
  teacherId: string,
  resourceId: string,
  resourceUrl?: string,
  studentId?: string
): Promise<ResourceHomeworkReference[]> {
  const references: ResourceHomeworkReference[] = []
  const videoId = resourceUrl ? extractYouTubeVideoId(resourceUrl) : null

  function isReferencedInHw(hw: {
    resources?: Record<string, string>
    content?: string
    editContent?: string
  }): boolean {
    if (hw.resources?.[resourceId]) return true
    for (const html of [hw.content, hw.editContent]) {
      if (!html) continue
      if (resourceUrl && html.includes(resourceUrl)) return true
      if (videoId && (html.includes(`/embed/${videoId}`) || html.includes(`v=${videoId}`))) {
        return true
      }
    }
    return false
  }

  interface HwRecord {
    resources?: Record<string, string>
    content?: string
    editContent?: string
    title?: string
  }

  // Scan all students under a parent path (teacher-only access)
  async function scanAllStudentsPath(basePath: string, isDraft: boolean) {
    const snap = await get(ref(database, basePath))
    if (!snap.exists()) return
    const students = snap.val() as Record<string, Record<string, HwRecord>>
    const studentIds = Object.keys(students)
    const nameSnaps = await Promise.all(
      studentIds.map((id) => get(ref(database, `users/${id}/name`)))
    )
    for (let i = 0; i < studentIds.length; i++) {
      const sid = studentIds[i]
      const studentName = (nameSnaps[i].val() as string | null) ?? sid
      for (const [homeworkId, hw] of Object.entries(students[sid])) {
        if (isReferencedInHw(hw)) {
          references.push({
            studentId: sid,
            studentName,
            homeworkId,
            homeworkTitle: hw.title ?? (isDraft ? 'Draft' : 'Untitled'),
            isDraft
          })
        }
      }
    }
  }

  // Scan a single student's homework path (accessible to that student)
  async function scanSingleStudentPath(sid: string) {
    const [nameSnap, hwSnap] = await Promise.all([
      get(ref(database, `users/${sid}/name`)),
      get(ref(database, `homework/teachers/${teacherId}/students/${sid}`))
    ])
    if (!hwSnap.exists()) return
    const studentName = (nameSnap.val() as string | null) ?? sid
    const homeworks = hwSnap.val() as Record<string, HwRecord>
    for (const [homeworkId, hw] of Object.entries(homeworks)) {
      if (isReferencedInHw(hw)) {
        references.push({
          studentId: sid,
          studentName,
          homeworkId,
          homeworkTitle: hw.title ?? 'Untitled',
          isDraft: false
        })
      }
    }
  }

  if (studentId) {
    await scanSingleStudentPath(studentId)
  } else {
    await Promise.all([
      scanAllStudentsPath(`homework/teachers/${teacherId}/students`, false),
      scanAllStudentsPath(`homework/teachers/${teacherId}/drafts/students`, true)
    ])
  }

  return references
}
