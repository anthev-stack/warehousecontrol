import { prisma } from "@/lib/db";
import { ActionForm } from "@/components/action-form";
import { createSalesOrderDraft, salesOrderIntentForm } from "@/actions/sales";

export default async function SalesPage() {
  const [orders, parts] = await Promise.all([
    prisma.salesOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: { lines: { include: { part: true } } },
    }),
    prisma.part.findMany({ where: { active: true }, orderBy: { sku: "asc" } }),
  ]);

  const fg = parts.filter((p) => p.isManufactured);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sales orders</h1>
        <p className="mt-1 text-sm text-muted">
          Confirmed orders reserve demand; shipping deducts finished goods inventory and feeds the next MRP cycle.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">New sales order</h2>
        <ActionForm action={createSalesOrderDraft} className="mt-4 grid gap-3 md:max-w-xl">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="customerName">
              Customer
            </label>
            <input
              id="customerName"
              name="customerName"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="partId">
              Finished good (product)
            </label>
            <select
              id="partId"
              name="partId"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select part…
              </option>
              {fg.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="qty">
              Quantity
            </label>
            <input
              id="qty"
              name="qty"
              type="number"
              step="0.01"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="unitPrice">
              Unit price
            </label>
            <input
              id="unitPrice"
              name="unitPrice"
              type="number"
              step="0.01"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Save draft SO
          </button>
        </ActionForm>
      </section>

      <div className="space-y-4">
        {orders.map((o) => (
          <article key={o.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{o.number}</div>
                <div className="text-sm text-muted">{o.customerName}</div>
                <div className="mt-2 text-xs text-muted">Status: {o.status}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {o.status === "DRAFT" ? (
                  <form action={salesOrderIntentForm}>
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="intent" value="confirm" />
                    <button
                      type="submit"
                      className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent-muted"
                    >
                      Confirm
                    </button>
                  </form>
                ) : null}
                {o.status === "CONFIRMED" ? (
                  <form action={salesOrderIntentForm}>
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="intent" value="ship" />
                    <button
                      type="submit"
                      className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                    >
                      Ship &amp; deduct stock
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {o.lines.map((l) => (
                <li key={l.id}>
                  {l.qty} × {l.part.sku} @ ${l.unitPrice.toFixed(2)}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
