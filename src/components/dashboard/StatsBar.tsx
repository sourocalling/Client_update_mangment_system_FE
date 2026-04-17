"use client";

import { Badge } from "@/components/ui/Badge";

/* ── Single stat card ─────────────────────────────────────────── */

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
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white shadow-sm`}
            >
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

/* ── Stats bar (3 cards) ──────────────────────────────────────── */

export function StatsBar({
  total,
  pageCount,
  riskCount
}: {
  total: number;
  pageCount: number;
  riskCount: number;
}) {
  return (
    <div className="mt-7 grid gap-4 sm:grid-cols-3">
      <StatCard
        label="Total visible"
        value={total}
        accent="from-sky-500 to-sky-600"
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          </svg>
        }
      />
      <StatCard
        label="On this page"
        value={pageCount}
        accent="from-cyan-500 to-sky-500"
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
          riskCount > 0 ? (
            <Badge variant="danger">Needs review</Badge>
          ) : (
            <Badge variant="success">All clear</Badge>
          )
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
  );
}
