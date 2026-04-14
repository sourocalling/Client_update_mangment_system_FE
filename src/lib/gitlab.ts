"use client";

import { useCallback, useEffect, useState } from "react";

export type GitlabUser = {
  id: number;
  username: string;
  name: string;
  avatar_url: string;
  web_url: string;
  email?: string;
};

export type GitlabConnection = {
  url: string;
  token: string;
  user: GitlabUser;
};

const storageKey = "cums_gitlab_connection";
const connectionChangeEvent = "cums:gitlab-connection-change";

function normalizeGitlabUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (!trimmed) return "https://gitlab.webskitters.com";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export type GitlabProject = {
  id: number;
  name: string;
  name_with_namespace: string;
  path_with_namespace: string;
  web_url: string;
  description: string | null;
  last_activity_at: string;
  default_branch: string | null;
  star_count: number;
  avatar_url: string | null;
};

export type GitlabCommit = {
  id: string;
  short_id: string;
  title: string;
  message: string;
  author_name: string;
  author_email: string;
  authored_date: string;
  web_url: string;
};

export type GitlabBranch = {
  name: string;
  default: boolean;
  merged: boolean;
  protected: boolean;
};

function sanitizeToken(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/[\u200B-\u200D\uFEFF]/g, "");
}

async function readGitlabError(res: Response): Promise<string | null> {
  try {
    const body = (await res.clone().json()) as { message?: unknown; error?: unknown };
    const msg = body?.message ?? body?.error;
    if (typeof msg === "string" && msg.trim().length > 0) return msg;
  } catch {}
  return null;
}

async function gitlabFetch<T>(
  url: string,
  token: string,
  path: string,
  signal?: AbortSignal
): Promise<T> {
  const base = normalizeGitlabUrl(url);
  const cleanToken = sanitizeToken(token);

  if (!cleanToken) throw new Error("invalid_token");

  const doFetch = (headerMode: "private" | "bearer") =>
    fetch(`${base}${path}`, {
      method: "GET",
      headers:
        headerMode === "private"
          ? { "PRIVATE-TOKEN": cleanToken, accept: "application/json" }
          : { Authorization: `Bearer ${cleanToken}`, accept: "application/json" },
      signal
    });

  let res: Response;
  try {
    res = await doFetch("private");
    if (res.status === 401) {
      // GitLab accepts both header forms — retry in case the token type
      // prefers the Bearer flow (e.g. group/project tokens on some instances).
      const retry = await doFetch("bearer");
      if (retry.status !== 401) res = retry;
      else res = retry;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "TypeError") {
      throw new Error("network_error");
    }
    throw error;
  }

  if (res.status === 401) {
    const msg = await readGitlabError(res);
    if (msg) {
      const lower = msg.toLowerCase();
      if (lower.includes("expired")) throw new Error("token_expired");
      if (lower.includes("revoked")) throw new Error("token_revoked");
      throw new Error(`gitlab: ${msg}`);
    }
    throw new Error("invalid_token");
  }
  if (res.status === 403) {
    const msg = await readGitlabError(res);
    throw new Error(msg ? `gitlab: ${msg}` : "forbidden");
  }
  if (res.status === 404) throw new Error("unreachable");
  if (!res.ok) {
    const msg = await readGitlabError(res);
    throw new Error(msg ? `gitlab: ${msg}` : "gitlab_error");
  }

  return (await res.json()) as T;
}

export function fetchGitlabUser(
  url: string,
  token: string,
  signal?: AbortSignal
): Promise<GitlabUser> {
  return gitlabFetch<GitlabUser>(url, token, "/api/v4/user", signal);
}

async function fetchGitlabPage<T>(
  baseUrl: string,
  cleanToken: string,
  pathWithQuery: string,
  page: number,
  signal?: AbortSignal
): Promise<{ data: T[]; totalPages: number }> {
  const sep = pathWithQuery.includes("?") ? "&" : "?";
  const target = `${baseUrl}${pathWithQuery}${sep}page=${page}&per_page=100`;

  const doFetch = (mode: "private" | "bearer") =>
    fetch(target, {
      method: "GET",
      headers:
        mode === "private"
          ? { "PRIVATE-TOKEN": cleanToken, accept: "application/json" }
          : { Authorization: `Bearer ${cleanToken}`, accept: "application/json" },
      signal
    });

  let res: Response;
  try {
    res = await doFetch("private");
    if (res.status === 401) {
      const retry = await doFetch("bearer");
      res = retry;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "TypeError") {
      throw new Error("network_error");
    }
    throw error;
  }

  if (res.status === 401) {
    const msg = await readGitlabError(res);
    throw new Error(msg ? `gitlab: ${msg}` : "invalid_token");
  }
  if (res.status === 403) {
    const msg = await readGitlabError(res);
    throw new Error(msg ? `gitlab: ${msg}` : "forbidden");
  }
  if (res.status === 404) throw new Error("unreachable");
  if (!res.ok) {
    const msg = await readGitlabError(res);
    throw new Error(msg ? `gitlab: ${msg}` : "gitlab_error");
  }

  const data = (await res.json()) as T[];
  const totalHeader = res.headers.get("x-total-pages");
  const totalPages = Number(totalHeader ?? "1") || 1;
  return { data, totalPages };
}

