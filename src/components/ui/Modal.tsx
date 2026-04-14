"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  footer,
  className
}: {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ overscrollBehavior: "contain" }}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[6px] animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog wrapper — max height = viewport with padding, flex column */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex w-full max-w-[720px] animate-scale-in flex-col",
          "max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]",
          "overflow-hidden rounded-2xl border border-slate-200/80 bg-white",
          "shadow-[0_40px_80px_-24px_rgba(15,23,42,0.4),0_12px_32px_-16px_rgba(15,23,42,0.2)]",
          "ring-1 ring-slate-900/5",
          className
        )}
      >
        {/* Decorative gradient strip */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#4f46e5_0%,#7c3aed_50%,#c026d3_100%)]"
        />

        {/* Header — fixed */}
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4 sm:px-8">
          <div className="min-w-0">
            <div className="text-[17px] font-semibold tracking-tight text-slate-900">
              {title}
            </div>
            {description ? (
              <div className="mt-1 text-sm leading-6 text-slate-500">{description}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-900/[0.05] hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content — scrolls internally */}
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-100 px-6 py-5 sm:px-8">
          {children}
        </div>

        {/* Footer — fixed */}
        {footer ? (
          <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-8">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
