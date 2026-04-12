"use client";

import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Project, UpdateRow } from "@/types/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/Card";
import { Field, InlineMessage } from "@/components/ui/Field";
import { Select, TextInput } from "@/components/ui/Inputs";

type SortBy = "createdAt" | "hours" | "title";
type SortDir = "asc" | "desc";

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

export default function DashboardPage() {
  return (
    <RequireAuth allow={["DEV", "TL", "PM"]}>
      <DashboardInner />
    </RequireAuth>
  );
}

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
  }, [accessToken, authorId, from, page, pageSize, projectId, q, riskOnly, sortBy, sortDir, to]);

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="neutral">Dashboard</Badge>
          <CardTitle className="mt-3">{title}</CardTitle>
          <CardDescription>Filter, search, and export updates with minimal effort.</CardDescription>
        </div>
        <Button variant="secondary" onClick={() => download("updates.csv", toCsv(items))}>
          Export CSV
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="px-5 py-4">
            <div className="text-xs font-semibold text-slate-600">Total visible</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{total}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="px-5 py-4">
            <div className="text-xs font-semibold text-slate-600">On page</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{items.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="px-5 py-4">
            <div className="text-xs font-semibold text-slate-600">At Risk on page</div>
            <div className="mt-1 flex items-center gap-2">
              <div className="text-2xl font-semibold text-slate-900">{riskCount}</div>
              {riskCount > 0 ? <Badge variant="danger">At Risk</Badge> : <Badge variant="success">OK</Badge>}
            </div>
          </CardContent>
        </Card>
      </div>

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
                  placeholder="Search updates…"
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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-xs text-slate-600">
              Page <span className="font-semibold text-slate-800">{page}</span> of{" "}
              <span className="font-semibold text-slate-800">{totalPages}</span>
              <span className="mx-2 text-slate-300">•</span>
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

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-4 py-3">
                <button type="button" onClick={() => toggleSort("createdAt")} className="font-semibold hover:text-slate-900">
                  Date {sortBy === "createdAt" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
              </th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => toggleSort("title")} className="font-semibold hover:text-slate-900">
                  Title {sortBy === "title" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
              </th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => toggleSort("hours")} className="font-semibold hover:text-slate-900">
                  Hours {sortBy === "hours" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </button>
              </th>
              <th className="px-4 py-3">Risk</th>
              <th className="px-4 py-3">Feedback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-slate-600">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-slate-600">
                  No updates found.
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr key={u.id} className="group align-top transition hover:bg-slate-50/70">
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {new Date(u.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{u.projectName}</td>
                  <td className="px-4 py-3">{u.authorName}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{u.title}</div>
                    <div className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{u.enrichedBody}</div>
                    <div className="mt-2 text-xs text-slate-600">
                      <span className="font-medium">Next:</span> {u.nextPlan}
                      {u.blockers ? <span className="ml-2 rounded bg-amber-100 px-2 py-0.5">Blockers</span> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">{u.hours}</td>
                  <td className="px-4 py-3">
                    {u.riskDetected ? (
                      <span className="relative inline-flex">
                        <Badge
                          variant="danger"
                          className="cursor-help"
                          title={u.riskKeywords.join(", ")}
                        >
                          At Risk
                        </Badge>
                        {u.riskKeywords.length > 0 ? (
                          <span className="pointer-events-none absolute left-0 top-full z-10 mt-2 hidden w-64 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-lg shadow-slate-900/10 group-hover:block">
                            <div className="font-semibold text-slate-900">Risk keywords</div>
                            <div className="mt-1">{u.riskKeywords.join(", ")}</div>
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={() =>
                          accessToken
                            ? apiFetch(`/api/updates/${u.id}/feedback`, {
                                method: "POST",
                                token: accessToken,
                                body: { feedback: "up" }
                              }).catch(() => {})
                            : null
                        }
                        variant="secondary"
                        size="sm"
                      >
                        Up {u.feedbackUp}
                      </Button>
                      <Button
                        type="button"
                        onClick={() =>
                          accessToken
                            ? apiFetch(`/api/updates/${u.id}/feedback`, {
                                method: "POST",
                                token: accessToken,
                                body: { feedback: "down" }
                              }).catch(() => {})
                            : null
                        }
                        variant="secondary"
                        size="sm"
                      >
                        Down {u.feedbackDown}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
