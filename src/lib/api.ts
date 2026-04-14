"use client";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export function getApiBaseUrl() {
  return apiBaseUrl;
}

export async function apiFetch<T>(
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    token?: string | null;
    signal?: AbortSignal;
  }
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl}${path}`, {
      method: options?.method ?? "GET",
      headers: {
        "content-type": "application/json",
        ...(options?.token ? { authorization: `Bearer ${options.token}` } : {})
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: options?.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TypeError") {
      throw new Error("network_error");
    }
    throw error;
  }

  if (!res.ok) {
    let message = "request_failed";
    try {
      const body = (await res.json()) as unknown;
      if (body && typeof body === "object" && "error" in body) {
        const err = (body as { error?: unknown }).error;
        if (typeof err === "string") message = err;
      }
    } catch {}
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options?: { token?: string | null; signal?: AbortSignal }
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: options?.token ? { authorization: `Bearer ${options.token}` } : undefined,
      body: formData,
      signal: options?.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TypeError") {
      throw new Error("network_error");
    }
    throw error;
  }

  if (!res.ok) {
    let message = res.status === 401 ? "unauthorized" : res.status === 413 ? "image_too_large" : "upload_failed";
    try {
      const body = (await res.json()) as unknown;
      if (body && typeof body === "object" && "error" in body) {
        const err = (body as { error?: unknown }).error;
        if (typeof err === "string") message = err;
      }
    } catch {}
    throw new Error(message);
  }

  return (await res.json()) as T;
}
