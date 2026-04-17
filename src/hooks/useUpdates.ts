"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useDebouncedValue } from "./useDebouncedValue";
import type { Project, UpdateRow } from "@/types/shared";

/* ── Types ────────────────────────────────────────────────────── */

export type SortBy = "createdAt" | "hours" | "title";
export type SortDir = "asc" | "desc";

export type Filters = {
  q: string;
  projectId: string;
  authorId: string;
  riskOnly: boolean;
  from: string;
  to: string;
};

const EMPTY_FILTERS: Filters = {
  q: "",
  projectId: "",
  authorId: "",
  riskOnly: false,
  from: "",
  to: ""
};

/* ── Hook ─────────────────────────────────────────────────────── */

export function useUpdates(accessToken: string | null) {
  /* filters */
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const debouncedQ = useDebouncedValue(filters.q, 300);

  /* pagination */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  /* sort */
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  /* data */
  const [items, setItems] = useState<UpdateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  /* projects */
  const [projects, setProjects] = useState<Project[]>([]);

  /* authors — accumulate across all pages so the filter stays populated */
  const [authorMap, setAuthorMap] = useState<Map<string, string>>(() => new Map());

  /* ── Derived ─────────────────────────────────────────────── */

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const riskCount = useMemo(() => items.filter((i) => i.riskDetected).length, [items]);

  // Accumulate authors from each fetched page
  useEffect(() => {
    if (items.length === 0) return;
    setAuthorMap((prev) => {
      const next = new Map(prev);
      let changed = false;
      for (const it of items) {
        if (!next.has(it.authorId)) {
          next.set(it.authorId, it.authorName);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [items]);

  const authors = useMemo(
    () => Array.from(authorMap.entries()).sort((a, b) => a[1].localeCompare(b[1])),
    [authorMap]
  );

  /* ── Setters ─────────────────────────────────────────────── */

  const setFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }, []);

  const changePageSize = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const toggleSort = useCallback(
    (key: SortBy) => {
      if (sortBy !== key) {
        setSortBy(key);
        setSortDir("desc");
      } else {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      }
    },
    [sortBy]
  );

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  /* ── Load projects ───────────────────────────────────────── */

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<{ projects: Project[] }>("/api/projects", { token: accessToken })
      .then((res) => setProjects(res.projects))
      .catch(() => setProjects([]));
  }, [accessToken]);

  /* ── Load updates ────────────────────────────────────────── */

  useEffect(() => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    if (filters.projectId) params.set("projectId", filters.projectId);
    if (filters.authorId) params.set("authorId", filters.authorId);
    if (filters.riskOnly) params.set("risk", "true");
    if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
    if (filters.from) params.set("from", new Date(filters.from).toISOString());
    if (filters.to) params.set("to", new Date(filters.to).toISOString());

    const controller = new AbortController();
    apiFetch<{
      items: UpdateRow[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/api/updates?${params.toString()}`, {
      token: accessToken,
      signal: controller.signal
    })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((e) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "load_failed");
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [
    accessToken,
    page,
    pageSize,
    sortBy,
    sortDir,
    filters.projectId,
    filters.authorId,
    filters.riskOnly,
    debouncedQ,
    filters.from,
    filters.to,
    refreshKey
  ]);

  return {
    /* data */
    items,
    setItems,
    total,
    isLoading,
    error,
    setError,
    projects,
    /* derived */
    authors,
    riskCount,
    totalPages,
    /* filters */
    filters,
    setFilter,
    clearFilters,
    /* pagination */
    page,
    setPage,
    pageSize,
    changePageSize,
    /* sort */
    sortBy,
    sortDir,
    toggleSort,
    /* actions */
    refresh
  };
}
