"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../supabase/client";

type AuthSessionState = {
  userId: string | null;
  ready: boolean;
  revision: number;
};

const AuthSessionContext = createContext<AuthSessionState | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSessionState>({
    userId: null,
    ready: false,
    revision: 0,
  });

  useEffect(() => {
    let mounted = true;
    let requestVersion = 0;
    const initialRequest = ++requestVersion;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted || initialRequest !== requestVersion) return;
      setSession((current) => ({
        userId: error ? null : (data.session?.user.id ?? null),
        ready: true,
        revision: current.revision + 1,
      }));
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      requestVersion += 1;
      setSession((current) => ({
        userId: nextSession?.user.id ?? null,
        ready: true,
        revision: current.revision + 1,
      }));
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => session, [session]);
  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const session = useContext(AuthSessionContext);
  if (!session) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }
  return session;
}
