import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ActionForm } from "@/components/action-form";
import { logTime } from "@/actions/work-orders";

export default async function TimePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const [entries, workOrders] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { workOrder: true },
    }),
    prisma.workOrder.findMany({
      where: { status: { in: ["RELEASED", "IN_PROGRESS"] } },
      orderBy: { number: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Time tracking &amp; labor costing</h1>
        <p className="mt-1 text-sm text-muted">
          Capture minutes against work orders with a labor rate to roll estimated conversion costs into operational
          reporting.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Log time</h2>
        <ActionForm action={logTime} className="mt-4 grid gap-3 md:grid-cols-2 md:max-w-3xl">
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="workOrderId">
              Work order (optional)
            </label>
            <select
              id="workOrderId"
              name="workOrderId"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="">— indirect / overhead —</option>
              {workOrders.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.number}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="description">
              Description
            </label>
            <input
              id="description"
              name="description"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="minutes">
              Minutes
            </label>
            <input
              id="minutes"
              name="minutes"
              type="number"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="laborRate">
              Labor rate ($/hr)
            </label>
            <input
              id="laborRate"
              name="laborRate"
              type="number"
              step="0.01"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Save entry
            </button>
          </div>
        </ActionForm>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Recent entries (you)</h2>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-accent-muted/40 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">WO</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Minutes</th>
              <th className="px-4 py-3">Est. cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3 text-xs text-muted">{e.createdAt.toLocaleString()}</td>
                <td className="px-4 py-3 text-xs">{e.workOrder?.number ?? "—"}</td>
                <td className="px-4 py-3">{e.description}</td>
                <td className="px-4 py-3 tabular-nums">{e.minutes}</td>
                <td className="px-4 py-3 tabular-nums">${((e.minutes / 60) * e.laborRate).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
