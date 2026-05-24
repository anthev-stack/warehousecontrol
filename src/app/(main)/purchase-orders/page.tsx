import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { PoCreateForm } from "@/components/po-create-form";
import { DeleteButton } from "@/components/delete-button";
import { deletePurchaseOrderAction } from "@/actions/purchase-orders";

export default async function PurchaseOrdersPage() {
  const [session, pos, vendors, parts] = await Promise.all([
    getSession(),
    prisma.purchaseOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: { vendor: true, lines: { include: { part: true } } },
    }),
    prisma.vendor.findMany({ orderBy: { name: "asc" } }),
    prisma.part.findMany({ where: { isPurchased: true }, orderBy: { sku: "asc" } }),
  ]);

  const canBuy = session && (session.role === "ADMIN" || session.role === "PURCHASING");
  const partOptions = parts.map((p) => ({ id: p.id, label: `${p.sku} — ${p.name}` }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Purchase orders</h1>
        <p className="mt-1 text-sm text-muted">
          Draft, optional approvals, and status that flows into receiving and inventory valuation.
        </p>
      </div>

      {canBuy ? (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">New purchase order (draft)</h2>
          <PoCreateForm vendors={vendors} parts={partOptions} />
        </section>
      ) : null}

      <div className="space-y-4">
        {pos.map((po) => (
          <article
            key={po.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <Link
              href={`/purchase-orders/${po.id}`}
              className="min-w-0 flex-1 transition hover:border-accent"
            >
              <div className="font-semibold">{po.number}</div>
              <div className="text-sm text-muted">{po.vendor.name}</div>
              <div className="mt-2 text-xs text-muted">
                {po.status}
                {po.needsApproval ? ` · approval ${po.approvedAt ? "approved" : "pending"}` : ""}
              </div>
              <div className="mt-1 text-xs text-muted">
                {po.lines.length} line(s) · expected{" "}
                {po.expectedDate ? po.expectedDate.toLocaleDateString() : "TBD"}
              </div>
            </Link>
            {canBuy && po.status === "DRAFT" ? (
              <DeleteButton
                id={po.id}
                action={deletePurchaseOrderAction}
                confirmMessage={`Delete draft ${po.number}?`}
              />
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
