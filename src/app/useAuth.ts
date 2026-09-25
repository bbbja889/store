import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

let current: User | null = null;
let ready = false;
const subs = new Set<(u: User | null) => void>();
let started = false;

function start() {
  if (started) return;
  started = true;
  void import('@/firebase')
    .then(({ watchAuth }) =>
      watchAuth((u) => {
        current = u;
        ready = true;
        subs.forEach((s) => s(u));
      }),
    )
    .catch(() => {
      ready = true;
      subs.forEach((s) => s(null));
    });
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(current);
  const [isReady, setReady] = useState(ready);
  useEffect(() => {
    const s = (u: User | null) => {
      setUser(u);
      setReady(true);
    };
    subs.add(s);
    start();
    return () => {
      subs.delete(s);
    };
  }, []);
  return { user, ready: isReady };
}

export async function signIn(): Promise<string | null> {
  try {
    const { signInWithGoogle } = await import('@/firebase');
    await signInWithGoogle();
    return null;
  } catch (e) {
    const { describeFirebaseError } = await import('@/firebase');
    return describeFirebaseError(e);
  }
}

export async function signOutUser() {
  const { logout } = await import('@/firebase');
  await logout();
}
