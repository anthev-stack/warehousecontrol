import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const [openWo, parts, openPo, recentReceipts] = await Promise.all([
    prisma.workOrder.count({
      where: { status: { in: ["DRAFT", "RELEASED", "IN_PROGRESS"] } },
    }),
    prisma.part.findMany({ where: { active: true } }),
    prisma.purchaseOrder.count({
      where: { status: { in: ["DRAFT", "SUBMITTED", "PARTIALLY_RECEIVED"] } },
    }),
    prisma.goodsReceipt.findMany({
      orderBy: { receivedAt: "desc" },
      take: 5,
      include: { purchaseOrder: { include: { vendor: true } } },
    }),
  ]);

  const lowStockCount = parts.filter((p) => p.onHand < p.reorderPoint).length;

  const cards = [
    { label: "Open work orders", value: openWo, href: "/work-orders" },
    { label: "Parts below reorder point", value: lowStockCount, href: "/mrp" },
    { label: "Purchase orders in flight", value: openPo, href: "/purchase-orders" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Operations overview</h1>
        <p className="mt-1 text-sm text-muted">
          Inventory, manufacturing, purchasing, and sales are connected through BOMs, work orders, and MRP-style
          suggestions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-accent"
          >
            <div className="text-sm text-muted">{c.label}</div>
            <div className="mt-2 text-3xl font-semibold tabular-nums">{c.value}</div>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Recent receipts</h2>
          <Link href="/receive" className="text-sm font-medium text-accent">
            Receive goods →
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-border text-sm">
          {recentReceipts.length === 0 ? (
            <li className="py-3 text-muted">No receipts yet.</li>
          ) : (
            recentReceipts.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <div className="font-medium">{r.purchaseOrder.number}</div>
                  <div className="text-xs text-muted">{r.purchaseOrder.vendor.name}</div>
                </div>
                <div className="text-xs text-muted">{r.receivedAt.toLocaleString()}</div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
