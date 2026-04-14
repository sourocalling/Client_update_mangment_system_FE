"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

function Icon({
  name,
  className
}: {
  name: "home" | "submit" | "dashboard" | "login" | "logout" | "menu" | "close" | "sparkle";
  className?: string;
}) {
  const cls = `h-4 w-4 ${className ?? ""}`;
  if (name === "menu") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "close") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "submit") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 20h8M16.5 3.5l4 4L8 20H4v-4L16.5 3.5z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "dashboard") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 13h7V4H4v9zm9 7h7V11h-7v9zM4 20h7v-5H4v5zm9-9h7V4h-7v7z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (name === "login") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M10 17l5-5-5-5M15 12H3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M21 3h-8a2 2 0 0 0-2 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M11 15v4a2 2 0 0 0 2 2h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "logout") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M14 7l5 5-5 5M19 12H9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M5 3h6a2 2 0 0 1 2 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M13 15v4a2 2 0 0 1-2 2H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "sparkle") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l1.4 5.1L18 9l-4.6 1.9L12 16l-1.4-5.1L6 9l4.6-1.9L12 2z" />
        <path d="M19 13l.9 3.2L23 17l-3.1 1.3L19 22l-.9-3.7L15 17l3.1-.8L19 13z" />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5z" />
    </svg>
  );
}

function NavLink({
  href,
  label,
  icon
}: {
  href: string;
  label: string;
  icon: "submit" | "dashboard" | "login" | "home";
}) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={`group relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold tracking-tight outline-none transition-all duration-200 ${
        isActive
          ? "bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-[0_10px_24px_-12px_rgba(124,58,237,0.55)]"
          : "text-slate-600 hover:bg-slate-900/[0.05] hover:text-slate-900"
      } focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2`}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon
        name={icon}
        className={isActive ? "text-white" : "text-slate-500 group-hover:text-slate-700"}
      />
      {label}
    </Link>
  );
}

export function Nav() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const handleLogout = useCallback(() => {
    setShowLogoutConfirm(false);
    setIsMobileOpen(false);
    logout();
    router.push("/login");
  }, [logout, router]);

  const links = useMemo(() => {
    if (!user) return [];
    if (user.role === "DEV")
      return [
        { href: "/submit", label: "Submit", icon: "submit" as const },
        { href: "/dashboard", label: "Dashboard", icon: "dashboard" as const }
      ];
    if (user.role === "TL") return [{ href: "/dashboard", label: "Squad", icon: "dashboard" as const }];
    return [{ href: "/dashboard", label: "Portfolio", icon: "dashboard" as const }];
  }, [user]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "border-b border-slate-200/70 bg-white/75 backdrop-blur-xl shadow-[0_8px_28px_-18px_rgba(30,27,75,0.3)]"
          : "border-b border-transparent bg-white/40 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="group inline-flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#4f46e5_0%,#7c3aed_55%,#c026d3_100%)] text-white shadow-[0_10px_24px_-10px_rgba(124,58,237,0.6)] transition-transform duration-300 group-hover:scale-[1.04]">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.55), transparent 60%)"
              }}
            />
            <Icon name="sparkle" className="h-[18px] w-[18px] text-white drop-shadow-sm" />
          </span>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight text-slate-900">
              Client<span className="gradient-text">Portal</span>
            </div>
            <div className="text-[11px] font-medium text-slate-500">Always up to date</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map((l) => (
            <NavLink key={l.href} href={l.href} label={l.label} icon={l.icon} />
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden items-center gap-2.5 rounded-full border border-slate-200/80 bg-white/85 px-3 py-1.5 text-xs shadow-sm backdrop-blur-sm sm:flex">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="font-semibold text-slate-800">{user.name}</span>
                <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700 ring-1 ring-inset ring-indigo-200/80">
                  {user.role}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200/80 bg-white/85 px-3.5 text-[13px] font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-[1px] hover:border-slate-300 hover:bg-white hover:shadow-md focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 md:inline-flex"
              >
                <Icon name="logout" />
                Logout
              </button>
            </>
          ) : (
            <NavLink href="/login" label="Sign in" icon="login" />
          )}

          {user ? (
            <button
              type="button"
              onClick={() => setIsMobileOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/85 text-slate-700 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 md:hidden"
              aria-label={isMobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileOpen}
            >
              <Icon name={isMobileOpen ? "close" : "menu"} className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Mobile panel */}
      {user ? (
        <div
          className={`md:hidden overflow-hidden border-t border-slate-200/70 bg-white/90 backdrop-blur-xl transition-all duration-300 ${
            isMobileOpen ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="mx-auto max-w-6xl space-y-3 px-4 py-4">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">{user.name}</div>
                <div className="truncate text-xs text-slate-600">{user.email}</div>
              </div>
              <div className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700 shadow-sm ring-1 ring-inset ring-indigo-200">
                {user.role}
              </div>
            </div>

            <nav className="grid gap-2" aria-label="Mobile primary">
              {links.map((l) => (
                <NavLink key={l.href} href={l.href} label={l.label} icon={l.icon} />
              ))}
            </nav>

            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <Icon name="logout" />
              Logout
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={showLogoutConfirm}
        title="Logout"
        description="You are about to end your session."
        confirmLabel="Logout"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </header>
  );
}
