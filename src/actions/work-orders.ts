"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole, requireSession } from "@/lib/auth/require";
import type { TaskStatus, WorkOrderStatus } from "@/generated/prisma/client";
import {
  fgMatchesProductionKind,
  parseProductionKind,
  productionKindFromFg,
  productionListPath,
} from "@/lib/production-kind";

function revalidateProductionPaths() {
  revalidatePath("/production");
  revalidatePath("/work-orders");
}

async function nextWoNumber() {
  const n = await prisma.workOrder.count();
  return `WO-${String(n + 1).padStart(5, "0")}`;
}

export async function createWorkOrder(formData: FormData) {
  const session = await requireRole(["PRODUCTION", "ADMIN"]);
  const productionKind = parseProductionKind(String(formData.get("productionKind") ?? ""));
  const bomId = String(formData.get("bomId") ?? "");
  const qty = Number(formData.get("qty") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  if (!productionKind || !bomId || !Number.isFinite(qty) || qty <= 0) {
    throw new Error("Invalid production type, item, or quantity.");
  }

  const bom = await prisma.bom.findUnique({
    where: { id: bomId, active: true },
    include: { lines: true, finishedGood: true },
  });
  if (!bom) throw new Error("Bill of material not found.");
  if (!fgMatchesProductionKind(bom.finishedGood, productionKind)) {
    throw new Error("Selected item does not match this production type.");
  }
  if (bom.lines.length === 0) throw new Error("Bill of material has no components.");

  const number = await nextWoNumber();

  await prisma.workOrder.create({
    data: {
      number,
      bomId,
      qty,
      status: "DRAFT",
      notes,
      createdById: session.id,
      materials: {
        create: bom.lines.map((line) => ({
          partId: line.componentPartId,
          qtyRequired: line.qtyPer * qty,
          qtyIssued: 0,
        })),
      },
    },
  });

  revalidateProductionPaths();
  redirect("/work-orders");
}

export async function updateWorkOrderStatus(id: string, status: WorkOrderStatus) {
  const session = await requireRole(["PRODUCTION", "ADMIN"]);
  const wo = await prisma.workOrder.findUnique({ where: { id } });
  if (!wo) throw new Error("Work order not found.");

  await prisma.workOrder.update({
    where: { id },
    data: {
      status,
      ...(status === "RELEASED" && !wo.releasedAt ? { releasedAt: new Date() } : {}),
    },
  });

  revalidateProductionPaths();
  revalidatePath(`/work-orders/${id}`);
}

export async function issueMaterialsAndStart(id: string) {
  const session = await requireRole(["PRODUCTION", "ADMIN"]);
  const wo = await prisma.workOrder.findUnique({
    where: { id },
    include: { materials: true },
  });
  if (!wo) throw new Error("Work order not found.");
  if (wo.status !== "RELEASED" && wo.status !== "IN_PROGRESS") {
    throw new Error("Release the work order before issuing materials.");
  }

  await prisma.$transaction(async (tx) => {
    for (const m of wo.materials) {
      const remaining = m.qtyRequired - m.qtyIssued;
      if (remaining <= 0) continue;
      const part = await tx.part.findUnique({ where: { id: m.partId } });
      if (!part) throw new Error("Component part missing.");
      const issue = Math.min(remaining, part.onHand);
      if (issue <= 0) continue;
      const newOnHand = part.onHand - issue;
      await tx.part.update({
        where: { id: part.id },
        data: { onHand: newOnHand },
      });
      await tx.workOrderMaterial.update({
        where: { id: m.id },
        data: { qtyIssued: m.qtyIssued + issue },
      });
      await tx.stockMovement.create({
        data: {
          partId: part.id,
          qtyDelta: -issue,
          type: "WO_ISSUE",
          reference: wo.number,
          createdById: session.id,
        },
      });
    }
    await tx.workOrder.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    });
  });

  revalidateProductionPaths();
  revalidatePath(`/work-orders/${id}`);
  revalidatePath("/inventory");
  revalidatePath("/parts");
  revalidatePath("/mrp");
}

