import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function ReceiveIndexPage() {
  const pos = await prisma.purchaseOrder.findMany({
    where: { status: { in: ["SUBMITTED", "PARTIALLY_RECEIVED"] } },
    orderBy: { updatedAt: "desc" },
    include: { vendor: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Receive goods</h1>
        <p className="mt-1 text-sm text-muted">
          Post receipts against open purchase orders. Inventory and average landed cost update automatically.
        </p>
      </div>

      <div className="space-y-3">
        {pos.length === 0 ? (
          <p className="text-sm text-muted">No purchase orders waiting for receipts.</p>
        ) : (
          pos.map((po) => (
            <Link
              key={po.id}
              href={`/receive/${po.id}`}
              className="block rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-accent"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{po.number}</div>
                  <div className="text-sm text-muted">{po.vendor.name}</div>
                </div>
                <div className="text-xs text-muted">{po.status}</div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
