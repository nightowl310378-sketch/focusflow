import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { JSX } from 'react'

import { StoreProvider } from '@/storage/use-store'
import { ToastProvider } from '@/components/ui/toast'
import { ThemeProvider } from '@/theme/theme'
import { createInitialData } from '@/constants/defaults'
import { saveData } from '@/storage/storage'
import { AppShell } from '@/components/layout/app-shell'

import Landing from '@/pages/landing'
import Onboarding from '@/pages/onboarding'
import Dashboard from '@/pages/dashboard'
import Plan from '@/pages/plan'
import Subjects from '@/pages/subjects'
import Tasks from '@/pages/tasks'
import CalendarPage from '@/pages/calendar'
import TimerPage from '@/pages/timer'
import Analytics from '@/pages/analytics'
import Assistant from '@/pages/assistant'
import Settings from '@/pages/settings'

function renderPage(ui: JSX.Element, route = '/') {
  return render(
    <ThemeProvider>
      <StoreProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </ToastProvider>
      </StoreProvider>
    </ThemeProvider>,
  )
}

function Shell() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<div>child</div>} />
      </Route>
    </Routes>
  )
}

const pages: Array<[string, JSX.Element, string]> = [
  ['Landing', <Landing />, '/'],
  ['Onboarding', <Onboarding />, '/onboarding'],
  ['Dashboard', <Dashboard />, '/app'],
  ['Plan', <Plan />, '/app/plan'],
  ['Subjects', <Subjects />, '/app/subjects'],
  ['Tasks', <Tasks />, '/app/tasks'],
  ['Calendar', <CalendarPage />, '/app/calendar'],
  ['Timer', <TimerPage />, '/app/timer'],
  ['Analytics', <Analytics />, '/app/analytics'],
  ['Assistant', <Assistant />, '/app/assistant'],
  ['Settings', <Settings />, '/app/settings'],
]

describe('page render smoke tests (demo data)', () => {
  beforeEach(() => {
    localStorage.clear()
    saveData(createInitialData({ demo: true }))
  })
  afterEach(() => cleanup())

  for (const [name, el, route] of pages) {
    it(`renders ${name} without crashing`, () => {
      const { container } = renderPage(el, route)
      expect(container.firstChild).toBeTruthy()
    })
  }

  it('renders AppShell with nested outlet', () => {
    const { container } = renderPage(<Shell />, '/app')
    expect(container.firstChild).toBeTruthy()
  })
})

describe('page render smoke tests (empty state)', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => cleanup())

  for (const [name, el, route] of pages) {
    it(`renders ${name} with no data`, () => {
      const { container } = renderPage(el, route)
      expect(container.firstChild).toBeTruthy()
    })
  }
})
