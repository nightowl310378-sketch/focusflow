import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react'

export type ThemeMode = 'light' | 'dark' | 'comfort'
export type TextSize = 'normal' | 'large' | 'xlarge'

export const THEME_STORAGE_KEY = 'focusflow:theme'
export const TEXT_SIZE_STORAGE_KEY = 'focusflow:text-size'

export const THEME_MODES: ThemeMode[] = ['light', 'dark', 'comfort']
export const TEXT_SIZES: TextSize[] = ['normal', 'large', 'xlarge']

export const THEME_LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  comfort: 'Eye Comfort',
}

export const TEXT_SIZE_LABELS: Record<TextSize, string> = {
  normal: 'Normal',
  large: 'Large',
  xlarge: 'Extra large',
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'comfort'
}

export function isTextSize(value: unknown): value is TextSize {
  return value === 'normal' || value === 'large' || value === 'xlarge'
}

/** The theme the operating system currently prefers, defaulting to light. */
export function systemTheme(): ThemeMode {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export function readStoredTheme(): ThemeMode | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeMode(value) ? value : null
  } catch {
    return null
  }
}

export function readStoredTextSize(): TextSize {
  try {
    const value = localStorage.getItem(TEXT_SIZE_STORAGE_KEY)
    return isTextSize(value) ? value : 'normal'
  } catch {
    return 'normal'
  }
}

/**
 * Read the theme already applied to <html> by the no-flash inline script.
 * Falls back to the stored value, then the system preference, then light.
 */
function initialTheme(): ThemeMode {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme')
    if (isThemeMode(attr)) return attr
  }
  return readStoredTheme() ?? systemTheme()
}

function initialTextSize(): TextSize {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-text-size')
    if (isTextSize(attr)) return attr
  }
  return readStoredTextSize()
}

interface ThemeContextValue {
  theme: ThemeMode
  textSize: TextSize
  /** True when the user has explicitly chosen a theme (stored). */
  explicit: boolean
  setTheme: (theme: ThemeMode) => void
  cycleTheme: () => void
  setTextSize: (size: TextSize) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [theme, setThemeState] = useState<ThemeMode>(() => initialTheme())
  const [textSize, setTextSizeState] = useState<TextSize>(() => initialTextSize())
  const [explicit, setExplicit] = useState<boolean>(() => readStoredTheme() !== null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-text-size', textSize)
  }, [textSize])

  // Follow the OS preference until the student chooses a theme themselves.
  useEffect(() => {
    if (explicit || typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setThemeState(media.matches ? 'dark' : 'light')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [explicit])

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next)
    setExplicit(true)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
  }, [])

  const setTextSize = useCallback((next: TextSize) => {
    setTextSizeState(next)
    try {
      localStorage.setItem(TEXT_SIZE_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = THEME_MODES[(THEME_MODES.indexOf(prev) + 1) % THEME_MODES.length]
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next)
      } catch {
        /* ignore */
      }
      return next
    })
    setExplicit(true)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, textSize, explicit, setTheme, cycleTheme, setTextSize }),
    [theme, textSize, explicit, setTheme, cycleTheme, setTextSize],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
