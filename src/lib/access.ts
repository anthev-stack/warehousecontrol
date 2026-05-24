import type { Role } from "@/generated/prisma/client";

export type Area =
  | "purchasing"
  | "production"
  | "admin"
  | "sales"
  | "inventory"
  | "time";

export function canAccessArea(role: Role, area: Area): boolean {
  if (role === "ADMIN") return true;
  switch (area) {
    case "purchasing":
      return role === "PURCHASING";
    case "production":
      return role === "PRODUCTION";
    case "admin":
      return false;
    case "sales":
    case "inventory":
    case "time":
      return true;
    default:
      return false;
  }
}

export function roleTitle(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "Administrator";
    case "PURCHASING":
      return "Purchasing officer";
    case "PRODUCTION":
      return "Production manager";
    case "USER":
    default:
      return "User";
  }
}
