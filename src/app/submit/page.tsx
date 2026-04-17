"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RequireAuth } from "@/components/RequireAuth";
import { apiFetch, apiUpload } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  useGitlabConnection,
  type GitlabProject
} from "@/lib/gitlab";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/Card";
import { Field, InlineMessage } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/Inputs";
import { MarkdownComposer } from "@/components/editor/MarkdownComposer";
import { AiEnhanceDialog } from "@/components/editor/AiEnhanceDialog";
import { GitlabConnectModal } from "@/components/GitlabConnectModal";
import { GitlabProjectPicker } from "@/components/GitlabProjectPicker";
import { GitlabCommitsPicker } from "@/components/GitlabCommitsPicker";

const MAX_BODY_CHARS = 8000;

const BLOCKER_KEYWORDS = /\b(block(?:ed|er|ers|age|ing)|stuck|stalled|impediment|delay(?:ed)?|waiting\s+(?:on|for)|can(?:'|no)t\s+proceed|depend(?:ency|encies)\s+issue|at\s+risk)\b/gi;

function detectBlockerKeywords(text: string): string[] {
  const matches = text.match(BLOCKER_KEYWORDS);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.toLowerCase()))];
}

const FormSchema = z.object({
  title: z.string().min(1).max(200),
  projectId: z.string().min(1, "Pick a project"),
  originalBody: z.string().min(1).max(MAX_BODY_CHARS),
  hours: z.number().min(0).max(24),
  nextPlan: z.string().min(1).max(500),
  blockers: z.boolean()
});

type FormValues = z.infer<typeof FormSchema>;

export default function SubmitPage() {
  return (
    <RequireAuth allow={["DEV", "TL", "PM"]}>
      <SubmitPageInner />
    </RequireAuth>
  );
}

function Icon({ name, className }: { name: "sparkle" | "check" | "warn"; className?: string }) {
  const cls = `h-4 w-4 ${className ?? ""}`;
  if (name === "check") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M20 6L9 17l-5-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "warn") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 9v4m0 4h.01M10.3 3.7l-8.6 14.9A2 2 0 0 0 3.4 21h17.2a2 2 0 0 0 1.7-2.4L13.7 3.7a2 2 0 0 0-3.4 0z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2l1.4 5.1L18 9l-4.6 1.9L12 16l-1.4-5.1L6 9l4.6-1.9L12 2z"
        fill="currentColor"
      />
      <path
        d="M19 13l.9 3.2L23 17l-3.1 1.3L19 22l-.9-3.7L15 17l3.1-.8L19 13z"
        fill="currentColor"
      />
    </svg>
  );
}

