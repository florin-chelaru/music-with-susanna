import { get, onValue, push, ref, remove, set, update } from 'firebase/database'
import { deleteObject, getDownloadURL, getMetadata, listAll } from 'firebase/storage'
import { renderHook } from '@testing-library/react'
import {
  ResourceType,
  addYouTubeResource,
  deduplicateResources,
  deleteResource,
  importExistingUploads,
  inferFileType,
  shareResource,
  unshareResource,
  updateResourceMetadata,
  useTeacherResources
} from './resources'
import { fetchYouTubeVideo } from './youtube'

jest.mock('firebase/database')
jest.mock('firebase/storage')
jest.mock('../store/Firebase', () => ({ database: {}, storage: {} }))
jest.mock('./youtube', () => ({
  extractYouTubeVideoId: jest.requireActual<typeof import('./youtube')>('./youtube')
    .extractYouTubeVideoId,
  fetchYouTubeVideo: jest.fn()
}))

const mockFetchYouTubeVideo = fetchYouTubeVideo as jest.Mock
const mockRef = ref as jest.Mock
const mockSet = set as jest.Mock
const mockRemove = remove as jest.Mock
const mockGet = get as jest.Mock
const mockPush = push as jest.Mock
const mockUpdate = update as jest.Mock
const mockOnValue = onValue as jest.Mock
const mockDeleteObject = deleteObject as jest.Mock
const mockGetMetadata = getMetadata as jest.Mock
const mockListAll = listAll as jest.Mock
const mockGetDownloadURL = getDownloadURL as jest.Mock

const TEACHER = 'teacher-1'
const STUDENT = 'student-1'
const RESOURCE_ID = 'res-1'

const DB_RECORD = {
  title: 'Kreutzer No. 2',
  type: ResourceType.PDF,
  url: 'https://storage.example.com/kreutzer.pdf',
  fileName: 'kreutzer.pdf',
  storagePath: `resources/${TEACHER}/${RESOURCE_ID}/kreutzer.pdf`,
  tags: { etude: 'Etude' },
  createdAt: '2026-01-15T10:00:00.000Z'
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRef.mockReturnValue({})
  mockPush.mockReturnValue({ key: RESOURCE_ID })
})

// ---------------------------------------------------------------------------
// shareResource
// ---------------------------------------------------------------------------

test('shareResource writes true to the shared-resources path', async () => {
  await shareResource(TEACHER, STUDENT, RESOURCE_ID)

  expect(mockRef).toHaveBeenCalledWith(
    expect.anything(),
    `shared-resources/${TEACHER}/students/${STUDENT}/${RESOURCE_ID}`
  )
  expect(mockSet).toHaveBeenCalledWith(expect.anything(), true)
})

// ---------------------------------------------------------------------------
// unshareResource
// ---------------------------------------------------------------------------

test('unshareResource removes from the shared-resources path', async () => {
  await unshareResource(TEACHER, STUDENT, RESOURCE_ID)

  expect(mockRef).toHaveBeenCalledWith(
    expect.anything(),
    `shared-resources/${TEACHER}/students/${STUDENT}/${RESOURCE_ID}`
  )
  expect(mockRemove).toHaveBeenCalled()
})

// ---------------------------------------------------------------------------
// addYouTubeResource
// ---------------------------------------------------------------------------

test('addYouTubeResource creates a YOUTUBE record and returns the resource id', async () => {
  const id = await addYouTubeResource(TEACHER, 'https://youtu.be/abc123', {
    title: 'Bach Concerto',
    tags: {}
  })

  expect(id).toBe(RESOURCE_ID)
  expect(mockSet).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ type: ResourceType.YOUTUBE, url: 'https://youtu.be/abc123' })
  )
})

// ---------------------------------------------------------------------------
// updateResourceMetadata
// ---------------------------------------------------------------------------

test('updateResourceMetadata updates only the provided fields', async () => {
  await updateResourceMetadata(TEACHER, RESOURCE_ID, { title: 'New Title' })

  expect(mockRef).toHaveBeenCalledWith(
    expect.anything(),
    `resources/teachers/${TEACHER}/${RESOURCE_ID}`
  )
  expect(mockUpdate).toHaveBeenCalledWith(expect.anything(), { title: 'New Title' })
})

