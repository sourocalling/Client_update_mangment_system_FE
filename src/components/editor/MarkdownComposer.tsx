"use client";

import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { InlineMessage } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { normalizeHttpUrl } from "./url";

export type MarkdownComposerImage = {
  name: string;
  url: string;
};

export function MarkdownComposer({
  value,
  onChange,
  placeholder,
  maxChars,
  onUploadImage,
  onDeleteImage,
  disabled
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  maxChars?: number;
  onUploadImage: (file: File) => Promise<{ url: string }>;
  onDeleteImage?: (url: string) => Promise<void>;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingUrls, setDeletingUrls] = useState<Set<string>>(() => new Set());
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [view, setView] = useState<"write" | "preview">("write");

  const length = value.length;
  const isOverLimit = typeof maxChars === "number" ? length > maxChars : false;

  const images = useMemo(() => extractImages(value), [value]);

  const applyChange = useCallback(
    (next: string) => {
      onChange(next);
    },
    [onChange]
  );

  const getSelection = () => {
    const el = ref.current;
    if (!el) return { start: 0, end: 0, selected: "" };
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    return { start, end, selected: el.value.slice(start, end) };
  };

  const setSelection = (start: number, end: number) => {
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, end);
    });
  };

  const wrapSelection = (prefix: string, suffix: string) => {
    const el = ref.current;
    if (!el) return;
    const { start, end, selected } = getSelection();
    const before = value.slice(0, start);
    const after = value.slice(end);
    const inner = selected.length > 0 ? selected : "text";
    const next = `${before}${prefix}${inner}${suffix}${after}`;
    applyChange(next);
    const cursorStart = start + prefix.length;
    const cursorEnd = cursorStart + inner.length;
    setSelection(cursorStart, cursorEnd);
  };

  const insertAtCursor = useCallback(
    (text: string) => {
      const el = ref.current;
      if (!el) return;
      const { start, end } = getSelection();
      const before = value.slice(0, start);
      const after = value.slice(end);
      const next = `${before}${text}${after}`;
      applyChange(next);
      const pos = start + text.length;
      setSelection(pos, pos);
    },
    [applyChange, value]
  );

  const prefixLines = (prefix: string) => {
    const el = ref.current;
    if (!el) return;
    const { start, end, selected } = getSelection();
    const target = selected.length > 0 ? selected : currentLine(value, start).text;
    const replaced = target
      .split("\n")
      .map((line) => (line.trim().length === 0 ? line : `${prefix}${line}`))
      .join("\n");

    if (selected.length > 0) {
      const before = value.slice(0, start);
      const after = value.slice(end);
      const next = `${before}${replaced}${after}`;
      applyChange(next);
      setSelection(start, start + replaced.length);
      return;
    }

    const line = currentLine(value, start);
    const before = value.slice(0, line.start);
    const after = value.slice(line.end);
    const next = `${before}${replaced}${after}`;
    applyChange(next);
    setSelection(line.start, line.start + replaced.length);
  };

  const openLink = () => {
    setUiError(null);
    setLinkUrl("");
    setIsLinkOpen(true);
  };

  const applyLink = () => {
    const normalized = normalizeHttpUrl(linkUrl);
    if (!normalized) {
      setUiError("invalid_url");
      return;
    }

    const el = ref.current;
    if (!el) return;
    const { start, end, selected } = getSelection();
    const linkText = selected.length > 0 ? selected : "link";
    const before = value.slice(0, start);
    const after = value.slice(end);
    const insertion = `[${linkText}](${normalized})`;
    const next = `${before}${insertion}${after}`;
    applyChange(next);
    const pos = start + insertion.length;
    setSelection(pos, pos);
    setIsLinkOpen(false);
  };

  const validateImageFile = (file: File) => {
    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) return "image_too_large";
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) return "image_type_not_allowed";
    return null;
  };

  const stripImageFromValue = useCallback(
    (url: string) => {
      const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`!\\[[^\\]]*\\]\\(${escaped}\\)`, "g");
      const next = value.replace(pattern, "").replace(/\n{3,}/g, "\n\n");
      applyChange(next);
    },
    [applyChange, value]
  );

  const removeImage = useCallback(
    async (url: string) => {
      setUiError(null);
      if (!onDeleteImage) {
        stripImageFromValue(url);
        return;
      }
      setDeletingUrls((prev) => {
        const next = new Set(prev);
        next.add(url);
        return next;
      });
      try {
        await onDeleteImage(url);
        stripImageFromValue(url);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "delete_failed";
        if (msg === "not_found" || msg === "forbidden") {
          stripImageFromValue(url);
        } else {
          setUiError(msg);
        }
      } finally {
        setDeletingUrls((prev) => {
          const next = new Set(prev);
          next.delete(url);
          return next;
        });
      }
    },
    [onDeleteImage, stripImageFromValue]
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) return;
      setUiError(null);
      setIsUploading(true);
      try {
        for (const file of imageFiles) {
          const err = validateImageFile(file);
          if (err) {
            setUiError(err);
            continue;
          }
          try {
            const result = await onUploadImage(file);
            insertAtCursor(`\n\n![${file.name}](${result.url})\n\n`);
          } catch (e) {
            setUiError(e instanceof Error ? e.message : "upload_failed");
          }
        }
      } finally {
        setIsUploading(false);
      }
    },
    [insertAtCursor, onUploadImage]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-1 inline-flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setView("write")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                view === "write" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
              )}
              aria-pressed={view === "write"}
              disabled={disabled}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setView("preview")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                view === "preview" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
              )}
              aria-pressed={view === "preview"}
              disabled={disabled}
            >
              Preview
            </button>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => wrapSelection("**", "**")} disabled={disabled}>
            Bold
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => wrapSelection("*", "*")} disabled={disabled}>
            Italic
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => prefixLines("- ")} disabled={disabled}>
            List
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => prefixLines("1. ")}
            disabled={disabled}
          >
            Numbered
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={openLink} disabled={disabled}>
            Link
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            isLoading={isUploading}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            Image
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            multiple
            onChange={(e) => uploadFiles(Array.from(e.target.files ?? [])).catch(() => {})}
          />
        </div>

        {typeof maxChars === "number" ? (
          <div className={cn("text-xs", isOverLimit ? "text-red-600" : "text-slate-500")}>
            {length}/{maxChars}
          </div>
        ) : null}
      </div>

      {uiError ? (
        <InlineMessage variant="warning">
          {uiError === "invalid_url"
            ? "Please enter a valid http(s) URL."
            : uiError === "image_too_large"
            ? "Image is too large (max 2MB)."
            : uiError === "image_type_not_allowed"
            ? "Unsupported image type. Use PNG, JPG, WEBP, or GIF."
            : uiError === "unauthorized"
            ? "Your session expired. Please sign in again."
            : uiError === "network_error"
            ? "Can't reach the upload service. Check your connection and try again."
            : uiError === "upload_failed"
            ? "Upload failed. Please try again."
            : uiError === "delete_failed"
            ? "Couldn't delete the image. Please try again."
            : uiError}
        </InlineMessage>
      ) : null}

      <div
        className={cn(
          "rounded-2xl border border-slate-200 bg-white p-2",
          disabled ? "opacity-70" : "hover:border-slate-300"
        )}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (disabled) return;
          uploadFiles(Array.from(e.dataTransfer.files)).catch(() => {});
        }}
      >
        {view === "write" ? (
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => applyChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            className="min-h-[220px] w-full resize-y rounded-xl border border-transparent bg-white px-3 py-3 font-mono text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-200"
          />
        ) : (
          <div className="min-h-[220px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900">
            {value.trim().length === 0 ? (
              <div className="text-sm text-slate-500">Nothing to preview yet.</div>
            ) : (
              <MarkdownPreview markdown={value} />
            )}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between gap-2 px-2 pb-1">
          <div className="text-xs text-slate-500">Drag & drop images here</div>
          {isOverLimit ? <div className="text-xs font-semibold text-red-600">Too long</div> : null}
        </div>
      </div>

      {images.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-700">Images</div>
            <div className="text-[11px] text-slate-500">{images.length} attached</div>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {images.map((img, idx) => {
              const isDeleting = deletingUrls.has(img.url);
              return (
                <div
                  key={`${img.url}-${idx}`}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 pr-8 transition-opacity",
                    isDeleting && "opacity-60"
                  )}
                >
                  <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <PreviewImage src={img.url} alt={img.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-slate-800">{img.name}</div>
                    <div className="truncate text-[11px] text-slate-500">{img.url}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      removeImage(img.url).catch(() => {});
                    }}
                    disabled={disabled || isDeleting}
                    aria-label={`Remove ${img.name}`}
                    aria-busy={isDeleting}
                    className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-150 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                      </svg>
                    ) : (
                      <svg
                        className="h-3 w-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {isLinkOpen ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-700">Insert link</div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsLinkOpen(false)}>
                Cancel
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={applyLink}>
                Apply
              </Button>
            </div>
          </div>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function extractImages(markdown: string): MarkdownComposerImage[] {
  const results: MarkdownComposerImage[] = [];
  const re = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(markdown))) {
    const name = match[1] || "image";
    const url = match[2] || "";
    if (!url) continue;
    results.push({ name, url });
  }
  return results;
}

function currentLine(text: string, cursor: number) {
  const start = text.lastIndexOf("\n", cursor - 1) + 1;
  const endIndex = text.indexOf("\n", cursor);
  const end = endIndex === -1 ? text.length : endIndex;
  return { start, end, text: text.slice(start, end) };
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;

  const pushParagraph = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    blocks.push(
      <p key={`p-${blocks.length}`} className="whitespace-pre-wrap leading-6 text-slate-900">
        {renderInline(trimmed)}
      </p>
    );
  };

  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    if (line.trim().startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i] ?? "").trim().startsWith("- ")) {
        items.push((lines[i] ?? "").trim().slice(2));
        i += 1;
      }
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-6 text-slate-900">
          {items.map((t, idx) => (
            <li key={idx}>{renderInline(t)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push(
        <ol key={`ol-${blocks.length}`} className="list-decimal space-y-1 pl-6 text-slate-900">
          {items.map((t, idx) => (
            <li key={idx}>{renderInline(t)}</li>
          ))}
        </ol>
      );
      continue;
    }

    const paragraphLines: string[] = [line];
    i += 1;
    while (i < lines.length && (lines[i] ?? "").trim() !== "") {
      paragraphLines.push(lines[i] ?? "");
      i += 1;
    }
    pushParagraph(paragraphLines.join("\n"));
  }

  return <div className="space-y-3">{blocks}</div>;
}

function safeLinkUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;
  const normalized = normalizeHttpUrl(trimmed);
  return normalized;
}

function safeImageUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) return trimmed;
  const normalized = normalizeHttpUrl(trimmed);
  return normalized;
}

function renderInline(text: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];

  const pattern = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));

    if (match[1] !== undefined && match[2] !== undefined) {
      const alt = match[1] || "image";
      const url = safeImageUrl(match[2]);
      nodes.push(
        url ? (
          <PreviewImage
            key={`img-${nodes.length}`}
            src={url}
            alt={alt}
            className="my-2 max-h-80 w-auto rounded-xl border border-slate-200"
          />
        ) : (
          `![${alt}](invalid)`
        )
      );
    } else if (match[3] !== undefined && match[4] !== undefined) {
      const label = match[3];
      const url = safeLinkUrl(match[4]);
      nodes.push(
        url ? (
          <a
            key={`a-${nodes.length}`}
            href={url}
            target={url.startsWith("/") ? undefined : "_blank"}
            rel={url.startsWith("/") ? undefined : "noreferrer"}
            className="font-semibold text-sky-700 underline underline-offset-2"
          >
            {label}
          </a>
        ) : (
          label
        )
      );
    } else if (match[5] !== undefined) {
      nodes.push(
        <strong key={`b-${nodes.length}`} className="font-semibold">
          {match[5]}
        </strong>
      );
    } else if (match[6] !== undefined) {
      nodes.push(
        <em key={`i-${nodes.length}`} className="italic">
          {match[6]}
        </em>
      );
    }

    last = match.index + match[0].length;
  }

  if (last < text.length) nodes.push(text.slice(last));

  return (
    <>
      {nodes.map((n, idx) => (
        <Fragment key={idx}>{n}</Fragment>
      ))}
    </>
  );
}

function PreviewImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [hasError, setHasError] = useState(false);
  if (hasError) {
    return (
      <span className="my-2 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
        Image failed to load
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}
