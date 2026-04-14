"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Project, UpdateRow } from "@/types/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/Card";
import { Field, InlineMessage } from "@/components/ui/Field";
import { Select, TextInput } from "@/components/ui/Inputs";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EditUpdateModal } from "@/components/EditUpdateModal";
import { cn } from "@/lib/cn";

type SortBy = "createdAt" | "hours" | "title";
type SortDir = "asc" | "desc";

/* ── CSV helpers ───────────────────────────────────────── */

function toCsv(rows: UpdateRow[]) {
  const header = [
    "createdAt",
    "projectName",
    "authorName",
    "title",
    "hours",
    "riskDetected",
    "riskKeywords",
    "enrichedBody",
    "nextPlan",
    "blockers"
  ];
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return `"${s.replaceAll('"', '""')}"`;
  };
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.createdAt,
        r.projectName,
        r.authorName,
        r.title,
        r.hours,
        r.riskDetected,
        r.riskKeywords.join("|"),
        r.enrichedBody,
        r.nextPlan,
        r.blockers
      ].map(escape).join(",")
    );
  }
  return lines.join("\n");
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Markdown / formatting helpers ─────────────────────── */

function extractImages(markdown: string): { alt: string; url: string }[] {
  const results: { alt: string; url: string }[] = [];
  const re = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(markdown))) {
    const alt = match[1] || "image";
    const url = match[2] || "";
    if (url) results.push({ alt, url });
  }
  return results;
}

function stripImages(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderInline(text: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1] !== undefined && match[2] !== undefined) {
      nodes.push(
        <a
          key={`a-${nodes.length}`}
          href={match[2]}
          target="_blank"
          rel="noreferrer"
          className="text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
        >
          {match[1]}
        </a>
      );
    } else if (match[3] !== undefined) {
      nodes.push(<strong key={`b-${nodes.length}`} className="font-semibold text-slate-800">{match[3]}</strong>);
    } else if (match[4] !== undefined) {
      nodes.push(<em key={`i-${nodes.length}`} className="italic">{match[4]}</em>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</>;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  };
}

/* ── Rich body renderer ────────────────────────────────── */

function RichBody({ text }: { text: string }) {
  if (!text) return null;
  const paragraphs = text.split(/\n+/).filter((p) => p.trim());
  return (
    <div className="space-y-1">
      {paragraphs.map((p, i) => (
        <p key={i} className="leading-relaxed">
          {renderInline(p)}
        </p>
      ))}
    </div>
  );
}

/* ── Image components ──────────────────────────────────── */

