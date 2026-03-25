import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  getUserProfile,
  loginWithEmail,
  logoutFirebaseUser,
  onFirebaseAuthChanged,
  registerWithEmail,
  type PlayerAccountProfile,
} from '../multiplayer/firebase';

interface AuthContextType {
  user: User | null;
  profile: PlayerAccountProfile | null;
  loading: boolean;
  register: (input: { email: string; password: string; displayName: string }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function usePlayerAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('usePlayerAuth must be used within PlayerAuthProvider');
  return ctx;
}

export function PlayerAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PlayerAccountProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onFirebaseAuthChanged(async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const p = await getUserProfile(nextUser.uid);
        setProfile(p);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return unsub;
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    profile,
    loading,
    register: async ({ email, password, displayName }) => {
      setLoading(true);
      try {
        const { profile: nextProfile } = await registerWithEmail(email, password, displayName);
        setProfile(nextProfile);
      } finally {
        setLoading(false);
      }
    },
    login: async ({ email, password }) => {
      setLoading(true);
      try {
        const { profile: nextProfile } = await loginWithEmail(email, password);
        setProfile(nextProfile);
      } finally {
        setLoading(false);
      }
    },
    logout: async () => {
      setLoading(true);
      try {
        await logoutFirebaseUser();
        setProfile(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    },
    refreshProfile: async () => {
      if (!user) {
        setProfile(null);
        return;
      }
      const p = await getUserProfile(user.uid);
      setProfile(p);
    },
  }), [user, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
