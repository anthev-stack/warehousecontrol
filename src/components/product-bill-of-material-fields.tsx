"use client";

import { useCallback, useState } from "react";
import type { LineOption } from "@/components/dynamic-line-fields";

type Row = { key: string; kind: "part" | "assembly" };

export function ProductBillOfMaterialFields({
  partOptions,
  assemblyOptions,
}: {
  partOptions: LineOption[];
  assemblyOptions: LineOption[];
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});

  const setField = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const getValue = useCallback((name: string) => values[name] ?? "", [values]);

  const addRow = (kind: Row["kind"]) => {
    setRows((prev) => [...prev, { key: crypto.randomUUID(), kind }]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setValues((prev) => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        const m = k.match(/^(linePart|lineQty|lineOptional)_(\d+)$/);
        if (!m) continue;
        const field = m[1];
        const idx = Number(m[2]);
        if (idx === index) continue;
        const newIdx = idx > index ? idx - 1 : idx;
        next[`${field}_${newIdx}`] = v;
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name="lineCount" value={String(rows.length)} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => addRow("part")}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent-muted"
        >
          Add part
        </button>
        <button
          type="button"
          onClick={() => addRow("assembly")}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent-muted"
        >
          Add assembly
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted">
          Add purchased parts and sub-assemblies to the bill of material.
        </p>
      ) : null}
      {rows.map((row, i) => {
        const options = row.kind === "part" ? partOptions : assemblyOptions;
        const label = row.kind === "part" ? "Part" : "Assembly";
        return (
          <div
            key={row.key}
            className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-12 md:items-end"
          >
            <div className="md:col-span-5">
              <label className="text-xs font-medium text-muted" htmlFor={`linePart_${i}`}>
                {label}
              </label>
              <select
                id={`linePart_${i}`}
                name={`linePart_${i}`}
                required
                value={getValue(`linePart_${i}`)}
                onChange={(e) => setField(`linePart_${i}`, e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
              >
                <option value="">Select {label.toLowerCase()}…</option>
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
                required
                value={getValue(`lineQty_${i}`)}
                onChange={(e) => setField(`lineQty_${i}`, e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-xs md:col-span-3">
              <input type="checkbox" name={`lineOptional_${i}`} className="h-4 w-4" />
              Optional
            </label>
            <div className="flex md:col-span-1 md:justify-end">
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-xs text-muted hover:text-foreground"
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
