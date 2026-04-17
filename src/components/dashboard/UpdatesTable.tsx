"use client";

import { Fragment, memo, useCallback } from "react";
import type { UpdateRow } from "@/types/shared";
import type { SortBy, SortDir } from "@/hooks/useUpdates";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { isSafeUrl } from "@/lib/sanitize";
import { Thumbnail } from "./ImageLightbox";

/* ── Helpers ──────────────────────────────────────────────────── */

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

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  };
}

function renderInline(text: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1] !== undefined && match[2] !== undefined) {
      if (isSafeUrl(match[2])) {
        nodes.push(
          <a
            key={`a-${nodes.length}`}
            href={match[2]}
            target="_blank"
            rel="noreferrer noopener"
            className="text-sky-700 underline underline-offset-2 hover:text-sky-800"
          >
            {match[1]}
          </a>
        );
      } else {
        nodes.push(match[1]);
      }
    } else if (match[3] !== undefined) {
      nodes.push(
        <strong key={`b-${nodes.length}`} className="font-semibold text-slate-800">
          {match[3]}
        </strong>
      );
    } else if (match[4] !== undefined) {
      nodes.push(
        <em key={`i-${nodes.length}`} className="italic">
          {match[4]}
        </em>
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return (
    <>
      {nodes.map((n, i) => (
        <Fragment key={i}>{n}</Fragment>
      ))}
    </>
  );
}

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

function SortIcon({ dir }: { dir: SortDir | null }) {
  if (!dir) return null;
  return (
    <svg className="ml-1 inline h-3 w-3 text-sky-600" viewBox="0 0 12 12" fill="currentColor">
      {dir === "asc" ? <path d="M6 2L10 8H2L6 2Z" /> : <path d="M6 10L2 4H10L6 10Z" />}
    </svg>
  );
}

/* ── Single row (memoized) ────────────────────────────────────── */

const UpdateTableRow = memo(function UpdateTableRow({
  item,
  canModify,
  onFeedback,
  onEdit,
  onDelete,
  onImageClick
}: {
  item: UpdateRow;
  canModify: boolean;
  onFeedback: (id: string, dir: "up" | "down") => void;
  onEdit: (item: UpdateRow) => void;
  onDelete: (item: UpdateRow) => void;
  onImageClick: (url: string) => void;
}) {
  const images = extractImages(item.enrichedBody);
  const bodyText = stripImages(item.enrichedBody);
  const { date, time } = formatDate(item.createdAt);

  return (
    <tr className="group align-top transition-colors hover:bg-slate-50/60">
      {/* Date */}
      <td className="px-5 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-slate-700">{date}</div>
        <div className="mt-0.5 text-xs text-slate-400">{time}</div>
      </td>

      {/* Project */}
      <td className="px-5 py-4">
        <Badge variant="neutral">{item.projectName}</Badge>
      </td>

      {/* Author */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-bold text-slate-600">
            {item.authorName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-slate-700">{item.authorName}</span>
        </div>
      </td>

      {/* Content */}
      <td className="max-w-lg px-5 py-4">
        <div className="text-sm font-semibold text-slate-900">{item.title}</div>

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
                onClick={() => onImageClick(img.url)}
              />
            ))}
          </div>
        )}

        {item.nextPlan && (
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
              <span className="text-slate-600">{item.nextPlan}</span>
            </div>
          </div>
        )}

        {item.blockers && <Badge variant="warning" className="mt-2">Blockers</Badge>}
      </td>

      {/* Hours */}
      <td className="px-5 py-4 text-center">
        <span className="text-lg font-bold text-slate-900">{item.hours}</span>
        <span className="ml-0.5 text-xs text-slate-400">h</span>
      </td>

      {/* Risk */}
      <td className="px-5 py-4 text-center">
        {item.riskDetected ? (
          <span className="relative inline-flex">
            <Badge variant="danger" className="cursor-help" title={item.riskKeywords.join(", ")}>
              At Risk
            </Badge>
            {item.riskKeywords.length > 0 && (
              <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-left text-xs text-slate-700 shadow-xl shadow-slate-900/10 group-hover:block">
                <div className="font-semibold text-slate-900">Risk keywords</div>
                <div className="mt-1 text-slate-500">{item.riskKeywords.join(", ")}</div>
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
            onClick={() => onFeedback(item.id, "up")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
            {item.feedbackUp}
          </button>
          <button
            type="button"
            onClick={() => onFeedback(item.id, "down")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
            {item.feedbackDown}
          </button>
        </div>
      </td>

      {/* Actions */}
      <td className="px-5 py-4 text-center">
        {canModify && (
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(item)}
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
              onClick={() => onDelete(item)}
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
});

/* ── Table ────────────────────────────────────────────────────── */

export function UpdatesTable({
  items,
  isLoading,
  sortBy,
  sortDir,
  onToggleSort,
  canModify,
  onFeedback,
  onEdit,
  onDelete,
  onImageClick
}: {
  items: UpdateRow[];
  isLoading: boolean;
  sortBy: SortBy;
  sortDir: SortDir;
  onToggleSort: (key: SortBy) => void;
  canModify: (row: UpdateRow) => boolean;
  onFeedback: (id: string, dir: "up" | "down") => void;
  onEdit: (item: UpdateRow) => void;
  onDelete: (item: UpdateRow) => void;
  onImageClick: (url: string) => void;
}) {
  const sortIconFor = useCallback(
    (key: SortBy) => (sortBy === key ? sortDir : null),
    [sortBy, sortDir]
  );

  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/85 backdrop-blur-xl shadow-[0_1px_3px_rgba(15,23,42,0.04),0_18px_40px_-22px_rgba(30,27,75,0.22)]">
      <table className="min-w-full text-left text-sm">
        <thead className="sticky top-0 z-10 border-b border-slate-200/70 bg-slate-50/90 backdrop-blur text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-5 py-3.5">
              <button type="button" onClick={() => onToggleSort("createdAt")} className="inline-flex items-center hover:text-slate-900">
                Date <SortIcon dir={sortIconFor("createdAt")} />
              </button>
            </th>
            <th className="px-5 py-3.5">Project</th>
            <th className="px-5 py-3.5">Author</th>
            <th className="px-5 py-3.5">
              <button type="button" onClick={() => onToggleSort("title")} className="inline-flex items-center hover:text-slate-900">
                Title <SortIcon dir={sortIconFor("title")} />
              </button>
            </th>
            <th className="px-5 py-3.5 text-center">
              <button type="button" onClick={() => onToggleSort("hours")} className="inline-flex items-center hover:text-slate-900">
                Hours <SortIcon dir={sortIconFor("hours")} />
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
            items.map((u) => (
              <UpdateTableRow
                key={u.id}
                item={u}
                canModify={canModify(u)}
                onFeedback={onFeedback}
                onEdit={onEdit}
                onDelete={onDelete}
                onImageClick={onImageClick}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