function Thumbnail({ src, alt, onClick }: { src: string; alt: string; onClick: () => void }) {
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

function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
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
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── Sort arrow icon ───────────────────────────────────── */

function SortIcon({ dir }: { dir: SortDir | null }) {
  if (!dir) return null;
  return (
    <svg className="ml-1 inline h-3 w-3 text-indigo-500" viewBox="0 0 12 12" fill="currentColor">
      {dir === "asc" ? <path d="M6 2L10 8H2L6 2Z" /> : <path d="M6 10L2 4H10L6 10Z" />}
    </svg>
  );
}

/* ── Stat card ─────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon,
  accent,
  trailing
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/85 p-5 backdrop-blur-xl shadow-[0_1px_3px_rgba(15,23,42,0.04),0_16px_40px_-22px_rgba(30,27,75,0.2)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_1px_3px_rgba(15,23,42,0.05),0_24px_48px_-22px_rgba(79,70,229,0.35)]">
      <div
        aria-hidden
        className={`absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${accent} opacity-[0.08] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.16]`}
      />
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white shadow-sm`}>
              {icon}
            </span>
            {label}
          </div>
          <div className="mt-3 text-[28px] font-bold tracking-tight text-slate-900">
            {value}
          </div>
        </div>
        {trailing}
      </div>
    </div>
  );
}

/* ── Page wrapper ──────────────────────────────────────── */

export default function DashboardPage() {
  return (
    <RequireAuth allow={["DEV", "TL", "PM", "AM"]}>
      <DashboardInner />
    </RequireAuth>
  );
}

/* ── Dashboard ─────────────────────────────────────────── */

function DashboardInner() {
  const { accessToken, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<UpdateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [projectId, setProjectId] = useState<string>("");
  const [authorId, setAuthorId] = useState<string>("");
  const [riskOnly, setRiskOnly] = useState<boolean>(false);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UpdateRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<UpdateRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<{ projects: Project[] }>("/api/projects", { token: accessToken })
      .then((res) => setProjects(res.projects))
      .catch(() => setProjects([]));
  }, [accessToken]);

  const authors = useMemo(() => {
    const map = new Map<string, string>();
    for (const it of items) map.set(it.authorId, it.authorName);
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [items]);

  useEffect(() => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    if (projectId) params.set("projectId", projectId);
    if (authorId) params.set("authorId", authorId);
    if (riskOnly) params.set("risk", "true");
    if (q.trim()) params.set("q", q.trim());
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());

    apiFetch<{ items: UpdateRow[]; total: number; page: number; pageSize: number }>(
      `/api/updates?${params.toString()}`,
      { token: accessToken }
    )
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "load_failed"))
      .finally(() => setIsLoading(false));
  }, [accessToken, authorId, from, page, pageSize, projectId, q, refreshKey, riskOnly, sortBy, sortDir, to]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const title =
    user?.role === "DEV" ? "My Updates" : user?.role === "TL" ? "Squad Dashboard" : "Manager Dashboard";

  const riskCount = useMemo(() => items.filter((i) => i.riskDetected).length, [items]);

  const toggleSort = (key: SortBy) => {
    if (sortBy !== key) {
      setSortBy(key);
      setSortDir("desc");
      return;
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  const handleFeedback = (updateId: string, feedback: "up" | "down") => {
    if (!accessToken) return;
    setItems((prev) =>
      prev.map((u) =>
        u.id === updateId
          ? { ...u, feedbackUp: u.feedbackUp + (feedback === "up" ? 1 : 0), feedbackDown: u.feedbackDown + (feedback === "down" ? 1 : 0) }
          : u
      )
    );
    apiFetch(`/api/updates/${updateId}/feedback`, {
      method: "POST",
      token: accessToken,
      body: { feedback }
    }).catch(() => {
      setItems((prev) =>
        prev.map((u) =>
          u.id === updateId
            ? { ...u, feedbackUp: u.feedbackUp - (feedback === "up" ? 1 : 0), feedbackDown: u.feedbackDown - (feedback === "down" ? 1 : 0) }
            : u
        )
      );
    });
  };

  const canModify = useCallback(
    (row: UpdateRow) => {
      if (!user) return false;
      if (user.role === "PM" || user.role === "TL") return true;
      return row.authorId === user.id;
    },
    [user]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget || !accessToken) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/updates/${deleteTarget.id}`, {
        method: "DELETE",
        token: accessToken
      });
      setItems((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setTotal((prev) => prev - 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete_failed");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, accessToken]);

  const handleEditSave = useCallback(
    async (id: string, payload: Record<string, unknown>) => {
      if (!accessToken) return;
      setIsSaving(true);
      try {
        await apiFetch(`/api/updates/${id}`, {
          method: "PUT",
          token: accessToken,
          body: payload
        });
        setEditTarget(null);
        setRefreshKey((k) => k + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "update_failed");
      } finally {
        setIsSaving(false);
      }
    },
    [accessToken]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12 animate-fade-in-up">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="brand">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 13h7V4H4v9zm9 7h7V11h-7v9zM4 20h7v-5H4v5zm9-9h7V4h-7v7z" />
            </svg>
            Dashboard
          </Badge>
          <CardTitle className="mt-3 text-[28px] sm:text-[32px]">
            <span className="gradient-text">{title}</span>
          </CardTitle>
          <CardDescription className="max-w-xl">
            Filter, search, and export updates with minimal effort. Everything you need, always up to date.
          </CardDescription>
        </div>
        <Button
          variant="secondary"
          onClick={() => download("updates.csv", toCsv(items))}
          leftIcon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          }
        >
          Export CSV
        </Button>
      </div>

      {/* ── Summary cards ── */}
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total visible"
          value={total}
          accent="from-indigo-500 to-violet-500"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
          }
        />
        <StatCard
          label="On this page"
          value={items.length}
          accent="from-violet-500 to-fuchsia-500"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
            </svg>
          }
        />
        <StatCard
          label="At Risk"
          value={riskCount}
          accent={riskCount > 0 ? "from-rose-500 to-orange-500" : "from-emerald-500 to-cyan-500"}
          trailing={
            riskCount > 0 ? <Badge variant="danger">Needs review</Badge> : <Badge variant="success">All clear</Badge>
          }
          icon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        />
      </div>

      {/* ── Filters ── */}
      <Card className="mt-5">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-12">
            <div className="md:col-span-4">
              <Field label="Search" hint="Title or body">
                <TextInput
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search updates..."
                />
              </Field>
            </div>

            <div className="md:col-span-3">
              <Field label="Project">
                <Select
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="md:col-span-3">
              <Field label="Author">
                <Select
                  value={authorId}
                  onChange={(e) => {
                    setAuthorId(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
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
                  value={riskOnly ? "true" : ""}
                  onChange={(e) => {
                    setRiskOnly(e.target.value === "true");
                    setPage(1);
                  }}
                >
                  <option value="">All</option>
                  <option value="true">At Risk only</option>
                </Select>
              </Field>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-12">
            <div className="md:col-span-3">
              <Field label="From">
                <TextInput
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPage(1);
                  }}
                />
              </Field>
            </div>
            <div className="md:col-span-3">
              <Field label="To">
                <TextInput
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(1);
                  }}
                />
              </Field>
            </div>
            <div className="md:col-span-6 md:flex md:items-end md:justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQ("");
                  setProjectId("");
                  setAuthorId("");
                  setRiskOnly(false);
                  setFrom("");
                  setTo("");
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            </div>
          </div>

          {/* ── Pagination bar ── */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-xs text-slate-600">
              Page <span className="font-semibold text-slate-800">{page}</span> of{" "}
              <span className="font-semibold text-slate-800">{totalPages}</span>
              <span className="mx-2 text-slate-300">|</span>
              Showing <span className="font-semibold text-slate-800">{items.length}</span> of{" "}
              <span className="font-semibold text-slate-800">{total}</span>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={String(pageSize)}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="w-[110px] py-2"
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}/page
                  </option>
                ))}
              </Select>
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

      {/* ── Data table ── */}
      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/85 backdrop-blur-xl shadow-[0_1px_3px_rgba(15,23,42,0.04),0_18px_40px_-22px_rgba(30,27,75,0.22)]">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200/70 bg-slate-50/90 backdrop-blur text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3.5">
                <button type="button" onClick={() => toggleSort("createdAt")} className="inline-flex items-center hover:text-slate-900">
                  Date <SortIcon dir={sortBy === "createdAt" ? sortDir : null} />
                </button>
              </th>
              <th className="px-5 py-3.5">Project</th>
              <th className="px-5 py-3.5">Author</th>
              <th className="px-5 py-3.5">
                <button type="button" onClick={() => toggleSort("title")} className="inline-flex items-center hover:text-slate-900">
                  Title <SortIcon dir={sortBy === "title" ? sortDir : null} />
                </button>
              </th>
              <th className="px-5 py-3.5 text-center">
                <button type="button" onClick={() => toggleSort("hours")} className="inline-flex items-center hover:text-slate-900">
                  Hours <SortIcon dir={sortBy === "hours" ? sortDir : null} />
                </button>
              </th>
              <th className="px-5 py-3.5 text-center">Risk</th>
              <th className="px-5 py-3.5 text-center">Feedback</th>
              <th className="px-5 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                    </svg>
                    Loading updates...
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-500">
                  No updates found.
                </td>
              </tr>
            ) : (
              items.map((u) => {
                const images = extractImages(u.enrichedBody);
                const bodyText = stripImages(u.enrichedBody);
                const { date, time } = formatDate(u.createdAt);

                return (
                  <tr key={u.id} className="group align-top transition-colors hover:bg-slate-50/60">
                    {/* Date */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-700">{date}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{time}</div>
                    </td>

                    {/* Project */}
                    <td className="px-5 py-4">
                      <Badge variant="neutral">{u.projectName}</Badge>
                    </td>

                    {/* Author */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-bold text-slate-600">
                          {u.authorName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{u.authorName}</span>
                      </div>
                    </td>

                    {/* Content */}
                    <td className="max-w-lg px-5 py-4">
                      <div className="text-sm font-semibold text-slate-900">{u.title}</div>

                      {bodyText && (
                        <div className="mt-2 text-xs leading-relaxed text-slate-500">
                          <RichBody text={bodyText} />
                        </div>
                      )}

                      {images.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {images.map((img, idx) => (
                            <Thumbnail
                              key={idx}
                              src={img.url}
                              alt={img.alt}
                              onClick={() => setLightboxUrl(img.url)}
                            />
                          ))}
                        </div>
                      )}

                      {u.nextPlan && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                          <svg
                            className="mt-0.5 h-3 w-3 shrink-0 text-slate-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                          <div className="text-xs">
                            <span className="font-semibold text-slate-500">Next: </span>
                            <span className="text-slate-600">{u.nextPlan}</span>
                          </div>
                        </div>
                      )}

                      {u.blockers && (
                        <Badge variant="warning" className="mt-2">Blockers</Badge>
                      )}
                    </td>

                    {/* Hours */}
                    <td className="px-5 py-4 text-center">
                      <span className="text-lg font-bold text-slate-900">{u.hours}</span>
                      <span className="ml-0.5 text-xs text-slate-400">h</span>
                    </td>

                    {/* Risk */}
                    <td className="px-5 py-4 text-center">
                      {u.riskDetected ? (
                        <span className="relative inline-flex">
                          <Badge variant="danger" className="cursor-help" title={u.riskKeywords.join(", ")}>
                            At Risk
                          </Badge>
                          {u.riskKeywords.length > 0 && (
                            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-left text-xs text-slate-700 shadow-xl shadow-slate-900/10 group-hover:block">
                              <div className="font-semibold text-slate-900">Risk keywords</div>
                              <div className="mt-1 text-slate-500">{u.riskKeywords.join(", ")}</div>
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">&mdash;</span>
                      )}
                    </td>

                    {/* Feedback */}
                    <td className="px-5 py-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleFeedback(u.id, "up")}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 19V5M5 12l7-7 7 7" />
                          </svg>
                          {u.feedbackUp}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFeedback(u.id, "down")}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12l7 7 7-7" />
                          </svg>
                          {u.feedbackDown}
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-center">
                      {canModify(u) && (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditTarget(u)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                            title="Edit update"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h8M16.5 3.5l4 4L8 20H4v-4L16.5 3.5z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(u)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                            title="Delete update"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Image lightbox ── */}
      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      {/* ── Edit modal ── */}
      <EditUpdateModal
        open={editTarget !== null}
        update={editTarget}
        projects={projects}
        isSaving={isSaving}
        onSave={handleEditSave}
        onCancel={() => setEditTarget(null)}
      />

      {/* ── Delete confirmation ── */}
      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete Update"
        description={
          deleteTarget
            ? `"${deleteTarget.title}" by ${deleteTarget.authorName} will be permanently removed.`
            : undefined
        }
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
