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
  return { id, ...record }
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