// ---------------------------------------------------------------------------
// deleteResource
// ---------------------------------------------------------------------------

test('deleteResource soft-deletes, removes shared refs, and deletes Storage file', async () => {
  mockGet
    .mockResolvedValueOnce({ exists: () => true, val: () => DB_RECORD })
    .mockResolvedValueOnce({
      exists: () => true,
      val: () => ({ [STUDENT]: { [RESOURCE_ID]: true } })
    })

  await deleteResource(TEACHER, RESOURCE_ID)

  // Soft-delete written
  expect(mockSet).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ title: DB_RECORD.title })
  )
  // Removed from active path and shared path
  expect(mockRemove).toHaveBeenCalledTimes(2)
  // Storage file hard-deleted
  expect(mockDeleteObject).toHaveBeenCalled()
})

test('deleteResource is a no-op when the resource does not exist', async () => {
  mockGet.mockResolvedValueOnce({ exists: () => false })

  await deleteResource(TEACHER, RESOURCE_ID)

  expect(mockSet).not.toHaveBeenCalled()
  expect(mockRemove).not.toHaveBeenCalled()
})

test('deleteResource skips Storage deletion when storagePath is absent', async () => {
  const { storagePath: _omit, ...recordWithoutPath } = DB_RECORD
  mockGet
    .mockResolvedValueOnce({ exists: () => true, val: () => recordWithoutPath })
    .mockResolvedValueOnce({ exists: () => false })

  await deleteResource(TEACHER, RESOURCE_ID)

  expect(mockDeleteObject).not.toHaveBeenCalled()
})

// ---------------------------------------------------------------------------
// useTeacherResources
// ---------------------------------------------------------------------------

test('useTeacherResources returns resources from the RTDB snapshot', () => {
  mockOnValue.mockImplementationOnce((_: unknown, cb: (snap: object) => void) => {
    cb({ exists: () => true, val: () => ({ [RESOURCE_ID]: DB_RECORD }) })
    return jest.fn()
  })

  const { result } = renderHook(() => useTeacherResources(TEACHER))

  expect(result.current.loading).toBe(false)
  expect(result.current.resources).toHaveLength(1)
  expect(result.current.resources[0]).toMatchObject({ id: RESOURCE_ID, title: DB_RECORD.title })
})

test('useTeacherResources returns empty and stops loading when teacherId is undefined', () => {
  const { result } = renderHook(() => useTeacherResources(undefined))

  expect(result.current.loading).toBe(false)
  expect(result.current.resources).toEqual([])
  expect(mockOnValue).not.toHaveBeenCalled()
})

// ---------------------------------------------------------------------------
// inferFileType
// ---------------------------------------------------------------------------

test.each([
  [new File([], 'f.pdf', { type: 'application/pdf' }), ResourceType.PDF],
  [new File([], 'f.mp3', { type: 'audio/mpeg' }), ResourceType.AUDIO],
  [new File([], 'f.png', { type: 'image/png' }), ResourceType.IMAGE]
])('inferFileType(%s) → %s', (file, expected) => {
  expect(inferFileType(file)).toBe(expected)
})

// ---------------------------------------------------------------------------
// deduplicateResources
// ---------------------------------------------------------------------------

const RES_A = {
  ...DB_RECORD,
  createdAt: '2026-01-01T00:00:00.000Z'
}
const RES_B_ID = 'res-2'
const RES_B_URL = 'https://storage.example.com/kreutzer-copy.pdf'
const RES_B = {
  title: 'Kreutzer No. 2 (copy)',
  type: ResourceType.PDF,
  url: RES_B_URL,
  fileName: 'kreutzer.pdf',
  storagePath: `resources/${TEACHER}/${RES_B_ID}/kreutzer.pdf`,
  tags: {},
  createdAt: '2026-02-01T00:00:00.000Z'
}

