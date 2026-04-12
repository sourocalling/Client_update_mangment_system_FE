"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EnhanceResponse } from "@/types/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function AiEnhanceDialog({
  open,
  token,
  body,
  onClose,
  onResult,
  onReplace,
  onInsert
}: {
  open: boolean;
  token: string;
  body: string;
  onClose: () => void;
  onResult: (result: EnhanceResponse) => void;
  onReplace: (enriched: string) => void;
  onInsert: (enriched: string) => void;
}) {
  const [mode, setMode] = useState<"grammar" | "style" | "expand">("style");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EnhanceResponse | null>(null);
  const [baseBody, setBaseBody] = useState("");

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const abortRef = useRef<AbortController | null>(null);
  const isLoadingRef = useRef(false);

  const run = useCallback(
    async (overrideBody?: string, overrideMode?: "grammar" | "style" | "expand") => {
      const requestBody = (overrideBody ?? baseBody).trim();
      const requestMode = overrideMode ?? mode;
      if (!requestBody) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (overrideBody !== undefined) setBaseBody(overrideBody);
      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);
      try {
        const resp = await fetch("/api/enhance", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body: requestBody, mode: requestMode }),
          signal: controller.signal
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "enhance_failed" }));
          throw new Error((err as { error?: string }).error ?? "enhance_failed");
        }
        const res = (await resp.json()) as EnhanceResponse;
        if (controller.signal.aborted) return;
        setResult(res);
        onResultRef.current(res);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "enhance_failed");
      } finally {
        if (controller.signal.aborted) return;
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [baseBody, mode, token]
  );

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      isLoadingRef.current = false;
      setIsLoading(false);
      return;
    }
    if (isLoadingRef.current) return;
    setResult(null);
    setError(null);
    setMode("style");
    setBaseBody(body);
    run(body, "style").catch(() => {});
  }, [open, body, run]);

  return (
    <Modal
      open={open}
      title="AI Suggestions"
      description="Review the proposed rewrite before applying it."
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Mode</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "grammar" | "style" | "expand")}
              className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="grammar">Grammar</option>
              <option value="style">Style</option>
              <option value="expand">Expand</option>
            </select>
            <Button
              variant="secondary"
              size="sm"
              isLoading={isLoading}
              disabled={!baseBody.trim()}
              onClick={() => run().catch(() => {})}
            >
              Run
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              disabled={!result}
              onClick={() => {
                if (!result) return;
                onInsert(result.enriched);
                onClose();
              }}
            >
              Insert below
            </Button>
            <Button
              variant="primary"
              disabled={!result}
              onClick={() => {
                if (!result) return;
                onReplace(result.enriched);
                onClose();
              }}
            >
              Replace
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4">
        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>
        ) : null}

        {result ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {result.risk ? <Badge variant="danger">At Risk</Badge> : <Badge variant="success">Looks good</Badge>}
              {result.inappropriate ? <Badge variant="warning">Language flagged</Badge> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-slate-700">Current</div>
                <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 whitespace-pre-wrap">
                  {baseBody}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-700">Suggested</div>
                <div className="mt-1 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 whitespace-pre-wrap">
                  {result.enriched}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-600">{isLoading ? "Generating suggestion…" : "No suggestion yet."}</div>
        )}
      </div>
    </Modal>
  );
}
