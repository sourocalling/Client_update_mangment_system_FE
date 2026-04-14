"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Field, InlineMessage } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/Inputs";
import { Logo } from "@/components/Logo";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

type LoginForm = z.infer<typeof LoginSchema>;

const DEMO_ACCOUNTS = [
  { role: "DEV", email: "dev1@acme.test", label: "Developer" },
  { role: "DEV", email: "dev2@acme.test", label: "Developer" },
  { role: "TL", email: "tl@acme.test", label: "Team Lead" },
  { role: "PM", email: "pm@acme.test", label: "Project Manager" }
] as const;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const errorText =
    error === "network_error"
      ? "Can't reach the API. Check that the backend is running and CORS/API URL are configured correctly."
      : error === "invalid_credentials"
        ? "Those credentials don't match any account in this workspace. Double-check your workspace, email, and password."
        : error;

  const form = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "dev1@acme.test", password: "password" },
    mode: "onChange"
  });

  const fillDemo = (email: string) => {
    form.setValue("email", email, { shouldValidate: true });
    form.setValue("password", "password", { shouldValidate: true });
  };

  return (
    <div className="relative overflow-hidden">
      {/* Ambient decorative blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-sky-300/25 blur-3xl animate-float-slow" />
        <div className="absolute -right-24 top-40 h-[24rem] w-[24rem] rounded-full bg-cyan-200/30 blur-3xl animate-float-slow" style={{ animationDelay: "-3s" }} />
        <div className="absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full bg-sky-200/30 blur-3xl animate-float-slow" style={{ animationDelay: "-6s" }} />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:gap-16 lg:py-20">
        {/* Left: hero */}
        <div className="relative animate-fade-in-up">
          <Logo variant="full" className="h-10 w-auto" />

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="tracking-wide uppercase">Live dashboard</span>
            <span className="mx-1 h-3 w-px bg-slate-300" />
            <span className="text-slate-500">v1.0</span>
          </div>

          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[52px]">
            Client updates, <br />
            <span className="text-sky-700">without the email thread.</span>
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-7 text-slate-600">
            Submit daily status in seconds. Managers see a single dashboard with
            <span className="font-semibold text-slate-800"> AI-enhanced clarity</span> and
            <span className="font-semibold text-slate-800"> instant risk signals</span>.
          </p>

          {/* Feature grid */}
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            <FeatureCard
              icon={
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              }
              title="Fast"
              sub="One form, no follow-ups."
            />
            <FeatureCard
              icon={
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              }
              title="Clear"
              sub="Professional tone, consistent format."
            />
            <FeatureCard
              icon={
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              }
              title="Safe"
              sub="Role-based visibility by design."
            />
          </div>

          {/* Trust strip */}
          <div className="mt-10 flex flex-wrap items-center gap-6 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            <span>AI-Enhanced</span>
            <span className="h-3 w-px bg-slate-300" />
            <span>Multi-Tenant</span>
            <span className="h-3 w-px bg-slate-300" />
            <span>GDPR Ready</span>
            <span className="h-3 w-px bg-slate-300" />
            <span>Role-Based</span>
          </div>
        </div>

        {/* Right: Auth card */}
        <div className="relative animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_56px_-24px_rgba(15,23,42,0.18)]">
            <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-400" />
            <div className="relative px-7 py-8 sm:px-9 sm:py-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">
                    Welcome back
                  </h2>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500">
                    Sign in with a demo account to explore the portal.
                  </p>
                </div>
                <div className="rounded-lg bg-sky-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_8px_20px_-10px_rgba(2,132,199,0.6)]">
                  Demo
                </div>
              </div>

              <form
                className="mt-7 space-y-4"
                onSubmit={form.handleSubmit(async (values) => {
                  setError(null);
                  try {
                    await login(values.email.trim().toLowerCase(), values.password);
                    router.push("/dashboard");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "login_failed");
                  }
                })}
              >
                <Field label="Email address" error={form.formState.errors.email?.message}>
                  <TextInput
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    {...form.register("email")}
                  />
                </Field>

                <Field label="Password" error={form.formState.errors.password?.message}>
                  <TextInput
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...form.register("password")}
                  />
                </Field>

                {errorText ? (
                  <InlineMessage variant="danger" role="alert">
                    {errorText}
                  </InlineMessage>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  disabled={!form.formState.isValid || form.formState.isSubmitting}
                  isLoading={form.formState.isSubmitting}
                  className="w-full"
                  rightIcon={
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  }
                >
                  Sign in to continue
                </Button>
              </form>

              {/* Divider */}
              <div className="mt-7 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" />
                Seeded accounts
                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200" />
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillDemo(acc.email)}
                    className="group flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-xs transition-all duration-200 hover:border-sky-300 hover:bg-sky-50/40 hover:shadow-[0_10px_24px_-14px_rgba(2,132,199,0.3)]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-700 ring-1 ring-inset ring-sky-200/80">
                          {acc.role}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500">{acc.label}</span>
                      </div>
                      <div className="mt-1 truncate font-mono text-[11px] text-slate-700">{acc.email}</div>
                    </div>
                    <svg
                      className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-sky-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                ))}
              </div>

              <p className="mt-5 text-center text-[11px] text-slate-400">
                All demo accounts use the password{" "}
                <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">password</code>
              </p>

              <div className="mt-5 text-center text-[12px] text-slate-500">
                New here?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-sky-700 transition-colors hover:text-sky-800 hover:underline"
                >
                  Create an account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  sub
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-[2px] hover:border-sky-300 hover:shadow-[0_14px_32px_-18px_rgba(2,132,199,0.35)]">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200/80">
        {icon}
      </div>
      <div className="mt-3 text-[13px] font-semibold tracking-tight text-slate-900">{title}</div>
      <div className="mt-0.5 text-[11px] leading-5 text-slate-600">{sub}</div>
    </div>
  );
}