function makeSnap(value: unknown, exists = true) {
  return { exists: () => exists, val: () => value }
}

test('deduplicateResources returns zero counts when there are no resources', async () => {
  mockGet.mockResolvedValueOnce(makeSnap(null, false))

  const result = await deduplicateResources(TEACHER)

  expect(result).toEqual({ groupsFound: 0, resourcesRemoved: 0 })
  expect(mockGetMetadata).not.toHaveBeenCalled()
})

test('deduplicateResources returns zero counts when all resources are YouTube (no storagePath)', async () => {
  mockGet.mockResolvedValueOnce(
    makeSnap({ 'yt-1': { type: ResourceType.YOUTUBE, url: 'https://youtu.be/x', tags: {}, createdAt: '2026-01-01T00:00:00.000Z', title: 'Video' } })
  )

  const result = await deduplicateResources(TEACHER)

  expect(result).toEqual({ groupsFound: 0, resourcesRemoved: 0 })
  expect(mockGetMetadata).not.toHaveBeenCalled()
})

test('deduplicateResources finds and removes a duplicate, keeping the earliest entry', async () => {
  // First get: all resources (A is older, B is duplicate)
  mockGet.mockResolvedValueOnce(makeSnap({ [RESOURCE_ID]: RES_A, [RES_B_ID]: RES_B }))
  // getMetadata for both files — same size indicates duplicate
  mockGetMetadata.mockResolvedValue({ size: 2048 })
  // get(sharedStudentsPath) — no shared entries
  mockGet.mockResolvedValueOnce(makeSnap(null, false))
  // get(published homework) — no entries
  mockGet.mockResolvedValueOnce(makeSnap(null, false))
  // get(draft homework) — no entries
  mockGet.mockResolvedValueOnce(makeSnap(null, false))
  // get(dupResRef) for soft-delete
  mockGet.mockResolvedValueOnce(makeSnap(RES_B))

  const result = await deduplicateResources(TEACHER)

  expect(result).toEqual({ groupsFound: 1, resourcesRemoved: 1 })
  // Soft-delete written for the duplicate (B)
  expect(mockSet).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ title: RES_B.title })
  )
  // Duplicate removed from active path
  expect(mockRemove).toHaveBeenCalled()
  // Storage file hard-deleted
  expect(mockDeleteObject).toHaveBeenCalled()
})

test('deduplicateResources updates homework resources map and replaces embedded URL', async () => {
  const HW_ID = 'hw-1'
  const HW_STUDENT = 'student-2'
  const contentWithDupUrl = `<img src="${RES_B_URL}">`

  mockGet.mockResolvedValueOnce(makeSnap({ [RESOURCE_ID]: RES_A, [RES_B_ID]: RES_B }))
  mockGetMetadata.mockResolvedValue({ size: 2048 })
  // No shared-resources
  mockGet.mockResolvedValueOnce(makeSnap(null, false))
  // Published homework has dup in resources map and embedded URL
  mockGet.mockResolvedValueOnce(
    makeSnap({
      [HW_STUDENT]: {
        [HW_ID]: {
          resources: { [RES_B_ID]: RES_B_URL },
          content: contentWithDupUrl
        }
      }
    })
  )
  // No draft homework
  mockGet.mockResolvedValueOnce(makeSnap(null, false))
  // get(dupResRef) for soft-delete
  mockGet.mockResolvedValueOnce(makeSnap(RES_B))

  await deduplicateResources(TEACHER)

  expect(mockUpdate).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      [`homework/teachers/${TEACHER}/students/${HW_STUDENT}/${HW_ID}/resources/${RES_B_ID}`]: null,
      [`homework/teachers/${TEACHER}/students/${HW_STUDENT}/${HW_ID}/resources/${RESOURCE_ID}`]:
        DB_RECORD.url,
      [`homework/teachers/${TEACHER}/students/${HW_STUDENT}/${HW_ID}/content`]: `<img src="${DB_RECORD.url}">`
    })
  )
})

