export type EmploymentStatus = 'ACTIVE' | 'PROBATION' | 'RESIGNED' | 'TERMINATED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PayrollStatus = 'DRAFT' | 'APPROVED' | 'PAID';

export interface DepartmentDto {
  id: string;
  name: string;
  employeeCount?: number;
}

export interface DesignationDto {
  id: string;
  name: string;
  employeeCount?: number;
}

export interface EmployeeDto {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  joiningDate: string;
  status: EmploymentStatus;
  departmentId?: string | null;
  departmentName?: string | null;
  designationId?: string | null;
  designationName?: string | null;
  basicSalary: string | number;
  hra: string | number;
  allowances: string | number;
  deductions: string | number;
  grossSalary: string | number;
  netSalary: string | number;
  bankAccountNumber?: string | null;
  bankIfscCode?: string | null;
  panNumber?: string | null;
  uanNumber?: string | null;
  createdAt: string;
}

export interface AttendanceRecordDto {
  id: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  date: string;
  status: AttendanceStatus;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  notes?: string | null;
}

export interface PayslipDto {
  id: string;
  payrollPeriodId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  workingDays: number;
  presentDays: number;
  basicSalary: string | number;
  hra: string | number;
  allowances: string | number;
  grossSalary: string | number;
  deductions: string | number;
  netSalary: string | number;
  status: PayrollStatus;
  createdAt: string;
}

export interface PayrollPeriodDto {
  id: string;
  month: number;
  year: number;
  status: PayrollStatus;
  processedAt?: string | null;
  totalGross: string | number;
  totalDeductions: string | number;
  totalNet: string | number;
  payslipCount: number;
  payslips?: PayslipDto[];
}
