import { z } from 'zod';

export const employmentStatusEnum = z.enum([
  'ACTIVE',
  'PROBATION',
  'RESIGNED',
  'TERMINATED',
]);

export const attendanceStatusEnum = z.enum([
  'PRESENT',
  'ABSENT',
  'HALF_DAY',
  'LEAVE',
]);

export const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(100),
});

export const createDesignationSchema = z.object({
  name: z.string().min(1, 'Designation name is required').max(100),
});

export const createEmployeeSchema = z.object({
  employeeCode: z.string().min(1, 'Employee code is required').max(50),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(20).optional().nullable(),
  joiningDate: z.string().min(1, 'Joining date is required'),
  status: employmentStatusEnum.optional().default('ACTIVE'),
  departmentId: z.string().optional().nullable(),
  designationId: z.string().optional().nullable(),
  basicSalary: z.number().min(0).default(0),
  hra: z.number().min(0).default(0),
  allowances: z.number().min(0).default(0),
  deductions: z.number().min(0).default(0),
  bankAccountNumber: z.string().max(50).optional().nullable(),
  bankIfscCode: z.string().max(20).optional().nullable(),
  panNumber: z.string().max(10).optional().nullable(),
  uanNumber: z.string().max(20).optional().nullable(),
});

export const logAttendanceSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  date: z.string().min(1, 'Date is required'),
  status: attendanceStatusEnum,
  checkInTime: z.string().optional().nullable(),
  checkOutTime: z.string().optional().nullable(),
  notes: z.string().max(255).optional().nullable(),
});

export const bulkAttendanceSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  records: z.array(
    z.object({
      employeeId: z.string().min(1),
      status: attendanceStatusEnum,
    })
  ),
});

export const runPayrollSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2050),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type CreateDesignationInput = z.infer<typeof createDesignationSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type LogAttendanceInput = z.infer<typeof logAttendanceSchema>;
export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;
export type RunPayrollInput = z.infer<typeof runPayrollSchema>;
