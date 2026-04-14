"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "text-white bg-sky-600 " +
    "shadow-[0_8px_24px_-12px_rgba(2,132,199,0.5)] " +
    "hover:bg-sky-700 hover:shadow-[0_14px_32px_-14px_rgba(2,132,199,0.55)] " +
    "active:bg-sky-800",
  secondary:
    "border border-slate-200 bg-white text-slate-800 " +
    "shadow-[0_1px_2px_rgba(15,23,42,0.04)] " +
    "hover:border-sky-300 hover:bg-sky-50/60 hover:text-sky-800 " +
    "active:bg-sky-50",
  ghost:
    "text-slate-700 hover:bg-slate-900/[0.05] hover:text-slate-900 active:bg-slate-900/[0.08]",
  danger:
    "text-white bg-rose-600 " +
    "shadow-[0_8px_24px_-12px_rgba(225,29,72,0.5)] " +
    "hover:bg-rose-700 hover:shadow-[0_14px_32px_-14px_rgba(225,29,72,0.55)] " +
    "active:bg-rose-800"
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]"
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading,
  leftIcon,
  rightIcon,
  className,
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={cn(
        "group/btn relative inline-flex items-center justify-center gap-2 rounded-lg font-semibold tracking-tight " +
          "transition-[box-shadow,background,color,border-color] duration-200 ease-out " +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white " +
          "disabled:cursor-not-allowed disabled:opacity-60",
        SIZES[size],
        VARIANTS[variant],
        className
      )}
    >
      <span className="relative inline-flex items-center gap-2">
        {isLoading ? <Spinner /> : leftIcon}
        <span>{children}</span>
        {rightIcon}
      </span>
    </button>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}
