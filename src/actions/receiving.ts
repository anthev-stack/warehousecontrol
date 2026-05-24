"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require";

export async function receivePurchaseOrder(
  purchaseOrderId: string,
  lines: { purchaseOrderLineId: string; qty: number }[],
  note?: string,
) {
  const session = await requireRole(["PURCHASING", "ADMIN"]);
  if (!lines.length) throw new Error("Nothing to receive.");

  await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { lines: true },
    });
    if (!po) throw new Error("PO not found.");
    if (po.status === "CANCELLED") throw new Error("Cannot receive a cancelled PO.");

    const receipt = await tx.goodsReceipt.create({
      data: {
        purchaseOrderId,
        note,
        receivedById: session.id,
        lines: {
          create: lines
            .filter((l) => l.qty > 0)
            .map((l) => ({
              purchaseOrderLineId: l.purchaseOrderLineId,
              qty: l.qty,
            })),
        },
      },
      include: {
        lines: { include: { purchaseOrderLine: { include: { part: true } } } },
      },
    });

    for (const rl of receipt.lines) {
      const pol = rl.purchaseOrderLine;
      const addQty = rl.qty;
      const maxAllowed = pol.qtyOrdered - pol.qtyReceived;
      if (addQty > maxAllowed + 1e-6) {
        throw new Error(`Receive quantity exceeds open quantity for ${pol.partId}.`);
      }

      const newReceived = pol.qtyReceived + addQty;
      await tx.purchaseOrderLine.update({
        where: { id: pol.id },
        data: { qtyReceived: newReceived },
      });

      const part = pol.part;
      const newOnHand = part.onHand + addQty;
      const priorVal = part.onHand * part.avgLandedCost;
      const newAvg =
        newOnHand > 0 ? (priorVal + addQty * pol.unitCost) / newOnHand : part.avgLandedCost;

      await tx.part.update({
        where: { id: part.id },
        data: { onHand: newOnHand, avgLandedCost: newAvg },
      });

      await tx.stockMovement.create({
        data: {
          partId: part.id,
          qtyDelta: addQty,
          type: "RECEIPT",
          reference: po.number,
          note: "Purchase receipt",
          createdById: session.id,
        },
      });
    }

    const refreshed = await tx.purchaseOrderLine.findMany({
      where: { purchaseOrderId },
    });
    const allReceived = refreshed.every((l) => l.qtyReceived + 1e-6 >= l.qtyOrdered);
    const anyReceived = refreshed.some((l) => l.qtyReceived > 0);
    let status = po.status;
    if (allReceived) status = "RECEIVED";
    else if (anyReceived) status = "PARTIALLY_RECEIVED";
    await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status },
    });
  });

  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${purchaseOrderId}`);
  revalidatePath("/inventory");
  revalidatePath("/parts");
  revalidatePath("/receive");
}

export async function receivePurchaseOrderForm(formData: FormData) {
  const purchaseOrderId = String(formData.get("poId") ?? "");
  const note = String(formData.get("note") ?? "").trim() || undefined;
  const lineCount = Number(formData.get("lineCount") ?? 0);
  if (!purchaseOrderId || !Number.isFinite(lineCount)) {
    throw new Error("Invalid receipt form.");
  }
  const lines: { purchaseOrderLineId: string; qty: number }[] = [];
  for (let i = 0; i < lineCount; i++) {
    const purchaseOrderLineId = String(formData.get(`lineId_${i}`) ?? "");
    const qty = Number(formData.get(`qty_${i}`) ?? 0);
    if (!purchaseOrderLineId || !Number.isFinite(qty) || qty <= 0) continue;
    lines.push({ purchaseOrderLineId, qty });
  }
  await receivePurchaseOrder(purchaseOrderId, lines, note);
}
