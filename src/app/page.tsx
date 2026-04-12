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

  return <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-slate-600">Loading…</div>;
}