export async function completeWorkOrder(id: string) {
  const session = await requireRole(["PRODUCTION", "ADMIN"]);
  const wo = await prisma.workOrder.findUnique({
    where: { id },
    include: { bom: true, materials: true },
  });
  if (!wo) throw new Error("Work order not found.");
  if (wo.status === "COMPLETED") return;

  const open = wo.materials.filter((m) => m.qtyIssued + 1e-6 < m.qtyRequired);
  if (open.length > 0) {
    throw new Error("Issue all materials (or re-run Issue materials) before completing.");
  }

  const fg = await prisma.part.findUnique({ where: { id: wo.bom.finishedGoodPartId } });
  if (!fg) throw new Error("Finished good part missing.");

  await prisma.$transaction(async (tx) => {
    const builtQty = wo.qty;
    const newOnHand = fg.onHand + builtQty;
    const priorValue = fg.onHand * fg.avgLandedCost;

    const materialsCost = (
      await Promise.all(
        wo.materials.map(async (m) => {
          const p = await tx.part.findUnique({ where: { id: m.partId } });
          return (p?.avgLandedCost ?? 0) * m.qtyRequired;
        }),
      )
    ).reduce((a, b) => a + b, 0);

    const estUnitCost = builtQty > 0 ? materialsCost / builtQty : fg.avgLandedCost;
    const newAvg =
      newOnHand > 0 ? (priorValue + estUnitCost * builtQty) / newOnHand : fg.avgLandedCost;

    await tx.part.update({
      where: { id: fg.id },
      data: {
        onHand: newOnHand,
        avgLandedCost: newAvg,
      },
    });
    await tx.stockMovement.create({
      data: {
        partId: fg.id,
        qtyDelta: builtQty,
        type: "WO_RECEIPT_FG",
        reference: wo.number,
        note: "Finished goods receipt from work order",
        createdById: session.id,
      },
    });
    await tx.workOrder.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  });

  revalidateProductionPaths();
  revalidatePath(`/work-orders/${id}`);
  revalidatePath("/inventory");
  revalidatePath("/parts");
  revalidatePath("/mrp");
}

export async function createWorkOrderTask(formData: FormData) {
  const session = await requireRole(["PRODUCTION", "ADMIN"]);
  const workOrderId = String(formData.get("workOrderId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || undefined;
  const assigneeId = String(formData.get("assigneeId") ?? "").trim() || undefined;
  if (!workOrderId || !title) throw new Error("Task title is required.");

  const maxSort = await prisma.workOrderTask.findFirst({
    where: { workOrderId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.workOrderTask.create({
    data: {
      workOrderId,
      title,
      description,
      assigneeId: assigneeId || undefined,
      sortOrder: (maxSort?.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath(`/work-orders/${workOrderId}`);
}

export async function updateTaskStatus(taskId: string, status: "TODO" | "IN_PROGRESS" | "DONE") {
  const session = await requireSession();
  const task = await prisma.workOrderTask.findUnique({
    where: { id: taskId },
    include: { workOrder: true },
  });
  if (!task) throw new Error("Task not found.");
  const isPrivileged = session.role === "ADMIN" || session.role === "PRODUCTION";
  const isAssignee = task.assigneeId === session.id;
  if (!isPrivileged && !isAssignee) {
    throw new Error("You cannot update this task.");
  }

  await prisma.workOrderTask.update({
    where: { id: taskId },
    data: { status },
  });

  revalidatePath(`/work-orders/${task.workOrderId}`);
}

export async function logTime(formData: FormData) {
  const session = await requireSession();
  const workOrderId = String(formData.get("workOrderId") ?? "").trim() || undefined;
  const description = String(formData.get("description") ?? "").trim();
  const minutes = Number(formData.get("minutes") ?? 0);
  const laborRate = Number(formData.get("laborRate") ?? 0);
  if (!description || !Number.isFinite(minutes) || minutes <= 0) {
    throw new Error("Description and positive minutes are required.");
  }

  await prisma.timeEntry.create({
    data: {
      userId: session.id,
      workOrderId,
      description,
      minutes: Math.round(minutes),
      laborRate: Number.isFinite(laborRate) ? laborRate : 0,
    },
  });

  if (workOrderId) {
    revalidatePath(`/work-orders/${workOrderId}`);
  }
  revalidatePath("/time");
}

export async function workOrderIntentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "");
  if (!id || !intent) throw new Error("Missing work order action.");

  if (intent === "release") {
    await updateWorkOrderStatus(id, "RELEASED");
  } else if (intent === "start") {
    await issueMaterialsAndStart(id);
  } else if (intent === "complete") {
    await completeWorkOrder(id);
  } else {
    throw new Error("Unknown work order action.");
  }
}

export async function setTaskStatusForm(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const statusRaw = String(formData.get("status") ?? "");
  if (!taskId || !statusRaw) throw new Error("Missing task.");
  if (!["TODO", "IN_PROGRESS", "DONE"].includes(statusRaw)) {
    throw new Error("Invalid task status.");
  }
  await updateTaskStatus(taskId, statusRaw as TaskStatus);
}

export async function deleteWorkOrderAction(formData: FormData) {
  await requireRole(["ADMIN", "PRODUCTION"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Work order id is required.");

  const wo = await prisma.workOrder.findUnique({
    where: { id },
    include: { materials: true, bom: { include: { finishedGood: true } } },
  });
  if (!wo) throw new Error("Work order not found.");

  if (wo.status === "COMPLETED") {
    throw new Error(
      "Completed work orders cannot be deleted because finished goods may already be in inventory.",
    );
  }

  const issued = wo.materials.some((m) => m.qtyIssued > 0);
  if (issued) {
    throw new Error("Cannot delete: materials were already issued to this work order.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.timeEntry.updateMany({
      where: { workOrderId: id },
      data: { workOrderId: null },
    });
    await tx.workOrder.delete({ where: { id } });
  });

  revalidateProductionPaths();
  revalidatePath("/mrp");
  redirect("/work-orders");
}
