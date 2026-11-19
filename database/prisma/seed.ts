import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$d1bNOS1zGm1T3PtyX74DJQ$vAeXinLIype6JF/06I4H0MXiVhtjm5GvoCCFsJp7sZ8';

async function seedOrganization(org: any, roleMap: Record<string, string>) {
  console.log(`\n=============================================================`);
  console.log(`🌱 Seeding dummy data for Organization: "${org.name}" (${org.id})`);
  console.log(`=============================================================`);

  // 1. Operating Branches
  let mainBranch = await prisma.branch.findFirst({
    where: { organizationId: org.id },
  });
  if (!mainBranch) {
    mainBranch = await prisma.branch.create({
      data: {
        organizationId: org.id,
        name: 'Head Office (Mumbai)',
        code: 'HQ-01',
        gstin: '27AABCU9603R1ZM',
        addressLine1: 'B-402, Trade World, Lower Parel',
        city: 'Mumbai',
        state: 'Maharashtra',
        stateCode: '27',
        postalCode: '400013',
        isMainBranch: true,
      },
    });
  }

  let secondaryBranch = await prisma.branch.findFirst({
    where: { organizationId: org.id, code: 'BR-02' },
  });
  if (!secondaryBranch) {
    secondaryBranch = await prisma.branch.create({
      data: {
        organizationId: org.id,
        name: 'Branch Office (Pune)',
        code: 'BR-02',
        gstin: '27AABCU9603R1ZM',
        addressLine1: 'Tech Centre, Hinjewadi Phase 1',
        city: 'Pune',
        state: 'Maharashtra',
        stateCode: '27',
        postalCode: '411057',
        isMainBranch: false,
      },
    });
  }
  console.log(`✓ Branches verified (${mainBranch.name}, ${secondaryBranch.name})`);

  // 2. Warehouses
  let mainWarehouse = await prisma.warehouse.findFirst({
    where: { organizationId: org.id, isDefault: true },
  });
  if (!mainWarehouse) {
    mainWarehouse = await prisma.warehouse.create({
      data: {
        organizationId: org.id,
        branchId: mainBranch.id,
        name: 'Central Warehouse (Bhiwandi)',
        code: 'WH-01',
        isDefault: true,
      },
    });
  }

  let secondaryWarehouse = await prisma.warehouse.findFirst({
    where: { organizationId: org.id, code: 'WH-02' },
  });
  if (!secondaryWarehouse) {
    secondaryWarehouse = await prisma.warehouse.create({
      data: {
        organizationId: org.id,
        branchId: mainBranch.id,
        name: 'Retail Depot (Andheri)',
        code: 'WH-02',
        isDefault: false,
      },
    });
  }
  console.log(`✓ Warehouses verified (${mainWarehouse.name}, ${secondaryWarehouse.name})`);

  // 3. Product Categories
  const categories: Record<string, string> = {};
  const catNames = ['Office Furniture', 'IT & Electronics', 'Packaging & Supplies'];
  for (const name of catNames) {
    let cat = await prisma.productCategory.findFirst({
      where: { organizationId: org.id, name },
    });
    if (!cat) {
      cat = await prisma.productCategory.create({
        data: { organizationId: org.id, name },
      });
    }
    categories[name] = cat.id;
  }
  console.log('✓ Product categories verified');

  // 4. Units of Measurement (UOM)
  const uomsToSeed = [
    { code: 'PCS', name: 'Pieces' },
    { code: 'BOX', name: 'Boxes' },
    { code: 'SET', name: 'Sets' },
  ];
  const uomMap: Record<string, string> = {};
  for (const u of uomsToSeed) {
    let uom = await prisma.unitOfMeasurement.findFirst({
      where: { organizationId: org.id, code: u.code },
    });
    if (!uom) {
      uom = await prisma.unitOfMeasurement.create({
        data: {
          organizationId: org.id,
          code: u.code,
          name: u.name,
        },
      });
    }
    uomMap[u.code] = uom.id;
  }
  console.log('✓ Units of Measurement verified');

  // 5. Products & Stock
  const productsToSeed = [
    {
      name: 'Ergonomic Executive Chair',
      sku: 'FUR-CHR-01',
      barcode: '8901234567890',
      hsnSacCode: '94013000',
      sellingPrice: 4500,
      purchasePrice: 3200,
      taxRate: 18,
      minStockLevel: 5,
      category: 'Office Furniture',
      uom: 'PCS',
      stockQty: 45,
    },
    {
      name: 'Motorized Standing Desk',
      sku: 'FUR-DSK-02',
      barcode: '8901234567891',
      hsnSacCode: '94031000',
      sellingPrice: 18500,
      purchasePrice: 12000,
      taxRate: 18,
      minStockLevel: 3,
      category: 'Office Furniture',
      uom: 'PCS',
      stockQty: 15,
    },
    {
      name: 'Wireless Mechanical Keyboard',
      sku: 'IT-KBD-03',
      barcode: '8901234567892',
      hsnSacCode: '84716000',
      sellingPrice: 2900,
      purchasePrice: 1800,
      taxRate: 18,
      minStockLevel: 10,
      category: 'IT & Electronics',
      uom: 'PCS',
      stockQty: 60,
    },
    {
      name: 'Dual 4K USB-C Docking Station',
      sku: 'IT-DCK-04',
      barcode: '8901234567893',
      hsnSacCode: '84718000',
      sellingPrice: 8200,
      purchasePrice: 5500,
      taxRate: 18,
      minStockLevel: 5,
      category: 'IT & Electronics',
      uom: 'PCS',
      stockQty: 25,
    },
    {
      name: 'Thermal Receipt Rolls (80mm)',
      sku: 'PKG-THM-05',
      barcode: '8901234567894',
      hsnSacCode: '48025400',
      sellingPrice: 120,
      purchasePrice: 45,
      taxRate: 12,
      minStockLevel: 50,
      category: 'Packaging & Supplies',
      uom: 'BOX',
      stockQty: 300,
    },
    {
      name: 'Anti-Fatigue Floor Mat',
      sku: 'FUR-MAT-06',
      barcode: '8901234567895',
      hsnSacCode: '57050000',
      sellingPrice: 1450,
      purchasePrice: 800,
      taxRate: 18,
      minStockLevel: 8,
      category: 'Office Furniture',
      uom: 'PCS',
      stockQty: 40,
    },
  ];

  const productMap: Record<string, string> = {};
  for (const p of productsToSeed) {
    let prod = await prisma.product.findFirst({
      where: { organizationId: org.id, sku: p.sku },
    });
    if (!prod) {
      prod = await prisma.product.create({
        data: {
          organizationId: org.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          hsnSacCode: p.hsnSacCode,
          sellingPrice: p.sellingPrice,
          purchasePrice: p.purchasePrice,
          taxRate: p.taxRate,
          minStockLevel: p.minStockLevel,
          categoryId: categories[p.category],
          uomId: uomMap[p.uom],
        },
      });

      // Create initial stock level
      await prisma.stockLevel.create({
        data: {
          organizationId: org.id,
          productId: prod.id,
          warehouseId: mainWarehouse.id,
          quantity: p.stockQty,
        },
      });

      // Stock movement audit
      await prisma.stockMovement.create({
        data: {
          organizationId: org.id,
          productId: prod.id,
          warehouseId: mainWarehouse.id,
          movementType: 'OPENING_STOCK',
          quantity: p.stockQty,
          unitCost: p.purchasePrice,
          referenceType: 'MANUAL',
          referenceId: 'OPENING',
          notes: 'Initial warehouse opening stock setup',
        },
      });
    }
    productMap[p.sku] = prod.id;
  }
  console.log('✓ Products & Stock levels verified (6 products initialized)');

  // 6. Customers
  const customersToSeed = [
    {
      name: 'Walk-in Counter Customer',
      companyName: 'Cash Retail Counter',
      phone: '9999999999',
      email: 'counter@bizflow.local',
      gstin: null,
      partyType: 'UNREGISTERED' as const,
      state: 'Maharashtra',
      stateCode: '27',
      billingAddress: 'In-store Walkin Counter, Mumbai',
      currentBalance: 0,
    },
    {
      name: 'Apex Logistics Solutions Pvt Ltd',
      companyName: 'Apex Logistics',
      phone: '9820011223',
      email: 'accounts@apexlogistics.in',
      gstin: '27AAACA1234A1Z5',
      partyType: 'REGULAR' as const,
      state: 'Maharashtra',
      stateCode: '27',
      billingAddress: 'Plot 45, MIDC Industrial Area, Andheri East, Mumbai 400093',
      currentBalance: 14500,
    },
    {
      name: 'Metro Retail Mart',
      companyName: 'Metro Retailers Pvt Ltd',
      phone: '9819922334',
      email: 'billing@metromart.com',
      gstin: '27BBBCA5678B1Z2',
      partyType: 'REGULAR' as const,
      state: 'Maharashtra',
      stateCode: '27',
      billingAddress: 'Shop 12-14, Galleria Mall, Hiranandani, Powai, Mumbai 400076',
      currentBalance: 28900,
    },
    {
      name: 'Bangalore Tech Park Ltd',
      companyName: 'Tech Park Realties',
      phone: '9845012345',
      email: 'procurement@blortechpark.com',
      gstin: '29CCCCA9012C1Z8',
      partyType: 'REGULAR' as const,
      state: 'Karnataka',
      stateCode: '29',
      billingAddress: 'Tower B, Outer Ring Road, Bellandur, Bengaluru 560103',
      currentBalance: 42000,
    },
  ];

  const customerMap: Record<string, string> = {};
  for (const c of customersToSeed) {
    let cust = await prisma.customer.findFirst({
      where: { organizationId: org.id, name: c.name },
    });
    if (!cust) {
      cust = await prisma.customer.create({
        data: {
          organizationId: org.id,
          name: c.name,
          companyName: c.companyName,
          phone: c.phone,
          email: c.email,
          gstin: c.gstin,
          partyType: c.partyType,
          state: c.state,
          stateCode: c.stateCode,
          billingAddress: c.billingAddress,
          currentBalance: c.currentBalance,
        },
      });
    }
    customerMap[c.name] = cust.id;
  }
  console.log('✓ Customers verified (4 customers initialized)');

  // 7. Suppliers
  const suppliersToSeed = [
    {
      name: 'Nilkamal Office Systems Ltd',
      companyName: 'Nilkamal Ltd',
      phone: '9820055443',
      email: 'b2b@nilkamal.com',
      gstin: '27AADCN4589N1Z4',
      state: 'Maharashtra',
      stateCode: '27',
      billingAddress: '77/78 Nilkamal House, Road No 13, MIDC, Andheri East, Mumbai 400093',
      currentBalance: 35000,
    },
    {
      name: 'Logitech Electronic Importers',
      companyName: 'Logitech India Distributors',
      phone: '9811122334',
      email: 'orders@logitechdist.in',
      gstin: '27AAACL3456L1Z9',
      state: 'Maharashtra',
      stateCode: '27',
      billingAddress: 'Godown 4, Bhiwandi Logistics Park, Thane 421302',
      currentBalance: 18400,
    },
    {
      name: 'RollPack Papers India',
      companyName: 'RollPack Papers Ltd',
      phone: '9890011223',
      email: 'sales@rollpack.in',
      gstin: '27AABCR7890R1Z1',
      state: 'Maharashtra',
      stateCode: '27',
      billingAddress: 'Survey 102, Chakan Industrial Area, Pune 410501',
      currentBalance: 6200,
    },
  ];

  const supplierMap: Record<string, string> = {};
  for (const s of suppliersToSeed) {
    let sup = await prisma.supplier.findFirst({
      where: { organizationId: org.id, name: s.name },
    });
    if (!sup) {
      sup = await prisma.supplier.create({
        data: {
          organizationId: org.id,
          name: s.name,
          companyName: s.companyName,
          phone: s.phone,
          email: s.email,
          gstin: s.gstin,
          partyType: 'REGULAR',
          state: s.state,
          stateCode: s.stateCode,
          billingAddress: s.billingAddress,
          currentBalance: s.currentBalance,
        },
      });
    }
    supplierMap[s.name] = sup.id;
  }
  console.log('✓ Suppliers verified (3 suppliers initialized)');

  // 8. CRM Leads
  const leadsToSeed = [
    {
      name: 'Rohan Verma',
      companyName: 'Tata Consultancy Services',
      email: 'rohan.verma@tcs.com',
      phone: '9820099887',
      source: 'Referral',
      status: 'PROPOSAL' as const,
      estimatedValue: 45000,
      notes: 'Requested proposal for 10 ergonomic chairs and 2 standing desks.',
    },
    {
      name: 'Sneha Kulkarni',
      companyName: 'Infosys BPM',
      email: 'sneha.k@infosys.com',
      phone: '9833344556',
      source: 'Website / Inbound',
      status: 'QUALIFIED' as const,
      estimatedValue: 120000,
      notes: 'Fitting out entire second floor development wing.',
    },
    {
      name: 'Anil Deshmukh',
      companyName: 'Deshmukh Finserve',
      email: 'anil@deshmukhfin.com',
      phone: '9821100223',
      source: 'Cold Call',
      status: 'CONTACTED' as const,
      estimatedValue: 28000,
      notes: 'Initial discussion held. Sent product catalog.',
    },
    {
      name: 'Pooja Mehta',
      companyName: 'Zomato Regional Office',
      email: 'pooja.mehta@zomato.com',
      phone: '9819988776',
      source: 'Inbound',
      status: 'WON' as const,
      estimatedValue: 65000,
      notes: 'Order confirmed. In process of generating sales invoice.',
    },
    {
      name: 'Kunal Joshi',
      companyName: 'Startup Hub Incubator',
      email: 'kunal@startuphub.co',
      phone: '9870011223',
      source: 'Trade Expo',
      status: 'NEW' as const,
      estimatedValue: 15000,
      notes: 'New lead from Mumbai SME Expo.',
    },
  ];

  for (const l of leadsToSeed) {
    const existing = await prisma.lead.findFirst({
      where: { organizationId: org.id, name: l.name },
    });
    if (!existing) {
      await prisma.lead.create({
        data: {
          organizationId: org.id,
          name: l.name,
          companyName: l.companyName,
          email: l.email,
          phone: l.phone,
          source: l.source,
          status: l.status,
          estimatedValue: l.estimatedValue,
          notes: l.notes,
        },
      });
    }
  }
  console.log('✓ CRM Leads verified (5 leads initialized)');

  // 9. Departments & Designations
  const departmentsToSeed = [
    'Executive Management',
    'Sales & Marketing',
    'Finance & Accounts',
    'Warehouse & Operations',
    'Human Resources',
  ];
  const deptMap: Record<string, string> = {};
  for (const deptName of departmentsToSeed) {
    let d = await prisma.department.findFirst({
      where: { organizationId: org.id, name: deptName },
    });
    if (!d) {
      d = await prisma.department.create({
        data: { organizationId: org.id, name: deptName },
      });
    }
    deptMap[deptName] = d.id;
  }

  const designationsToSeed = [
    'Director',
    'Senior Sales Manager',
    'Lead Accountant',
    'Warehouse Supervisor',
    'HR Generalist',
  ];
  const desigMap: Record<string, string> = {};
  for (const title of designationsToSeed) {
    let dg = await prisma.designation.findFirst({
      where: { organizationId: org.id, name: title },
    });
    if (!dg) {
      dg = await prisma.designation.create({
        data: {
          organizationId: org.id,
          name: title,
        },
      });
    }
    desigMap[title] = dg.id;
  }
  console.log('✓ Departments & Designations verified');

  // 10. Employees
  const employeesToSeed = [
    {
      employeeCode: 'EMP-001',
      firstName: 'Rahul',
      lastName: 'Sharma',
      email: `rahul.s@${org.name.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: '9820012345',
      joiningDate: new Date('2025-04-01'),
      dept: 'Sales & Marketing',
      desig: 'Senior Sales Manager',
      basic: 40000,
      hra: 16000,
      allowance: 8000,
      deduction: 3200,
    },
    {
      employeeCode: 'EMP-002',
      firstName: 'Priya',
      lastName: 'Nair',
      email: `priya.n@${org.name.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: '9820054321',
      joiningDate: new Date('2025-05-15'),
      dept: 'Finance & Accounts',
      desig: 'Lead Accountant',
      basic: 35000,
      hra: 14000,
      allowance: 7000,
      deduction: 2800,
    },
    {
      employeeCode: 'EMP-003',
      firstName: 'Suresh',
      lastName: 'Ghadge',
      email: `suresh.g@${org.name.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: '9820098765',
      joiningDate: new Date('2025-06-01'),
      dept: 'Warehouse & Operations',
      desig: 'Warehouse Supervisor',
      basic: 25000,
      hra: 10000,
      allowance: 5000,
      deduction: 2000,
    },
    {
      employeeCode: 'EMP-004',
      firstName: 'Neha',
      lastName: 'Gupta',
      email: `neha.g@${org.name.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: '9820067890',
      joiningDate: new Date('2025-07-01'),
      dept: 'Human Resources',
      desig: 'HR Generalist',
      basic: 30000,
      hra: 12000,
      allowance: 6000,
      deduction: 2400,
    },
  ];

  const employeeIds: string[] = [];
  for (const emp of employeesToSeed) {
    let e = await prisma.employee.findFirst({
      where: { organizationId: org.id, employeeCode: emp.employeeCode },
    });
    if (!e) {
      e = await prisma.employee.create({
        data: {
          organizationId: org.id,
          employeeCode: emp.employeeCode,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          phone: emp.phone,
          joiningDate: emp.joiningDate,
          status: 'ACTIVE',
          departmentId: deptMap[emp.dept],
          designationId: desigMap[emp.desig],
          basicSalary: emp.basic,
          hra: emp.hra,
          allowances: emp.allowance,
          deductions: emp.deduction,
          bankAccountNumber: '918010045678' + Math.floor(100 + Math.random() * 900),
          bankIfscCode: 'HDFC0000123',
          panNumber: 'ABCPS' + Math.floor(1000 + Math.random() * 9000) + 'A',
        },
      });
    }
    employeeIds.push(e.id);
  }
  console.log('✓ Employees verified (4 staff members initialized)');

  // 11. Daily Attendance
  const today = new Date();
  for (const empId of employeeIds) {
    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        organizationId: org.id,
        employeeId: empId,
        date: today,
      },
    });
    if (!existing) {
      await prisma.attendanceRecord.create({
        data: {
          organizationId: org.id,
          employeeId: empId,
          date: today,
          status: 'PRESENT',
        },
      });
    }
  }
  console.log('✓ Today attendance records verified');

  // 12. Payroll Period & Payslips
  let payrollPeriod = await prisma.payrollPeriod.findFirst({
    where: { organizationId: org.id, month: today.getMonth() + 1, year: today.getFullYear() },
  });
  if (!payrollPeriod) {
    payrollPeriod = await prisma.payrollPeriod.create({
      data: {
        organizationId: org.id,
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        status: 'APPROVED',
        totalGross: 247000,
        totalDeductions: 10400,
        totalNet: 236600,
      },
    });

    for (let i = 0; i < employeesToSeed.length; i++) {
      const empData = employeesToSeed[i];
      const gross = empData.basic + empData.hra + empData.allowance;
      const net = gross - empData.deduction;

      await prisma.payslip.create({
        data: {
          payrollPeriodId: payrollPeriod.id,
          employeeId: employeeIds[i],
          workingDays: 30,
          presentDays: 28,
          basicSalary: empData.basic,
          hra: empData.hra,
          allowances: empData.allowance,
          grossSalary: gross,
          deductions: empData.deduction,
          netSalary: net,
          status: 'APPROVED',
        },
      });
    }
  }
  console.log('✓ Payroll run & payslips verified');

  // 13. Indian Standard Chart of Accounts
  const standardAccounts = [
    // ASSETS
    { code: '1110', name: 'Cash in Hand', category: 'ASSET' as const, isSystem: true, balance: 15400 },
    { code: '1120', name: 'HDFC Bank Current A/c', category: 'ASSET' as const, isSystem: true, balance: 485000 },
    { code: '1200', name: 'Accounts Receivable (Debtors)', category: 'ASSET' as const, isSystem: true, balance: 85400 },
    { code: '1300', name: 'Inventory / Stock Asset', category: 'ASSET' as const, isSystem: true, balance: 342000 },
    { code: '1410', name: 'Input CGST (Tax Credit)', category: 'ASSET' as const, isSystem: true, balance: 8400 },
    { code: '1420', name: 'Input SGST (Tax Credit)', category: 'ASSET' as const, isSystem: true, balance: 8400 },
    { code: '1430', name: 'Input IGST (Tax Credit)', category: 'ASSET' as const, isSystem: true, balance: 0 },
    // LIABILITIES
    { code: '2100', name: 'Accounts Payable (Creditors)', category: 'LIABILITY' as const, isSystem: true, balance: 59600 },
    { code: '2210', name: 'Output CGST (Tax Liability)', category: 'LIABILITY' as const, isSystem: true, balance: 12400 },
    { code: '2220', name: 'Output SGST (Tax Liability)', category: 'LIABILITY' as const, isSystem: true, balance: 12400 },
    { code: '2230', name: 'Output IGST (Tax Liability)', category: 'LIABILITY' as const, isSystem: true, balance: 6400 },
    { code: '2300', name: 'Salary Payable', category: 'LIABILITY' as const, isSystem: true, balance: 0 },
    // EQUITY
    { code: '3100', name: 'Owner Capital', category: 'EQUITY' as const, isSystem: true, balance: 500000 },
    { code: '3200', name: 'Retained Earnings', category: 'EQUITY' as const, isSystem: true, balance: 350000 },
    // REVENUE
    { code: '4100', name: 'Sales Revenue', category: 'REVENUE' as const, isSystem: true, balance: 245000 },
    { code: '4200', name: 'Consulting Revenue', category: 'REVENUE' as const, isSystem: true, balance: 25000 },
    // EXPENSES
    { code: '5100', name: 'Cost of Goods Sold (COGS)', category: 'EXPENSE' as const, isSystem: true, balance: 120000 },
    { code: '5200', name: 'Purchases (Goods)', category: 'EXPENSE' as const, isSystem: true, balance: 85000 },
    { code: '6100', name: 'Office Rent Expense', category: 'EXPENSE' as const, isSystem: true, balance: 50000 },
    { code: '6200', name: 'Electricity & Utilities', category: 'EXPENSE' as const, isSystem: true, balance: 17000 },
    { code: '6300', name: 'Employee Salaries', category: 'EXPENSE' as const, isSystem: true, balance: 236600 },
  ];

  const accountMap: Record<string, string> = {};
  for (const acc of standardAccounts) {
    let a = await prisma.account.findFirst({
      where: { organizationId: org.id, code: acc.code },
    });
    if (!a) {
      a = await prisma.account.create({
        data: {
          organizationId: org.id,
          code: acc.code,
          name: acc.name,
          category: acc.category,
          isSystem: acc.isSystem,
          currentBalance: acc.balance,
        },
      });
    }
    accountMap[acc.code] = a.id;
  }
  console.log('✓ Chart of Accounts verified (21 accounts initialized)');

  // 14. Balanced Double-Entry Journal Vouchers
  const jvEntries = [
    {
      entryNumber: 'JV-2026-27-00001',
      date: new Date('2026-11-01'),
      narration: 'Capital contribution by promoters into HDFC bank account',
      lines: [
        { account: '1120', debit: 500000, credit: 0, desc: 'Deposit in HDFC Bank' },
        { account: '3100', debit: 0, credit: 500000, desc: 'Owner Equity Investment' },
      ],
    },
    {
      entryNumber: 'JV-2026-27-00002',
      date: new Date('2026-11-05'),
      narration: 'Office space monthly rent paid via RTGS transfer',
      lines: [
        { account: '6100', debit: 25000, credit: 0, desc: 'Office Rent BKC' },
        { account: '1120', debit: 0, credit: 25000, desc: 'Bank RTGS transfer' },
      ],
    },
    {
      entryNumber: 'JV-2026-27-00003',
      date: new Date('2026-11-10'),
      narration: 'Electricity and high-speed fiber broadband bill settlement',
      lines: [
        { account: '6200', debit: 8500, credit: 0, desc: 'Electricity & Internet' },
        { account: '1120', debit: 0, credit: 8500, desc: 'Direct Debit Netbanking' },
      ],
    },
  ];

  for (const jv of jvEntries) {
    const existing = await prisma.journalEntry.findFirst({
      where: { organizationId: org.id, entryNumber: jv.entryNumber },
    });
    if (!existing) {
      const totalAmount = jv.lines.reduce((sum, l) => sum + l.debit, 0);
      const entry = await prisma.journalEntry.create({
        data: {
          organizationId: org.id,
          entryNumber: jv.entryNumber,
          entryDate: jv.date,
          referenceType: 'MANUAL',
          referenceId: 'MANUAL_JV',
          narration: jv.narration,
          totalDebit: totalAmount,
          totalCredit: totalAmount,
          status: 'POSTED',
          postedAt: jv.date,
        },
      });

      for (const line of jv.lines) {
        await prisma.journalEntryLine.create({
          data: {
            journalEntryId: entry.id,
            accountId: accountMap[line.account],
            debit: line.debit,
            credit: line.credit,
            description: line.desc,
          },
        });
      }
    }
  }
  console.log('✓ Journal vouchers verified (3 balanced double-entry vouchers initialized)');

  // 15. Sales Invoices
  const invoicesToSeed = [
    {
      invNum: 'INV-2026-27-00001',
      customer: 'Metro Retail Mart',
      date: new Date('2026-11-12'),
      due: new Date('2026-12-12'),
      status: 'POSTED' as const,
      subtotal: 24491.53,
      cgst: 2204.24,
      sgst: 2204.24,
      igst: 0,
      totalTax: 4408.47,
      total: 28900,
      items: [
        { sku: 'FUR-CHR-01', desc: 'Ergonomic Executive Chair', qty: 5, price: 4500, taxRate: 18 },
        { sku: 'PKG-THM-05', desc: 'Thermal Receipt Rolls (80mm)', qty: 20, price: 120, taxRate: 12 },
      ],
    },
    {
      invNum: 'INV-2026-27-00002',
      customer: 'Apex Logistics Solutions Pvt Ltd',
      date: new Date('2026-11-15'),
      due: new Date('2026-12-15'),
      status: 'POSTED' as const,
      subtotal: 12288.14,
      cgst: 1105.93,
      sgst: 1105.93,
      igst: 0,
      totalTax: 2211.86,
      total: 14500,
      items: [
        { sku: 'IT-KBD-03', desc: 'Wireless Mechanical Keyboard', qty: 5, price: 2900, taxRate: 18 },
      ],
    },
    {
      invNum: 'INV-2026-27-00003',
      customer: 'Bangalore Tech Park Ltd',
      date: new Date('2026-11-17'),
      due: new Date('2026-12-17'),
      status: 'DRAFT' as const,
      subtotal: 35593.22,
      cgst: 0,
      sgst: 0,
      igst: 6406.78,
      totalTax: 6406.78,
      total: 42000,
      items: [
        { sku: 'FUR-DSK-02', desc: 'Motorized Standing Desk', qty: 2, price: 18500, taxRate: 18 },
        { sku: 'IT-DCK-04', desc: 'Dual 4K USB-C Docking Station', qty: 1, price: 5000, taxRate: 18 },
      ],
    },
  ];

  for (const inv of invoicesToSeed) {
    const existing = await prisma.salesInvoice.findFirst({
      where: { organizationId: org.id, invoiceNumber: inv.invNum },
    });
    if (!existing) {
      const createdInv = await prisma.salesInvoice.create({
        data: {
          organizationId: org.id,
          branchId: mainBranch.id,
          customerId: customerMap[inv.customer],
          invoiceNumber: inv.invNum,
          invoiceDate: inv.date,
          dueDate: inv.due,
          status: inv.status,
          subtotalAmount: inv.subtotal,
          cgstAmount: inv.cgst,
          sgstAmount: inv.sgst,
          igstAmount: inv.igst,
          totalTaxAmount: inv.totalTax,
          totalAmount: inv.total,
          paidAmount: inv.status === 'POSTED' ? inv.total : 0,
          dueAmount: inv.status === 'POSTED' ? 0 : inv.total,
          placeOfSupply: inv.customer.includes('Bangalore') ? '29' : '27',
          postedAt: inv.status === 'POSTED' ? inv.date : null,
        },
      });

      for (const it of inv.items) {
        const taxable = (it.price * it.qty) / (1 + it.taxRate / 100);
        const taxAmt = it.price * it.qty - taxable;
        await prisma.salesInvoiceItem.create({
          data: {
            invoiceId: createdInv.id,
            productId: productMap[it.sku],
            description: it.desc,
            quantity: it.qty,
            unitPrice: it.price,
            discountPct: 0,
            discountAmount: 0,
            taxRate: it.taxRate,
            taxableAmount: taxable,
            cgstAmount: inv.igst > 0 ? 0 : taxAmt / 2,
            sgstAmount: inv.igst > 0 ? 0 : taxAmt / 2,
            igstAmount: inv.igst > 0 ? taxAmt : 0,
            totalAmount: it.price * it.qty,
          },
        });
      }
    }
  }
  console.log('✓ Sales invoices verified (3 invoices initialized)');

  // 16. Purchase Invoices (Vendor Bills)
  const billsToSeed = [
    {
      billNum: 'BILL-2026-27-00001',
      supplier: 'Nilkamal Office Systems Ltd',
      vendorBillNo: 'NIL-9982',
      date: new Date('2026-11-04'),
      due: new Date('2026-12-04'),
      status: 'POSTED' as const,
      subtotal: 29661.02,
      cgst: 2669.49,
      sgst: 2669.49,
      igst: 0,
      totalTax: 5338.98,
      total: 35000,
      items: [
        { sku: 'FUR-CHR-01', desc: 'Nilkamal Ergonomic Office Chairs', qty: 10, cost: 3200, taxRate: 18 },
      ],
    },
    {
      billNum: 'BILL-2026-27-00002',
      supplier: 'Logitech Electronic Importers',
      vendorBillNo: 'LOG-3312',
      date: new Date('2026-11-08'),
      due: new Date('2026-12-08'),
      status: 'POSTED' as const,
      subtotal: 15593.22,
      cgst: 1403.39,
      sgst: 1403.39,
      igst: 0,
      totalTax: 2806.78,
      total: 18400,
      items: [
        { sku: 'IT-KBD-03', desc: 'Logitech Wireless Mechanical Keyboards', qty: 10, cost: 1800, taxRate: 18 },
      ],
    },
  ];

  for (const b of billsToSeed) {
    const existing = await prisma.purchaseInvoice.findFirst({
      where: { organizationId: org.id, billNumber: b.billNum },
    });
    if (!existing) {
      const createdBill = await prisma.purchaseInvoice.create({
        data: {
          organizationId: org.id,
          branchId: mainBranch.id,
          supplierId: supplierMap[b.supplier],
          billNumber: b.billNum,
          supplierBillNo: b.vendorBillNo,
          billDate: b.date,
          dueDate: b.due,
          status: b.status,
          subtotalAmount: b.subtotal,
          cgstAmount: b.cgst,
          sgstAmount: b.sgst,
          igstAmount: b.igst,
          totalTaxAmount: b.totalTax,
          totalAmount: b.total,
          paidAmount: b.total,
          dueAmount: 0,
          postedAt: b.date,
        },
      });

      for (const it of b.items) {
        const taxable = (it.cost * it.qty) / (1 + it.taxRate / 100);
        const taxAmt = it.cost * it.qty - taxable;
        await prisma.purchaseInvoiceItem.create({
          data: {
            billId: createdBill.id,
            productId: productMap[it.sku],
            description: it.desc,
            quantity: it.qty,
            unitCost: it.cost,
            taxRate: it.taxRate,
            taxableAmount: taxable,
            cgstAmount: taxAmt / 2,
            sgstAmount: taxAmt / 2,
            igstAmount: 0,
            totalAmount: it.cost * it.qty,
          },
        });
      }
    }
  }
  console.log('✓ Purchase bills verified (2 vendor bills initialized)');
}

