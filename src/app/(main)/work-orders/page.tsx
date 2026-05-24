import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { DeleteButton } from "@/components/delete-button";
import { CreateWorkOrderSection } from "@/components/create-work-order-section";
import { deleteWorkOrderAction } from "@/actions/work-orders";
import { productionKindFromFg, productionKindLabel } from "@/lib/production-kind";

export default async function WorkOrdersPage() {
  const [session, orders, productBoms, assemblyBoms] = await Promise.all([
    getSession(),
    prisma.workOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: { bom: { include: { finishedGood: true } } },
      take: 50,
    }),
    prisma.bom.findMany({
      where: { active: true, finishedGood: { isManufactured: true } },
      orderBy: { name: "asc" },
      include: { finishedGood: true, lines: true },
    }),
    prisma.bom.findMany({
      where: { active: true, finishedGood: { isAssembly: true } },
      orderBy: { name: "asc" },
      include: { finishedGood: true, lines: true },
    }),
  ]);

  const canPlan = session && (session.role === "ADMIN" || session.role === "PRODUCTION");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Work orders</h1>
        <p className="mt-1 text-sm text-muted">
          Plan manufacturing by creating work orders for products or assemblies. Fulfill them on
          Product production or Assembly production.
        </p>
      </div>

      {canPlan ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <CreateWorkOrderSection kind="product" boms={productBoms} />
          <CreateWorkOrderSection kind="assembly" boms={assemblyBoms} />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Recent work orders</h2>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-accent-muted/40 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">WO</th>
              <th className="px-4 py-3">Production type</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Fulfill on</th>
              {canPlan ? <th className="px-4 py-3">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={canPlan ? 7 : 6}
                  className="px-4 py-8 text-center text-sm text-muted"
                >
                  No work orders yet.
                </td>
              </tr>
            ) : (
              orders.map((w) => {
                const kind = productionKindFromFg(w.bom.finishedGood);
                return (
                  <tr key={w.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/work-orders/${w.id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {w.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs">{productionKindLabel(kind)}</td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">{w.bom.finishedGood.sku}</div>
                      <div className="text-xs text-muted">{w.bom.finishedGood.name}</div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{w.qty}</td>
                    <td className="px-4 py-3 text-xs">{w.status}</td>
                    <td className="px-4 py-3">
                      <Link href="/production" className="text-xs text-accent hover:underline">
                        Production
                      </Link>
                    </td>
                    {canPlan ? (
                      <td className="px-4 py-3">
                        <DeleteButton
                          id={w.id}
                          action={deleteWorkOrderAction}
                          confirmMessage={`Delete work order ${w.number}? This cannot be undone.`}
                        />
                      </td>
                    ) : null}
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
