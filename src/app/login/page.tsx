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
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-indigo-400/20 blur-3xl animate-float-slow" />
        <div className="absolute -right-24 top-40 h-[24rem] w-[24rem] rounded-full bg-fuchsia-400/15 blur-3xl animate-float-slow" style={{ animationDelay: "-3s" }} />
        <div className="absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full bg-cyan-400/15 blur-3xl animate-float-slow" style={{ animationDelay: "-6s" }} />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:gap-16 lg:py-20">
        {/* Left: hero */}
        <div className="relative animate-fade-in-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur-md">
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
            <span className="gradient-text">without the email thread.</span>
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
              accent="from-indigo-500 to-violet-500"
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
              accent="from-violet-500 to-fuchsia-500"
            />
            <FeatureCard
              icon={
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              }
              title="Safe"
              sub="Role-based visibility by design."
              accent="from-fuchsia-500 to-cyan-500"
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
          {/* Glow behind card */}
          <div
            aria-hidden
            className="absolute -inset-4 -z-10 rounded-[2rem] bg-[linear-gradient(135deg,rgba(99,102,241,0.25),rgba(217,70,239,0.15),rgba(6,182,212,0.2))] blur-2xl"
          />

          <div className="relative overflow-hidden rounded-[22px] border border-white/60 bg-white/90 p-1 shadow-[0_40px_90px_-30px_rgba(49,46,129,0.4)] backdrop-blur-xl">
            {/* gradient ring */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[22px]"
              style={{
                background: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(217,70,239,0.2), rgba(6,182,212,0.25))",
                mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
                padding: "1px"
              }}
            />

            <div className="relative rounded-[20px] bg-white/95 px-7 py-8 sm:px-9 sm:py-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">
                    Welcome back
                  </h2>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500">
                    Sign in with a demo account to explore the portal.
                  </p>
                </div>
                <div className="rounded-xl bg-[linear-gradient(135deg,#4f46e5,#7c3aed,#c026d3)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_8px_20px_-10px_rgba(124,58,237,0.6)]">
                  Demo
                </div>
              </div>

              <form
                className="mt-7 space-y-4"
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
                    className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-left text-xs transition-all duration-200 hover:-translate-y-[1px] hover:border-indigo-300 hover:bg-white hover:shadow-[0_10px_24px_-14px_rgba(79,70,229,0.35)]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-700 ring-1 ring-inset ring-indigo-200/80">
                          {acc.role}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500">{acc.label}</span>
                      </div>
                      <div className="mt-1 truncate font-mono text-[11px] text-slate-700">{acc.email}</div>
                    </div>
                    <svg
                      className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-indigo-500"
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
                  className="font-semibold text-indigo-600 transition-colors hover:text-indigo-700 hover:underline"
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
  sub,
  accent
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/75 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_30px_-18px_rgba(30,27,75,0.2)] backdrop-blur-md transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_20px_40px_-18px_rgba(79,70,229,0.35)]">
      <div
        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-[0_8px_20px_-10px_rgba(79,70,229,0.5)]`}
      >
        {icon}
      </div>
      <div className="mt-3 text-[13px] font-semibold tracking-tight text-slate-900">{title}</div>
      <div className="mt-0.5 text-[11px] leading-5 text-slate-600">{sub}</div>
    </div>
  );
}
