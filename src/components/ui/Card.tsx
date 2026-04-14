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
        "relative rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl",
        "shadow-[0_1px_3px_rgba(15,23,42,0.05),0_18px_40px_-22px_rgba(30,27,75,0.22)]",
        "transition-shadow duration-300",
        className
      )}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("px-6 pt-6 sm:px-8 sm:pt-8", className)} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      {...props}
      className={cn(
        "text-[22px] font-semibold tracking-tight text-slate-900 sm:text-2xl",
        className
      )}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      {...props}
      className={cn("mt-1.5 text-sm leading-6 text-slate-600", className)}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("px-6 pb-6 sm:px-8 sm:pb-8", className)} />;
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
      className={cn(
        "flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 sm:px-8",
        className
      )}
    >
      <div className="min-w-0">{left}</div>
      <div className="flex shrink-0 items-center gap-2">{right}</div>
    </div>
  );
}
