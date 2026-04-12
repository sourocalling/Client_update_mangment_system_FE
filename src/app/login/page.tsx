"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Field, InlineMessage } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/Inputs";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

type LoginForm = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const errorText =
    error === "network_error"
      ? "Can’t reach the API. Check that the backend is running and CORS/API URL are configured correctly."
      : error;

  const form = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "dev1@acme.test", password: "password" },
    mode: "onChange"
  });

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-indigo-200/60 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-sky-200/70 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-2 lg:py-16">
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Always up to date
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Client updates, without the email thread.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Submit daily status in seconds. Managers see a single dashboard with AI-enhanced clarity and instant risk
            signals.
          </p>

          <div className="mt-6 grid max-w-xl gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur">
              <div className="text-sm font-semibold text-slate-900">Fast</div>
              <div className="mt-1 text-xs text-slate-600">One form, no follow-ups.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur">
              <div className="text-sm font-semibold text-slate-900">Clear</div>
              <div className="mt-1 text-xs text-slate-600">Professional tone, consistent format.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur">
              <div className="text-sm font-semibold text-slate-900">Safe</div>
              <div className="mt-1 text-xs text-slate-600">Role-based visibility by design.</div>
            </div>
          </div>
        </div>

        <div className="relative">
          <Card>
            <CardContent className="px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Sign in</h2>
                <p className="mt-1 text-sm text-slate-600">Use a seeded demo account to explore the portal.</p>
              </div>
              <div className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm">
                Demo
              </div>
            </div>

            <form
              className="mt-6 space-y-4"
              onSubmit={form.handleSubmit(async (values) => {
                setError(null);
                try {
                  await login(values.email, values.password);
                  router.push("/dashboard");
                } catch (e) {
                  setError(e instanceof Error ? e.message : "login_failed");
                }
              })}
            >
              <Field label="Email" error={form.formState.errors.email?.message}>
                <TextInput type="email" autoComplete="email" {...form.register("email")} />
              </Field>

              <Field label="Password" error={form.formState.errors.password?.message}>
                <TextInput type="password" autoComplete="current-password" {...form.register("password")} />
              </Field>

              {errorText ? (
                <InlineMessage variant="danger" role="alert">
                  {errorText}
                </InlineMessage>
              ) : null}

              <Button
                type="submit"
                disabled={!form.formState.isValid || form.formState.isSubmitting}
                isLoading={form.formState.isSubmitting}
                className="w-full"
              >
                Sign in
              </Button>
            </form>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-700">Seeded accounts</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                  <div className="font-semibold">DEV</div>
                  <div className="mt-1">dev1@acme.test</div>
                  <div className="text-slate-500">password</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                  <div className="font-semibold">DEV</div>
                  <div className="mt-1">dev2@acme.test</div>
                  <div className="text-slate-500">password</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                  <div className="font-semibold">TL</div>
                  <div className="mt-1">tl@acme.test</div>
                  <div className="text-slate-500">password</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                  <div className="font-semibold">PM</div>
                  <div className="mt-1">pm@acme.test</div>
                  <div className="text-slate-500">password</div>
                </div>
              </div>
            </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
