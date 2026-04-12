"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/types/shared";
import { useAuth } from "@/lib/auth";

export function RequireAuth({
  children,
  allow
}: {
  children: React.ReactNode;
  allow?: Role[];
}) {
  const { isReady, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (allow && !allow.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [allow, isReady, router, user]);

  if (!isReady) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-slate-600">Loading…</div>
    );
  }

  if (!user) return null;
  if (allow && !allow.includes(user.role)) return null;

  return <>{children}</>;
}

