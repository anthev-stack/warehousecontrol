import { ActionForm } from "@/components/action-form";
import { createWorkOrder } from "@/actions/work-orders";
import { productionTitle, type ProductionKind } from "@/lib/production-kind";

type BomOption = {
  id: string;
  finishedGood: { sku: string; name: string };
  lines: { id: string }[];
};

const copy: Record<ProductionKind, { fgLabel: string }> = {
  product: { fgLabel: "Product" },
  assembly: { fgLabel: "Assembly" },
};

function EmptyBillOfMaterialMessage({ kind }: { kind: ProductionKind }) {
  const noun = kind === "product" ? "product" : "assembly";
  const action =
    kind === "product"
      ? "Create a product with components on Parts & products."
      : "Create an assembly with required parts on Parts & products.";
  return (
    <p className="mt-3 text-sm text-muted">
      No {noun}{" "}
      <span className="font-semibold text-foreground">bill of material</span> yet. {action}
    </p>
  );
}

export function CreateWorkOrderSection({
  kind,
  boms,
}: {
  kind: ProductionKind;
  boms: BomOption[];
}) {
  const text = copy[kind];

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{productionTitle(kind)}</h2>
      {boms.length === 0 ? (
        <EmptyBillOfMaterialMessage kind={kind} />
      ) : (
        <ActionForm action={createWorkOrder} className="mt-4 space-y-3">
          <input type="hidden" name="productionKind" value={kind} />
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor={`bomId-${kind}`}>
              {text.fgLabel}
            </label>
            <select
              id={`bomId-${kind}`}
              name="bomId"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select {text.fgLabel.toLowerCase()}…
              </option>
              {boms.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.finishedGood.sku} — {b.finishedGood.name} ({b.lines.length} components)
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor={`qty-${kind}`}>
              Quantity to build
            </label>
            <input
              id={`qty-${kind}`}
              name="qty"
              type="number"
              step="0.01"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor={`notes-${kind}`}>
              Notes
            </label>
            <textarea
              id={`notes-${kind}`}
              name="notes"
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Create draft work order
          </button>
        </ActionForm>
      )}
    </section>
  );
}
