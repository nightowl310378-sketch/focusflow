import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  Calendar,
  Home,
  Menu,
  NotebookPen,
  Settings,
  Sparkles,
  Target,
  Timer,
  X,
} from 'lucide-react'
import { useEffect, useState, type JSX } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { GoogleSignInButton } from '@/components/google-sign-in-button'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/cn'
import { useAuth } from '@/services/auth'
import { useStore } from '@/storage/use-store'

const NAV = [
  { to: '/app', label: 'Dashboard', icon: Home, end: true },
  { to: '/app/plan', label: 'Study Plan', icon: NotebookPen },
  { to: '/app/subjects', label: 'Subjects', icon: BookOpen },
  { to: '/app/tasks', label: 'Tasks', icon: Target },
  { to: '/app/calendar', label: 'Calendar', icon: Calendar },
  { to: '/app/timer', label: 'Focus Timer', icon: Timer },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/assistant', label: 'Assistant', icon: BrainCircuit },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-on-primary shadow-pop">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold tracking-tight text-ink">FocusFlow</p>
        <p className="text-[11px] text-ink-muted">Smart Study Planner</p>
      </div>
    </Link>
  )
}

function NavItems({ onNavigate }: { onNavigate?: () => void }): JSX.Element {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-soft text-primary-strong'
                : 'text-ink-2 hover:bg-soft-2 hover:text-ink',
            )
          }
        >
          <Icon className="h-[18px] w-[18px]" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export function AppShell(): JSX.Element {
  const { data, setData } = useStore()
  const { configured, user, signOut } = useAuth()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // When a user signs in, adopt their Google name if the profile is still the default.
  useEffect(() => {
    if (!user?.name) return
    setData((prev) =>
      prev.profile.name && prev.profile.name !== 'Student'
        ? prev
        : { ...prev, profile: { ...prev.profile, name: user.name! } },
    )
  }, [user?.name, setData])

  return (
    <div className="min-h-screen bg-app">
      {data.demo ? (
        <div className="flex items-center justify-center gap-2 bg-invert px-4 py-1.5 text-center text-xs font-medium text-invert-ink">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          You are exploring the demo dataset
          <Link to="/app/settings" className="underline decoration-cyan-400 underline-offset-2">
            Start fresh
          </Link>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="sticky top-0 z-30 hidden h-screen w-72 shrink-0 flex-col gap-6 border-r border-line bg-surface px-5 py-6 md:flex">
          <div className="flex items-center justify-between gap-3">
            <Logo />
            <ThemeToggle />
          </div>
          <NavItems />
          <div className="mt-auto rounded-2xl bg-soft p-4">
            {user ? (
              <>
                <p className="text-xs font-medium text-ink-muted">Signed in as</p>
                <div className="mt-1.5 flex items-center gap-2">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-7 w-7 shrink-0 rounded-full"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {user.name ?? user.email ?? 'Student'}
                    </p>
                    {user.email ? (
                      <p className="truncate text-[11px] text-ink-muted">{user.email}</p>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="mt-3 text-xs font-medium text-primary hover:underline"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-ink-muted">Signed in as</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-ink">{data.profile.name}</p>
                {configured ? (
                  <GoogleSignInButton size="sm" className="mt-3 w-full" label="Sign in" />
                ) : null}
              </>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone={data.demo ? 'cyan' : 'primary'}>{data.demo ? 'Demo' : 'My data'}</Badge>
              <Badge tone="neutral">{data.subjects.length} subjects</Badge>
            </div>
          </div>
        </aside>

        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur md:hidden">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-ink-2 transition-colors hover:bg-soft-2"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-overlay backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col gap-6 bg-surface px-5 py-6 shadow-pop animate-rise">
              <div className="flex items-center justify-between">
                <Logo />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                  className="rounded-xl p-1.5 text-ink-muted hover:bg-soft-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavItems onNavigate={() => setMobileOpen(false)} />
              <div className="mt-auto rounded-2xl bg-soft p-4">
                <p className="text-xs text-ink-muted">Signed in as</p>
                <p className="text-sm font-semibold text-ink">{data.profile.name}</p>
              </div>
            </div>
          </div>
        ) : null}

        <main className="flex-1">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 pb-24 md:gap-8 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
