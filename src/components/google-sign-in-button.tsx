import { useState, type JSX } from 'react'
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/services/auth'

function GoogleMark(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}

/**
 * Renders a "Sign in with Google" button. Renders nothing when Firebase auth
 * is not configured, so the app degrades cleanly to local-first mode.
 */
export function GoogleSignInButton({
  label = 'Sign in with Google',
  variant = 'secondary',
  size = 'md',
  className,
  onSignedIn,
}: {
  label?: string
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  onSignedIn?: () => void
}): JSX.Element | null {
  const { configured, signInWithGoogle } = useAuth()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  if (!configured) return null

  const handleClick = async () => {
    setBusy(true)
    try {
      await signInWithGoogle()
      toast({ tone: 'success', title: 'Signed in with Google' })
      onSignedIn?.()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Google sign-in was cancelled or blocked.'
      toast({ tone: 'error', title: 'Sign-in failed', message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button type="button" variant={variant} size={size} className={className} loading={busy} onClick={handleClick}>
      <GoogleMark />
      {label}
    </Button>
  )
}
