"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Badge({
  variant = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: "neutral" | "success" | "danger" | "warning" | "brand";
}) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-tight",
        "ring-1 ring-inset",
        variant === "neutral" && "bg-slate-50 text-slate-700 ring-slate-200/80",
        variant === "success" && "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
        variant === "danger" && "bg-rose-50 text-rose-700 ring-rose-200/80",
        variant === "warning" && "bg-amber-50 text-amber-800 ring-amber-200/80",
        variant === "brand" && "bg-indigo-50 text-indigo-700 ring-indigo-200/80",
        className
      )}
    />
  );
}
