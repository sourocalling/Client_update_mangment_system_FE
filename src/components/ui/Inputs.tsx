"use client";

import { forwardRef } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const base =
  "w-full rounded-xl border border-slate-200/80 bg-white/85 px-3.5 py-2.5 text-sm text-slate-900 " +
  "outline-none transition-[border-color,box-shadow,background] duration-200 " +
  "placeholder:text-slate-400 " +
  "hover:border-slate-300 " +
  "focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(base, className)} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        base,
        // custom chevron
        "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 8 10 12 14 8%22/></svg>')] bg-[length:18px_18px] bg-[right_10px_center] bg-no-repeat pr-9",
        className
      )}
    />
  );
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        {...props}
        ref={ref}
        className={cn(
          base,
          "min-h-[180px] resize-y py-3 leading-6 font-mono",
          className
        )}
      />
    );
  }
);
TextArea.displayName = "TextArea";
