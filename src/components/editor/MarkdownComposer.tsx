"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import PlaceholderExtension from "@tiptap/extension-placeholder";
import UnderlineExtension from "@tiptap/extension-underline";
import TurndownService from "turndown";
import { marked } from "marked";
import { cn } from "@/lib/cn";
import { normalizeHttpUrl } from "./url";

/* ── Markdown <-> HTML conversion ──────────────────────────────── */

function createTurndown() {
  const td = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**"
  });
  // Underline → markdown doesn't have native underline; use <u> passthrough
  td.addRule("underline", {
    filter: ["u"],
    replacement: (content) => content
  });
  // Strikethrough
  td.addRule("strikethrough", {
    filter: ["s", "del"],
    replacement: (content) => `~~${content}~~`
  });
  return td;
}

function mdToHtml(md: string): string {
  if (!md.trim()) return "";
  return marked.parse(md, { async: false, breaks: true, gfm: true }) as string;
}

/* ── Image extraction (from markdown value) ────────────────────── */

export type MarkdownComposerImage = {
  name: string;
  url: string;
};

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

/* ── Main Component ────────────────────────────────────────────── */

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingUrls, setDeletingUrls] = useState<Set<string>>(() => new Set());
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef<HTMLInputElement | null>(null);

  const turndown = useMemo(() => createTurndown(), []);

  const htmlToMd = useCallback(
    (html: string) => {
      if (!html.trim() || html === "<p></p>") return "";
      return turndown.turndown(html);
    },
    [turndown]
  );

  // Track the last markdown we either sent to parent or received from parent
  const lastMdRef = useRef(value);

  const length = value.length;
  const isOverLimit = typeof maxChars === "number" ? length > maxChars : false;
  const images = useMemo(() => extractImages(value), [value]);

  // ── Tiptap editor ──────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] }
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class:
            "text-sky-700 underline underline-offset-2 cursor-pointer hover:text-sky-800"
        }
      }),
      ImageExtension.configure({
        HTMLAttributes: {
          class: "rounded-xl border border-slate-200 max-h-80 my-2"
        }
      }),
      PlaceholderExtension.configure({
        placeholder: placeholder?.replace(/\\n/g, "\n") ?? "Start writing your update..."
      }),
      UnderlineExtension
    ],
    content: mdToHtml(value),
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const md = htmlToMd(html);
      lastMdRef.current = md;
      onChange(md);
    },
    editorProps: {
      attributes: {
        class: "tiptap outline-none min-h-[180px] px-4 py-3 text-sm text-slate-900"
      },
      handleDrop: (_view, event) => {
        if (disabled) return false;
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          event.preventDefault();
          uploadFiles(Array.from(files)).catch(() => {});
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        if (disabled) return false;
        const files = event.clipboardData?.files;
        if (files && files.length > 0) {
          const imageFiles = Array.from(files).filter((f) =>
            f.type.startsWith("image/")
          );
          if (imageFiles.length > 0) {
            event.preventDefault();
            uploadFiles(imageFiles).catch(() => {});
            return true;
          }
        }
        return false;
      }
    },
    immediatelyRender: false
  });

  // ── Sync external value changes (AI enhance, GitLab insert) ───
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (value === lastMdRef.current) return;

    lastMdRef.current = value;
    const html = mdToHtml(value);
    // emitUpdate: false → won't trigger onUpdate → no loop
    editor.commands.setContent(html, { emitUpdate: false });
  }, [value, editor]);

  // ── Update editable state ─────────────────────────────────────
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  // ── Image upload ──────────────────────────────────────────────
  const validateImageFile = (file: File) => {
    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) return "image_too_large";
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) return "image_type_not_allowed";
    return null;
  };

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0 || !editor) return;
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
            editor
              .chain()
              .focus()
              .setImage({ src: result.url, alt: file.name })
              .run();
          } catch (e) {
            setUiError(e instanceof Error ? e.message : "upload_failed");
          }
        }
      } finally {
        setIsUploading(false);
      }
    },
    [editor, onUploadImage]
  );

  // ── Image removal ─────────────────────────────────────────────
  const stripImageFromValue = useCallback(
    (url: string) => {
      const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`!\\[[^\\]]*\\]\\(${escaped}\\)`, "g");
      const next = value.replace(pattern, "").replace(/\n{3,}/g, "\n\n");
      onChange(next);
    },
    [onChange, value]
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

  // ── Link handling ─────────────────────────────────────────────
  const openLink = () => {
    if (!editor) return;
    setUiError(null);
    const existingHref = editor.getAttributes("link").href as string | undefined;
    setLinkUrl(existingHref ?? "");
    setIsLinkOpen(true);
    setTimeout(() => linkInputRef.current?.focus(), 0);
  };

  const applyLink = () => {
    if (!editor) return;
    const normalized = normalizeHttpUrl(linkUrl);
    if (!normalized) {
      setUiError("invalid_url");
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: normalized })
      .run();
    setIsLinkOpen(false);
  };

  const removeLink = () => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setIsLinkOpen(false);
  };

  const errorText = !uiError
    ? null
    : uiError === "invalid_url"
      ? "Please enter a valid http(s) URL."
      : uiError === "image_too_large"
        ? "Image is too large (max 2 MB)."
        : uiError === "image_type_not_allowed"
          ? "Unsupported image type. Use PNG, JPG, WEBP, or GIF."
          : uiError === "unauthorized"
            ? "Your session expired. Please sign in again."
            : uiError === "network_error"
              ? "Can\u2019t reach the upload service. Check your connection."
              : uiError === "upload_failed"
                ? "Upload failed. Please try again."
                : uiError === "delete_failed"
                  ? "Couldn\u2019t delete the image. Please try again."
                  : uiError;

  return (
    <div className="space-y-3">
      {/* Editor card */}
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-slate-200 bg-white transition-[border-color,box-shadow] duration-200",
          disabled
            ? "opacity-70"
            : "hover:border-slate-300 focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-500/10"
        )}
      >
        {/* ── Toolbar ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50/60 px-2 py-1.5">
          <ToolbarButton
            title="Bold"
            active={editor?.isActive("bold")}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
              <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            title="Italic"
            active={editor?.isActive("italic")}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="4" x2="10" y2="4" />
              <line x1="14" y1="20" x2="5" y2="20" />
              <line x1="15" y1="4" x2="9" y2="20" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            title="Underline"
            active={editor?.isActive("underline")}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
              <line x1="4" y1="21" x2="20" y2="21" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            title="Strikethrough"
            active={editor?.isActive("strike")}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4c-1.5 0-3.5.5-4 2" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <path d="M8 20c1.5 0 3.5-.5 4-2" />
            </svg>
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            title="Heading 2"
            active={editor?.isActive("heading", { level: 2 })}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <span className="text-xs font-bold">H2</span>
          </ToolbarButton>
          <ToolbarButton
            title="Heading 3"
            active={editor?.isActive("heading", { level: 3 })}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <span className="text-xs font-bold">H3</span>
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            title="Bullet list"
            active={editor?.isActive("bulletList")}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="9" y1="6" x2="20" y2="6" />
              <line x1="9" y1="12" x2="20" y2="12" />
              <line x1="9" y1="18" x2="20" y2="18" />
              <circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" />
              <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
              <circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            title="Ordered list"
            active={editor?.isActive("orderedList")}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="10" y1="6" x2="20" y2="6" />
              <line x1="10" y1="12" x2="20" y2="12" />
              <line x1="10" y1="18" x2="20" y2="18" />
              <text x="2" y="8" fill="currentColor" stroke="none" fontSize="7" fontWeight="600" fontFamily="system-ui">1</text>
              <text x="2" y="14" fill="currentColor" stroke="none" fontSize="7" fontWeight="600" fontFamily="system-ui">2</text>
              <text x="2" y="20" fill="currentColor" stroke="none" fontSize="7" fontWeight="600" fontFamily="system-ui">3</text>
            </svg>
          </ToolbarButton>
          <ToolbarButton
            title="Blockquote"
            active={editor?.isActive("blockquote")}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 8c-1.1 0-2 .9-2 2v3c0 1.1.9 2 2 2h1l-1 3h2l1-3c1.1 0 2-.9 2-2v-3c0-1.1-.9-2-2-2h-3zM3 8c-1.1 0-2 .9-2 2v3c0 1.1.9 2 2 2h1l-1 3h2l1-3c1.1 0 2-.9 2-2v-3c0-1.1-.9-2-2-2H3z" opacity="0.7" />
            </svg>
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            title="Horizontal rule"
            disabled={disabled}
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="12" x2="21" y2="12" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            title="Code"
            active={editor?.isActive("code")}
            disabled={disabled}
            onClick={() => editor?.chain().focus().toggleCode().run()}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            title="Insert link"
            active={editor?.isActive("link")}
            disabled={disabled}
            onClick={openLink}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            title="Upload image"
            disabled={disabled || isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            )}
          </ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            multiple
            onChange={(e) => {
              uploadFiles(Array.from(e.target.files ?? [])).catch(() => {});
              e.target.value = "";
            }}
          />

          {/* Spacer + character count */}
          <div className="flex-1" />
          {typeof maxChars === "number" ? (
            <div
              className={cn(
                "mr-1 text-[11px] tabular-nums",
                isOverLimit ? "font-semibold text-red-600" : "text-slate-400"
              )}
            >
              {length}/{maxChars}
            </div>
          ) : null}
        </div>

        {/* ── Bubble Menu (floating toolbar on selection) ──── */}
        {editor ? (
          <BubbleMenu
            editor={editor}
            className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white px-1.5 py-1 shadow-lg"
          >
            <BubbleButton
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
                <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
              </svg>
            </BubbleButton>
            <BubbleButton
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="4" x2="10" y2="4" />
                <line x1="14" y1="20" x2="5" y2="20" />
                <line x1="15" y1="4" x2="9" y2="20" />
              </svg>
            </BubbleButton>
            <BubbleButton
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              title="Underline"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
                <line x1="4" y1="21" x2="20" y2="21" />
              </svg>
            </BubbleButton>
            <BubbleButton
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="Strikethrough"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4c-1.5 0-3.5.5-4 2" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <path d="M8 20c1.5 0 3.5-.5 4-2" />
              </svg>
            </BubbleButton>
            <div className="mx-0.5 h-4 w-px bg-slate-200" />
            <BubbleButton
              active={editor.isActive("link")}
              onClick={openLink}
              title="Link"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </BubbleButton>
          </BubbleMenu>
        ) : null}

        {/* ── Editor content ─────────────────────────────── */}
        <EditorContent editor={editor} />

        {/* ── Footer ─────────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/40 px-4 py-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Drag & drop or paste images
          </div>
          {isOverLimit ? (
            <div className="text-[11px] font-semibold text-red-600">Character limit exceeded</div>
          ) : null}
        </div>
      </div>

      {/* ── Error message ──────────────────────────────────────── */}
      {errorText ? (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-[12px] text-amber-800">
          {errorText}
        </div>
      ) : null}

      {/* ── Link dialog ────────────────────────────────────────── */}
      {isLinkOpen ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 animate-fade-in">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-700">
              {editor?.isActive("link") ? "Edit link" : "Insert link"}
            </div>
            <div className="flex items-center gap-1.5">
              {editor?.isActive("link") ? (
                <button
                  type="button"
                  onClick={removeLink}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  Remove
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setIsLinkOpen(false)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyLink}
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
          <input
            ref={linkInputRef}
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setIsLinkOpen(false);
              }
            }}
          />
        </div>
      ) : null}

      {/* ── Image gallery ──────────────────────────────────────── */}
      {images.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-700">Images</div>
            <div className="text-[11px] text-slate-500">
              {images.length} attached
            </div>
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
                    <PreviewImage
                      src={img.url}
                      alt={img.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-slate-800">
                      {img.name}
                    </div>
                    <div className="truncate text-[11px] text-slate-500">
                      {img.url}
                    </div>
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
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    </div>
  );
}

/* ── Toolbar button ────────────────────────────────────────────── */

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150",
        active
          ? "bg-sky-100 text-sky-700 shadow-sm ring-1 ring-inset ring-sky-200/60"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
        disabled && "pointer-events-none opacity-40"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-5 w-px bg-slate-200" />;
}

/* ── Bubble menu button ────────────────────────────────────────── */

function BubbleButton({
  active,
  onClick,
  title,
  children
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-sky-100 text-sky-700"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      )}
    >
      {children}
    </button>
  );
}

/* ── Preview image ─────────────────────────────────────────────── */

function PreviewImage({
  src,
  alt,
  className
}: {
  src: string;
  alt: string;
  className?: string;
}) {
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
