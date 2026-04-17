"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { Field, InlineMessage } from "@/components/ui/Field";
import { TextInput, Select } from "@/components/ui/Inputs";
import { Button } from "@/components/ui/Button";
import { GitlabProjectPicker } from "@/components/GitlabProjectPicker";
import type { Filters } from "@/hooks/useUpdates";
import type { Project } from "@/types/shared";
import { cn } from "@/lib/cn";

export function FilterPanel({
  filters,
  onFilterChange,
  onClear,
  projects,
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
  projects: Project[];
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

          {/* ── Project filter ──────────────────────────────── */}
          <div className="md:col-span-3">
            <Field
              label="Project"
              hint={gitlabConnected ? "GitLab" : undefined}
            >
              {gitlabConnected ? (
                <div className="relative">
                  <GitlabProjectPicker
                    value={filters.projectId}
                    onChange={(v) => onFilterChange("projectId", v)}
                    gitlabUrl={gitlabUrl}
                    gitlabToken={gitlabToken}
                    placeholder="All projects"
                  />
                  {/* Clear button when a project is selected */}
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
              ) : (
                <Select
                  value={filters.projectId}
                  onChange={(e) => onFilterChange("projectId", e.target.value)}
                >
                  <option value="">All</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              )}
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
    </Card>
  );
}
