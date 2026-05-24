import { computeMrp } from "@/actions/purchase-orders";
import { getSession } from "@/lib/auth/session";
import { MrpDraftButtons } from "@/components/mrp-draft-buttons";

export default async function MrpPage() {
  const [session, suggestions] = await Promise.all([getSession(), computeMrp()]);
  const canAutoPo = session && (session.role === "ADMIN" || session.role === "PURCHASING");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Material requirements planning</h1>
        <p className="mt-1 text-sm text-muted">
          Demand from released work orders is netted against on-hand balances and compared to reorder policies to
          highlight what to buy next.
        </p>
      </div>

      {canAutoPo ? (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Auto purchasing (draft POs)</h2>
          <p className="mt-1 text-xs text-muted">
            Groups suggestions by default vendor. Draft POs still honor your approval workflow before submission.
          </p>
          <div className="mt-4">
            <MrpDraftButtons suggestions={suggestions} />
          </div>
        </section>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-accent-muted/40 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Part</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Shortfall</th>
              <th className="px-4 py-3">Proposed buy qty</th>
              <th className="px-4 py-3">Vendor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {suggestions.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-muted" colSpan={5}>
                  All purchased parts look healthy against current demand.
                </td>
              </tr>
            ) : (
              suggestions.map((s) => (
                <tr key={`${s.partId}-${s.reason}`}>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs">{s.sku}</div>
                    <div className="text-xs text-muted">{s.name}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{s.reason === "WORK_ORDER" ? "Work orders" : "Reorder point"}</td>
                  <td className="px-4 py-3 tabular-nums">{s.shortfall.toFixed(2)}</td>
                  <td className="px-4 py-3 tabular-nums">{s.reorderQty.toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-muted">{s.vendorName ?? "— assign vendor —"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
