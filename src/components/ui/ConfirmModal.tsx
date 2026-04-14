"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

type Variant = "danger" | "primary";

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [onCancel, open]);

  if (!open) return null;

  const accent = variant === "danger" ? DANGER : PRIMARY;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ overscrollBehavior: "contain" }}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onCancel}
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[6px] animate-fade-in"
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className={cn(
          "relative w-full max-w-[400px] max-h-[calc(100vh-2rem)] animate-scale-in",
          "overflow-hidden rounded-2xl border border-slate-200/80 bg-white",
          "shadow-[0_30px_70px_-20px_rgba(15,23,42,0.35),0_10px_28px_-14px_rgba(15,23,42,0.18)]"
        )}
      >
        <div className="px-6 pt-7 pb-5 flex flex-col items-center text-center">
          {/* Icon */}
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full",
              accent.iconBg
            )}
          >
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-full", accent.iconInner)}>
              {accent.icon}
            </div>
          </div>

          {/* Title */}
          <h2
            id="confirm-title"
            className="mt-4 text-[17px] font-semibold tracking-tight text-slate-900"
          >
            {title}
          </h2>

          {/* Description */}
          {description ? (
            <p
              id="confirm-desc"
              className="mt-1.5 max-w-[320px] text-[13px] leading-[1.55] text-slate-500"
            >
              {description}
            </p>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5">
          <Button variant="secondary" size="md" onClick={onCancel} className="flex-1">
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            size="md"
            onClick={onConfirm}
            className="flex-1"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

const DANGER = {
  iconBg: "bg-rose-50 ring-1 ring-rose-100",
  iconInner:
    "bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-[0_8px_18px_-8px_rgba(244,63,94,0.55)]",
  icon: (
    <svg
      className="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
};

const PRIMARY = {
  iconBg: "bg-indigo-50 ring-1 ring-indigo-100",
  iconInner:
    "bg-[linear-gradient(135deg,#4f46e5_0%,#7c3aed_55%,#c026d3_100%)] text-white shadow-[0_8px_18px_-8px_rgba(79,70,229,0.55)]",
  icon: (
    <svg
      className="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  )
};
