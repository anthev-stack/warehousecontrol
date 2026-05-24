"use client";

import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { createPart } from "@/actions/catalog";
import { DynamicLineFields, type LineOption } from "@/components/dynamic-line-fields";
import { ProductBillOfMaterialFields } from "@/components/product-bill-of-material-fields";
import type { PartKind } from "@/lib/part-kind";

const createTabs: { kind: PartKind; label: string }[] = [
  { kind: "purchased", label: "Create part" },
  { kind: "manufactured", label: "Create product" },
  { kind: "assembly", label: "Create assembly" },
];

const kindHelp: Record<PartKind, string> = {
  purchased: "Items you buy complete from vendors (nuts, bolts, raw components).",
  manufactured:
    "Final products you build and ship. Define components below — product production work orders use this bill of material.",
  assembly:
    "Sub-assemblies built in-house from purchased parts. List required parts below — assembly production work orders pull from this bill of material.",
};

export function AddPartForm({
  vendors,
  purchasedComponents,
  assemblyComponents,
  initialKind = "purchased",
}: {
  vendors: { id: string; name: string }[];
  purchasedComponents: LineOption[];
  assemblyComponents: LineOption[];
  initialKind?: PartKind;
}) {
  const [kind, setKind] = useState<PartKind>(initialKind);

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {createTabs.map((tab) => (
          <button
            key={tab.kind}
            type="button"
            onClick={() => setKind(tab.kind)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              kind === tab.kind
                ? "bg-accent-muted text-foreground"
                : "text-muted hover:bg-accent-muted/60 hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm text-muted">{kindHelp[kind]}</p>

      <ActionForm action={createPart} className="mt-4 grid gap-3 md:grid-cols-2">
        <input type="hidden" name="partKind" value={kind} />
        <Field label="SKU" name="sku" required />
        <Field label="Name" name="name" required />
        <Field label="Unit" name="unit" placeholder="ea" />
        <Field label="On hand" name="onHand" type="number" step="0.01" />
        {kind === "purchased" ? (
          <>
            <Field label="Reorder point" name="reorderPoint" type="number" step="0.01" />
            <Field label="Reorder qty" name="reorderQty" type="number" step="0.01" />
            <Field label="Avg landed cost" name="avgLandedCost" type="number" step="0.01" />
          </>
        ) : null}
        {kind === "manufactured" ? (
          <Field label="Price" name="price" type="number" step="0.01" />
        ) : null}
        {kind === "assembly" ? (
          <div className="md:col-span-2 space-y-2 border-t border-border pt-4">
            <h3 className="text-sm font-semibold">Bill of material</h3>
            <p className="text-xs text-muted">
              Purchased parts consumed when you run assembly production work orders.
            </p>
            <DynamicLineFields
              variant="bom"
              options={purchasedComponents}
              initialRows={1}
              hideHeader
            />
          </div>
        ) : null}
        {kind === "manufactured" ? (
          <div className="md:col-span-2 space-y-2 border-t border-border pt-4">
            <h3 className="text-sm font-semibold">Bill of material</h3>
            <ProductBillOfMaterialFields
              partOptions={purchasedComponents}
              assemblyOptions={assemblyComponents}
            />
          </div>
        ) : null}
        {kind === "purchased" ? (
          <div className="flex flex-col justify-end gap-2 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="defaultVendorId">
              Default vendor
            </label>
            <select
              id="defaultVendorId"
              name="defaultVendorId"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="">— none —</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Save {kind === "manufactured" ? "product" : kind === "assembly" ? "assembly" : "part"}
          </button>
        </div>
      </ActionForm>
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium" htmlFor={`${name}-${label}`}>
        {label}
      </label>
      <input
        id={`${name}-${label}`}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        step={step}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
      />
    </div>
  );
}
