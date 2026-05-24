import { getSession } from "@/lib/auth/session";
import type { Role } from "@/generated/prisma/client";

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("You must be signed in.");
  }
  return session;
}

export async function requireRole(allowed: Role[]) {
  const session = await requireSession();
  if (!allowed.includes(session.role)) {
    throw new Error("You do not have permission to perform this action.");
  }
  return session;
}
