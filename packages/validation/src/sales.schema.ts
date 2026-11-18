import { z } from 'zod';
import { gstinRegex } from './organization.schema';

export const createCustomerSchema = z.object({
  name: z.string().min(2, { message: 'Customer name is required' }).max(150),
  companyName: z.string().max(150).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(10).max(15).optional().or(z.literal('')),
  gstin: z
    .string()
    .regex(gstinRegex, { message: 'Invalid 15-digit GSTIN format' })
    .toUpperCase()
    .optional()
    .or(z.literal('')),
  partyType: z.enum(['UNREGISTERED', 'REGULAR', 'COMPOSITION', 'CONSUMER', 'OVERSEAS']).default('UNREGISTERED'),
  state: z.string().min(2, { message: 'State is required' }),
  stateCode: z.string().length(2, { message: '2-digit State code is required' }),
  billingAddress: z.string().min(3, { message: 'Billing address is required' }),
  shippingAddress: z.string().optional().or(z.literal('')),
  creditLimit: z.number().min(0).default(0),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const createSalesInvoiceItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, { message: 'Item description is required' }),
  hsnSacCode: z.string().max(10).optional().or(z.literal('')),
  quantity: z.number().positive({ message: 'Quantity must be greater than 0' }),
  unitPrice: z.number().min(0, { message: 'Unit price cannot be negative' }),
  discountPct: z.number().min(0).max(100).default(0),
  discountAmount: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(18), // 0, 5, 12, 18, 28
});

export type CreateSalesInvoiceItemInput = z.infer<typeof createSalesInvoiceItemSchema>;

export const createSalesInvoiceSchema = z.object({
  branchId: z.string().uuid({ message: 'Branch selection is required' }),
  customerId: z.string().uuid({ message: 'Customer selection is required' }),
  invoiceDate: z.string().min(10, { message: 'Valid invoice date is required (YYYY-MM-DD)' }),
  dueDate: z.string().min(10, { message: 'Valid due date is required (YYYY-MM-DD)' }),
  placeOfSupply: z.string().length(2, { message: '2-digit Place of Supply state code required' }),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(createSalesInvoiceItemSchema).min(1, { message: 'Invoice must contain at least 1 item' }),
});

export type CreateSalesInvoiceInput = z.infer<typeof createSalesInvoiceSchema>;

export const recordPaymentReceiptSchema = z.object({
  customerId: z.string().uuid({ message: 'Customer selection is required' }),
  paymentDate: z.string().min(10, { message: 'Payment date is required (YYYY-MM-DD)' }),
  paymentMode: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE']).default('UPI'),
  amount: z.number().positive({ message: 'Payment amount must be greater than 0' }),
  referenceNo: z.string().max(100).optional(),
  notes: z.string().max(255).optional(),
  allocations: z
    .array(
      z.object({
        invoiceId: z.string().uuid(),
        allocatedAmount: z.number().positive(),
      })
    )
    .optional(),
});

export type RecordPaymentReceiptInput = z.infer<typeof recordPaymentReceiptSchema>;
