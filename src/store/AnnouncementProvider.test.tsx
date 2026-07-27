import { renderHook } from '@testing-library/react'
import { onValue, ref, set } from 'firebase/database'
import { ReactNode, useContext } from 'react'
import { SupportedLocale } from '../util/SupportedLocale'
import { UserRole } from '../util/User'
import AnnouncementProvider, { AnnouncementContext, AnnouncementData } from './AnnouncementProvider'
import { useUser } from './UserProvider'

jest.mock('firebase/database')
jest.mock('./UserProvider', () => ({ useUser: jest.fn() }))
jest.mock('./Firebase', () => ({ database: {} }))

const mockOnValue = onValue as jest.Mock
const mockRef = ref as jest.Mock
const mockSet = set as jest.Mock

const DATA: AnnouncementData = {
  visible: true,
  [SupportedLocale.EN_US]: { title: 'T', body: 'B' },
  [SupportedLocale.RO_RO]: { title: 'T', body: 'B' }
}

function wrapper({ children }: { children: ReactNode }) {
  return <AnnouncementProvider>{children as JSX.Element}</AnnouncementProvider>
}

function setupData(data: AnnouncementData | null) {
  mockOnValue.mockImplementationOnce(
    (_: unknown, cb: (snap: { val: () => unknown }) => void) => {
      cb({ val: () => data })
      return jest.fn()
    }
  )
}

beforeEach(() => {
  localStorage.clear()
})

test('hidden is false for teacher even when data.visible is false', () => {
  ;(useUser as jest.Mock).mockReturnValue({ user: { role: UserRole.TEACHER } })
  setupData({ ...DATA, visible: false })

  const { result } = renderHook(() => useContext(AnnouncementContext), { wrapper })

  expect(result.current.hidden).toBe(false)
})

test('hidden is true for non-teacher when data.visible is false', () => {
  ;(useUser as jest.Mock).mockReturnValue({ user: { role: UserRole.STUDENT } })
  setupData({ ...DATA, visible: false })

  const { result } = renderHook(() => useContext(AnnouncementContext), { wrapper })

  expect(result.current.hidden).toBe(true)
})

test('hidden is false for non-teacher when data.visible is true', () => {
  ;(useUser as jest.Mock).mockReturnValue({ user: { role: UserRole.STUDENT } })
  setupData(DATA)

  const { result } = renderHook(() => useContext(AnnouncementContext), { wrapper })

  expect(result.current.hidden).toBe(false)
})

test('update() writes the announcement data to RTDB', async () => {
  ;(useUser as jest.Mock).mockReturnValue({ user: { role: UserRole.TEACHER } })
  setupData(DATA)
  const fakeRef = {}
  mockRef.mockReturnValue(fakeRef)

  const { result } = renderHook(() => useContext(AnnouncementContext), { wrapper })
  await result.current.update(DATA)

  expect(mockRef).toHaveBeenCalledWith(expect.anything(), 'announcement')
  expect(mockSet).toHaveBeenCalledWith(fakeRef, DATA)
})
