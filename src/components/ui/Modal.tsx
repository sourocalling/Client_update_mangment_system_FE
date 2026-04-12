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
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative mx-auto mt-16 w-[min(720px,calc(100%-2rem))]">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20",
            className
          )}
        >
          <div className="border-b border-slate-200 px-5 py-4 sm:px-7">
            <div className="text-base font-semibold text-slate-900">{title}</div>
            {description ? <div className="mt-1 text-sm text-slate-600">{description}</div> : null}
          </div>
          <div className="px-5 py-4 sm:px-7">{children}</div>
          {footer ? <div className="border-t border-slate-200 px-5 py-4 sm:px-7">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

