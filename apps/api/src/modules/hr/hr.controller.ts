import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { HrService } from './hr.service';
import {
  CreateDepartmentInput,
  CreateDesignationInput,
  CreateEmployeeInput,
  LogAttendanceInput,
  BulkAttendanceInput,
  RunPayrollInput,
} from '@bizflow/validation';

@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  // Departments
  @Get('departments')
  async listDepartments(@Req() req: any) {
    return this.hrService.listDepartments(req.organizationId);
  }

  @Post('departments')
  async createDepartment(@Req() req: any, @Body() body: CreateDepartmentInput) {
    return this.hrService.createDepartment(req.organizationId, body);
  }

  // Designations
  @Get('designations')
  async listDesignations(@Req() req: any) {
    return this.hrService.listDesignations(req.organizationId);
  }

  @Post('designations')
  async createDesignation(@Req() req: any, @Body() body: CreateDesignationInput) {
    return this.hrService.createDesignation(req.organizationId, body);
  }

  // Employees
  @Get('employees')
  async listEmployees(@Req() req: any, @Query('departmentId') departmentId?: string) {
    return this.hrService.listEmployees(req.organizationId, departmentId);
  }

  @Get('employees/:id')
  async getEmployeeById(@Req() req: any, @Param('id') id: string) {
    return this.hrService.getEmployeeById(req.organizationId, id);
  }

  @Post('employees')
  async createEmployee(@Req() req: any, @Body() body: CreateEmployeeInput) {
    return this.hrService.createEmployee(req.organizationId, body);
  }

  // Attendance
  @Get('attendance')
  async getAttendance(@Req() req: any, @Query('date') date: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.hrService.getAttendanceByDate(req.organizationId, targetDate);
  }

  @Post('attendance')
  async logAttendance(@Req() req: any, @Body() body: LogAttendanceInput) {
    return this.hrService.logAttendance(req.organizationId, body);
  }

  @Post('attendance/bulk')
  async bulkLogAttendance(@Req() req: any, @Body() body: BulkAttendanceInput) {
    return this.hrService.bulkLogAttendance(req.organizationId, body);
  }

  // Payroll
  @Get('payroll/periods')
  async listPayrollPeriods(@Req() req: any) {
    return this.hrService.listPayrollPeriods(req.organizationId);
  }

  @Get('payroll/periods/:id/payslips')
  async getPayslips(@Req() req: any, @Param('id') periodId: string) {
    return this.hrService.getPayslipsByPeriod(req.organizationId, periodId);
  }

  @Post('payroll/run')
  async runPayroll(@Req() req: any, @Body() body: RunPayrollInput) {
    return this.hrService.runPayroll(req.organizationId, body);
  }
}
