import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedOrders() {
  console.log('--- Seeding Module C: Orders, Challans & Notes ---');
  const orgs = await prisma.organization.findMany();

  for (const org of orgs) {
    const branch = await prisma.branch.findFirst({ where: { organizationId: org.id } });
    const customers = await prisma.customer.findMany({ where: { organizationId: org.id } });
    const suppliers = await prisma.supplier.findMany({ where: { organizationId: org.id } });
    const products = await prisma.product.findMany({ where: { organizationId: org.id } });

    if (!branch || customers.length === 0 || suppliers.length === 0 || products.length === 0) {
      console.log(`Skipping ${org.name}: missing basic masters`);
      continue;
    }

    console.log(`Seeding Orders & Challans for ${org.name}...`);

    // 1. Sales Orders
    const existingSo = await prisma.salesOrder.findFirst({ where: { organizationId: org.id } });
    if (!existingSo) {
      await prisma.salesOrder.create({
        data: {
          organizationId: org.id,
          branchId: branch.id,
          customerId: customers[0].id,
          orderNumber: 'SO-2026-27-00001',
          orderDate: new Date('2026-11-10'),
          validUntil: new Date('2026-11-25'),
          status: 'PENDING',
          totalTaxable: 25000,
          totalTax: 4500,
          totalAmount: 29500,
          notes: 'Standard commercial supply order. Ready for dispatch.',
          lines: {
            create: [
              {
                productId: products[0].id,
                quantity: 5,
                unitPrice: 5000,
                taxRate: 18,
                taxAmount: 4500,
                lineTotal: 29500,
              },
            ],
          },
        },
      });

      if (customers.length > 1 && products.length > 1) {
        await prisma.salesOrder.create({
          data: {
            organizationId: org.id,
            branchId: branch.id,
            customerId: customers[1].id,
            orderNumber: 'SO-2026-27-00002',
            orderDate: new Date('2026-11-15'),
            validUntil: new Date('2026-11-30'),
            status: 'PENDING',
            totalTaxable: 18000,
            totalTax: 3240,
            totalAmount: 21240,
            notes: 'High-priority client annual replenishment.',
            lines: {
              create: [
                {
                  productId: products[1].id,
                  quantity: 2,
                  unitPrice: 9000,
                  taxRate: 18,
                  taxAmount: 3240,
                  lineTotal: 21240,
                },
              ],
            },
          },
        });
      }
    }

    // 2. Purchase Orders
    const existingPo = await prisma.purchaseOrder.findFirst({ where: { organizationId: org.id } });
    if (!existingPo) {
      await prisma.purchaseOrder.create({
        data: {
          organizationId: org.id,
          branchId: branch.id,
          supplierId: suppliers[0].id,
          orderNumber: 'PO-2026-27-00001',
          orderDate: new Date('2026-11-05'),
          expectedDate: new Date('2026-11-20'),
          status: 'PLACED',
          totalAmount: 42000,
          lines: {
            create: [
              {
                productId: products[0].id,
                quantity: 12,
                unitCost: 3500,
                lineTotal: 42000,
              },
            ],
          },
        },
      });
    }

    // 3. Delivery Challans
    const existingDc = await prisma.deliveryChallan.findFirst({ where: { organizationId: org.id } });
    if (!existingDc) {
      await prisma.deliveryChallan.create({
        data: {
          organizationId: org.id,
          branchId: branch.id,
          customerId: customers[0].id,
          challanNumber: 'DC-2026-27-00001',
          challanDate: new Date('2026-11-12'),
          vehicleNumber: 'MH-04-AB-9876',
          eWayBillNumber: '271298453412',
          status: 'DISPATCHED',
          lines: {
            create: [
              {
                productId: products[0].id,
                quantity: 5,
              },
            ],
          },
        },
      });
    }

    // 4. Credit Notes
    const existingCn = await prisma.creditNote.findFirst({ where: { organizationId: org.id } });
    if (!existingCn) {
      await prisma.creditNote.create({
        data: {
          organizationId: org.id,
          branchId: branch.id,
          customerId: customers[0].id,
          noteNumber: 'CN-2026-27-00001',
          noteDate: new Date('2026-11-14'),
          reasonCode: 'GOODS_RETURN',
          taxableAmount: 4000,
          taxAmount: 720,
          totalAmount: 4720,
          lines: {
            create: [
              {
                productId: products[0].id,
                quantity: 1,
                unitPrice: 4000,
                lineTotal: 4720,
              },
            ],
          },
        },
      });
    }

    // 5. Debit Notes
    const existingDn = await prisma.debitNote.findFirst({ where: { organizationId: org.id } });
    if (!existingDn) {
      await prisma.debitNote.create({
        data: {
          organizationId: org.id,
          branchId: branch.id,
          supplierId: suppliers[0].id,
          noteNumber: 'DN-2026-27-00001',
          noteDate: new Date('2026-11-16'),
          reasonCode: 'DAMAGED_SUPPLY_RETURN',
          taxableAmount: 3500,
          taxAmount: 630,
          totalAmount: 4130,
          lines: {
            create: [
              {
                productId: products[0].id,
                quantity: 1,
                unitCost: 3500,
                lineTotal: 4130,
              },
            ],
          },
        },
      });
    }

    console.log(`✓ Module C seeded for ${org.name}`);
  }

  console.log('--- Module C Seeding Completed Successfully ---');
}

seedOrders()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
