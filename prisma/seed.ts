import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, Role } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
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
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("demo123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@demo.com",
      name: "Alex Admin",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const purchasing = await prisma.user.create({
    data: {
      email: "purchasing@demo.com",
      name: "Pat Purchasing",
      passwordHash,
      role: Role.PURCHASING,
    },
  });

  const production = await prisma.user.create({
    data: {
      email: "production@demo.com",
      name: "Priya Production",
      passwordHash,
      role: Role.PRODUCTION,
    },
  });

  await prisma.user.create({
    data: {
      email: "user@demo.com",
      name: "Sam User",
      passwordHash,
      role: Role.USER,
    },
  });

  const acme = await prisma.vendor.create({
    data: {
      name: "Acme Components",
      email: "orders@acme.test",
      phone: "555-0100",
      defaultLeadDays: 5,
      notes: "Preferred mechanical supplier",
    },
  });

  const beta = await prisma.vendor.create({
    data: {
      name: "Beta Electronics",
      email: "sales@beta.test",
      phone: "555-0200",
      defaultLeadDays: 10,
    },
  });

  const frame = await prisma.part.create({
    data: {
      sku: "RAW-FRAME-001",
      name: "Welded frame subassembly",
      unit: "ea",
      onHand: 40,
      reorderPoint: 20,
      reorderQty: 50,
      avgLandedCost: 42.5,
      isPurchased: true,
      isManufactured: false,
      defaultVendorId: acme.id,
    },
  });

  const paint = await prisma.part.create({
    data: {
      sku: "CONS-PAINT-BLK",
      name: "Powder coat — black",
      unit: "kg",
      onHand: 12,
      reorderPoint: 15,
      reorderQty: 25,
      avgLandedCost: 8.2,
      isPurchased: true,
      isManufactured: false,
      defaultVendorId: acme.id,
    },
  });

  const pcb = await prisma.part.create({
    data: {
      sku: "ELEC-PCB-CTRL",
      name: "Control PCB assembly",
      unit: "ea",
      onHand: 8,
      reorderPoint: 10,
      reorderQty: 40,
      avgLandedCost: 63,
      isPurchased: true,
      isManufactured: false,
      defaultVendorId: beta.id,
    },
  });

  const screwKit = await prisma.part.create({
    data: {
      sku: "HW-KIT-M6",
      name: "Fastener kit M6",
      unit: "kit",
      onHand: 200,
      reorderPoint: 50,
      reorderQty: 100,
      avgLandedCost: 1.1,
      isPurchased: true,
      isManufactured: false,
      defaultVendorId: acme.id,
    },
  });

  const widget = await prisma.part.create({
    data: {
      sku: "FG-WIDGET-H1",
      name: 'Configurable widget — "Home" line',
      unit: "ea",
      onHand: 5,
      reorderPoint: 0,
      reorderQty: 0,
      avgLandedCost: 0,
      isPurchased: false,
      isManufactured: true,
    },
  });

  await prisma.partVendor.createMany({
    data: [
      {
        partId: frame.id,
        vendorId: acme.id,
        vendorPartNumber: "AC-FR-100",
        unitCost: 40,
        leadTimeDays: 5,
      },
      {
        partId: pcb.id,
        vendorId: beta.id,
        vendorPartNumber: "BT-CTRL-22",
        unitCost: 60,
        leadTimeDays: 12,
      },
    ],
  });

  const bom = await prisma.bom.create({
    data: {
      name: "Widget H1 — standard build",
      revision: "B",
      isConfigurable: true,
      finishedGoodPartId: widget.id,
      lines: {
        create: [
          { componentPartId: frame.id, qtyPer: 1, isOptional: false },
          { componentPartId: pcb.id, qtyPer: 1, isOptional: false },
          { componentPartId: screwKit.id, qtyPer: 1, isOptional: false },
          { componentPartId: paint.id, qtyPer: 0.4, isOptional: true },
        ],
      },
    },
  });

  const wo = await prisma.workOrder.create({
    data: {
      number: "WO-00001",
      bomId: bom.id,
      qty: 10,
      status: "RELEASED",
      notes: "Demo work order — release and start on the shop floor.",
      createdById: production.id,
      releasedAt: new Date(),
      materials: {
        create: [
          {
            partId: frame.id,
            qtyRequired: 10,
            qtyIssued: 0,
          },
          {
            partId: pcb.id,
            qtyRequired: 10,
            qtyIssued: 0,
          },
          {
            partId: screwKit.id,
            qtyRequired: 10,
            qtyIssued: 0,
          },
          {
            partId: paint.id,
            qtyRequired: 4,
            qtyIssued: 0,
          },
        ],
      },
      tasks: {
        create: [
          {
            title: "Prep frame and install PCB",
            sortOrder: 1,
            status: "TODO",
            assigneeId: admin.id,
          },
          {
            title: "Powder coat (optional line)",
            description: "Skip if customer selects bare metal config.",
            sortOrder: 2,
            status: "TODO",
          },
        ],
      },
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      number: "PO-00001",
      vendorId: beta.id,
      status: "SUBMITTED",
      expectedDate: new Date(Date.now() + 7 * 86_400_000),
      notes: "Restock PCBs after MRP run",
      createdById: purchasing.id,
      needsApproval: true,
      approvedAt: new Date(),
      lines: {
        create: [
          { partId: pcb.id, qtyOrdered: 40, unitCost: 61 },
        ],
      },
    },
  });

  await prisma.salesOrder.create({
    data: {
      number: "SO-00001",
      customerName: "Northwind Traders",
      status: "CONFIRMED",
      lines: {
        create: [{ partId: widget.id, qty: 3, unitPrice: 420 }],
      },
    },
  });

  await prisma.timeEntry.create({
    data: {
      userId: production.id,
      workOrderId: wo.id,
      description: "Setup and inspection",
      minutes: 45,
      laborRate: 55,
    },
  });

  console.log("Seed complete. Log in with any demo account, password: demo123");
  console.log("  admin@demo.com | purchasing@demo.com | production@demo.com | user@demo.com");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
