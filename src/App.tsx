import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { ToastProvider } from '@/components/ui/toast'
import Landing from '@/pages/landing'
import Onboarding from '@/pages/onboarding'
import { StoreProvider } from '@/storage/use-store'

const Dashboard = lazy(() => import('@/pages/dashboard'))
const Plan = lazy(() => import('@/pages/plan'))
const Subjects = lazy(() => import('@/pages/subjects'))
const Tasks = lazy(() => import('@/pages/tasks'))
const CalendarPage = lazy(() => import('@/pages/calendar'))
const TimerPage = lazy(() => import('@/pages/timer'))
const Analytics = lazy(() => import('@/pages/analytics'))
const Assistant = lazy(() => import('@/pages/assistant'))
const Settings = lazy(() => import('@/pages/settings'))

function RouteFallback(): React.JSX.Element {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-ink-muted">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-primary" />
        Loading…
      </div>
    </div>
  )
}

export default function App(): React.JSX.Element {
  return (
    <StoreProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/app" element={<AppShell />}>
              <Route
                index
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <Dashboard />
                  </Suspense>
                }
              />
              <Route
                path="plan"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <Plan />
                  </Suspense>
                }
              />
              <Route
                path="subjects"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <Subjects />
                  </Suspense>
                }
              />
              <Route
                path="tasks"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <Tasks />
                  </Suspense>
                }
              />
              <Route
                path="calendar"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <CalendarPage />
                  </Suspense>
                }
              />
              <Route
                path="timer"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <TimerPage />
                  </Suspense>
                }
              />
              <Route
                path="analytics"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <Analytics />
                  </Suspense>
                }
              />
              <Route
                path="assistant"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <Assistant />
                  </Suspense>
                }
              />
              <Route
                path="settings"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <Settings />
                  </Suspense>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </StoreProvider>
  )
}
