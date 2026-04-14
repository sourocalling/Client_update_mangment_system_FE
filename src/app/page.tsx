"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { isReady, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [isReady, router, user]);

  return (
    <div className="mx-auto flex max-w-4xl items-center justify-center px-4 py-24">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-indigo-500" />
        </span>
        <span className="font-medium">Loading your workspace…</span>
      </div>
    </div>
  );
}
