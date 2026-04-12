"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Badge({
  variant = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: "neutral" | "success" | "danger" | "warning" }) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
        variant === "neutral" && "border border-slate-200 bg-slate-50 text-slate-700",
        variant === "success" && "bg-emerald-100 text-emerald-800",
        variant === "danger" && "bg-red-100 text-red-700",
        variant === "warning" && "bg-amber-100 text-amber-800",
        className
      )}
    />
  );
}

