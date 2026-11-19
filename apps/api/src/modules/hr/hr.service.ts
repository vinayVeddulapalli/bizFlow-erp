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

  async getEmployeeMonthlyAttendance(
    organizationId: string,
    employeeId: string,
    month: number,
    year: number
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      include: { department: true, designation: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found.');
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    const recordMap = new Map<string, any>();
    records.forEach((r) => {
      const dateKey = r.date.toISOString().split('T')[0];
      recordMap.set(dateKey, r);
    });

    const daysList = [];
    let presentCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let leaveCount = 0;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(Date.UTC(year, month - 1, day));
      const dateKey = dateObj.toISOString().split('T')[0];
      const dayOfWeekIndex = dateObj.getUTCDay();
      const isWeekend = dayOfWeekIndex === 0;

      const existing = recordMap.get(dateKey);
      const status = existing ? existing.status : 'PRESENT';

      if (status === 'PRESENT') presentCount++;
      else if (status === 'ABSENT') absentCount++;
      else if (status === 'HALF_DAY') halfDayCount++;
      else if (status === 'LEAVE') leaveCount++;

      daysList.push({
        date: dateKey,
        dayNumber: day,
        dayOfWeek: dayNames[dayOfWeekIndex],
        isWeekend,
        status,
        hasExplicitRecord: !!existing,
        checkInTime: existing?.checkInTime || (status === 'PRESENT' ? '09:30' : null),
        checkOutTime: existing?.checkOutTime || (status === 'PRESENT' ? '18:30' : null),
        notes: existing?.notes || (isWeekend ? 'Weekly Off' : null),
      });
    }

    const effectivePresent = presentCount + halfDayCount * 0.5;
    const attendancePercentage = ((effectivePresent / daysInMonth) * 100).toFixed(1);

    return {
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        fullName: `${employee.firstName} ${employee.lastName}`,
        departmentName: employee.department?.name || 'General',
        designationName: employee.designation?.name || 'Staff Member',
        joiningDate: employee.joiningDate,
      },
      month,
      year,
      daysInMonth,
      summary: {
        totalDays: daysInMonth,
        present: presentCount,
        absent: absentCount,
        halfDay: halfDayCount,
        leave: leaveCount,
        effectivePresent,
        attendancePercentage,
      },
      records: daysList,
    };
  }

  async getMonthlyAttendanceOverview(organizationId: string, month: number, year: number) {
    const employees = await this.prisma.employee.findMany({
      where: { organizationId, status: 'ACTIVE' },
      include: { department: true },
      orderBy: { employeeCode: 'asc' },
    });

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        date: { gte: startDate, lte: endDate },
      },
    });

    const empRecordMap = new Map<string, any[]>();
    records.forEach((r) => {
      const list = empRecordMap.get(r.employeeId) || [];
      list.push(r);
      empRecordMap.set(r.employeeId, list);
    });

    return employees.map((emp) => {
      const empRecords = empRecordMap.get(emp.id) || [];
      let present = 0;
      let absent = 0;
      let halfDay = 0;
      let leave = 0;

      empRecords.forEach((r) => {
        if (r.status === 'PRESENT') present++;
        else if (r.status === 'ABSENT') absent++;
        else if (r.status === 'HALF_DAY') halfDay++;
        else if (r.status === 'LEAVE') leave++;
      });

      if (empRecords.length === 0) {
        present = daysInMonth;
      }

      const effectivePresent = present + halfDay * 0.5;
      const rate = ((effectivePresent / daysInMonth) * 100).toFixed(1);

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        fullName: `${emp.firstName} ${emp.lastName}`,
        departmentName: emp.department?.name || 'General',
        totalDays: daysInMonth,
        present,
        absent,
        halfDay,
        leave,
        attendancePercentage: rate,
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
      include: {
        payslips: {
          include: { employee: true },
        },
      },
    });

    if (existing && existing.payslips.length > 0) {
      return existing;
    }

    if (existing) {
      await this.prisma.payslip.deleteMany({ where: { payrollPeriodId: existing.id } });
      await this.prisma.payrollPeriod.delete({ where: { id: existing.id } });
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
