"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  fetchGitlabBranches,
  fetchGitlabCommits,
  type GitlabBranch,
  type GitlabCommit
} from "@/lib/gitlab";
import { cn } from "@/lib/cn";

function todayISODate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayBounds(dateStr: string): { since: string; until: string } {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(`${dateStr}T23:59:59.999`);
  return { since: start.toISOString(), until: end.toISOString() };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function humanDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function buildCommitsMarkdown(date: string, commits: GitlabCommit[]): string {
  if (commits.length === 0) return "";
  const lines = commits.map((c) => {
    const time = formatTime(c.authored_date);
    return `- [\`${c.short_id}\`](${c.web_url}) ${c.title} *(${time})*`;
  });
  return `### GitLab commits · ${humanDate(date)}\n\n${lines.join("\n")}`;
}

export function GitlabCommitsPicker({
  projectId,
  projectName,
  gitlabUrl,
  gitlabToken,
  currentUserEmail,
  onInsert
}: {
  projectId: number;
  projectName: string;
  gitlabUrl: string;
  gitlabToken: string;
  currentUserEmail?: string;
  onInsert: (markdown: string) => void;
}) {
  const [date, setDate] = useState<string>(() => todayISODate());
  const [myOnly, setMyOnly] = useState(true);
  const [branches, setBranches] = useState<GitlabBranch[]>([]);
  const [branchRef, setBranchRef] = useState<string | null>(null); // null = all branches
  const [commits, setCommits] = useState<GitlabCommit[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load branches whenever the project changes
  useEffect(() => {
    const controller = new AbortController();
    setBranches([]);
    setBranchRef(null);
    fetchGitlabBranches(gitlabUrl, gitlabToken, projectId, controller.signal)
      .then((list) => setBranches(list))
      .catch(() => {
        // Branch fetch failures are non-fatal — user can still use "All branches".
      });
    return () => controller.abort();
  }, [projectId, gitlabUrl, gitlabToken]);

  // Load commits whenever project / date / branch changes
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    setCommits([]);
    setSelected(new Set());

    const { since, until } = dayBounds(date);
    fetchGitlabCommits(
      gitlabUrl,
      gitlabToken,
      projectId,
      since,
      until,
      branchRef,
      controller.signal
    )
      .then((list) => {
        setCommits(list);
      })
      .catch((e) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "commits_failed");
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [projectId, date, gitlabUrl, gitlabToken, branchRef]);

  const visibleCommits = useMemo(() => {
    if (!myOnly || !currentUserEmail) return commits;
    const me = currentUserEmail.toLowerCase();
    return commits.filter((c) => c.author_email.toLowerCase() === me);
  }, [commits, myOnly, currentUserEmail]);

  // Auto-select all when the visible set changes
  useEffect(() => {
    setSelected(new Set(visibleCommits.map((c) => c.id)));
  }, [visibleCommits]);

  const toggleCommit = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === visibleCommits.length) return new Set();
      return new Set(visibleCommits.map((c) => c.id));
    });
  }, [visibleCommits]);

  const handleInsert = useCallback(() => {
    const picked = visibleCommits.filter((c) => selected.has(c.id));
    if (picked.length === 0) return;
    const md = buildCommitsMarkdown(date, picked);
    onInsert(md);
  }, [visibleCommits, selected, date, onInsert]);

  const errorText = !error
    ? null
    : error === "invalid_token"
      ? "GitLab token was rejected. Reconnect in the header."
      : error === "forbidden"
        ? "Your token lacks access to this repository's commits."
        : error === "network_error"
          ? "Couldn't reach GitLab. Check your connection."
          : error.startsWith("gitlab: ")
            ? `GitLab says: ${error.slice("gitlab: ".length)}`
            : "Couldn't load commits. Try again.";

  const selectedCount = selected.size;
  const allVisibleSelected =
    visibleCommits.length > 0 && visibleCommits.every((c) => selected.has(c.id));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Header row */}
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-br from-sky-50/60 via-white to-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 ring-1 ring-inset ring-orange-100">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M12 21 3 12l2.3-7.1h3l2.4 7.1H13l2.4-7.1h3L20.9 12 12 21z" fill="#FC6D26" />
              <path d="M12 21 8.7 12H15.3L12 21z" fill="#E24329" />
              <path d="M12 21 3 12h5.7L12 21z" fill="#FCA326" />
              <path d="m3 12 2.3-7.1L8.7 12H3z" fill="#E24329" />
              <path d="M12 21 21 12h-5.7L12 21z" fill="#FCA326" />
              <path d="m21 12-2.3-7.1L15.3 12H21z" fill="#E24329" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold tracking-tight text-slate-900">
              GitLab activity
            </div>
            <div className="mt-0.5 truncate text-[11px] text-slate-500">
              Pick commits from <span className="font-medium text-slate-700">{projectName}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <BranchPicker
            branches={branches}
            value={branchRef}
            onChange={setBranchRef}
          />

          <label className="sr-only" htmlFor="gitlab-date">
            Date
          </label>
          <input
            id="gitlab-date"
            type="date"
            value={date}
            max={todayISODate()}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-800 outline-none transition-colors hover:border-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10"
          />

          {currentUserEmail ? (
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:border-slate-300">
              <input
                type="checkbox"
                checked={myOnly}
                onChange={(e) => setMyOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              My commits only
            </label>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="min-h-[140px]">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
            <svg className="h-4 w-4 animate-spin text-sky-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
            </svg>
            Fetching commits from GitLab…
          </div>
        ) : errorText ? (
          <div className="mx-4 my-4 rounded-lg border border-rose-200/80 bg-rose-50/80 px-3 py-2.5 text-[12px] text-rose-800">
            {errorText}
          </div>
        ) : visibleCommits.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-10 text-center">
            <svg
              className="h-6 w-6 text-slate-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M3 12h6m6 0h6" />
            </svg>
            <div className="text-[12px] font-medium text-slate-700">
              No commits {myOnly ? "by you" : ""} on {humanDate(date)}
            </div>
            <div className="text-[11px] text-slate-500">
              {myOnly && currentUserEmail
                ? "Try turning off the 'My commits only' filter."
                : "Try a different date."}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                {allVisibleSelected ? "Deselect all" : "Select all"}
              </label>
              <div className="text-[11px] font-medium text-slate-500">
                {visibleCommits.length} commit{visibleCommits.length === 1 ? "" : "s"}
              </div>
            </div>
            <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {visibleCommits.map((c) => {
                const isChecked = selected.has(c.id);
                return (
                  <li key={c.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-3 px-4 py-2.5 transition-colors",
                        isChecked ? "bg-sky-50/60" : "hover:bg-slate-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCommit(c.id)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[12px]">
                          <a
                            href={c.web_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="rounded bg-sky-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200/80 hover:bg-sky-100"
                          >
                            {c.short_id}
                          </a>
                          <span className="truncate font-medium text-slate-900">{c.title}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500">
                          <span className="truncate">{c.author_name}</span>
                          <span className="text-slate-300">·</span>
                          <span>{formatTime(c.authored_date)}</span>
                        </div>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[11px] text-slate-500">
          {selectedCount > 0
            ? `${selectedCount} commit${selectedCount === 1 ? "" : "s"} selected`
            : "Pick commits to include in your update"}
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={selectedCount === 0}
          onClick={handleInsert}
          leftIcon={
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          }
        >
          Insert {selectedCount > 0 ? `${selectedCount} ` : ""}into update
        </Button>
      </div>
    </div>
  );
}

function BranchPicker({
  branches,
  value,
  onChange
}: {
  branches: GitlabBranch[];
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(() => {
    // default branch first, then alphabetical
    return [...branches].sort((a, b) => {
      if (a.default && !b.default) return -1;
      if (!a.default && b.default) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [branches]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((b) => b.name.toLowerCase().includes(q));
  }, [sorted, query]);

  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const label = value ?? "All branches";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-lg border bg-white px-2.5 text-[12px] font-medium text-slate-800 outline-none transition-[border-color,box-shadow] duration-200",
          "hover:border-slate-300",
          isOpen ? "border-sky-400 ring-4 ring-sky-500/10" : "border-slate-200"
        )}
      >
        <svg
          className="h-3.5 w-3.5 text-slate-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="18" cy="8" r="2.5" />
          <path d="M6 8.5v7" />
          <path d="M18 10.5c0 3-2.5 5-6 5" />
        </svg>
        <span className="max-w-[140px] truncate">{label}</span>
        <svg
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200",
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

      {isOpen ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_20px_40px_-16px_rgba(15,23,42,0.2),0_6px_18px_-8px_rgba(15,23,42,0.1)]">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
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
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsOpen(false);
                }}
                placeholder={`Search ${branches.length} branch${branches.length === 1 ? "" : "es"}…`}
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-2 text-[12px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
              />
            </div>
          </div>

          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(null);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-[12px]",
                  value === null ? "bg-sky-50 font-semibold text-sky-900" : "hover:bg-slate-50"
                )}
              >
                <svg
                  className="h-3.5 w-3.5 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="6" cy="6" r="2.5" />
                  <circle cx="18" cy="6" r="2.5" />
                  <circle cx="6" cy="18" r="2.5" />
                  <path d="M6 8.5v7" />
                  <path d="M18 8.5c0 4-5 3-5 9.5" />
                </svg>
                <span className="flex-1 truncate">All branches</span>
                {value === null ? <CheckIcon /> : null}
              </button>
            </li>

            {filtered.length === 0 && branches.length > 0 ? (
              <li className="px-3 py-6 text-center text-[11px] text-slate-500">
                No branches match “{query}”
              </li>
            ) : (
              filtered.map((b) => {
                const isSelected = value === b.name;
                return (
                  <li key={b.name}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onChange(b.name);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-[12px]",
                        isSelected ? "bg-sky-50 font-semibold text-sky-900" : "hover:bg-slate-50"
                      )}
                    >
                      <svg
                        className="h-3.5 w-3.5 text-slate-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <circle cx="6" cy="6" r="2.5" />
                        <circle cx="6" cy="18" r="2.5" />
                        <circle cx="18" cy="8" r="2.5" />
                        <path d="M6 8.5v7" />
                        <path d="M18 10.5c0 3-2.5 5-6 5" />
                      </svg>
                      <span className="flex-1 truncate">{b.name}</span>
                      {b.default ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-inset ring-slate-200">
                          default
                        </span>
                      ) : null}
                      {isSelected ? <CheckIcon /> : null}
                    </button>
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

function CheckIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-sky-600"
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
  );
}
