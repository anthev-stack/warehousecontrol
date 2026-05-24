import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { DeleteButton } from "@/components/delete-button";
import { deletePurchaseOrderAction, purchaseOrderIntentAction } from "@/actions/purchase-orders";

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [session, po] = await Promise.all([
    getSession(),
    prisma.purchaseOrder.findUnique({
      where: { id },
      include: { vendor: true, lines: { include: { part: true } }, receipts: true },
    }),
  ]);

  if (!po) notFound();

  const canBuy = session && (session.role === "ADMIN" || session.role === "PURCHASING");

  return (
    <div className="space-y-8">
      <div>
        <Link href="/purchase-orders" className="text-sm font-medium text-accent">
          ← Purchase orders
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{po.number}</h1>
            <p className="mt-1 text-sm text-muted">
              {po.vendor.name} · {po.status}
              {po.needsApproval ? (
                <span> · approval {po.approvedAt ? "cleared" : "pending"}</span>
              ) : null}
            </p>
            {po.notes ? <p className="mt-2 text-sm">{po.notes}</p> : null}
          </div>
          {canBuy ? (
            <div className="flex flex-wrap gap-2">
              {po.status === "DRAFT" ? (
                <DeleteButton
                  id={po.id}
                  action={deletePurchaseOrderAction}
                  confirmMessage={`Delete draft ${po.number}?`}
                />
              ) : null}
              {po.needsApproval && !po.approvedAt ? (
                <form action={purchaseOrderIntentAction}>
                  <input type="hidden" name="id" value={po.id} />
                  <input type="hidden" name="intent" value="approve" />
                  <button
                    type="submit"
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent-muted"
                  >
                    Approve PO
                  </button>
                </form>
              ) : null}
              {po.status === "DRAFT" ? (
                <form action={purchaseOrderIntentAction}>
                  <input type="hidden" name="id" value={po.id} />
                  <input type="hidden" name="intent" value="submit" />
                  <button
                    type="submit"
                    className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Submit to vendor
                  </button>
                </form>
              ) : null}
              {po.status !== "CANCELLED" && po.status !== "RECEIVED" ? (
                <form action={purchaseOrderIntentAction}>
                  <input type="hidden" name="id" value={po.id} />
                  <input type="hidden" name="intent" value="cancel" />
                  <button
                    type="submit"
                    className="rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-700 dark:text-red-200"
                  >
                    Cancel
                  </button>
                </form>
              ) : null}
              {po.status === "SUBMITTED" || po.status === "PARTIALLY_RECEIVED" ? (
                <Link
                  href={`/receive/${po.id}`}
                  className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent-muted"
                >
                  Receive goods
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-accent-muted/40 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Part</th>
              <th className="px-4 py-3">Ordered</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Unit cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {po.lines.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3">
                  <div className="font-mono text-xs">{l.part.sku}</div>
                  <div className="text-xs text-muted">{l.part.name}</div>
                </td>
                <td className="px-4 py-3 tabular-nums">{l.qtyOrdered}</td>
                <td className="px-4 py-3 tabular-nums">{l.qtyReceived}</td>
                <td className="px-4 py-3 tabular-nums">${l.unitCost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {po.receipts.length ? (
        <section className="rounded-xl border border-border bg-card p-6 text-sm shadow-sm">
          <h2 className="text-lg font-semibold">Receipt history</h2>
          <ul className="mt-3 space-y-2 text-muted">
            {po.receipts.map((r) => (
              <li key={r.id}>
                {r.receivedAt.toLocaleString()}
                {r.note ? ` — ${r.note}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
