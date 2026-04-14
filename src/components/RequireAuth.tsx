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
    if (!user) return; // proxy.ts handles redirect to /login
    if (allow && !allow.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [allow, isReady, router, user]);

  if (!isReady || !user) {
    return (
      <div className="mx-auto flex max-w-4xl items-center justify-center px-4 py-24">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-sky-500" />
          </span>
          <span className="font-medium">Loading your workspace…</span>
        </div>
      </div>
    );
  }

  if (allow && !allow.includes(user.role)) return null;

  return <>{children}</>;
}

