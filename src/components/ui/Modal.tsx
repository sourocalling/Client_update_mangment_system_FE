"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
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
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      style={{ overscrollBehavior: "contain" }}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[6px] animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex w-full max-w-[560px] max-h-[90vh] animate-scale-in flex-col",
          "overflow-hidden rounded-2xl border border-slate-200 bg-white",
          "shadow-[0_30px_70px_-24px_rgba(15,23,42,0.35),0_12px_32px_-16px_rgba(15,23,42,0.18)]",
          "ring-1 ring-slate-900/5",
          className
        )}
      >
        {/* Gradient strip */}
        <div
          aria-hidden
          className="h-[3px] w-full shrink-0 bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-400"
        />

        {/* Header — pinned */}
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-5 pb-4 sm:px-8 sm:pt-6">
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
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-900/[0.05] hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
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

        {/* Content — scrolls internally if too tall */}
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-100 px-6 py-5 sm:px-8">
          {children}
        </div>

        {/* Footer — pinned */}
        {footer ? (
          <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-8">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
