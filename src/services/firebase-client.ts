/**
 * Thin Firebase client wrapper. This module is imported lazily (dynamic import)
 * so the Firebase SDK is only downloaded when auth is actually configured/used.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import { firebaseConfig, isFirebaseConfigured } from '@/services/firebase-config'

let app: FirebaseApp | null = null
let auth: Auth | null = null

/** Returns the shared Firebase Auth instance, or null when not configured. */
export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured) return null
  if (!app) {
    app = initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    })
  }
  if (!auth) auth = getAuth(app)
  return auth
}

/** Google provider that always lets the user pick an account. */
export function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}
