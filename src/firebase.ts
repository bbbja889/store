/**
 * Firebase (Auth + Firestore). Loaded lazily by the catalog and auth hooks so the intro never waits on it.
 * Errors are converted to short, human messages — never raw JSON containing user identifiers.
 */
import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import config from '../firebase-applet-config.json';

const app = initializeApp(config);
export const db = getFirestore(app, config.firestoreDatabaseId);
export const auth = getAuth(app);

export type { User };

export async function signInWithGoogle() {
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function logout() {
  await signOut(auth);
}

export function watchAuth(cb: (u: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export function describeFirebaseError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'permission-denied': 'The store rejected this request (permission denied).',
    unavailable: 'The store is unreachable right now. Check your connection.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/popup-blocked': 'Your browser blocked the sign-in pop-up.',
    'auth/unauthorized-domain': 'Sign-in is not enabled for this domain yet.',
    'auth/network-request-failed': 'Network error during sign-in.',
    'failed-precondition': 'The store needs an index for this query.',
    'invalid-argument': 'Some fields were not accepted by the store.',
  };
  return map[code] ?? map[code.replace(/^firestore\//, '')] ?? 'Something went wrong talking to the store.';
}
