import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

const prisma = new PrismaClient({ adapter });

/** Remove all operational data; user accounts are kept. */
async function main() {
  const userCount = await prisma.user.count();

  await prisma.stockMovement.deleteMany();
  await prisma.goodsReceiptLine.deleteMany();
  await prisma.goodsReceipt.deleteMany();
  await prisma.purchaseOrderLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.salesOrderLine.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.workOrderTask.deleteMany();
  await prisma.workOrderMaterial.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.bomLine.deleteMany();
  await prisma.bom.deleteMany();
  await prisma.partVendor.deleteMany();
  await prisma.part.deleteMany();
  await prisma.vendor.deleteMany();

  console.log(`Operational data cleared. ${userCount} user account(s) kept.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
