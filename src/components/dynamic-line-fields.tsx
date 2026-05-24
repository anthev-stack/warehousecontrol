"use client";

import { useCallback, useMemo, useState } from "react";

export type LineOption = { id: string; label: string };

type Variant = "po" | "bom";

function rowHasContent(variant: Variant, index: number, getValue: (name: string) => string): boolean {
  if (variant === "po") {
    return getValue(`partId_${index}`).length > 0;
  }
  return getValue(`linePart_${index}`).length > 0;
}

export function DynamicLineFields({
  variant,
  options,
  initialRows = 1,
  hideHeader = false,
}: {
  variant: Variant;
  options: LineOption[];
  initialRows?: number;
  /** When true, parent supplies the section title (e.g. Bill of material). */
  hideHeader?: boolean;
}) {
  const [rowCount, setRowCount] = useState(Math.max(1, initialRows));
  const [values, setValues] = useState<Record<string, string>>({});

  const setField = useCallback((name: string, value: string) => {
    const m = name.match(/^(?:partId|linePart)_(\d+)$/);
    if (m && value.length > 0) {
      const idx = Number(m[1]);
      setRowCount((c) => (idx === c - 1 ? c + 1 : c));
    }
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const getValue = useCallback((name: string) => values[name] ?? "", [values]);

  const rows = useMemo(() => Array.from({ length: rowCount }, (_, i) => i), [rowCount]);

  const removeRow = (index: number) => {
    if (rowCount <= 1) return;
    setValues((prev) => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        const pm = k.match(/^(partId|qty|unitCost|linePart|lineQty|lineOptional)_(\d+)$/);
        if (!pm) continue;
        const field = pm[1];
        const idx = Number(pm[2]);
        if (idx === index) continue;
        const newIdx = idx > index ? idx - 1 : idx;
        next[`${field}_${newIdx}`] = v;
      }
      return next;
    });
    setRowCount((c) => c - 1);
  };

  return (
    <div className="space-y-2">
      <input type="hidden" name="lineCount" value={String(rowCount)} />
      {!hideHeader ? (
        <>
          <div className="text-sm font-semibold">{variant === "po" ? "Lines" : "Components"}</div>
          <p className="text-xs text-muted">
            A new blank line appears after you select a part on the current row.
          </p>
        </>
      ) : (
        <p className="text-xs text-muted">
          A new blank line appears after you select a part on the current row.
        </p>
      )}
      {rows.map((i) => (
        <div
          key={i}
          className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-12 md:items-end"
        >
          {variant === "po" ? (
            <>
              <div className="md:col-span-5">
                <label className="text-xs font-medium text-muted" htmlFor={`partId_${i}`}>
                  Part
                </label>
                <select
                  id={`partId_${i}`}
                  name={`partId_${i}`}
                  value={getValue(`partId_${i}`)}
                  onChange={(e) => setField(`partId_${i}`, e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                >
                  <option value="">Select part…</option>
                  {options.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-medium text-muted" htmlFor={`qty_${i}`}>
                  Qty
                </label>
                <input
                  id={`qty_${i}`}
                  name={`qty_${i}`}
                  type="number"
                  step="0.01"
                  value={getValue(`qty_${i}`)}
                  onChange={(e) => setField(`qty_${i}`, e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-medium text-muted" htmlFor={`unitCost_${i}`}>
                  Unit cost
                </label>
                <input
                  id={`unitCost_${i}`}
                  name={`unitCost_${i}`}
                  type="number"
                  step="0.01"
                  value={getValue(`unitCost_${i}`)}
                  onChange={(e) => setField(`unitCost_${i}`, e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                />
              </div>
            </>
          ) : (
            <>
              <div className="md:col-span-5">
                <label className="text-xs font-medium text-muted" htmlFor={`linePart_${i}`}>
                  Part
                </label>
                <select
                  id={`linePart_${i}`}
                  name={`linePart_${i}`}
                  value={getValue(`linePart_${i}`)}
                  onChange={(e) => setField(`linePart_${i}`, e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                >
                  <option value="">Select part…</option>
                  {options.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="text-xs font-medium text-muted" htmlFor={`lineQty_${i}`}>
                  Qty / FG
                </label>
                <input
                  id={`lineQty_${i}`}
                  name={`lineQty_${i}`}
                  type="number"
                  step="0.0001"
                  value={getValue(`lineQty_${i}`)}
                  onChange={(e) => setField(`lineQty_${i}`, e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-xs md:col-span-3">
                <input type="checkbox" name={`lineOptional_${i}`} className="h-4 w-4" />
                Optional
              </label>
            </>
          )}
          <div className="flex md:col-span-1 md:justify-end">
            {rowCount > 1 && rowHasContent(variant, i, getValue) ? (
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-xs text-muted hover:text-foreground"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
