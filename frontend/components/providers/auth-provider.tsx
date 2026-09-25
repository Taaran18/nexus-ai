"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  clearSession,
  hasStoredSession,
  onAuthChange,
  refreshSession,
  storeSession,
} from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import type { User } from "@/lib/types";

type Status = "loading" | "authenticated" | "anonymous" | "offline";

interface AuthContextValue {
  status: Status;
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const restore = useCallback(async () => {
    if (!hasStoredSession()) {
      setStatus("anonymous");
      return;
    }
    setStatus("loading");
    try {
      const restored = await refreshSession();
      setUserState(restored);
      setStatus(restored ? "authenticated" : "anonymous");
    } catch (error) {
      setStatus(error instanceof ApiError && error.status === 0 ? "offline" : "anonymous");
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChange((next) => {
      setUserState(next);
      setStatus(next ? "authenticated" : "anonymous");
    });
    const onStorage = (event: StorageEvent) => {
      if (event.key === "nexus.refresh" && !event.newValue) clearSession();
    };
    window.addEventListener("storage", onStorage);
    const timer = window.setTimeout(restore, 0);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", onStorage);
      window.clearTimeout(timer);
    };
  }, [restore]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    storeSession(response);
    return response.user;
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const response = await authApi.signup(name, email, password);
    storeSession(response);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {}
    clearSession();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, signup, logout, setUser: setUserState, retry: restore }),
    [status, user, login, signup, logout, restore],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
