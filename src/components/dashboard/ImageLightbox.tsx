"use client";

import { useEffect, useState } from "react";

/* ── Thumbnail ────────────────────────────────────────────────── */

export function Thumbnail({
  src,
  alt,
  onClick
}: {
  src: string;
  alt: string;
  onClick: () => void;
}) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-1 text-center text-[10px] text-slate-400">
        Failed to load
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group/thumb relative overflow-hidden rounded-xl border border-slate-200 transition hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
    >
      <img
        src={src}
        alt={alt}
        className="h-20 w-20 object-cover"
        loading="lazy"
        onError={() => setError(true)}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover/thumb:bg-black/10">
        <svg
          className="h-5 w-5 text-white opacity-0 drop-shadow transition group-hover/thumb:opacity-100"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1" />
        </svg>
      </div>
    </button>
  );
}

/* ── Lightbox ─────────────────────────────────────────────────── */

export function ImageLightbox({
  url,
  onClose
}: {
  url: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <img
          src={url}
          alt="Preview"
          className="max-h-[85vh] max-w-[85vw] rounded-2xl shadow-2xl"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg transition hover:bg-slate-50 hover:text-slate-900"
          aria-label="Close preview"
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
    </div>
  );
}
