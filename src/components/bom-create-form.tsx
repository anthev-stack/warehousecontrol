"use client";

import { ActionForm } from "@/components/action-form";
import { DynamicLineFields, type LineOption } from "@/components/dynamic-line-fields";
import { createBom } from "@/actions/catalog";

export function BomCreateForm({
  fgParts,
  componentParts,
}: {
  fgParts: LineOption[];
  componentParts: LineOption[];
}) {
  return (
    <ActionForm action={createBom} className="mt-4 space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="revision">
            Revision
          </label>
          <input
            id="revision"
            name="revision"
            placeholder="A"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="finishedGoodPartId">
            Finished good (product)
          </label>
          <select
            id="finishedGoodPartId"
            name="finishedGoodPartId"
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Select product…
            </option>
            {fgParts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" name="isConfigurable" className="h-4 w-4" />
          Configurable BOM (optional component lines allowed)
        </label>
      </div>
      <DynamicLineFields variant="bom" options={componentParts} />
      <button
        type="submit"
        className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
      >
        Save BOM
      </button>
    </ActionForm>
  );
}
