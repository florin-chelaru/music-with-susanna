import { screen } from '@testing-library/react'
import { SupportedLocale } from '../util/SupportedLocale'
import { UserRole } from '../util/User'
import { makeAnnouncementData, renderWithProviders } from '../test-utils'
import { useUser } from '../store/UserProvider'
import Announcement from './Announcement'

jest.mock('../store/UserProvider', () => ({ useUser: jest.fn() }))
// Firebase.ts initializes app/db at module level — mock the whole module to prevent that
jest.mock('../store/Firebase', () => ({ database: {}, auth: {}, storage: {}, analytics: {} }))

beforeEach(() => {
  localStorage.setItem('locale', SupportedLocale.EN_US)
})

test('renders title and body text from RTDB data', () => {
  ;(useUser as jest.Mock).mockReturnValue({ user: { role: UserRole.STUDENT } })
  const data = makeAnnouncementData()

  renderWithProviders(<Announcement />, { announcement: { data } })

  expect(screen.getByText(data[SupportedLocale.EN_US].title)).toBeInTheDocument()
  expect(screen.getByText(data[SupportedLocale.EN_US].body)).toBeInTheDocument()
})

test('teacher sees edit button; non-teacher does not', () => {
  const data = makeAnnouncementData()

  ;(useUser as jest.Mock).mockReturnValue({ user: { role: UserRole.TEACHER } })
  const { unmount } = renderWithProviders(<Announcement />, { announcement: { data } })
  expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  unmount()

  ;(useUser as jest.Mock).mockReturnValue({ user: { role: UserRole.STUDENT } })
  renderWithProviders(<Announcement />, { announcement: { data } })
  expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
})

test('body renders HTML as markup, not escaped text', () => {
  ;(useUser as jest.Mock).mockReturnValue({ user: { role: UserRole.STUDENT } })
  const data = makeAnnouncementData({
    [SupportedLocale.EN_US]: {
      title: 'Announcement',
      body: '<a href="/contact">Click here</a> to contact us.'
    }
  })

  renderWithProviders(<Announcement />, { announcement: { data } })

  expect(screen.getByRole('link', { name: 'Click here' })).toBeInTheDocument()
  expect(screen.queryByText(/<a href/)).not.toBeInTheDocument()
})
