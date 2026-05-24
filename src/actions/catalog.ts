"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require";
import { parseBomLinesFromForm } from "@/lib/bom-lines";
import { parseLineCount } from "@/lib/form-lines";
import { flagsFromKind, kindFromFlags, parsePartKind } from "@/lib/part-kind";

export async function createPart(formData: FormData) {
  await requireRole(["PURCHASING", "PRODUCTION", "ADMIN"]);
  const sku = String(formData.get("sku") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "ea").trim() || "ea";
  const onHand = Number(formData.get("onHand") ?? 0);
  const kind = parsePartKind(String(formData.get("partKind") ?? ""));

  let reorderPoint = 0;
  let reorderQty = 0;
  let avgLandedCost = 0;
  if (kind === "purchased") {
    reorderPoint = Number(formData.get("reorderPoint") ?? 0);
    reorderQty = Number(formData.get("reorderQty") ?? 0);
    avgLandedCost = Number(formData.get("avgLandedCost") ?? 0);
  } else if (kind === "manufactured") {
    avgLandedCost = Number(formData.get("price") ?? 0);
  }
  const { isPurchased, isManufactured, isAssembly } = flagsFromKind(kind);
  const defaultVendorId =
    kind === "purchased"
      ? String(formData.get("defaultVendorId") ?? "").trim() || undefined
      : undefined;
  if (!sku || !name) throw new Error("SKU and name are required.");

  const needsBom = kind === "manufactured" || kind === "assembly";
  const bomLines = needsBom ? parseBomLinesFromForm(formData) : [];
  if (needsBom && bomLines.length === 0) {
    throw new Error("Add at least one component part to the bill of material.");
  }

  await prisma.$transaction(async (tx) => {
    const part = await tx.part.create({
      data: {
        sku,
        name,
        unit,
        reorderPoint: Number.isFinite(reorderPoint) ? reorderPoint : 0,
        reorderQty: Number.isFinite(reorderQty) ? reorderQty : 0,
        onHand: Number.isFinite(onHand) ? onHand : 0,
        avgLandedCost: Number.isFinite(avgLandedCost) ? avgLandedCost : 0,
        isPurchased,
        isManufactured,
        isAssembly,
        defaultVendorId,
      },
    });

    if (needsBom) {
      const componentIds = [...new Set(bomLines.map((l) => l.partId))];
      const components = await tx.part.findMany({ where: { id: { in: componentIds } } });
      if (components.length !== componentIds.length) {
        throw new Error("One or more component parts were not found.");
      }
      for (const c of components) {
        if (kind === "assembly" && !c.isPurchased) {
          throw new Error("Assembly components must be purchased parts.");
        }
        if (kind === "manufactured" && !(c.isPurchased || c.isAssembly)) {
          throw new Error("Product components must be purchased parts or assemblies.");
        }
      }

      await tx.bom.create({
        data: {
          name,
          revision: "A",
          isConfigurable: kind === "manufactured",
          finishedGoodPartId: part.id,
          lines: {
            create: bomLines.map((l) => ({
              componentPartId: l.partId,
              qtyPer: l.qtyPer,
              isOptional: l.isOptional,
            })),
          },
        },
      });
    }
  });

  revalidatePath("/parts");
  revalidatePath("/inventory");
  revalidatePath("/mrp");
  revalidatePath("/production");
}

