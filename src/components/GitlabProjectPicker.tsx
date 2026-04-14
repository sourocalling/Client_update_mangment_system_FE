"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { GitlabProject } from "@/lib/gitlab";

const VALUE_PREFIX = "gitlab:";

export function GitlabProjectPicker({
  value,
  onChange,
  projects,
  disabled,
  isLoading,
  placeholder,
  emptyLabel
}: {
  value: string;
  onChange: (v: string) => void;
  projects: GitlabProject[];
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name_with_namespace.toLowerCase().includes(q));
  }, [projects, query]);

  const selected = useMemo(
    () => projects.find((p) => `${VALUE_PREFIX}${p.id}` === value),
    [projects, value]
  );

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isOpen]);

  // Focus input when opened, reset search
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIdx(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Keep active index inside the filtered range as user types
  useEffect(() => {
    setActiveIdx((i) => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  // Scroll active option into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, isOpen]);

  const commitSelection = (p: GitlabProject) => {
    onChange(`${VALUE_PREFIX}${p.id}`);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const p = filtered[activeIdx];
      if (p) commitSelection(p);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const triggerLabel = selected?.name_with_namespace
    ?? (isLoading
      ? "Loading GitLab projects…"
      : (placeholder ?? "Select a GitLab project…"));

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3.5 py-2.5 text-left text-sm transition-[border-color,box-shadow,background] duration-200",
          "outline-none",
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
            : "border-slate-200 text-slate-900 hover:border-slate-300",
          isOpen && !disabled && "border-sky-400 ring-4 ring-sky-500/10"
        )}
      >
        <span className={cn("truncate", !selected && "text-slate-400")}>{triggerLabel}</span>
        <svg
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 8 10 12 14 8" />
        </svg>
      </button>

      {isOpen && !disabled ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_20px_40px_-16px_rgba(15,23,42,0.2),0_6px_18px_-8px_rgba(15,23,42,0.1)]">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Search ${projects.length} project${projects.length === 1 ? "" : "s"}…`}
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-8 pr-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
              />
            </div>
          </div>

          <ul
            ref={listRef}
            role="listbox"
            className="max-h-72 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-slate-500">
                {emptyLabel ?? (query ? `No projects match “${query}”` : "No projects found")}
              </li>
            ) : (
              filtered.map((p, idx) => {
                const isSelected = `${VALUE_PREFIX}${p.id}` === value;
                const isActive = idx === activeIdx;
                return (
                  <li
                    key={p.id}
                    role="option"
                    aria-selected={isSelected}
                    data-idx={idx}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commitSelection(p);
                    }}
                    className={cn(
                      "group flex cursor-pointer items-center gap-3 px-3 py-2 text-sm",
                      isActive && "bg-sky-50",
                      isSelected && "bg-sky-100"
                    )}
                  >
                    <ProjectAvatar project={p} />
                    <div className="min-w-0 flex-1">
                      <div className={cn("truncate font-medium text-slate-900", isSelected && "text-sky-900")}>
                        {p.name}
                      </div>
                      <div className="truncate text-[11px] text-slate-500">
                        {p.path_with_namespace}
                      </div>
                    </div>
                    {isSelected ? (
                      <svg
                        className="h-4 w-4 shrink-0 text-sky-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ProjectAvatar({ project }: { project: GitlabProject }) {
  if (project.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={project.avatar_url}
        alt=""
        className="h-7 w-7 shrink-0 rounded-md border border-slate-200 object-cover"
      />
    );
  }
  const initial = project.name.charAt(0).toUpperCase() || "?";
  return (
    <div
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 to-sky-700 text-[11px] font-bold uppercase text-white"
    >
      {initial}
    </div>
  );
}
