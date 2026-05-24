"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canAccessArea, roleTitle } from "@/lib/access";
import type { SessionUser } from "@/lib/auth/session";
import { ThemeToggle } from "@/components/theme-toggle";

const nav: { href: string; label: string; area: "purchasing" | "production" | "admin" | "sales" | "inventory" | "time" }[] =
  [
    { href: "/dashboard", label: "Dashboard", area: "inventory" },
    { href: "/parts", label: "Parts & products", area: "inventory" },
    { href: "/inventory", label: "Inventory", area: "inventory" },
    { href: "/work-orders", label: "Work orders", area: "production" },
    { href: "/production", label: "Production", area: "production" },
    { href: "/mrp", label: "MRP", area: "inventory" },
    { href: "/vendors", label: "Vendors", area: "purchasing" },
    { href: "/purchase-orders", label: "Purchase orders", area: "purchasing" },
    { href: "/receive", label: "Receive goods", area: "purchasing" },
    { href: "/sales", label: "Sales", area: "sales" },
    { href: "/time", label: "Time & labor", area: "time" },
    { href: "/admin/users", label: "Users (admin)", area: "admin" },
  ];

export function AppShell({ session, children }: { session: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const links = nav.filter((item) => canAccessArea(session.role, item.area));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card p-4 md:flex">
        <div className="mb-6">
          <div className="text-sm font-semibold tracking-tight">Manufacturing ERP</div>
          <div className="mt-1 text-xs text-muted">{roleTitle(session.role)}</div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 text-sm">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-2 transition ${
                  active
                    ? "bg-accent-muted font-medium text-foreground"
                    : "text-muted hover:bg-accent-muted/60 hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 space-y-2 border-t border-border pt-4 text-xs text-muted">
          <div className="truncate font-medium text-foreground">{session.name}</div>
          <div className="truncate">{session.email}</div>
        </div>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex flex-1 items-center gap-2 md:hidden">
            <span className="text-sm font-semibold">ERP</span>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent-muted"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
        <nav className="sticky bottom-0 flex border-t border-border bg-card/95 px-2 py-2 text-xs md:hidden">
          {links.slice(0, 4).map((l) => (
            <Link key={l.href} href={l.href} className="flex-1 px-2 py-2 text-center text-muted">
              {l.label}
            </Link>
          ))}
          <Link href="/dashboard" className="flex-1 px-2 py-2 text-center font-medium">
            Home
          </Link>
        </nav>
      </div>
    </div>
  );
}
