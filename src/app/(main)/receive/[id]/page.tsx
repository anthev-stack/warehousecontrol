import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ActionForm } from "@/components/action-form";
import { receivePurchaseOrderForm } from "@/actions/receiving";

export default async function ReceiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { vendor: true, lines: { include: { part: true } } },
  });
  if (!po) notFound();

  const openLines = po.lines.filter((l) => l.qtyReceived + 1e-6 < l.qtyOrdered);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/receive" className="text-sm font-medium text-accent">
          ← Receiving queue
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Receive {po.number}</h1>
        <p className="mt-1 text-sm text-muted">{po.vendor.name}</p>
      </div>

      <ActionForm action={receivePurchaseOrderForm} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
        <input type="hidden" name="poId" value={po.id} />
        <input type="hidden" name="lineCount" value={String(openLines.length)} />
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="note">
            Receipt note
          </label>
          <input
            id="note"
            name="note"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-3">
          {openLines.map((l, i) => (
            <div key={l.id} className="rounded-md border border-border p-3">
              <input type="hidden" name={`lineId_${i}`} value={l.id} />
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <div className="font-mono text-xs">{l.part.sku}</div>
                  <div className="text-xs text-muted">{l.part.name}</div>
                </div>
                <div className="text-xs text-muted">
                  Open {l.qtyOrdered - l.qtyReceived} of {l.qtyOrdered}
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <label className="text-xs font-medium text-muted" htmlFor={`qty_${i}`}>
                  Receive qty
                </label>
                <input
                  id={`qty_${i}`}
                  name={`qty_${i}`}
                  type="number"
                  step="0.01"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
        {openLines.length === 0 ? (
          <p className="text-sm text-muted">All lines fully received.</p>
        ) : (
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Post receipt
          </button>
        )}
      </ActionForm>
    </div>
  );
}
