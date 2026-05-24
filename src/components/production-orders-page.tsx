import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { productionKindFromFg, productionKindLabel } from "@/lib/production-kind";

export async function ProductionOrdersPage() {
  const [session, orders] = await Promise.all([
    getSession(),
    prisma.workOrder.findMany({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { bom: { include: { finishedGood: true } } },
    }),
  ]);

  const canPlan = session && (session.role === "ADMIN" || session.role === "PRODUCTION");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Production</h1>
        <p className="mt-1 text-sm text-muted">
          Release work orders, issue materials, and complete builds for products and assemblies.
          Create new work orders on the Work orders tab.
        </p>
        {canPlan ? (
          <p className="mt-2 text-sm">
            <Link href="/work-orders" className="font-medium text-accent hover:underline">
              Work orders
            </Link>
            <span className="text-muted"> — create product or assembly work orders</span>
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-accent-muted/40 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">WO</th>
              <th className="px-4 py-3">Production type</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">
                  No open work orders. Create one under Work orders, then return here to fulfill it.
                </td>
              </tr>
            ) : (
              orders.map((w) => {
                const kind = productionKindFromFg(w.bom.finishedGood);
                return (
                  <tr key={w.id} className="hover:bg-accent-muted/20">
                    <td className="px-4 py-3">
                      <Link
                        href={`/work-orders/${w.id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {w.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium capitalize">
                      {productionKindLabel(kind)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">{w.bom.finishedGood.sku}</div>
                      <div className="text-xs text-muted">{w.bom.finishedGood.name}</div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{w.qty}</td>
                    <td className="px-4 py-3 text-xs font-medium">{w.status}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
