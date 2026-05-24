"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole, requireSession } from "@/lib/auth/require";
import { parseLineCount } from "@/lib/form-lines";
import type { POStatus } from "@/generated/prisma/client";

async function nextPoNumber() {
  const n = await prisma.purchaseOrder.count();
  return `PO-${String(n + 1).padStart(5, "0")}`;
}

export async function createPurchaseOrderDraft(formData: FormData) {
  const session = await requireRole(["PURCHASING", "ADMIN"]);
  const vendorId = String(formData.get("vendorId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  const needsApproval = String(formData.get("needsApproval") ?? "") === "on";

  const lineCount = parseLineCount(formData);
  if (!vendorId || lineCount <= 0) {
    throw new Error("Vendor and at least one line are required.");
  }

  const lines: { partId: string; qty: number; unitCost: number }[] = [];
  for (let i = 0; i < lineCount; i++) {
    const partId = String(formData.get(`partId_${i}`) ?? "");
    const qty = Number(formData.get(`qty_${i}`) ?? 0);
    const unitCost = Number(formData.get(`unitCost_${i}`) ?? 0);
    if (!partId || !Number.isFinite(qty) || qty <= 0) continue;
    lines.push({ partId, qty, unitCost: Number.isFinite(unitCost) ? unitCost : 0 });
  }
  if (lines.length === 0) throw new Error("Add line items.");

  const number = await nextPoNumber();
  await prisma.purchaseOrder.create({
    data: {
      number,
      vendorId,
      status: "DRAFT",
      notes,
      needsApproval,
      approvedAt: needsApproval ? undefined : new Date(),
      createdById: session.id,
      lines: {
        create: lines.map((l) => ({
          partId: l.partId,
          qtyOrdered: l.qty,
          unitCost: l.unitCost,
        })),
      },
    },
  });

  revalidatePath("/purchase-orders");
}

export async function updatePurchaseOrderStatus(id: string, status: POStatus) {
  await requireRole(["PURCHASING", "ADMIN"]);
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new Error("Purchase order not found.");
  if (po.needsApproval && !po.approvedAt && status !== "DRAFT" && status !== "CANCELLED") {
    throw new Error("Approve this purchase order before changing its status.");
  }

  await prisma.purchaseOrder.update({ where: { id }, data: { status } });
  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${id}`);
}

export async function approvePurchaseOrder(id: string) {
  await requireRole(["PURCHASING", "ADMIN"]);
  await prisma.purchaseOrder.update({
    where: { id },
    data: { approvedAt: new Date() },
  });
  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${id}`);
}

export type MrpSuggestion = {
  partId: string;
  sku: string;
  name: string;
  vendorId: string | null;
  vendorName: string | null;
  shortfall: number;
  reorderQty: number;
  reason: "REORDER_POINT" | "WORK_ORDER";
  unitCost: number;
};

export async function computeMrp(): Promise<MrpSuggestion[]> {
  await requireSession();
  const parts = await prisma.part.findMany({
    where: { active: true, isPurchased: true },
    include: { defaultVendor: true },
  });

  const openWo = await prisma.workOrder.findMany({
    where: { status: { in: ["RELEASED", "IN_PROGRESS"] } },
    include: { materials: true },
  });

  const demand = new Map<string, number>();
  for (const wo of openWo) {
    for (const m of wo.materials) {
      const need = Math.max(0, m.qtyRequired - m.qtyIssued);
      demand.set(m.partId, (demand.get(m.partId) ?? 0) + need);
    }
  }

  const suggestions: MrpSuggestion[] = [];

  for (const p of parts) {
    const d = demand.get(p.id) ?? 0;
    const projected = p.onHand - d;
    if (projected < p.reorderPoint || d > 0) {
      const shortfall = Math.max(0, p.reorderPoint - projected, d);
      const reorderQty =
        shortfall > 0 ? Math.max(p.reorderQty, shortfall) : p.reorderQty;
      if (reorderQty <= 0 && shortfall > 0) {
        suggestions.push({
          partId: p.id,
          sku: p.sku,
          name: p.name,
          vendorId: p.defaultVendorId,
          vendorName: p.defaultVendor?.name ?? null,
          shortfall,
          reorderQty: shortfall,
          reason: d > 0 ? "WORK_ORDER" : "REORDER_POINT",
          unitCost: p.avgLandedCost || 0,
        });
      } else if (reorderQty > 0) {
        suggestions.push({
          partId: p.id,
          sku: p.sku,
          name: p.name,
          vendorId: p.defaultVendorId,
          vendorName: p.defaultVendor?.name ?? null,
          shortfall,
          reorderQty,
          reason: d > 0 ? "WORK_ORDER" : "REORDER_POINT",
          unitCost: p.avgLandedCost || 0,
        });
      }
    }
  }

  return suggestions;
}

export async function createDraftPoFromSuggestions(payload: {
  vendorId: string;
  lines: { partId: string; qty: number; unitCost: number }[];
  needsApproval: boolean;
}) {
  const session = await requireRole(["PURCHASING", "ADMIN"]);
  if (!payload.vendorId || payload.lines.length === 0) {
    throw new Error("Vendor and lines are required.");
  }

  const number = await nextPoNumber();
  await prisma.purchaseOrder.create({
    data: {
      number,
      vendorId: payload.vendorId,
      status: "DRAFT",
      needsApproval: payload.needsApproval,
      approvedAt: payload.needsApproval ? undefined : new Date(),
      createdById: session.id,
      lines: {
        create: payload.lines.map((l) => ({
          partId: l.partId,
          qtyOrdered: l.qty,
          unitCost: l.unitCost,
        })),
      },
    },
  });

  revalidatePath("/purchase-orders");
  revalidatePath("/mrp");
}

export async function deletePurchaseOrderAction(formData: FormData) {
  await requireRole(["PURCHASING", "ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Purchase order id is required.");

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { receipts: true },
  });
  if (!po) throw new Error("Purchase order not found.");
  if (po.status !== "DRAFT") {
    throw new Error("Only draft purchase orders can be deleted. Cancel submitted orders instead.");
  }
  if (po.receipts.length > 0) {
    throw new Error("Cannot delete: goods have already been received on this PO.");
  }

  await prisma.purchaseOrder.delete({ where: { id } });
  revalidatePath("/purchase-orders");
}

export async function purchaseOrderIntentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "");
  if (!id || !intent) throw new Error("Missing purchase order action.");

  if (intent === "approve") {
    await approvePurchaseOrder(id);
  } else if (intent === "submit") {
    await updatePurchaseOrderStatus(id, "SUBMITTED");
  } else if (intent === "cancel") {
    await updatePurchaseOrderStatus(id, "CANCELLED");
  } else {
    throw new Error("Unknown purchase order action.");
  }
}
