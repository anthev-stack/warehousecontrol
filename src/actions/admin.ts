"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/require";
import type { Role } from "@/generated/prisma/client";

const roleSchema = z.enum(["USER", "PURCHASING", "PRODUCTION", "ADMIN"]);

export async function createUserAccount(formData: FormData) {
  await requireRole(["ADMIN"]);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const roleParsed = roleSchema.safeParse(String(formData.get("role") ?? ""));
  if (!email || !name || password.length < 6) {
    throw new Error("Email, name, and password (min 6 chars) are required.");
  }
  if (!roleParsed.success) throw new Error("Invalid role.");

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: roleParsed.data as Role,
    },
  });

  revalidatePath("/admin/users");
}

export async function deleteUserAction(formData: FormData) {
  const session = await requireRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("User id is required.");
  if (id === session.id) throw new Error("You cannot delete your own account.");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("User not found.");

  const [tasks, time, woCreated, poCreated, receipts, movements] = await Promise.all([
    prisma.workOrderTask.count({ where: { assigneeId: id } }),
    prisma.timeEntry.count({ where: { userId: id } }),
    prisma.workOrder.count({ where: { createdById: id } }),
    prisma.purchaseOrder.count({ where: { createdById: id } }),
    prisma.goodsReceipt.count({ where: { receivedById: id } }),
    prisma.stockMovement.count({ where: { createdById: id } }),
  ]);

  if (tasks + time + woCreated + poCreated + receipts + movements > 0) {
    throw new Error(
      "Cannot delete: this user has work history (tasks, time, orders, or receipts). Reassign or deactivate instead.",
    );
  }

  if (user.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) throw new Error("Cannot delete the last administrator account.");
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
}
