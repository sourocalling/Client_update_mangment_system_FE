"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  hint,
  right,
  error,
  children,
  className
}: {
  label: string;
  hint?: string;
  right?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-start justify-between gap-3">
        <label className="text-sm font-semibold text-slate-800">{label}</label>
        <div className="flex items-center gap-3">
          {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
          {right}
        </div>
      </div>
      {children}
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  );
}

export function InlineMessage({
  variant = "info",
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: "info" | "success" | "warning" | "danger" }) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        variant === "info" && "border-slate-200 bg-slate-50 text-slate-800",
        variant === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900",
        variant === "warning" && "border-amber-200 bg-amber-50 text-amber-900",
        variant === "danger" && "border-red-200 bg-red-50 text-red-800",
        className
      )}
    />
  );
}
