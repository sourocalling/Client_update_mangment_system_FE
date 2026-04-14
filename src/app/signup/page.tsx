"use client";

import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Field, InlineMessage } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/Inputs";
import type { Role } from "@/types/shared";

const RoleSchema = z.enum(["DEV", "TL", "PM", "AM"]);

const SignupSchema = z.object({
  tenant: z.string().min(1, "Workspace is required").max(120),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Must be at least 8 characters")
    .max(128, "Must be 128 characters or fewer"),
  name: z.string().min(1, "Name is required").max(120),
  role: RoleSchema,
  squadName: z.string().max(120, "Must be 120 characters or fewer").optional()
});

type SignupForm = z.infer<typeof SignupSchema>;

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  { value: "DEV", label: "Developer", description: "Submits daily updates" },
  { value: "TL", label: "Team Lead", description: "Oversees a squad" },
  { value: "PM", label: "Project Manager", description: "Tracks delivery across squads" },
  { value: "AM", label: "Account Manager", description: "Owns client relationships" }
];

export default function SignupPage() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SignupForm>({
    resolver: zodResolver(SignupSchema),
    mode: "onChange",
    defaultValues: {
      tenant: "Acme",
      email: "",
      password: "",
      name: "",
      role: "DEV",
      squadName: ""
    }
  });

  const selectedRole = useWatch({ control: form.control, name: "role" });
  const showSquad = selectedRole === "DEV" || selectedRole === "TL";

  const errorText =
    error === "network_error"
      ? "Can't reach the API. Check that the backend is running and CORS/API URL are configured correctly."
      : error === "email_exists" || error === "user_exists"
        ? "An account with this email already exists. Try signing in instead."
        : error === "tenant_not_found"
          ? "That workspace doesn't exist yet. Check the workspace name with your admin."
          : error;

  return (
    <div className="relative overflow-hidden">
      {/* Ambient decorative blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-indigo-400/20 blur-3xl animate-float-slow" />
        <div className="absolute -right-24 top-40 h-[24rem] w-[24rem] rounded-full bg-fuchsia-400/15 blur-3xl animate-float-slow" style={{ animationDelay: "-3s" }} />
        <div className="absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full bg-cyan-400/15 blur-3xl animate-float-slow" style={{ animationDelay: "-6s" }} />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-20">
        {/* Left: hero */}
        <div className="relative animate-fade-in-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
            </span>
            <span className="tracking-wide uppercase">Create account</span>
            <span className="mx-1 h-3 w-px bg-slate-300" />
            <span className="text-slate-500">Free during beta</span>
          </div>

          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[52px]">
            Join your team&apos;s <br />
            <span className="gradient-text">daily update flow.</span>
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-7 text-slate-600">
            Pick your role, join a squad, and start submitting
            <span className="font-semibold text-slate-800"> AI-enhanced</span> updates in under a minute.
            Managers see clarity and risk signals instantly — no follow-up threads.
          </p>

          {/* Role walkthrough */}
          <div className="mt-8 grid max-w-xl gap-3">
            {ROLE_OPTIONS.map((opt) => (
              <div
                key={opt.value}
                className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/60 bg-white/75 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_30px_-18px_rgba(30,27,75,0.2)] backdrop-blur-md transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_20px_40px_-18px_rgba(79,70,229,0.35)]"
              >
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#4f46e5,#7c3aed,#c026d3)] text-[11px] font-bold uppercase tracking-wider text-white shadow-[0_8px_20px_-10px_rgba(79,70,229,0.5)]">
                  {opt.value}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold tracking-tight text-slate-900">{opt.label}</div>
                  <div className="mt-0.5 text-[12px] leading-5 text-slate-600">{opt.description}</div>
                </div>
              </div>
            ))}
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
          <div
            aria-hidden
            className="absolute -inset-4 -z-10 rounded-[2rem] bg-[linear-gradient(135deg,rgba(99,102,241,0.25),rgba(217,70,239,0.15),rgba(6,182,212,0.2))] blur-2xl"
          />

          <div className="relative overflow-hidden rounded-[22px] border border-white/60 bg-white/90 p-1 shadow-[0_40px_90px_-30px_rgba(49,46,129,0.4)] backdrop-blur-xl">
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
                    Create your account
                  </h2>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500">
                    Takes less than a minute. No credit card required.
                  </p>
                </div>
                <div className="rounded-xl bg-[linear-gradient(135deg,#4f46e5,#7c3aed,#c026d3)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_8px_20px_-10px_rgba(124,58,237,0.6)]">
                  Sign up
                </div>
              </div>

              <form
                className="mt-7 space-y-4"
                onSubmit={form.handleSubmit(async (values) => {
                  setError(null);
                  try {
                    const squadName = values.squadName?.trim();
                    await registerUser({
                      tenant: values.tenant.trim(),
                      email: values.email.trim(),
                      password: values.password,
                      name: values.name.trim(),
                      role: values.role,
                      squadName: squadName && squadName.length > 0 ? squadName : undefined
                    });
                    router.push("/dashboard");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "signup_failed");
                  }
                })}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" error={form.formState.errors.name?.message}>
                    <TextInput
                      type="text"
                      autoComplete="name"
                      placeholder="Ada Lovelace"
                      {...form.register("name")}
                    />
                  </Field>

                  <Field label="Workspace" hint="Tenant" error={form.formState.errors.tenant?.message}>
                    <TextInput
                      type="text"
                      autoComplete="organization"
                      placeholder="Acme"
                      {...form.register("tenant")}
                    />
                  </Field>
                </div>

                <Field label="Email address" error={form.formState.errors.email?.message}>
                  <TextInput
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    {...form.register("email")}
                  />
                </Field>

                <Field
                  label="Password"
                  hint="Min 8 characters"
                  error={form.formState.errors.password?.message}
                >
                  <TextInput
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...form.register("password")}
                  />
                </Field>

                <Field label="Role" error={form.formState.errors.role?.message}>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {ROLE_OPTIONS.map((opt) => {
                      const active = selectedRole === opt.value;
                      return (
                        <label
                          key={opt.value}
                          className={
                            "group relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-3 py-3 text-center transition-all duration-200 " +
                            (active
                              ? "border-indigo-400 bg-indigo-50/80 shadow-[0_10px_24px_-16px_rgba(79,70,229,0.6)]"
                              : "border-slate-200/80 bg-white/70 hover:-translate-y-[1px] hover:border-indigo-300 hover:bg-white")
                          }
                        >
                          <input
                            type="radio"
                            value={opt.value}
                            className="sr-only"
                            {...form.register("role")}
                          />
                          <span
                            className={
                              "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset " +
                              (active
                                ? "bg-indigo-600 text-white ring-indigo-600"
                                : "bg-indigo-50 text-indigo-700 ring-indigo-200/80")
                            }
                          >
                            {opt.value}
                          </span>
                          <span className="text-[12px] font-semibold tracking-tight text-slate-900">
                            {opt.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </Field>

                {showSquad ? (
                  <Field
                    label="Squad name"
                    hint="Optional"
                    error={form.formState.errors.squadName?.message}
                  >
                    <TextInput
                      type="text"
                      autoComplete="off"
                      placeholder="e.g. Platform, Growth, Checkout"
                      {...form.register("squadName")}
                    />
                  </Field>
                ) : null}

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
                  Create account
                </Button>

                <p className="text-center text-[11px] leading-5 text-slate-400">
                  By creating an account, you agree to our Terms and Privacy Policy.
                </p>
              </form>

              {/* Divider */}
              <div className="mt-7 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" />
                Already a member
                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200" />
              </div>

              <Link
                href="/login"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5 text-center text-[13px] font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-[1px] hover:border-indigo-300 hover:bg-white hover:text-indigo-700 hover:shadow-[0_10px_24px_-14px_rgba(79,70,229,0.35)]"
              >
                Sign in to your account
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
