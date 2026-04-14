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
    <div className={cn("space-y-2", className)}>
      <div className="flex items-start justify-between gap-3">
        <label className="text-[13px] font-semibold tracking-tight text-slate-800">
          {label}
        </label>
        <div className="flex items-center gap-3">
          {hint ? <div className="text-[11px] font-medium text-slate-400">{hint}</div> : null}
          {right}
        </div>
      </div>
      {children}
      {error ? (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600">
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-8 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm1-8a1 1 0 1 0-2 0v4a1 1 0 1 0 2 0V6z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      ) : null}
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
        "rounded-xl border px-4 py-3 text-sm backdrop-blur-sm",
        variant === "info" && "border-slate-200/80 bg-slate-50/80 text-slate-800",
        variant === "success" && "border-emerald-200/80 bg-emerald-50/80 text-emerald-900",
        variant === "warning" && "border-amber-200/80 bg-amber-50/80 text-amber-900",
        variant === "danger" && "border-rose-200/80 bg-rose-50/80 text-rose-800",
        className
      )}
    />
  );
}
