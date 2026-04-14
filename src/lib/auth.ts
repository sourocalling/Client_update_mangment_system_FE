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

export type RegisterInput = {
  tenant: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  squadName?: string;
};

export type AuthState = {
  isReady: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthState>({
  isReady: false,
  user: null,
  accessToken: null,
  login: async () => {},
  register: async () => {},
  logout: () => {}
});

export function useAuth() {
  return useContext(AuthContext);
}

