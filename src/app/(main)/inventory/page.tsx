import { prisma } from "@/lib/db";
import { PartTypeBadges } from "@/components/part-type-badges";

export default async function InventoryPage() {
  const [movements, parts] = await Promise.all([
    prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 75,
      include: { part: true },
    }),
    prisma.part.findMany({ orderBy: { sku: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory &amp; movement</h1>
        <p className="mt-1 text-sm text-muted">
          Every receipt, work-order issue, finished-good receipt, and sales shipment flows through inventory with a full
          audit trail.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {parts.map((p) => (
          <div key={p.id} id={p.id} className="rounded-xl border border-border bg-card p-4 shadow-sm scroll-mt-24">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <div className="font-mono text-xs text-muted">{p.sku}</div>
                <div className="font-medium">{p.name}</div>
                <div className="mt-1">
                  <PartTypeBadges flags={p} />
                </div>
              </div>
              <div className="text-right text-sm tabular-nums">
                <div className="text-lg font-semibold">
                  {p.onHand} {p.unit}
                </div>
                <div className="text-xs text-muted">Avg ${p.avgLandedCost.toFixed(2)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Recent stock movements</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-accent-muted/40 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Part</th>
                <th className="px-4 py-3">Δ</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 text-xs text-muted">{m.createdAt.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs">{m.part.sku}</div>
                    <div className="text-xs text-muted">{m.part.name}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium">{m.qtyDelta > 0 ? `+${m.qtyDelta}` : m.qtyDelta}</td>
                  <td className="px-4 py-3 text-xs">{m.type}</td>
                  <td className="px-4 py-3 text-xs text-muted">{m.reference ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
