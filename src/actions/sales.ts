"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth/require";

async function nextSoNumber() {
  const n = await prisma.salesOrder.count();
  return `SO-${String(n + 1).padStart(5, "0")}`;
}

export async function createSalesOrderDraft(formData: FormData) {
  const session = await requireSession();
  const customerName = String(formData.get("customerName") ?? "").trim();
  const partId = String(formData.get("partId") ?? "");
  const qty = Number(formData.get("qty") ?? 0);
  const unitPrice = Number(formData.get("unitPrice") ?? 0);
  if (!customerName || !partId || !Number.isFinite(qty) || qty <= 0) {
    throw new Error("Customer, part, and quantity are required.");
  }

  const number = await nextSoNumber();
  await prisma.salesOrder.create({
    data: {
      number,
      customerName,
      status: "DRAFT",
      lines: {
        create: [
          {
            partId,
            qty,
            unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
          },
        ],
      },
    },
  });

  revalidatePath("/sales");
}

export async function advanceSalesOrder(id: string, status: "CONFIRMED" | "SHIPPED") {
  await requireSession();
  if (status === "SHIPPED") {
    await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id },
        include: { lines: { include: { part: true } } },
      });
      if (!order) throw new Error("Order not found.");
      if (order.status === "SHIPPED" || order.status === "CANCELLED") {
        throw new Error("Invalid state transition.");
      }
      for (const line of order.lines) {
        const fresh = await tx.part.findUnique({ where: { id: line.partId } });
        if (!fresh || fresh.onHand + 1e-6 < line.qty) {
          throw new Error(`Not enough stock for ${line.partId}.`);
        }
      }
      for (const line of order.lines) {
        const fresh = await tx.part.findUnique({ where: { id: line.partId } });
        if (!fresh) throw new Error("Part missing.");
        await tx.part.update({
          where: { id: fresh.id },
          data: { onHand: fresh.onHand - line.qty },
        });
        await tx.stockMovement.create({
          data: {
            partId: fresh.id,
            qtyDelta: -line.qty,
            type: "SALE_SHIP",
            reference: order.number,
            note: "Sales shipment",
          },
        });
      }
      await tx.salesOrder.update({ where: { id }, data: { status: "SHIPPED" } });
    });
  } else {
    await prisma.salesOrder.update({ where: { id }, data: { status } });
  }

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/parts");
  revalidatePath("/mrp");
}

export async function salesOrderIntentForm(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "");
  if (!id || !intent) throw new Error("Missing sales order action.");
  if (intent === "confirm") {
    await advanceSalesOrder(id, "CONFIRMED");
  } else if (intent === "ship") {
    await advanceSalesOrder(id, "SHIPPED");
  } else {
    throw new Error("Unknown sales order action.");
  }
}
