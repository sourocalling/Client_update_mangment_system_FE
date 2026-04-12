"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext, type AuthState, type AuthUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

const storageKey = "cums_access_token";

function setTokenCookie(token: string) {
  document.cookie = `${storageKey}=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
}

function clearTokenCookie() {
  document.cookie = `${storageKey}=; path=/; max-age=0`;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (token) {
      setAccessToken(token);
      setTokenCookie(token);
    }
    setIsReady(true);
  }, []);

  const refreshMe = useCallback(
    async (token: string) => {
      const res = await apiFetch<{ user: AuthUser }>("/api/auth/me", { token });
      setUser(res.user);
    },
    []
  );

  useEffect(() => {
    if (!isReady) return;
    if (!accessToken) {
      setUser(null);
      return;
    }
    refreshMe(accessToken).catch(() => {
      window.localStorage.removeItem(storageKey);
      clearTokenCookie();
      setAccessToken(null);
      setUser(null);
    });
  }, [accessToken, isReady, refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ accessToken: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: { tenant: "Acme", email, password }
    });
    window.localStorage.setItem(storageKey, res.accessToken);
    setTokenCookie(res.accessToken);
    setAccessToken(res.accessToken);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(storageKey);
    clearTokenCookie();
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      isReady,
      user,
      accessToken,
      login,
      logout
    }),
    [accessToken, isReady, login, logout, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