test('deduplicateResources groups users/ files by base name after stripping 10-char suffix', async () => {
  const RES_SUFFIX_A_ID = 'res-s1'
  const RES_SUFFIX_B_ID = 'res-s2'
  const RES_SUFFIX_A = {
    title: 'photo',
    type: ResourceType.IMAGE,
    url: 'https://storage.example.com/photo_a.jpg',
    fileName: 'photo_WSSN7Wb8F3.jpeg',
    storagePath: `users/${TEACHER}/files/photo_WSSN7Wb8F3.jpeg`,
    tags: {},
    createdAt: '2026-01-01T00:00:00.000Z'
  }
  const RES_SUFFIX_B = {
    title: 'photo (copy)',
    type: ResourceType.IMAGE,
    url: 'https://storage.example.com/photo_b.jpg',
    fileName: 'photo_4E1OJatQr5.jpeg',
    storagePath: `users/${TEACHER}/files/photo_4E1OJatQr5.jpeg`,
    tags: {},
    createdAt: '2026-02-01T00:00:00.000Z'
  }

  mockGet.mockResolvedValueOnce(makeSnap({ [RES_SUFFIX_A_ID]: RES_SUFFIX_A, [RES_SUFFIX_B_ID]: RES_SUFFIX_B }))
  mockGetMetadata.mockResolvedValue({ size: 1024 })
  mockGet.mockResolvedValueOnce(makeSnap(null, false))
  mockGet.mockResolvedValueOnce(makeSnap(null, false))
  mockGet.mockResolvedValueOnce(makeSnap(null, false))
  mockGet.mockResolvedValueOnce(makeSnap(RES_SUFFIX_B))

  const result = await deduplicateResources(TEACHER)

  expect(result).toEqual({ groupsFound: 1, resourcesRemoved: 1 })
  expect(mockSet).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ title: RES_SUFFIX_B.title })
  )
  expect(mockDeleteObject).toHaveBeenCalled()
})

// ---------------------------------------------------------------------------
// importExistingUploads
// ---------------------------------------------------------------------------

const STORAGE_ITEM = {
  name: 'kreutzer_WSSN7Wb8F3.pdf',
  fullPath: `users/${TEACHER}/files/kreutzer_WSSN7Wb8F3.pdf`
}
const IMPORTED_URL = 'https://storage.example.com/kreutzer_imported.pdf'

test('importExistingUploads returns zero counts when storage folder is empty and no homework', async () => {
  mockListAll.mockResolvedValueOnce({ items: [], prefixes: [] })
  mockGet.mockResolvedValueOnce(makeSnap(null, false)) // existingResources
  mockGet.mockResolvedValueOnce(makeSnap(null, false)) // pubHw
  mockGet.mockResolvedValueOnce(makeSnap(null, false)) // draftHw

  const result = await importExistingUploads(TEACHER)

  expect(result).toEqual({ imported: 0, skipped: 0 })
})

test('importExistingUploads creates a Resource entry for a new file', async () => {
  mockListAll.mockResolvedValueOnce({ items: [STORAGE_ITEM], prefixes: [] })
  mockGetDownloadURL.mockResolvedValueOnce(IMPORTED_URL)
  mockGetMetadata.mockResolvedValueOnce({
    contentType: 'application/pdf',
    timeCreated: '2026-03-01T00:00:00.000Z',
    size: 512
  })
  // get(existingResources), get(pubHw), get(draftHw) — no existing entries
  mockGet.mockResolvedValueOnce(makeSnap(null, false))
  mockGet.mockResolvedValueOnce(makeSnap(null, false))
  mockGet.mockResolvedValueOnce(makeSnap(null, false))

  const result = await importExistingUploads(TEACHER)

  expect(result).toEqual({ imported: 1, skipped: 0 })
  expect(mockSet).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      title: 'kreutzer',
      type: ResourceType.PDF,
      url: IMPORTED_URL,
      fileName: STORAGE_ITEM.name,
      storagePath: STORAGE_ITEM.fullPath
    })
  )
})

