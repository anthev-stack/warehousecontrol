import Link from "next/link";
import type { parseListView } from "@/lib/part-kind";

export type PartsListView = ReturnType<typeof parseListView>;

const tabs: { view: PartsListView; label: string; href: string }[] = [
  { view: "all", label: "All", href: "/parts" },
  { view: "parts", label: "Parts", href: "/parts?view=parts" },
  { view: "products", label: "Products", href: "/parts?view=products" },
  { view: "assemblies", label: "Assemblies", href: "/parts?view=assemblies" },
];

export function PartsListTabs({
  active,
  counts,
}: {
  active: PartsListView;
  counts: { all: number; parts: number; products: number; assemblies: number };
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-border pb-3">
      {tabs.map((tab) => {
        const isActive = active === tab.view;
        const count =
          tab.view === "all"
            ? counts.all
            : tab.view === "parts"
              ? counts.parts
              : tab.view === "products"
                ? counts.products
                : counts.assemblies;
        return (
          <Link
            key={tab.view}
            href={tab.href}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-accent-muted text-foreground"
                : "text-muted hover:bg-accent-muted/60 hover:text-foreground"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 tabular-nums text-xs opacity-80">({count})</span>
          </Link>
        );
      })}
    </div>
  );
}
