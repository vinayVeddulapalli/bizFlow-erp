import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding BizFlow ERP Initial Data ---');

  // 1. Seed System Roles
  const roles = [
    {
      name: 'SuperAdmin',
      description: 'Full administrative control over all tenant modules',
      isSystem: true,
      permissions: ['*'],
    },
    {
      name: 'Admin',
      description: 'Organization administrator',
      isSystem: true,
      permissions: [
        'org.*',
        'branches.*',
        'members.*',
        'sales.*',
        'purchases.*',
        'inventory.*',
        'accounting.*',
        'reports.*',
      ],
    },
    {
      name: 'Accountant',
      description: 'Financial ledger, vouchers, and tax reporting access',
      isSystem: true,
      permissions: [
        'accounting.*',
        'sales.read',
        'purchases.read',
        'reports.financial.*',
        'gst.*',
      ],
    },
    {
      name: 'SalesManager',
      description: 'Customer relations, quotations, and sales invoicing',
      isSystem: true,
      permissions: ['sales.*', 'customers.*', 'inventory.read'],
    },
    {
      name: 'InventoryManager',
      description: 'Stock control, warehouse transfers, and product master',
      isSystem: true,
      permissions: ['inventory.*', 'warehouses.*', 'products.*'],
    },
  ];

  const createdRoles: Record<string, string> = {};
  for (const r of roles) {
    let role = await prisma.role.findFirst({
      where: { name: r.name, isSystem: true },
    });
    if (!role) {
      role = await prisma.role.create({
        data: r,
      });
      console.log(`Created system role: ${role.name}`);
    }
    createdRoles[r.name] = role.id;
  }

  // 2. Seed Default Demo SuperAdmin User
  const email = 'admin@bizflow.local';
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const passwordHash = await argon2.hash('Password@123', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    user = await prisma.user.create({
      data: {
        email,
        fullName: 'Super Administrator',
        passwordHash,
        isEmailVerified: true,
      },
    });
    console.log(`Created demo admin user: ${email} (Password: Password@123)`);
  }

  // 3. Seed Default Organization
  let org = await prisma.organization.findFirst({
    where: { name: 'Acme Enterprises' },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Acme Enterprises',
        legalName: 'Acme Enterprises Private Limited',
        gstin: '27AABCU9603R1ZM', // Valid dummy format Maharashtra GSTIN
        pan: 'AABCU9603R',
        currencyCode: 'INR',
        fiscalYearStartMonth: 4, // April
      },
    });
    console.log(`Created demo organization: ${org.name}`);

    // Create Main Branch
    const branch = await prisma.branch.create({
      data: {
        organizationId: org.id,
        name: 'Head Office (Mumbai)',
        code: 'HQ-MUM',
        gstin: '27AABCU9603R1ZM',
        addressLine1: '402 Trade Centre, BKC',
        city: 'Mumbai',
        state: 'Maharashtra',
        stateCode: '27',
        postalCode: '400051',
        isMainBranch: true,
      },
    });
    console.log(`Created main branch: ${branch.name}`);

    // Create Default Warehouse
    const warehouse = await prisma.warehouse.create({
      data: {
        organizationId: org.id,
        branchId: branch.id,
        name: 'Central Warehouse (Bhiwandi)',
        code: 'WH-MAIN',
        isDefault: true,
      },
    });
    console.log(`Created main warehouse: ${warehouse.name}`);

    // Attach SuperAdmin to Organization
    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        roleId: createdRoles['SuperAdmin'],
        isDefault: true,
      },
    });
    console.log(`Associated user ${user.email} with ${org.name} as SuperAdmin`);
  }

  console.log('--- Seeding Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
