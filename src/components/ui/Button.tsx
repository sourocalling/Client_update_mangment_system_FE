"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "text-white bg-[linear-gradient(135deg,#4f46e5_0%,#7c3aed_55%,#c026d3_100%)] " +
    "shadow-[0_10px_30px_-12px_rgba(79,70,229,0.55)] " +
    "hover:-translate-y-[1px] hover:shadow-[0_18px_44px_-16px_rgba(79,70,229,0.6)] " +
    "active:translate-y-0 active:shadow-[0_6px_16px_-8px_rgba(79,70,229,0.5)]",
  secondary:
    "border border-slate-200/90 bg-white/80 text-slate-800 backdrop-blur-sm " +
    "shadow-[0_1px_2px_rgba(15,23,42,0.04)] " +
    "hover:-translate-y-[1px] hover:border-slate-300 hover:bg-white hover:shadow-[0_10px_24px_-14px_rgba(30,27,75,0.25)] " +
    "active:translate-y-0",
  ghost:
    "text-slate-700 hover:bg-slate-900/[0.05] hover:text-slate-900 active:bg-slate-900/[0.08]",
  danger:
    "text-white bg-[linear-gradient(135deg,#ef4444_0%,#dc2626_100%)] " +
    "shadow-[0_10px_30px_-12px_rgba(220,38,38,0.55)] " +
    "hover:-translate-y-[1px] hover:shadow-[0_18px_44px_-16px_rgba(220,38,38,0.6)] " +
    "active:translate-y-0"
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
        "group/btn relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-tight " +
          "transition-[transform,box-shadow,background,color] duration-200 ease-out " +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white " +
          "disabled:cursor-not-allowed disabled:opacity-60",
        SIZES[size],
        VARIANTS[variant],
        className
      )}
    >
      {/* Shimmer highlight on primary/danger */}
      {(variant === "primary" || variant === "danger") && !disabled && !isLoading ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
        >
          <span className="absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-all duration-700 ease-out group-hover/btn:left-[120%]" />
        </span>
      ) : null}

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
