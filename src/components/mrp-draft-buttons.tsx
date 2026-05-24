"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MrpSuggestion } from "@/actions/purchase-orders";
import { createDraftPoFromSuggestions } from "@/actions/purchase-orders";

type Group = {
  vendorId: string;
  vendorName: string;
  lines: MrpSuggestion[];
};

function groupSuggestions(rows: MrpSuggestion[]): Group[] {
  const map = new Map<string, Group>();
  for (const row of rows) {
    if (!row.vendorId) continue;
    const key = row.vendorId;
    const existing = map.get(key);
    if (existing) {
      existing.lines.push(row);
    } else {
      map.set(key, {
        vendorId: row.vendorId,
        vendorName: row.vendorName ?? "Vendor",
        lines: [row],
      });
    }
  }
  return Array.from(map.values());
}

export function MrpDraftButtons({ suggestions }: { suggestions: MrpSuggestion[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const groups = groupSuggestions(suggestions);

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {groups.length === 0 ? (
        <p className="text-sm text-muted">
          No vendor-aligned suggestions yet. Set default vendors on purchased parts to enable one-click draft POs.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <button
              key={g.vendorId}
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  try {
                    await createDraftPoFromSuggestions({
                      vendorId: g.vendorId,
                      needsApproval: true,
                      lines: g.lines.map((l) => ({
                        partId: l.partId,
                        qty: l.reorderQty,
                        unitCost: l.unitCost,
                      })),
                    });
                    router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Could not create PO.");
                  }
                });
              }}
              className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Draft PO · {g.vendorName} ({g.lines.length} lines)
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
