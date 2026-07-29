import { get, onValue, push, ref, remove, set, update } from 'firebase/database'
import { deleteObject } from 'firebase/storage'
import { renderHook } from '@testing-library/react'
import {
  ResourceType,
  addYouTubeResource,
  deleteResource,
  inferFileType,
  shareResource,
  unshareResource,
  updateResourceMetadata,
  useTeacherResources
} from './resources'

jest.mock('firebase/database')
jest.mock('firebase/storage')
jest.mock('../store/Firebase', () => ({ database: {}, storage: {} }))

const mockRef = ref as jest.Mock
const mockSet = set as jest.Mock
const mockRemove = remove as jest.Mock
const mockGet = get as jest.Mock
const mockPush = push as jest.Mock
const mockUpdate = update as jest.Mock
const mockOnValue = onValue as jest.Mock
const mockDeleteObject = deleteObject as jest.Mock

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
