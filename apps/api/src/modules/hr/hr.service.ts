import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateDepartmentInput,
  CreateDesignationInput,
  CreateEmployeeInput,
  LogAttendanceInput,
  BulkAttendanceInput,
  RunPayrollInput,
} from '@bizflow/validation';
import { toDecimal } from '@bizflow/shared-utils';

@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= DEPARTMENTS & DESIGNATIONS =================
  async listDepartments(organizationId: string) {
    const departments = await this.prisma.department.findMany({
      where: { organizationId },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });

    return departments.map((d) => ({
      id: d.id,
      name: d.name,
      employeeCount: d._count.employees,
    }));
  }

  async createDepartment(organizationId: string, data: CreateDepartmentInput) {
    return this.prisma.department.create({
      data: {
        organizationId,
        name: data.name,
      },
    });
  }

  async listDesignations(organizationId: string) {
    const designations = await this.prisma.designation.findMany({
      where: { organizationId },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });

    return designations.map((d) => ({
      id: d.id,
      name: d.name,
      employeeCount: d._count.employees,
    }));
  }

  async createDesignation(organizationId: string, data: CreateDesignationInput) {
    return this.prisma.designation.create({
      data: {
        organizationId,
        name: data.name,
      },
    });
  }

  // ================= EMPLOYEES =================
  async listEmployees(organizationId: string, departmentId?: string) {
    const where: any = { organizationId };
    if (departmentId) where.departmentId = departmentId;

    const employees = await this.prisma.employee.findMany({
      where,
      orderBy: { employeeCode: 'asc' },
      include: {
        department: true,
        designation: true,
      },
    });

    return employees.map((emp) => {
      const basic = toDecimal(emp.basicSalary.toString());
      const hra = toDecimal(emp.hra.toString());
      const allowances = toDecimal(emp.allowances.toString());
      const deductions = toDecimal(emp.deductions.toString());
      const gross = basic.plus(hra).plus(allowances);
      const net = gross.minus(deductions);

      return {
        ...emp,
        fullName: `${emp.firstName} ${emp.lastName}`,
        departmentName: emp.department?.name || 'General',
        designationName: emp.designation?.name || 'Staff',
        basicSalary: basic.toFixed(2),
        hra: hra.toFixed(2),
        allowances: allowances.toFixed(2),
        deductions: deductions.toFixed(2),
        grossSalary: gross.toFixed(2),
        netSalary: net.toFixed(2),
      };
    });
  }

  async getEmployeeById(organizationId: string, id: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id, organizationId },
      include: { department: true, designation: true },
    });

    if (!emp) {
      throw new NotFoundException('Employee not found.');
    }

    const basic = toDecimal(emp.basicSalary.toString());
    const hra = toDecimal(emp.hra.toString());
    const allowances = toDecimal(emp.allowances.toString());
    const deductions = toDecimal(emp.deductions.toString());
    const gross = basic.plus(hra).plus(allowances);
    const net = gross.minus(deductions);

    return {
      ...emp,
      fullName: `${emp.firstName} ${emp.lastName}`,
      departmentName: emp.department?.name || 'General',
      designationName: emp.designation?.name || 'Staff',
      basicSalary: basic.toFixed(2),
      hra: hra.toFixed(2),
      allowances: allowances.toFixed(2),
      deductions: deductions.toFixed(2),
      grossSalary: gross.toFixed(2),
      netSalary: net.toFixed(2),
    };
  }

  async createEmployee(organizationId: string, data: CreateEmployeeInput) {
    const existing = await this.prisma.employee.findUnique({
      where: {
        organizationId_employeeCode: {
          organizationId,
          employeeCode: data.employeeCode,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Employee code "${data.employeeCode}" already exists.`);
    }

    return this.prisma.employee.create({
      data: {
        organizationId,
        employeeCode: data.employeeCode,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || undefined,
        phone: data.phone || undefined,
        joiningDate: new Date(data.joiningDate),
        status: data.status as any || 'ACTIVE',
        departmentId: data.departmentId || undefined,
        designationId: data.designationId || undefined,
        basicSalary: data.basicSalary || 0,
        hra: data.hra || 0,
        allowances: data.allowances || 0,
        deductions: data.deductions || 0,
        bankAccountNumber: data.bankAccountNumber || undefined,
        bankIfscCode: data.bankIfscCode || undefined,
        panNumber: data.panNumber || undefined,
        uanNumber: data.uanNumber || undefined,
      },
    });
  }

  // ================= ATTENDANCE =================
  async logAttendance(organizationId: string, data: LogAttendanceInput) {
    const recordDate = new Date(data.date);

    return this.prisma.attendanceRecord.upsert({
      where: {
        organizationId_employeeId_date: {
          organizationId,
          employeeId: data.employeeId,
          date: recordDate,
        },
      },
      update: {
        status: data.status as any,
        checkInTime: data.checkInTime || undefined,
        checkOutTime: data.checkOutTime || undefined,
        notes: data.notes || undefined,
      },
      create: {
        organizationId,
        employeeId: data.employeeId,
        date: recordDate,
        status: data.status as any,
        checkInTime: data.checkInTime || undefined,
        checkOutTime: data.checkOutTime || undefined,
        notes: data.notes || undefined,
      },
    });
  }

  async bulkLogAttendance(organizationId: string, data: BulkAttendanceInput) {
    const recordDate = new Date(data.date);

    for (const record of data.records) {
      await this.prisma.attendanceRecord.upsert({
        where: {
          organizationId_employeeId_date: {
            organizationId,
            employeeId: record.employeeId,
            date: recordDate,
          },
        },
        update: {
          status: record.status as any,
        },
        create: {
          organizationId,
          employeeId: record.employeeId,
          date: recordDate,
          status: record.status as any,
        },
      });
    }

    return { success: true, count: data.records.length };
  }

  async getAttendanceByDate(organizationId: string, dateString: string) {
    const date = new Date(dateString);

    const [employees, records] = await Promise.all([
      this.prisma.employee.findMany({
        where: { organizationId, status: 'ACTIVE' },
        include: { department: true },
        orderBy: { employeeCode: 'asc' },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { organizationId, date },
      }),
    ]);

    const recordMap = new Map(records.map((r) => [r.employeeId, r]));

    return employees.map((emp) => {
      const rec = recordMap.get(emp.id);
      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        fullName: `${emp.firstName} ${emp.lastName}`,
        departmentName: emp.department?.name || 'General',
        date: dateString,
        status: rec ? rec.status : 'PRESENT',
        checkInTime: rec?.checkInTime || null,
        checkOutTime: rec?.checkOutTime || null,
        notes: rec?.notes || null,
      };
    });
  }

  // ================= PAYROLL PROCESSING =================
  async runPayroll(organizationId: string, data: RunPayrollInput) {
    const { month, year } = data;

    const existing = await this.prisma.payrollPeriod.findUnique({
      where: {
        organizationId_month_year: {
          organizationId,
          month,
          year,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Payroll for ${month}/${year} has already been generated.`);
    }

    const employees = await this.prisma.employee.findMany({
      where: { organizationId, status: 'ACTIVE' },
    });

    let totalGross = toDecimal(0);
    let totalDeductions = toDecimal(0);
    let totalNet = toDecimal(0);

    const payslipData = employees.map((emp) => {
      const basic = toDecimal(emp.basicSalary.toString());
      const hra = toDecimal(emp.hra.toString());
      const allowances = toDecimal(emp.allowances.toString());
      const deductions = toDecimal(emp.deductions.toString());
      const gross = basic.plus(hra).plus(allowances);
      const net = gross.minus(deductions);

      totalGross = totalGross.plus(gross);
      totalDeductions = totalDeductions.plus(deductions);
      totalNet = totalNet.plus(net);

      return {
        employeeId: emp.id,
        workingDays: 30,
        presentDays: 30,
        basicSalary: basic.toNumber(),
        hra: hra.toNumber(),
        allowances: allowances.toNumber(),
        grossSalary: gross.toNumber(),
        deductions: deductions.toNumber(),
        netSalary: net.toNumber(),
        status: 'APPROVED' as any,
      };
    });

    return this.prisma.payrollPeriod.create({
      data: {
        organizationId,
        month,
        year,
        status: 'APPROVED',
        processedAt: new Date(),
        totalGross: totalGross.toNumber(),
        totalDeductions: totalDeductions.toNumber(),
        totalNet: totalNet.toNumber(),
        payslips: {
          create: payslipData,
        },
      },
      include: {
        payslips: {
          include: { employee: true },
        },
      },
    });
  }

  async listPayrollPeriods(organizationId: string) {
    const periods = await this.prisma.payrollPeriod.findMany({
      where: { organizationId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        _count: { select: { payslips: true } },
      },
    });

    return periods.map((p) => ({
      ...p,
      totalGross: p.totalGross.toString(),
      totalDeductions: p.totalDeductions.toString(),
      totalNet: p.totalNet.toString(),
      payslipCount: p._count.payslips,
    }));
  }

  async getPayslipsByPeriod(organizationId: string, periodId: string) {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: periodId, organizationId },
      include: {
        payslips: {
          include: {
            employee: {
              include: { department: true },
            },
          },
        },
      },
    });

    if (!period) {
      throw new NotFoundException('Payroll period not found.');
    }

    return period.payslips.map((ps) => ({
      id: ps.id,
      payrollPeriodId: ps.payrollPeriodId,
      employeeId: ps.employeeId,
      employeeCode: ps.employee.employeeCode,
      employeeName: `${ps.employee.firstName} ${ps.employee.lastName}`,
      departmentName: ps.employee.department?.name || 'General',
      workingDays: ps.workingDays,
      presentDays: ps.presentDays,
      basicSalary: ps.basicSalary.toString(),
      hra: ps.hra.toString(),
      allowances: ps.allowances.toString(),
      grossSalary: ps.grossSalary.toString(),
      deductions: ps.deductions.toString(),
      netSalary: ps.netSalary.toString(),
      status: ps.status,
      createdAt: ps.createdAt,
    }));
  }
}
