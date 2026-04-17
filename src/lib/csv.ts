import type { UpdateRow } from "@/types/shared";

const HEADERS = [
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
] as const;

function escape(v: unknown): string {
  const s = String(v ?? "");
  return `"${s.replaceAll('"', '""')}"`;
}

export function toCsv(rows: UpdateRow[]): string {
  const lines = [HEADERS.join(",")];
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
      ]
        .map(escape)
        .join(",")
    );
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, rows: UpdateRow[]): void {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
