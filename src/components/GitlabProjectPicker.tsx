"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { fetchGitlabProjectsPage, type GitlabProject } from "@/lib/gitlab";

const VALUE_PREFIX = "gitlab:";
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export function GitlabProjectPicker({
  value,
  onChange,
  gitlabUrl,
  gitlabToken,
  disabled,
  placeholder,
  onProjectChange,
  onMetaChange
}: {
  value: string;
  onChange: (v: string) => void;
  gitlabUrl: string;
  gitlabToken: string;
  disabled?: boolean;
  placeholder?: string;
  onProjectChange?: (project: GitlabProject | null) => void;
  onMetaChange?: (meta: { total: number; isLoading: boolean }) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Pagination state
  const [projects, setProjects] = useState<GitlabProject[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track selected project for display even when not in current page
  const [selectedProject, setSelectedProject] = useState<GitlabProject | null>(null);

  // Stable refs for callbacks to avoid effect re-runs
  const onMetaChangeRef = useRef(onMetaChange);
  onMetaChangeRef.current = onMetaChange;
  const onProjectChangeRef = useRef(onProjectChange);
  onProjectChangeRef.current = onProjectChange;

  // ── Debounced search ──────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // ── Fetch page 1 on mount + whenever connection/search changes ────
  useEffect(() => {
    if (!gitlabUrl || !gitlabToken) {
      setProjects([]);
      setTotal(0);
      setTotalPages(1);
      setPage(1);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchGitlabProjectsPage(gitlabUrl, gitlabToken, {
      page: 1,
      perPage: PAGE_SIZE,
      search: debouncedQuery || undefined,
      signal: controller.signal
    })
      .then((res) => {
        setProjects(res.data);
        setPage(1);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .catch((e) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "gitlab_error");
        setProjects([]);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [gitlabUrl, gitlabToken, debouncedQuery]);

  // ── Report meta changes to parent ─────────────────────────────────
  useEffect(() => {
    onMetaChangeRef.current?.({ total, isLoading });
  }, [total, isLoading]);

  // ── Sync selected project when value is cleared ───────────────────
  useEffect(() => {
    if (!value) {
      setSelectedProject(null);
      onProjectChangeRef.current?.(null);
    }
  }, [value]);

  // ── Load next page ────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (isLoadingMore || isLoading || page >= totalPages) return;
    const nextPage = page + 1;
    setIsLoadingMore(true);

    fetchGitlabProjectsPage(gitlabUrl, gitlabToken, {
      page: nextPage,
      perPage: PAGE_SIZE,
      search: debouncedQuery || undefined
    })
      .then((res) => {
        setProjects((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          const newItems = res.data.filter((p) => !ids.has(p.id));
          return [...prev, ...newItems];
        });
        setPage(nextPage);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .catch(() => {
        // Non-fatal — user can try scrolling again
      })
      .finally(() => setIsLoadingMore(false));
  }, [isLoadingMore, isLoading, page, totalPages, gitlabUrl, gitlabToken, debouncedQuery]);

  // Stable ref for loadMore so scroll handler doesn't go stale
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  // ── Scroll handler for infinite loading ───────────────────────────
  const handleListScroll = useCallback((e: React.UIEvent<HTMLUListElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      loadMoreRef.current();
    }
  }, []);

  // ── Resolve selected project for display ──────────────────────────
  const selected = useMemo(() => {
    if (!value) return null;
    const fromList = projects.find((p) => `${VALUE_PREFIX}${p.id}` === value);
    if (fromList) return fromList;
    if (selectedProject && `${VALUE_PREFIX}${selectedProject.id}` === value) return selectedProject;
    return null;
  }, [projects, value, selectedProject]);

  // ── Close on outside click ────────────────────────────────────────
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

  // ── Focus input when opened, reset search ─────────────────────────
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setDebouncedQuery("");
      setActiveIdx(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ── Keep active index in range ────────────────────────────────────
  useEffect(() => {
    setActiveIdx((i) => Math.min(i, Math.max(0, projects.length - 1)));
  }, [projects.length]);

  // ── Scroll active option into view ────────────────────────────────
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, isOpen]);

  const commitSelection = (p: GitlabProject) => {
    const newValue = `${VALUE_PREFIX}${p.id}`;
    setSelectedProject(p);
    onChange(newValue);
    onProjectChangeRef.current?.(p);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, projects.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const p = projects[activeIdx];
      if (p) commitSelection(p);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const hasMore = page < totalPages;
  const triggerLabel =
    selected?.name_with_namespace ??
    (isLoading && projects.length === 0
      ? "Loading projects\u2026"
      : (placeholder ?? "Select a GitLab project\u2026"));

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
          {/* Search */}
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
                placeholder={
                  total > 0
                    ? `Search ${total} project${total === 1 ? "" : "s"}\u2026`
                    : "Search projects\u2026"
                }
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-8 pr-8 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
              />
              {/* Search spinner */}
              {isLoading && projects.length > 0 ? (
                <svg
                  className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-sky-600"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                </svg>
              ) : null}
            </div>
          </div>

          {/* List */}
          <ul
            ref={listRef}
            role="listbox"
            onScroll={handleListScroll}
            className="max-h-72 overflow-y-auto py-1"
          >
            {isLoading && projects.length === 0 ? (
              <ProjectListSkeleton />
            ) : error ? (
              <li className="px-3 py-8 text-center text-sm text-rose-600">
                {error === "network_error"
                  ? "Couldn\u2019t reach GitLab. Check your connection."
                  : error === "invalid_token"
                    ? "GitLab token was rejected."
                    : "Failed to load projects."}
              </li>
            ) : projects.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-slate-500">
                {query ? `No projects match \u201c${query}\u201d` : "No projects found"}
              </li>
            ) : (
              <>
                {projects.map((p, idx) => {
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
                })}

                {/* Loading more indicator */}
                {isLoadingMore ? (
                  <li className="flex items-center justify-center gap-2 py-3">
                    <svg
                      className="h-4 w-4 animate-spin text-sky-600"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                    </svg>
                    <span className="text-xs text-slate-500">Loading more projects&hellip;</span>
                  </li>
                ) : null}

                {/* End-of-list indicator */}
                {!hasMore && !isLoadingMore && projects.length > 0 && total > PAGE_SIZE ? (
                  <li className="py-2 text-center text-[11px] text-slate-400">
                    All {total} projects loaded
                  </li>
                ) : null}
              </>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ProjectListSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-3 py-2.5">
          <div className="h-7 w-7 shrink-0 animate-pulse rounded-md bg-slate-200" />
          <div className="flex-1 space-y-1.5">
            <div
              className="h-3.5 animate-pulse rounded bg-slate-200"
              style={{ width: `${60 + ((i * 7) % 30)}%` }}
            />
            <div
              className="h-3 animate-pulse rounded bg-slate-100"
              style={{ width: `${40 + ((i * 11) % 25)}%` }}
            />
          </div>
        </li>
      ))}
    </>
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
