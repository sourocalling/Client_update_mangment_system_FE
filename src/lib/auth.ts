"use client";

import { createContext, useContext } from "react";
import type { Role } from "@/types/shared";

export type AuthUser = {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: Role;
  squadId: string | null;
};

export type AuthState = {
  isReady: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthState>({
  isReady: false,
  user: null,
  accessToken: null,
  login: async () => {},
  logout: () => {}
});

export function useAuth() {
  return useContext(AuthContext);
}

