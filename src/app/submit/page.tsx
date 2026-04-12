"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RequireAuth } from "@/components/RequireAuth";
import { apiFetch, getApiBaseUrl } from "@/lib/api";
import type { Project } from "@/types/shared";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/Card";
import { Field, InlineMessage } from "@/components/ui/Field";
import { Select, TextInput } from "@/components/ui/Inputs";
import { MarkdownComposer } from "@/components/editor/MarkdownComposer";
import { AiEnhanceDialog } from "@/components/editor/AiEnhanceDialog";

const MAX_BODY_CHARS = 8000;

const FormSchema = z.object({
  title: z.string().min(1).max(200),
  projectId: z.string().uuid(),
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [enhanceState, setEnhanceState] = useState<{
    risk: boolean | null;
    riskKeywords: string[];
    inappropriate: boolean | null;
    inappropriateKeywords: string[];
    error: string | null;
  }>({ risk: null, riskKeywords: [], inappropriate: null, inappropriateKeywords: [], error: null });
  const [isAiOpen, setIsAiOpen] = useState(false);

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

  const canEnhance = Boolean(originalBody?.trim()) && !form.formState.isSubmitting;

  const uploadImage = useMemo(() => {
    return async (file: File) => {
      if (!accessToken) throw new Error("missing_auth");
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${getApiBaseUrl()}/api/uploads/image`, {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}` },
        body: formData
      });
      if (!res.ok) throw new Error("upload_failed");
      const data = (await res.json()) as { url: string };
      if (data.url.startsWith("/")) {
        return { url: `${getApiBaseUrl()}${data.url}` };
      }
      return data;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    apiFetch<{ projects: Project[] }>("/api/projects", { token: accessToken })
      .then((res) => setProjects(res.projects))
      .catch(() => setProjects([]));
  }, [accessToken]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="neutral">Daily update</Badge>
              <CardTitle className="mt-3 text-2xl">Developer Update</CardTitle>
              <CardDescription>Write once. The dashboard stays current for your TL and PM.</CardDescription>
            </div>
            <Button
              type="button"
              variant="primary"
              leftIcon={<Icon name="sparkle" />}
              onClick={() => setIsAiOpen(true)}
              disabled={!canEnhance}
              className="bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-600"
            >
              Enhance with AI
            </Button>
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
              setSubmitSuccess(null);
              const res = await apiFetch<{ id: string }>("/api/updates", {
                method: "POST",
                token: accessToken,
                body: values
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
                hint="Used for dashboard filters and reporting."
                error={form.formState.errors.projectId?.message}
              >
                <Select {...form.register("projectId")}>
                  <option value="">Select a project…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

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
                  className="text-indigo-700 hover:bg-indigo-50 focus-visible:ring-indigo-600"
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

            <InlineMessage variant="info" className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                {...form.register("blockers")}
              />
              <div className="min-w-0">
                <div className="font-semibold text-slate-900">Has blockers</div>
                <div className="mt-0.5 text-xs text-slate-600">
                  Use this when you’re waiting on another team, an environment, or a dependency.
                </div>
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
    </div>
  );
}
