import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { AddPartForm } from "@/components/add-part-form";
import { DeleteButton } from "@/components/delete-button";
import { PartsListTabs } from "@/components/parts-list-tabs";
import { deletePartAction } from "@/actions/catalog";
import { PartTypeBadges } from "@/components/part-type-badges";
import { listViewWhere, parseListView, parsePartKind, partKindLabel } from "@/lib/part-kind";

export default async function PartsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; create?: string }>;
}) {
  const { view: viewParam, create: createParam } = await searchParams;
  const view = parseListView(viewParam);
  const createKind = parsePartKind(createParam);

  const where = listViewWhere(view);

  const [session, parts, allParts, vendors, countAll, countParts, countProducts, countAssemblies] =
    await Promise.all([
      getSession(),
      prisma.part.findMany({
        where,
        orderBy: { sku: "asc" },
        include: { defaultVendor: true },
      }),
      prisma.part.findMany({ orderBy: { sku: "asc" } }),
      prisma.vendor.findMany({ orderBy: { name: "asc" } }),
      prisma.part.count(),
      prisma.part.count({ where: { isPurchased: true } }),
      prisma.part.count({ where: { isManufactured: true } }),
      prisma.part.count({ where: { isAssembly: true } }),
    ]);

  const canEdit =
    session &&
    (session.role === "ADMIN" || session.role === "PURCHASING" || session.role === "PRODUCTION");

  const purchasedComponents = allParts
    .filter((p) => p.isPurchased)
    .map((p) => ({ id: p.id, label: `${p.sku} — ${p.name}` }));
  const assemblyComponents = allParts
    .filter((p) => p.isAssembly)
    .map((p) => ({ id: p.id, label: `${p.sku} — ${p.name}` }));

  const emptyLabel =
    view === "parts"
      ? "No parts yet. Use Create part above for purchased items."
      : view === "products"
        ? "No products yet. Use Create product above for finished goods you build."
        : view === "assemblies"
          ? "No assemblies yet. Use Create assembly for sub-assemblies built from parts."
          : "Nothing here yet. Create a part, product, or assembly above.";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Parts &amp; products</h1>
        <p className="mt-1 text-sm text-muted">
          Purchased parts, in-house assemblies, and finished products — with inventory and reorder
          settings for each.
        </p>
      </div>

      {canEdit ? (
        <AddPartForm
          vendors={vendors}
          purchasedComponents={purchasedComponents}
          assemblyComponents={assemblyComponents}
          initialKind={createKind}
        />
      ) : null}

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 pt-4">
          <PartsListTabs
            active={view}
            counts={{
              all: countAll,
              parts: countParts,
              products: countProducts,
              assemblies: countAssemblies,
            }}
          />
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-accent-muted/40 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">On hand</th>
              <th className="px-4 py-3">Reorder</th>
              <th className="px-4 py-3">Avg cost</th>
              {canEdit ? <th className="px-4 py-3">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {parts.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="px-4 py-8 text-center text-sm text-muted">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              parts.map((p) => (
                <tr key={p.id} className="hover:bg-accent-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3">
                    <Link href={`/inventory#${p.id}`} className="font-medium text-accent hover:underline">
                      {p.name}
                    </Link>
                    {p.defaultVendor ? (
                      <div className="text-xs text-muted">Vendor: {p.defaultVendor.name}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <PartTypeBadges flags={p} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {p.onHand} {p.unit}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {p.reorderPoint} / {p.reorderQty}
                  </td>
                  <td className="px-4 py-3 tabular-nums">${p.avgLandedCost.toFixed(2)}</td>
                  {canEdit ? (
                    <td className="px-4 py-3">
                      <DeleteButton
                        id={p.id}
                        action={deletePartAction}
                        confirmMessage={`Delete ${partKindLabel(p).toLowerCase()} ${p.sku}? This cannot be undone.`}
                      />
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