export async function createVendor(formData: FormData) {
  await requireRole(["PURCHASING", "ADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || undefined;
  const phone = String(formData.get("phone") ?? "").trim() || undefined;
  const defaultLeadDays = Number(formData.get("defaultLeadDays") ?? 7);
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  if (!name) throw new Error("Vendor name is required.");

  await prisma.vendor.create({
    data: {
      name,
      email,
      phone,
      defaultLeadDays: Number.isFinite(defaultLeadDays) ? Math.round(defaultLeadDays) : 7,
      notes,
    },
  });

  revalidatePath("/vendors");
}

export async function createBom(formData: FormData) {
  await requireRole(["PRODUCTION", "ADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  const finishedGoodPartId = String(formData.get("finishedGoodPartId") ?? "");
  const isConfigurable = String(formData.get("isConfigurable") ?? "") === "on";
  const revision = String(formData.get("revision") ?? "A").trim() || "A";
  const lineCount = parseLineCount(formData);
  if (!name || !finishedGoodPartId || lineCount <= 0) {
    throw new Error("BOM name and finished good (product) are required.");
  }

  const lines: { partId: string; qtyPer: number; isOptional: boolean }[] = [];
  for (let i = 0; i < lineCount; i++) {
    const partId = String(formData.get(`linePart_${i}`) ?? "");
    const qtyPer = Number(formData.get(`lineQty_${i}`) ?? 0);
    const isOptional = String(formData.get(`lineOptional_${i}`) ?? "") === "on";
    if (!partId || !Number.isFinite(qtyPer) || qtyPer <= 0) continue;
    lines.push({ partId, qtyPer, isOptional });
  }
  if (lines.length === 0) throw new Error("Add at least one BOM line.");

  await prisma.bom.create({
    data: {
      name,
      revision,
      isConfigurable,
      finishedGoodPartId,
      lines: {
        create: lines.map((l) => ({
          componentPartId: l.partId,
          qtyPer: l.qtyPer,
          isOptional: l.isOptional,
        })),
      },
    },
  });

  revalidatePath("/production");
}

export async function linkPartVendor(formData: FormData) {
  await requireRole(["PURCHASING", "ADMIN"]);
  const partId = String(formData.get("partId") ?? "");
  const vendorId = String(formData.get("vendorId") ?? "");
  const vendorPartNumber = String(formData.get("vendorPartNumber") ?? "").trim() || undefined;
  const unitCost = Number(formData.get("unitCost") ?? 0);
  const leadTimeDays = Number(formData.get("leadTimeDays") ?? 0);
  if (!partId || !vendorId) throw new Error("Part and vendor are required.");

  await prisma.partVendor.upsert({
    where: { partId_vendorId: { partId, vendorId } },
    create: {
      partId,
      vendorId,
      vendorPartNumber,
      unitCost: Number.isFinite(unitCost) ? unitCost : 0,
      leadTimeDays: Number.isFinite(leadTimeDays) ? Math.round(leadTimeDays) : null,
    },
    update: {
      vendorPartNumber,
      unitCost: Number.isFinite(unitCost) ? unitCost : 0,
      leadTimeDays: Number.isFinite(leadTimeDays) ? Math.round(leadTimeDays) : null,
    },
  });

  revalidatePath("/vendors");
  revalidatePath("/parts");
}

export async function deletePartAction(formData: FormData) {
  await requireRole(["PURCHASING", "PRODUCTION", "ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Part id is required.");

  const part = await prisma.part.findUnique({ where: { id } });
  if (!part) throw new Error("Part not found.");

  const [bomFg, bomLines, woMaterials, poLines, soLines, movements, partVendors] =
    await Promise.all([
      prisma.bom.count({ where: { finishedGoodPartId: id } }),
      prisma.bomLine.count({ where: { componentPartId: id } }),
      prisma.workOrderMaterial.count({ where: { partId: id } }),
      prisma.purchaseOrderLine.count({ where: { partId: id } }),
      prisma.salesOrderLine.count({ where: { partId: id } }),
      prisma.stockMovement.count({ where: { partId: id } }),
      prisma.partVendor.count({ where: { partId: id } }),
    ]);

  const blockers: string[] = [];
  if (bomFg) blockers.push(`${bomFg} BOM(s) as finished good`);
  if (bomLines) blockers.push(`${bomLines} BOM component line(s)`);
  if (woMaterials) blockers.push(`${woMaterials} work order material(s)`);
  if (poLines) blockers.push(`${poLines} purchase order line(s)`);
  if (soLines) blockers.push(`${soLines} sales order line(s)`);
  if (movements) blockers.push(`${movements} stock movement(s)`);
  if (partVendors) blockers.push(`${partVendors} vendor mapping(s)`);

  if (blockers.length > 0) {
    throw new Error(`Cannot delete: still referenced by ${blockers.join(", ")}.`);
  }

  await prisma.part.delete({ where: { id } });
  revalidatePath("/parts");
  revalidatePath("/inventory");
  revalidatePath("/production");
  revalidatePath("/mrp");
}

export async function deleteBomAction(formData: FormData) {
  await requireRole(["PRODUCTION", "ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("BOM id is required.");

  const woCount = await prisma.workOrder.count({ where: { bomId: id } });
  if (woCount > 0) {
    throw new Error(`Cannot delete: ${woCount} work order(s) use this BOM.`);
  }

  await prisma.bom.delete({ where: { id } });
  revalidatePath("/production");
}
