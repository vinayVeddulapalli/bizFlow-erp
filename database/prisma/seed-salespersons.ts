import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Salespersons across organizations...');

  const orgs = await prisma.organization.findMany();

  for (const org of orgs) {
    const existing = await prisma.salesperson.count({
      where: { organizationId: org.id },
    });

    if (existing > 0) {
      console.log(`Org ${org.name} already has ${existing} salespersons.`);
      continue;
    }

    const sampleSalespersons = [
      {
        name: 'Arjun Mehta',
        phone: '9820123456',
        email: 'arjun.mehta@field.bizflow.local',
        commissionPct: new Prisma.Decimal(5.0),
      },
      {
        name: 'Siddharth Roy',
        phone: '9845987654',
        email: 'siddharth.roy@field.bizflow.local',
        commissionPct: new Prisma.Decimal(4.5),
      },
      {
        name: 'Deepika Rao',
        phone: '9811445566',
        email: 'deepika.rao@field.bizflow.local',
        commissionPct: new Prisma.Decimal(6.0),
      },
    ];

    for (const sp of sampleSalespersons) {
      await prisma.salesperson.create({
        data: {
          organizationId: org.id,
          name: sp.name,
          phone: sp.phone,
          email: sp.email,
          commissionPct: sp.commissionPct,
          isActive: true,
        },
      });
    }

    console.log(`Seeded 3 salespersons for org: ${org.name}`);
  }

  console.log('✅ Salespersons seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
