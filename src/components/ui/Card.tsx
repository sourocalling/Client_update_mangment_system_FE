"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5",
        className
      )}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("px-5 pt-5 sm:px-7 sm:pt-7", className)} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h1 {...props} className={cn("text-xl font-semibold tracking-tight text-slate-900", className)} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} className={cn("mt-1 text-sm text-slate-600", className)} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("px-5 pb-5 sm:px-7 sm:pb-7", className)} />;
}

export function CardFooter({
  className,
  left,
  right,
  ...props
}: HTMLAttributes<HTMLDivElement> & { left?: ReactNode; right?: ReactNode }) {
  return (
    <div
      {...props}
      className={cn("flex items-center justify-between gap-3 px-5 pb-5 sm:px-7 sm:pb-7", className)}
    >
      <div className="min-w-0">{left}</div>
      <div className="flex shrink-0 items-center gap-2">{right}</div>
    </div>
  );
}

