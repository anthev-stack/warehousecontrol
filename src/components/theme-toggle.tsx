"use client";

import { useTheme } from "@/components/theme-provider";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-sm">
        …
      </span>
    );
  }
  const next = resolvedTheme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-accent-muted"
      aria-label="Toggle color theme"
    >
      {theme === "system" ? "System" : resolvedTheme === "dark" ? "Dark" : "Light"}
      <span className="ml-2 text-muted">⇄</span>
    </button>
  );
}
