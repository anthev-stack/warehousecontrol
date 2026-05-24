import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { ActionForm } from "@/components/action-form";
import { createVendor, linkPartVendor } from "@/actions/catalog";

export default async function VendorsPage() {
  const [session, vendors, parts] = await Promise.all([
    getSession(),
    prisma.vendor.findMany({
      orderBy: { name: "asc" },
      include: { partVendors: { include: { part: true } } },
    }),
    prisma.part.findMany({ orderBy: { sku: "asc" } }),
  ]);

  const canEdit = session && (session.role === "ADMIN" || session.role === "PURCHASING");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vendor management</h1>
        <p className="mt-1 text-sm text-muted">Costs, lead times, and supplier part numbers roll into purchasing and MRP.</p>
      </div>

      {canEdit ? (
        <section className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">New vendor</h2>
            <ActionForm action={createVendor} className="mt-4 space-y-3">
              <FormField label="Name" name="name" required />
              <FormField label="Email" name="email" type="email" />
              <FormField label="Phone" name="phone" />
              <FormField label="Default lead (days)" name="defaultLeadDays" type="number" />
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="notes">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Save vendor
              </button>
            </ActionForm>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Vendor part mapping</h2>
            <p className="mt-1 text-xs text-muted">Tie internal SKUs to a supplier&apos;s part number and contracted cost.</p>
            <ActionForm action={linkPartVendor} className="mt-4 space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="partId">
                  Part
                </label>
                <select
                  id="partId"
                  name="partId"
                  required
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select part…
                  </option>
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="vendorId">
                  Vendor
                </label>
                <select
                  id="vendorId"
                  name="vendorId"
                  required
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select vendor…
                  </option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <FormField label="Vendor part #" name="vendorPartNumber" />
              <FormField label="Unit cost" name="unitCost" type="number" step="0.01" />
              <FormField label="Lead time (days)" name="leadTimeDays" type="number" />
              <button
                type="submit"
                className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Save mapping
              </button>
            </ActionForm>
          </div>
        </section>
      ) : null}

      <div className="space-y-4">
        {vendors.map((v) => (
          <article key={v.id} className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{v.name}</h2>
                <div className="text-xs text-muted">
                  Lead {v.defaultLeadDays}d · {v.email ?? "no email"} · {v.phone ?? "no phone"}
                </div>
              </div>
            </div>
            {v.notes ? <p className="mt-3 text-sm text-muted">{v.notes}</p> : null}
            {v.partVendors.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="py-2 pr-4">Part</th>
                      <th className="py-2 pr-4">Supplier #</th>
                      <th className="py-2 pr-4">Cost</th>
                      <th className="py-2">Lead</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {v.partVendors.map((pv) => (
                      <tr key={pv.id}>
                        <td className="py-2 pr-4">
                          <div className="font-mono text-xs">{pv.part.sku}</div>
                          <div className="text-xs text-muted">{pv.part.name}</div>
                        </td>
                        <td className="py-2 pr-4">{pv.vendorPartNumber ?? "—"}</td>
                        <td className="py-2 pr-4 tabular-nums">${pv.unitCost.toFixed(2)}</td>
                        <td className="py-2">{pv.leadTimeDays ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">No mapped parts yet.</p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function FormField({
  label,
  name,
  type = "text",
  required,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        step={step}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
      />
    </div>
  );
}