test('importExistingUploads imports YouTube links from homework content and deduplicates by video ID', async () => {
  const VIDEO_ID = 'abc123'
  const EMBED_URL = `https://www.youtube.com/embed/${VIDEO_ID}`
  const SHORT_URL = `https://youtu.be/${VIDEO_ID}`
  const CANONICAL_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`
  // Two homework entries reference the same video via different URL formats
  const pubHw = {
    [STUDENT]: {
      'hw-1': { content: `<iframe src="${EMBED_URL}"></iframe>` },
      'hw-2': { content: `<a href="${SHORT_URL}">Watch</a>` }
    }
  }

  mockListAll.mockResolvedValueOnce({ items: [], prefixes: [] })
  mockGet.mockResolvedValueOnce(makeSnap(null, false)) // existingResources
  mockGet.mockResolvedValueOnce(makeSnap(pubHw)) // pubHw
  mockGet.mockResolvedValueOnce(makeSnap(null, false)) // draftHw
  mockFetchYouTubeVideo.mockResolvedValueOnce({
    videoId: VIDEO_ID,
    snippet: { title: 'Bach Concerto', description: '', publishedAt: '', thumbnails: {} }
  })

  const result = await importExistingUploads(TEACHER)

  // One resource created (both URLs are the same video)
  expect(result).toEqual({ imported: 1, skipped: 0 })
  expect(mockFetchYouTubeVideo).toHaveBeenCalledWith(VIDEO_ID, undefined)
  expect(mockSet).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ type: ResourceType.YOUTUBE, url: CANONICAL_URL, title: 'Bach Concerto' })
  )
  // Backfill: both homework entries get the resource reference
  expect(mockUpdate).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      [`homework/teachers/${TEACHER}/students/${STUDENT}/hw-1/resources/${RESOURCE_ID}`]: EMBED_URL,
      [`homework/teachers/${TEACHER}/students/${STUDENT}/hw-2/resources/${RESOURCE_ID}`]: SHORT_URL
    })
  )
})

test('importExistingUploads skips YouTube videos already in the resource library', async () => {
  const VIDEO_ID = 'abc123'
  const EMBED_URL = `https://www.youtube.com/embed/${VIDEO_ID}`
  const CANONICAL_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`

  mockListAll.mockResolvedValueOnce({ items: [], prefixes: [] })
  // Existing resource already has the canonical URL for this video
  mockGet.mockResolvedValueOnce(
    makeSnap({ 'yt-existing': { type: ResourceType.YOUTUBE, url: CANONICAL_URL, title: 'Existing', tags: {}, createdAt: '2026-01-01T00:00:00.000Z' } })
  )
  mockGet.mockResolvedValueOnce(
    makeSnap({ [STUDENT]: { 'hw-1': { content: `<iframe src="${EMBED_URL}"></iframe>` } } })
  )
  mockGet.mockResolvedValueOnce(makeSnap(null, false)) // draftHw

  const result = await importExistingUploads(TEACHER)

  expect(result).toEqual({ imported: 0, skipped: 1 })
  expect(mockFetchYouTubeVideo).not.toHaveBeenCalled()
  expect(mockSet).not.toHaveBeenCalled()
})

test('importExistingUploads skips files already present in the resource library', async () => {
  mockListAll.mockResolvedValueOnce({ items: [STORAGE_ITEM], prefixes: [] })
  mockGetDownloadURL.mockResolvedValueOnce(IMPORTED_URL)
  mockGetMetadata.mockResolvedValueOnce({ contentType: 'application/pdf', timeCreated: '2026-03-01T00:00:00.000Z', size: 512 })
  // get(existingResources) — file already imported; get(pubHw), get(draftHw) — empty
  mockGet.mockResolvedValueOnce(makeSnap({ [RESOURCE_ID]: { ...DB_RECORD, url: IMPORTED_URL } }))
  mockGet.mockResolvedValueOnce(makeSnap(null, false))
  mockGet.mockResolvedValueOnce(makeSnap(null, false))

  const result = await importExistingUploads(TEACHER)

  expect(result).toEqual({ imported: 0, skipped: 1 })
  expect(mockSet).not.toHaveBeenCalled()
})
