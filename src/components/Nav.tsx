"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";

function Icon({
  name,
  className
}: {
  name: "home" | "submit" | "dashboard" | "login" | "logout" | "menu" | "close";
  className?: string;
}) {
  const common = "h-4 w-4";
  const cls = `${common} ${className ?? ""}`;
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
        <path
          d="M21 3h-8a2 2 0 0 0-2 2v4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M11 15v4a2 2 0 0 0 2 2h8"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
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
        <path
          d="M5 3h6a2 2 0 0 1 2 2v4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M13 15v4a2 2 0 0 1-2 2H5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5z"
        fill="currentColor"
      />
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
      className={`group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold outline-none transition ${
        isActive
          ? "bg-slate-900 text-white shadow-sm"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
      } focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2`}
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

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="group inline-flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white shadow-sm transition group-hover:shadow">
            <Icon name="home" className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">Client Updates</div>
            <div className="text-xs text-slate-500">Always up to date</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex" aria-label="Primary">
          {links.map((l) => (
            <NavLink key={l.href} href={l.href} label={l.label} icon={l.icon} />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                <span className="font-medium">{user.name}</span>
                <span className="text-slate-500">· {user.role}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 md:inline-flex"
              >
                <Icon name="logout" />
                Logout
              </button>
            </>
          ) : (
            <NavLink href="/login" label="Login" icon="login" />
          )}

          {user ? (
            <button
              type="button"
              onClick={() => setIsMobileOpen((v) => !v)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 md:hidden"
              aria-label={isMobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileOpen}
            >
              <Icon name={isMobileOpen ? "close" : "menu"} className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>

      {user ? (
        <div
          className={`md:hidden ${
            isMobileOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          } overflow-hidden border-t border-slate-200 bg-white transition-all duration-200`}
        >
          <div className="mx-auto max-w-6xl space-y-2 px-4 py-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">{user.name}</div>
                <div className="text-xs text-slate-600">{user.email}</div>
              </div>
              <div className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm">
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
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              <Icon name="logout" />
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
