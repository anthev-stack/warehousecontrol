"use client";

import { ActionForm } from "@/components/action-form";
import { DynamicLineFields, type LineOption } from "@/components/dynamic-line-fields";
import { createPurchaseOrderDraft } from "@/actions/purchase-orders";

export function PoCreateForm({
  vendors,
  parts,
}: {
  vendors: { id: string; name: string }[];
  parts: LineOption[];
}) {
  return (
    <ActionForm action={createPurchaseOrderDraft} className="mt-4 space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="vendorId">
            Vendor
          </label>
          <select
            id="vendorId"
            name="vendorId"
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Select vendor…
            </option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <label className="mt-6 flex items-center gap-2 text-sm md:mt-8">
          <input type="checkbox" name="needsApproval" className="h-4 w-4" />
          Require approval before submit
        </label>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <DynamicLineFields variant="po" options={parts} />
      <button
        type="submit"
        className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
      >
        Save draft PO
      </button>
    </ActionForm>
  );
}
