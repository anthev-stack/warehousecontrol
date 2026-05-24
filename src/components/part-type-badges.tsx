import { partKindLabels, type PartKindFlags } from "@/lib/part-kind";

function badgeClass(label: string): string {
  if (label === "Product") {
    return "rounded-md bg-accent-muted px-2 py-0.5 font-medium";
  }
  if (label === "Assembly") {
    return "rounded-md border border-accent/30 bg-white px-2 py-0.5 font-medium text-accent dark:bg-white dark:text-accent";
  }
  return "rounded-md border border-border px-2 py-0.5 text-muted";
}

export function PartTypeBadges({ flags }: { flags: PartKindFlags }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {partKindLabels(flags).map((label) => (
        <span key={label} className={badgeClass(label)}>
          {label}
        </span>
      ))}
    </div>
  );
}
