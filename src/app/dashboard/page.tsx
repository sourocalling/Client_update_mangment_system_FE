"use client";

import { useCallback, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { apiFetch } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { useAuth } from "@/lib/auth";
import { useGitlabConnection } from "@/lib/gitlab";
import { useUpdates } from "@/hooks/useUpdates";
import type { UpdateRow } from "@/types/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardDescription, CardTitle } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EditUpdateModal } from "@/components/EditUpdateModal";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { FilterPanel } from "@/components/dashboard/FilterPanel";
import { UpdatesTable } from "@/components/dashboard/UpdatesTable";
import { ImageLightbox } from "@/components/dashboard/ImageLightbox";

export default function DashboardPage() {
  return (
    <RequireAuth allow={["DEV", "TL", "PM", "AM"]}>
      <DashboardInner />
    </RequireAuth>
  );
}

function DashboardInner() {
  const { accessToken, user } = useAuth();
  const { connection: gitlab } = useGitlabConnection();
  const data = useUpdates(accessToken);

  /* ── Local UI state ─────────────────────────────────────────── */

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UpdateRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<UpdateRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /* ── Derived ────────────────────────────────────────────────── */

  const title =
    user?.role === "DEV"
      ? "My Updates"
      : user?.role === "TL"
        ? "Squad Dashboard"
        : "Manager Dashboard";

  /* ── Handlers ───────────────────────────────────────────────── */

  const canModify = useCallback(
    (row: UpdateRow) => {
      if (!user) return false;
      if (user.role === "PM" || user.role === "TL") return true;
      return row.authorId === user.id;
    },
    [user]
  );

  const handleFeedback = useCallback(
    (updateId: string, feedback: "up" | "down") => {
      if (!accessToken) return;
      // Optimistic update
      data.setItems((prev) =>
        prev.map((u) =>
          u.id === updateId
            ? {
                ...u,
                feedbackUp: u.feedbackUp + (feedback === "up" ? 1 : 0),
                feedbackDown: u.feedbackDown + (feedback === "down" ? 1 : 0)
              }
            : u
        )
      );
      apiFetch(`/api/updates/${updateId}/feedback`, {
        method: "POST",
        token: accessToken,
        body: { feedback }
      }).catch(() => {
        // Rollback
        data.setItems((prev) =>
          prev.map((u) =>
            u.id === updateId
              ? {
                  ...u,
                  feedbackUp: u.feedbackUp - (feedback === "up" ? 1 : 0),
                  feedbackDown: u.feedbackDown - (feedback === "down" ? 1 : 0)
                }
              : u
          )
        );
      });
    },
    [accessToken, data]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget || !accessToken) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/updates/${deleteTarget.id}`, {
        method: "DELETE",
        token: accessToken
      });
      data.setItems((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    } catch (e) {
      data.setError(e instanceof Error ? e.message : "delete_failed");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, accessToken, data]);

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
        data.refresh();
      } catch (e) {
        data.setError(e instanceof Error ? e.message : "update_failed");
      } finally {
        setIsSaving(false);
      }
    },
    [accessToken, data]
  );

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="brand">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 13h7V4H4v9zm9 7h7V11h-7v9zM4 20h7v-5H4v5zm9-9h7V4h-7v7z" />
            </svg>
            Dashboard
          </Badge>
          <CardTitle className="mt-3 text-[28px] sm:text-[32px]">
            <span className="text-slate-900">{title}</span>
          </CardTitle>
          <CardDescription className="max-w-xl">
            Filter, search, and export updates with minimal effort. Everything
            you need, always up to date.
          </CardDescription>
        </div>
        <Button
          variant="secondary"
          onClick={() => downloadCsv("updates.csv", data.items)}
          leftIcon={
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          }
        >
          Export CSV
        </Button>
      </div>

      <StatsBar
        total={data.total}
        pageCount={data.items.length}
        riskCount={data.riskCount}
      />

      <FilterPanel
        filters={data.filters}
        onFilterChange={data.setFilter}
        onClear={data.clearFilters}
        projects={data.projects}
        authors={data.authors}
        error={data.error}
        page={data.page}
        totalPages={data.totalPages}
        pageSize={data.pageSize}
        total={data.total}
        itemCount={data.items.length}
        onPageChange={data.setPage}
        onPageSizeChange={data.changePageSize}
        gitlabUrl={gitlab?.url ?? ""}
        gitlabToken={gitlab?.token ?? ""}
      />

      <UpdatesTable
        items={data.items}
        isLoading={data.isLoading}
        sortBy={data.sortBy}
        sortDir={data.sortDir}
        onToggleSort={data.toggleSort}
        canModify={canModify}
        onFeedback={handleFeedback}
        onEdit={setEditTarget}
        onDelete={setDeleteTarget}
        onImageClick={setLightboxUrl}
      />

      {/* Lightbox */}
      {lightboxUrl && (
        <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}

      {/* Edit modal */}
      <EditUpdateModal
        open={editTarget !== null}
        update={editTarget}
        projects={data.projects}
        isSaving={isSaving}
        onSave={handleEditSave}
        onCancel={() => setEditTarget(null)}
      />

      {/* Delete confirmation */}
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