async function main() {
  console.log('--- Starting Universal BizFlow ERP Multi-Tenant Seeding ---');

  // Roles
  const roles = [
    {
      name: 'SuperAdmin',
      description: 'System Super Administrator with unconstrained capabilities across all modules',
      permissions: ['*'],
    },
    {
      name: 'Admin',
      description: 'Tenant Administrator with full access to company records and configurations',
      permissions: ['admin:*', 'sales:*', 'purchase:*', 'inventory:*', 'accounting:*', 'hr:*', 'crm:*'],
    },
    {
      name: 'Accountant',
      description: 'Senior Accountant with access to books, ledger entries, bank reconciliation, and tax filings',
      permissions: ['accounting:*', 'sales:read', 'purchase:read', 'reports:*'],
    },
    {
      name: 'InventoryManager',
      description: 'Warehouse supervisor with access to stock counts, adjustments, transfers, and inventory audits',
      permissions: ['inventory:*', 'purchase:read', 'sales:read'],
    },
    {
      name: 'SalesExecutive',
      description: 'Sales and CRM representative for invoicing, quotations, lead pipeline, and receivables tracking',
      permissions: ['sales:*', 'crm:*', 'customer:*'],
    },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of roles) {
    let role = await prisma.role.findFirst({ where: { name: r.name } });
    if (!role) {
      role = await prisma.role.create({
        data: {
          name: r.name,
          description: r.description,
          permissions: r.permissions,
        },
      });
    }
    roleMap[r.name] = role.id;
  }
  console.log('✓ System roles verified');

  // Admin User
  let admin = await prisma.user.findUnique({
    where: { email: 'admin@bizflow.local' },
  });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: 'admin@bizflow.local',
        passwordHash: PASSWORD_HASH,
        fullName: 'Administrator',
        isSuperAdmin: true,
      },
    });
  }

  // Vinay User
  let vinay = await prisma.user.findUnique({
    where: { email: 'vinayveddulapall2002@gmail.com' },
  });

  // Find all organizations
  const orgs = await prisma.organization.findMany();
  console.log(`Found ${orgs.length} organizations in database: ${orgs.map((o) => o.name).join(', ')}`);

  for (const org of orgs) {
    // Grant admin membership
    const adminMem = await prisma.organizationMember.findFirst({
      where: { userId: admin.id, organizationId: org.id },
    });
    if (!adminMem) {
      await prisma.organizationMember.create({
        data: {
          userId: admin.id,
          organizationId: org.id,
          roleId: roleMap['SuperAdmin'],
          isDefault: true,
        },
      });
    }

    // Grant Vinay membership to all orgs as SuperAdmin too!
    if (vinay) {
      const vinayMem = await prisma.organizationMember.findFirst({
        where: { userId: vinay.id, organizationId: org.id },
      });
      if (!vinayMem) {
        await prisma.organizationMember.create({
          data: {
            userId: vinay.id,
            organizationId: org.id,
            roleId: roleMap['SuperAdmin'],
            isDefault: org.name.toLowerCase().includes('iit'),
          },
        });
      }
    }

    // Seed data into this org
    await seedOrganization(org, roleMap);
  }

  console.log('\n=============================================================');
  console.log('🎉 COMPLETE DUMMY DATA SEEDED ACROSS ALL ORGANIZATIONS & TABS!');
  console.log('Users linked: admin@bizflow.local, vinayveddulapall2002@gmail.com');
  console.log('=============================================================');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
