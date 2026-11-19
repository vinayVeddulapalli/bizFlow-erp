import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAdvancedInventory() {
  console.log('--- Seeding Module D: Batches, Serials, Conversions & Pricing Matrix ---');
  const orgs = await prisma.organization.findMany();

  for (const org of orgs) {
    const warehouse = await prisma.warehouse.findFirst({ where: { organizationId: org.id } });
    const products = await prisma.product.findMany({ where: { organizationId: org.id } });
    const uoms = await prisma.unitOfMeasurement.findMany({ where: { organizationId: org.id } });
    const customers = await prisma.customer.findMany({ where: { organizationId: org.id } });

    if (!warehouse || products.length === 0) {
      console.log(`Skipping ${org.name}: missing basic warehouse or products`);
      continue;
    }

    console.log(`Seeding Advanced Inventory for ${org.name}...`);

    // 1. Batches
    const existingBatch = await prisma.productBatch.findFirst({ where: { organizationId: org.id } });
    if (!existingBatch) {
      await prisma.productBatch.create({
        data: {
          organizationId: org.id,
          productId: products[0].id,
          warehouseId: warehouse.id,
          batchNumber: 'BATCH-2026-NOV-01',
          mfgDate: new Date('2026-10-01'),
          expiryDate: new Date('2027-10-01'),
          mrp: 9999,
          purchasePrice: 6000,
          salePrice: 8500,
          currentStock: 25,
        },
      });

      if (products.length > 1) {
        // Add one batch expiring soon for testing alert
        await prisma.productBatch.create({
          data: {
            organizationId: org.id,
            productId: products[1].id,
            warehouseId: warehouse.id,
            batchNumber: 'BATCH-2026-EXP-EARLY',
            mfgDate: new Date('2026-05-01'),
            expiryDate: new Date(Date.now() + 15 * 86400000), // 15 days ahead -> Expiring Soon
            mrp: 4500,
            purchasePrice: 2800,
            salePrice: 3800,
            currentStock: 10,
          },
        });
      }
    }

    // 2. Serial Numbers
    const existingSerial = await prisma.productSerial.findFirst({ where: { organizationId: org.id } });
    if (!existingSerial) {
      await prisma.productSerial.create({
        data: {
          organizationId: org.id,
          productId: products[0].id,
          warehouseId: warehouse.id,
          serialNumber: 'SN-BF-2026-0001',
          status: 'IN_STOCK',
          warrantyExpiry: new Date('2027-11-19'),
        },
      });

      await prisma.productSerial.create({
        data: {
          organizationId: org.id,
          productId: products[0].id,
          warehouseId: warehouse.id,
          serialNumber: 'SN-BF-2026-0002',
          status: 'IN_STOCK',
          warrantyExpiry: new Date('2027-11-19'),
        },
      });
    }

    // 3. Unit Conversions (e.g. 1 Box = 10 Pcs)
    if (uoms.length >= 2) {
      const existingConv = await prisma.unitConversion.findFirst({ where: { organizationId: org.id } });
      if (!existingConv) {
        await prisma.unitConversion.create({
          data: {
            organizationId: org.id,
            productId: products[0].id,
            primaryUnitId: uoms[0].id,
            secondaryUnitId: uoms[1].id,
            conversionRatio: 12,
          },
        });
      }
    }

    // 4. Party Price Matrix
    if (customers.length > 0) {
      const existingPrice = await prisma.partyPriceMatrix.findFirst({ where: { organizationId: org.id } });
      if (!existingPrice) {
        await prisma.partyPriceMatrix.create({
          data: {
            organizationId: org.id,
            partyType: 'CUSTOMER',
            partyId: customers[0].id,
            productId: products[0].id,
            specialPrice: 7800, // discounted from 8500
            minOrderQty: 5,
            discountPct: 8.24,
          },
        });
      }
    }

    console.log(`✓ Module D seeded for ${org.name}`);
  }

  console.log('--- Module D Seeding Completed Successfully ---');
}

seedAdvancedInventory()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
