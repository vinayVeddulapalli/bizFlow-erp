import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Online Store & Orders across organizations...');

  const orgs = await prisma.organization.findMany();

  for (const org of orgs) {
    const products = await prisma.product.findMany({
      where: { organizationId: org.id },
      take: 5,
    });

    if (products.length === 0) continue;

    console.log(`Creating sample online orders for org: ${org.name}`);

    const existingCount = await prisma.onlineOrder.count({
      where: { organizationId: org.id },
    });

    if (existingCount > 0) {
      console.log(`Org ${org.name} already has ${existingCount} online orders.`);
      continue;
    }

    const sampleOrders = [
      {
        orderNumber: 'ORD-10021',
        customerName: 'Anand Verma',
        customerPhone: '9820011223',
        customerAddress: 'Flat 402, Sea Green Apts, Worli, Mumbai 400018',
        status: 'NEW',
        items: [
          {
            product: products[0],
            qty: 2,
            price: products[0].sellingPrice,
          },
        ],
      },
      {
        orderNumber: 'ORD-10022',
        customerName: 'Pooja Hegde',
        customerPhone: '9845099881',
        customerAddress: 'Plot 12, Jubilee Hills Road No 36, Hyderabad 500033',
        status: 'CONFIRMED',
        items: [
          {
            product: products[0],
            qty: 1,
            price: products[0].sellingPrice,
          },
          {
            product: products[1] || products[0],
            qty: 3,
            price: (products[1] || products[0]).sellingPrice,
          },
        ],
      },
      {
        orderNumber: 'ORD-10023',
        customerName: 'Kunal Deshmukh',
        customerPhone: '9811223344',
        customerAddress: 'Office 5, Cyber Park, Electronic City, Bengaluru 560100',
        status: 'DELIVERED',
        items: [
          {
            product: products[products.length - 1],
            qty: 5,
            price: products[products.length - 1].sellingPrice,
          },
        ],
      },
    ];

    for (const ord of sampleOrders) {
      let totalAmount = new Prisma.Decimal(0);
      const lines = ord.items.map((it) => {
        const qty = new Prisma.Decimal(it.qty);
        const price = new Prisma.Decimal(it.price.toString());
        const lineTotal = qty.mul(price);
        totalAmount = totalAmount.add(lineTotal);

        return {
          productId: it.product.id,
          productName: it.product.name,
          quantity: qty,
          unitPrice: price,
          lineTotal,
        };
      });

      await prisma.onlineOrder.create({
        data: {
          organizationId: org.id,
          orderNumber: ord.orderNumber,
          customerName: ord.customerName,
          customerPhone: ord.customerPhone,
          customerAddress: ord.customerAddress,
          totalAmount,
          status: ord.status,
          lines: {
            create: lines,
          },
        },
      });
    }
  }

  console.log('✅ Online Store orders seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
