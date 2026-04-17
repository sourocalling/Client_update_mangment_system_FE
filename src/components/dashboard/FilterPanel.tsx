"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, InlineMessage } from "@/components/ui/Field";
import { TextInput, Select } from "@/components/ui/Inputs";
import { Button } from "@/components/ui/Button";
import { GitlabProjectPicker } from "@/components/GitlabProjectPicker";
import { GitlabConnectModal } from "@/components/GitlabConnectModal";
import type { Filters } from "@/hooks/useUpdates";
import { cn } from "@/lib/cn";

export function FilterPanel({
  filters,
  onFilterChange,
  onClear,
  authors,
  error,
  /* pagination */
  page,
  totalPages,
  pageSize,
  total,
  itemCount,
  onPageChange,
  onPageSizeChange,
  /* gitlab */
  gitlabUrl,
  gitlabToken
}: {
  filters: Filters;
  onFilterChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  onClear: () => void;
  authors: [string, string][];
  error: string | null;
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  itemCount: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  gitlabUrl: string;
  gitlabToken: string;
}) {
  const gitlabConnected = Boolean(gitlabUrl && gitlabToken);
  const [isConnectOpen, setIsConnectOpen] = useState(false);

  return (
    <Card className="mt-5">
      <CardContent className="pt-6">
        {/* ── Row 1: Search, Project, Author, Risk ────────── */}
        <div className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-4">
            <Field label="Search" hint="Title or body">
              <TextInput
                value={filters.q}
                onChange={(e) => onFilterChange("q", e.target.value)}
                placeholder="Search updates..."
              />
            </Field>
          </div>

          {gitlabConnected ? (
            <>
              {/* ── Project filter ──────────────────────────────── */}
              <div className="md:col-span-3">
                <Field label="Project" hint="GitLab">
                  <div className="relative">
                    <GitlabProjectPicker
                      value={filters.projectId}
                      onChange={(v) => onFilterChange("projectId", v)}
                      gitlabUrl={gitlabUrl}
                      gitlabToken={gitlabToken}
                      placeholder="All projects"
                    />
                    {filters.projectId ? (
                      <button
                        type="button"
                        onClick={() => onFilterChange("projectId", "")}
                        className="absolute right-9 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        title="Clear project filter"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        >
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                </Field>
              </div>

              {/* ── Author filter ──────────────────────────────── */}
              <div className="md:col-span-3">
                <Field
                  label="Author"
                  hint={
                    authors.length > 0
                      ? `${authors.length} author${authors.length === 1 ? "" : "s"}`
                      : undefined
                  }
                >
                  <Select
                    value={filters.authorId}
                    onChange={(e) => onFilterChange("authorId", e.target.value)}
                    className={cn(!authors.length && "text-slate-400")}
                  >
                    <option value="">All authors</option>
                    {authors.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </>
          ) : (
            <div className="md:col-span-6">
              <GitlabConnectPrompt onConnect={() => setIsConnectOpen(true)} />
            </div>
          )}

          <div className="md:col-span-2">
            <Field label="At Risk">
              <Select
                value={filters.riskOnly ? "true" : ""}
                onChange={(e) =>
                  onFilterChange("riskOnly", e.target.value === "true")
                }
              >
                <option value="">All</option>
                <option value="true">At Risk only</option>
              </Select>
            </Field>
          </div>
        </div>

        {/* ── Row 2: Dates + clear ────────────────────────── */}
        <div className="mt-4 grid gap-4 md:grid-cols-12">
          <div className="md:col-span-3">
            <Field label="From">
              <TextInput
                type="date"
                value={filters.from}
                onChange={(e) => onFilterChange("from", e.target.value)}
              />
            </Field>
          </div>
          <div className="md:col-span-3">
            <Field label="To">
              <TextInput
                type="date"
                value={filters.to}
                onChange={(e) => onFilterChange("to", e.target.value)}
              />
            </Field>
          </div>
          <div className="md:col-span-6 md:flex md:items-end md:justify-end">
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear filters
            </Button>
          </div>
        </div>

        {/* ── Pagination bar ──────────────────────────────── */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-xs text-slate-600">
            Page{" "}
            <span className="font-semibold text-slate-800">{page}</span> of{" "}
            <span className="font-semibold text-slate-800">{totalPages}</span>
            <span className="mx-2 text-slate-300">|</span>
            Showing{" "}
            <span className="font-semibold text-slate-800">{itemCount}</span>{" "}
            of <span className="font-semibold text-slate-800">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="w-[110px] py-2"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </Select>
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            >
              Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            >
              Next
            </Button>
          </div>
        </div>

        {error ? (
          <InlineMessage variant="danger" className="mt-4">
            {error}
          </InlineMessage>
        ) : null}
      </CardContent>

      <GitlabConnectModal
        open={isConnectOpen}
        onClose={() => setIsConnectOpen(false)}
      />
    </Card>
  );
}

function GitlabConnectPrompt({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex h-full flex-col justify-between gap-3 rounded-xl border border-dashed border-sky-300/70 bg-gradient-to-br from-sky-50/70 via-white to-white px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-sky-200">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path d="M12 21 3 12l2.3-7.1h3l2.4 7.1H13l2.4-7.1h3L20.9 12 12 21z" fill="#FC6D26" />
            <path d="M12 21 8.7 12H15.3L12 21z" fill="#E24329" />
            <path d="M12 21 3 12h5.7L12 21z" fill="#FCA326" />
            <path d="m3 12 2.3-7.1L8.7 12H3z" fill="#E24329" />
            <path d="M12 21 21 12h-5.7L12 21z" fill="#FCA326" />
            <path d="m21 12-2.3-7.1L15.3 12H21z" fill="#E24329" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-slate-800">
            Connect GitLab to filter by project & author
          </div>
          <div className="mt-0.5 text-[11px] leading-snug text-slate-500">
            Your projects and their authors will load automatically once connected.
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={onConnect}
          leftIcon={
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          }
        >
          Connect GitLab
        </Button>
      </div>
    </div>
  );
}
