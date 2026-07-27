import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import {
  AnnouncementContext,
  AnnouncementData,
  AnnouncementHandler
} from './store/AnnouncementProvider'
import LocaleProvider from './store/LocaleProvider'
import { SupportedLocale } from './util/SupportedLocale'

export function makeAnnouncementData(overrides?: Partial<AnnouncementData>): AnnouncementData {
  return {
    visible: true,
    [SupportedLocale.EN_US]: { title: 'Test EN Title', body: 'Test EN body' },
    [SupportedLocale.RO_RO]: { title: 'Test RO Title', body: 'Test RO body' },
    ...overrides
  }
}

const defaultHandler: AnnouncementHandler = {
  hidden: false,
  loading: false,
  data: null,
  hide: jest.fn(),
  update: jest.fn(() => Promise.resolve())
}

interface ProviderOptions extends Omit<RenderOptions, 'wrapper'> {
  announcement?: Partial<AnnouncementHandler>
}

export function renderWithProviders(
  ui: ReactElement,
  { announcement, ...options }: ProviderOptions = {}
) {
  const handler: AnnouncementHandler = { ...defaultHandler, ...announcement }
  return render(
    <MemoryRouter>
      <LocaleProvider>
        <AnnouncementContext.Provider value={handler}>{ui}</AnnouncementContext.Provider>
      </LocaleProvider>
    </MemoryRouter>,
    options
  )
}