const GITLAB_MAX_PROJECT_PAGES = 20; // ~2,000 projects cap

export async function fetchGitlabProjects(
  url: string,
  token: string,
  signal?: AbortSignal
): Promise<GitlabProject[]> {
  const base = normalizeGitlabUrl(url);
  const cleanToken = sanitizeToken(token);
  if (!cleanToken) throw new Error("invalid_token");

  const path =
    "/api/v4/projects?membership=true&simple=true&order_by=last_activity_at&sort=desc";

  const first = await fetchGitlabPage<GitlabProject>(base, cleanToken, path, 1, signal);
  if (first.totalPages <= 1) return first.data;

  const pagesToFetch = Math.min(first.totalPages, GITLAB_MAX_PROJECT_PAGES);
  const rest = await Promise.all(
    Array.from({ length: pagesToFetch - 1 }, (_, i) =>
      fetchGitlabPage<GitlabProject>(base, cleanToken, path, i + 2, signal)
    )
  );

  return [...first.data, ...rest.flatMap((p) => p.data)];
}

export async function fetchGitlabCommits(
  url: string,
  token: string,
  projectId: number,
  since: string,
  until: string,
  ref?: string | null,
  signal?: AbortSignal
): Promise<GitlabCommit[]> {
  const base = normalizeGitlabUrl(url);
  const cleanToken = sanitizeToken(token);
  if (!cleanToken) throw new Error("invalid_token");

  const params = new URLSearchParams({ since, until });
  if (ref) {
    params.set("ref_name", ref);
  } else {
    params.set("all", "true");
  }

  const path = `/api/v4/projects/${projectId}/repository/commits?${params.toString()}`;
  const { data } = await fetchGitlabPage<GitlabCommit>(base, cleanToken, path, 1, signal);
  return data;
}

export async function fetchGitlabBranches(
  url: string,
  token: string,
  projectId: number,
  signal?: AbortSignal
): Promise<GitlabBranch[]> {
  const base = normalizeGitlabUrl(url);
  const cleanToken = sanitizeToken(token);
  if (!cleanToken) throw new Error("invalid_token");

  const path = `/api/v4/projects/${projectId}/repository/branches`;

  const first = await fetchGitlabPage<GitlabBranch>(base, cleanToken, path, 1, signal);
  if (first.totalPages <= 1) return first.data;

  const pagesToFetch = Math.min(first.totalPages, 10); // 1,000 branches cap
  const rest = await Promise.all(
    Array.from({ length: pagesToFetch - 1 }, (_, i) =>
      fetchGitlabPage<GitlabBranch>(base, cleanToken, path, i + 2, signal)
    )
  );

  return [...first.data, ...rest.flatMap((p) => p.data)];
}

function readConnection(): GitlabConnection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as GitlabConnection) : null;
  } catch {
    return null;
  }
}

function broadcastConnectionChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(connectionChangeEvent));
}

export function useGitlabConnection() {
  const [connection, setConnection] = useState<GitlabConnection | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setConnection(readConnection());
    setIsReady(true);

    const sync = () => setConnection(readConnection());
    window.addEventListener(connectionChangeEvent, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(connectionChangeEvent, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const connect = useCallback(async (url: string, token: string) => {
    const normalized = normalizeGitlabUrl(url);
    const user = await fetchGitlabUser(normalized, token);
    const next: GitlabConnection = { url: normalized, token, user };
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setConnection(next);
    broadcastConnectionChange();
    return next;
  }, []);

  const disconnect = useCallback(() => {
    window.localStorage.removeItem(storageKey);
    setConnection(null);
    broadcastConnectionChange();
  }, []);

  return { connection, isReady, connect, disconnect };
}
