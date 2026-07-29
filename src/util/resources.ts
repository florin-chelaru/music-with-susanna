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
const sharedStudentsPath = (teacherId: string) => `shared-resources/${teacherId}/students`

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
  metadata: ResourceMetadata
): Promise<string> {
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
  const studentsSnap = await get(ref(database, sharedStudentsPath(teacherId)))
  if (studentsSnap.exists()) {
    const studentIds = Object.keys(studentsSnap.val() as Record<string, unknown>)
    await Promise.all(
      studentIds.map((studentId) =>
        remove(ref(database, `${sharedPath(teacherId, studentId)}/${resourceId}`))
      )
    )
  }

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
  const studentsSnap = await get(ref(database, sharedStudentsPath(teacherId)))
  if (studentsSnap.exists()) {
    const studentIds = Object.keys(studentsSnap.val() as Record<string, unknown>)
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
  }

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

export async function findDuplicateGroups(teacherId: string): Promise<DuplicateGroup[]> {
  const allSnap = await get(ref(database, resourcesPath(teacherId)))
  if (!allSnap.exists()) return []

  const all = snapshotToResources(allSnap)
  const fileBacked = all.filter(isFileBacked)

  const withMeta = await Promise.all(
    fileBacked.map(async (r) => {
      try {
        const meta = await getMetadata(storageRef(storage, r.storagePath))
        return { ...r, size: meta.size }
      } catch {
        return null
      }
    })
  )
  const valid = withMeta.filter((r): r is FileBackedResource & { size: number } => r !== null)

  const groups = new Map<string, Array<FileBackedResource & { size: number }>>()
  for (const r of valid) {
    const key = `${r.fileName}::${r.size}`
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
  // Strip random upload suffix: "kreutzer_a1b2c3" → "kreutzer"
  const cleaned = base.replace(/_[a-z0-9]{6,}$/, '')
  return cleaned.replace(/[_-]+/g, ' ').trim() || base
}

export async function importExistingUploads(teacherId: string): Promise<ImportResult> {
  const listResult = await listAll(storageRef(storage, `users/${teacherId}/files`))
  if (listResult.items.length === 0) return { imported: 0, skipped: 0 }

  const existingSnap = await get(ref(database, resourcesPath(teacherId)))
  const existingUrls = new Set<string>()
  if (existingSnap.exists()) {
    for (const record of Object.values(existingSnap.val() as Record<string, ResourceDbRecord>)) {
      existingUrls.add(record.url)
    }
  }

  let imported = 0
  let skipped = 0

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
        const record: ResourceDbRecord = {
          title: cleanFileName(fileName),
          type,
          url,
          fileName,
          storagePath: item.fullPath,
          tags: {},
          createdAt: meta.timeCreated
        }
        await set(newRef, record)
        imported++
      } catch {
        // Skip inaccessible files
      }
    })
  )

  return { imported, skipped }
}

export async function findResourceUsageInHomework(
  teacherId: string,
  resourceId: string
): Promise<ResourceHomeworkReference[]> {
  const references: ResourceHomeworkReference[] = []

  async function scanPath(basePath: string, isDraft: boolean) {
    const snap = await get(ref(database, basePath))
    if (!snap.exists()) return
    const students = snap.val() as Record<
      string,
      Record<string, { resources?: Record<string, string>; title?: string }>
    >
    const studentIds = Object.keys(students)
    const nameSnaps = await Promise.all(
      studentIds.map((id) => get(ref(database, `users/${id}/name`)))
    )
    for (let i = 0; i < studentIds.length; i++) {
      const studentId = studentIds[i]
      const studentName = (nameSnaps[i].val() as string | null) ?? studentId
      for (const [homeworkId, hw] of Object.entries(students[studentId])) {
        if (hw.resources?.[resourceId]) {
          references.push({
            studentId,
            studentName,
            homeworkId,
            homeworkTitle: hw.title ?? (isDraft ? 'Draft' : 'Untitled'),
            isDraft
          })
        }
      }
    }
  }

  await Promise.all([
    scanPath(`homework/teachers/${teacherId}/students`, false),
    scanPath(`homework/teachers/${teacherId}/drafts/students`, true)
  ])

  return references
}
