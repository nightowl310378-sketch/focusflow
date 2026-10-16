import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from 'react'
import { isFirebaseConfigured } from '@/services/firebase-config'

export interface AuthUser {
  uid: string
  name: string | null
  email: string | null
  photoURL: string | null
}

export interface AuthContextValue {
  /** Whether Firebase auth is configured (env vars present). */
  configured: boolean
  /** True while the initial session is being restored. */
  loading: boolean
  user: AuthUser | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  configured: false,
  loading: false,
  user: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
})

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}

/**
 * Provides optional Google authentication. Safe to render without Firebase
 * configured: consumers simply see `configured: false` and the app stays
 * local-first.
 */
export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const configured = isFirebaseConfigured
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(configured)
  const unsubscribe = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }
    let active = true
    import('@/services/firebase-client')
      .then(async ({ getFirebaseAuth }) => {
        const auth = getFirebaseAuth()
        if (!auth) {
          if (active) setLoading(false)
          return
        }
        const { onAuthStateChanged } = await import('firebase/auth')
        unsubscribe.current = onAuthStateChanged(auth, (u) => {
          if (!active) return
          setUser(
            u
              ? { uid: u.uid, name: u.displayName, email: u.email, photoURL: u.photoURL }
              : null,
          )
          setLoading(false)
        })
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      unsubscribe.current?.()
      unsubscribe.current = null
    }
  }, [configured])

  const signInWithGoogle = useCallback(async () => {
    const [{ getFirebaseAuth, googleProvider }, { signInWithPopup }] = await Promise.all([
      import('@/services/firebase-client'),
      import('firebase/auth'),
    ])
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase is not configured.')
    await signInWithPopup(auth, googleProvider())
  }, [])

  const signOut = useCallback(async () => {
    const [{ getFirebaseAuth }, { signOut: firebaseSignOut }] = await Promise.all([
      import('@/services/firebase-client'),
      import('firebase/auth'),
    ])
    const auth = getFirebaseAuth()
    if (auth) await firebaseSignOut(auth)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ configured, loading, user, signInWithGoogle, signOut }),
    [configured, loading, user, signInWithGoogle, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