function SubmitPageInner() {
  const { accessToken } = useAuth();
  const { connection: gitlab } = useGitlabConnection();
  const [selectedGitlabProject, setSelectedGitlabProject] = useState<GitlabProject | null>(null);
  const [gitlabMeta, setGitlabMeta] = useState<{ total: number; isLoading: boolean }>({ total: 0, isLoading: false });
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [enhanceState, setEnhanceState] = useState<{
    risk: boolean | null;
    riskKeywords: string[];
    inappropriate: boolean | null;
    inappropriateKeywords: string[];
    error: string | null;
  }>({ risk: null, riskKeywords: [], inappropriate: null, inappropriateKeywords: [], error: null });
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isGitlabModalOpen, setIsGitlabModalOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: "",
      projectId: "",
      originalBody: "",
      hours: 0,
      nextPlan: "",
      blockers: false
    },
    mode: "onChange"
  });

  const originalBody = useWatch({ control: form.control, name: "originalBody" }) ?? "";
  const blockersChecked = useWatch({ control: form.control, name: "blockers" });
  const insertGitlabCommits = useCallback(
    (markdown: string) => {
      const current = form.getValues("originalBody") ?? "";
      const next = current.trim().length > 0 ? `${current}\n\n${markdown}\n` : `${markdown}\n`;
      form.setValue("originalBody", next, { shouldDirty: true, shouldValidate: true });
    },
    [form]
  );

  const setGeneratedTitle = useCallback(
    (title: string) => {
      form.setValue("title", title, { shouldDirty: true, shouldValidate: true });
    },
    [form]
  );

  const detectedKeywords = useMemo(() => detectBlockerKeywords(originalBody), [originalBody]);
  const blockersRequired = detectedKeywords.length > 0 || enhanceState.risk === true;

  useEffect(() => {
    if (blockersRequired && !blockersChecked) {
      form.setValue("blockers", true, { shouldValidate: true });
    }
  }, [blockersRequired, blockersChecked, form]);

  const canEnhance = Boolean(originalBody?.trim()) && !form.formState.isSubmitting;

  const uploadImage = useCallback(
    async (file: File) => {
      if (!accessToken) throw new Error("unauthorized");
      const formData = new FormData();
      formData.append("file", file);
      return apiUpload<{ url: string }>("/api/uploads/image", formData, { token: accessToken });
    },
    [accessToken]
  );

  const deleteImage = useCallback(
    async (url: string) => {
      if (!accessToken) throw new Error("unauthorized");
      await apiFetch<{ ok: boolean; path: string }>("/api/uploads/image", {
        method: "DELETE",
        token: accessToken,
        body: { url }
      });
    },
    [accessToken]
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12 animate-fade-in-up">
      <Card>
        <CardHeader>
          <div>
            <Badge variant="brand">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h8M16.5 3.5l4 4L8 20H4v-4L16.5 3.5z" />
              </svg>
              Daily update
            </Badge>
            <CardTitle className="mt-3 text-[28px] sm:text-[32px]">
              <span className="text-slate-900">Developer Update</span>
            </CardTitle>
            <CardDescription className="max-w-xl">
              Write once. The dashboard stays current for your TL and PM — with AI-enhanced clarity and instant risk signals.
            </CardDescription>
          </div>

          {enhanceState.error ? (
            <InlineMessage variant="warning" role="alert" className="mt-4">
              {enhanceState.error}
            </InlineMessage>
          ) : null}

          {enhanceState.risk !== null || enhanceState.inappropriate !== null ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {enhanceState.risk ? (
                <Badge variant="danger">
                  <Icon name="warn" /> At Risk
                </Badge>
              ) : (
                <Badge variant="success">
                  <Icon name="check" /> Looks good
                </Badge>
              )}
              {enhanceState.riskKeywords.length > 0 ? (
                <div className="text-xs text-slate-600">
                  Risk keywords: <span className="font-semibold text-slate-800">{enhanceState.riskKeywords.join(", ")}</span>
                </div>
              ) : null}
              {enhanceState.inappropriate ? (
                <Badge variant="warning">
                  <Icon name="warn" /> Language flagged
                </Badge>
              ) : null}
              {enhanceState.inappropriateKeywords.length > 0 ? (
                <div className="text-xs text-slate-600">
                  Flagged:{" "}
                  <span className="font-semibold text-slate-800">{enhanceState.inappropriateKeywords.join(", ")}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardHeader>

        <CardContent>
          <form
            className="grid gap-5"
            onSubmit={form.handleSubmit(async (values) => {
              if (!accessToken) return;
              const keywords = detectBlockerKeywords(values.originalBody);
              if ((keywords.length > 0 || enhanceState.risk) && !values.blockers) {
                form.setError("blockers", {
                  message: "Your update mentions blockers — please acknowledge before submitting."
                });
                return;
              }
              if (!selectedGitlabProject) {
                form.setError("projectId", { message: "Pick a GitLab project." });
                return;
              }
              setSubmitSuccess(null);
              const resolved = await apiFetch<{ id: string; name: string }>("/api/projects/ensure-gitlab", {
                method: "POST",
                token: accessToken,
                body: {
                  externalId: String(selectedGitlabProject.id),
                  name: selectedGitlabProject.name
                }
              });
              const res = await apiFetch<{ id: string }>("/api/updates", {
                method: "POST",
                token: accessToken,
                body: { ...values, projectId: resolved.id }
              });
              setSubmitSuccess(res.id);
              form.reset({ ...values, title: "", originalBody: "", nextPlan: "", blockers: false, hours: 0 });
              setEnhanceState({
                risk: null,
                riskKeywords: [],
                inappropriate: null,
                inappropriateKeywords: [],
                error: null
              });
            })}
          >
            {submitSuccess ? (
              <InlineMessage variant="success" role="status">
                Update submitted successfully.
              </InlineMessage>
            ) : null}

            {!gitlab ? (
              <div className="relative overflow-hidden rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 ring-1 ring-inset ring-orange-100">
                      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                        <path d="M12 21 3 12l2.3-7.1h3l2.4 7.1H13l2.4-7.1h3L20.9 12 12 21z" fill="#FC6D26" />
                        <path d="M12 21 8.7 12H15.3L12 21z" fill="#E24329" />
                        <path d="M12 21 3 12h5.7L12 21z" fill="#FCA326" />
                        <path d="m3 12 2.3-7.1L8.7 12H3z" fill="#E24329" />
                        <path d="M12 21 21 12h-5.7L12 21z" fill="#FCA326" />
                        <path d="m21 12-2.3-7.1L15.3 12H21z" fill="#E24329" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold tracking-tight text-slate-900">
                        Connect your GitLab workspace
                      </div>
                      <div className="mt-1 text-[12px] leading-5 text-slate-600">
                        Sign in once to load your repositories, browse commits by branch and date, and attach them directly to your daily update.
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setIsGitlabModalOpen(true)}
                  >
                    Connect GitLab
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Title"
                hint="Make it scannable for end-of-day review."
                error={form.formState.errors.title?.message}
              >
                <TextInput type="text" placeholder="One-line summary" {...form.register("title")} />
              </Field>

              <Field
                label="Project"
                hint={
                  gitlab
                    ? gitlabMeta.isLoading
                      ? "Loading GitLab projects…"
                      : gitlabMeta.total > 0
                        ? `GitLab · ${gitlabMeta.total} project${gitlabMeta.total === 1 ? "" : "s"}`
                        : "GitLab"
                    : "Connect GitLab to load your projects"
                }
                error={form.formState.errors.projectId?.message}
              >
                <Controller
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <GitlabProjectPicker
                      value={field.value}
                      onChange={(v) => field.onChange(v)}
                      gitlabUrl={gitlab?.url ?? ""}
                      gitlabToken={gitlab?.token ?? ""}
                      disabled={!gitlab}
                      placeholder={
                        gitlab ? "Select a GitLab project…" : "Connect GitLab to load projects…"
                      }
                      onProjectChange={setSelectedGitlabProject}
                      onMetaChange={setGitlabMeta}
                    />
                  )}
                />
              </Field>
            </div>

            {gitlab && selectedGitlabProject ? (
              <GitlabCommitsPicker
                projectId={selectedGitlabProject.id}
                projectName={selectedGitlabProject.name}
                gitlabUrl={gitlab.url}
                gitlabToken={gitlab.token}
                authToken={accessToken}
                currentUserEmail={gitlab.user.email}
                onInsert={insertGitlabCommits}
                onSetTitle={setGeneratedTitle}
              />
            ) : null}

            <Field
              label="Update details"
              hint="Cursor stays in place after AI replacement."
              error={form.formState.errors.originalBody?.message}
              right={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  leftIcon={<Icon name="sparkle" />}
                  onClick={() => setIsAiOpen(true)}
                  disabled={!canEnhance}
                  className="text-sky-700 hover:bg-sky-50 focus-visible:ring-sky-600"
                >
                  Enhance
                </Button>
              }
            >
              <Controller
                control={form.control}
                name="originalBody"
                render={({ field }) => (
                  <MarkdownComposer
                    value={field.value}
                    onChange={(next) => field.onChange(next)}
                    placeholder="- What you completed today\n- What’s next\n- Any risks / blockers"
                    maxChars={MAX_BODY_CHARS}
                    onUploadImage={uploadImage}
                    onDeleteImage={deleteImage}
                    disabled={form.formState.isSubmitting}
                  />
                )}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Hours" error={form.formState.errors.hours?.message}>
                <TextInput type="number" step="0.25" {...form.register("hours", { valueAsNumber: true })} />
              </Field>
              <Field label="Next-day plan" error={form.formState.errors.nextPlan?.message} className="sm:col-span-2">
                <TextInput type="text" placeholder="What you’ll focus on tomorrow" {...form.register("nextPlan")} />
              </Field>
            </div>

            <InlineMessage
              variant={blockersRequired ? "warning" : "info"}
              className="flex items-start gap-3"
            >
              <input
                type="checkbox"
                className={`mt-1 h-4 w-4 rounded border-slate-300 focus:ring-slate-900/20 ${
                  blockersRequired
                    ? "text-amber-600 cursor-not-allowed"
                    : "text-slate-900"
                }`}
                {...form.register("blockers")}
                disabled={blockersRequired}
              />
              <div className="min-w-0">
                <div className="font-semibold text-slate-900">
                  Has blockers
                  {blockersRequired ? (
                    <span className="ml-2 text-xs font-medium text-amber-700">Required</span>
                  ) : null}
                </div>
                {blockersRequired ? (
                  <div className="mt-0.5 text-xs text-amber-700">
                    Your update contains blocker-related keywords
                    {detectedKeywords.length > 0 ? (
                      <>
                        {" ("}<span className="font-semibold">{detectedKeywords.join(", ")}</span>{") "}
                      </>
                    ) : null}
                    — this field is mandatory.
                  </div>
                ) : (
                  <div className="mt-0.5 text-xs text-slate-600">
                    Use this when you’re waiting on another team, an environment, or a dependency.
                  </div>
                )}
              </div>
            </InlineMessage>

            <Button
              type="submit"
              disabled={!form.formState.isValid || form.formState.isSubmitting}
              isLoading={form.formState.isSubmitting}
              className="w-full"
            >
              Submit update
            </Button>
          </form>
        </CardContent>
      </Card>

      {accessToken ? (
        <AiEnhanceDialog
          open={isAiOpen}
          token={accessToken}
          body={originalBody}
          onClose={() => setIsAiOpen(false)}
          onResult={(result) => {
            setEnhanceState({
              risk: result.risk,
              riskKeywords: result.riskKeywords ?? [],
              inappropriate: result.inappropriate,
              inappropriateKeywords: result.inappropriateKeywords ?? [],
              error: null
            });
          }}
          onReplace={(enriched) => {
            form.setValue("originalBody", enriched, { shouldDirty: true, shouldValidate: true });
          }}
          onInsert={(enriched) => {
            const current = form.getValues("originalBody");
            form.setValue("originalBody", `${current}\n\n${enriched}`, { shouldDirty: true, shouldValidate: true });
          }}
        />
      ) : null}

      <GitlabConnectModal
        open={isGitlabModalOpen}
        onClose={() => setIsGitlabModalOpen(false)}
      />
    </div>
  );
}
