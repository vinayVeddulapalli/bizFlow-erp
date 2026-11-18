import { z } from 'zod';
import { gstinRegex } from './organization.schema';

export const createSupplierSchema = z.object({
  name: z.string().min(2, { message: 'Supplier name is required' }).max(150),
  companyName: z.string().max(150).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(10).max(15).optional().or(z.literal('')),
  gstin: z
    .string()
    .regex(gstinRegex, { message: 'Invalid 15-digit GSTIN format' })
    .toUpperCase()
    .optional()
    .or(z.literal('')),
  partyType: z.enum(['UNREGISTERED', 'REGULAR', 'COMPOSITION', 'CONSUMER', 'OVERSEAS']).default('REGULAR'),
  state: z.string().min(2, { message: 'State is required' }),
  stateCode: z.string().length(2, { message: '2-digit State code is required' }),
  billingAddress: z.string().min(3, { message: 'Billing address is required' }),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const createPurchaseInvoiceItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, { message: 'Item description is required' }),
  hsnSacCode: z.string().max(10).optional().or(z.literal('')),
  quantity: z.number().positive({ message: 'Quantity must be greater than 0' }),
  unitCost: z.number().min(0, { message: 'Unit cost cannot be negative' }),
  taxRate: z.number().min(0).default(18),
});

export type CreatePurchaseInvoiceItemInput = z.infer<typeof createPurchaseInvoiceItemSchema>;

export const createPurchaseInvoiceSchema = z.object({
  branchId: z.string().uuid({ message: 'Branch selection is required' }),
  supplierId: z.string().uuid({ message: 'Supplier selection is required' }),
  supplierBillNo: z.string().min(1, { message: "Supplier's invoice/bill number is required" }),
  billDate: z.string().min(10, { message: 'Valid bill date required (YYYY-MM-DD)' }),
  dueDate: z.string().min(10, { message: 'Valid due date required (YYYY-MM-DD)' }),
  notes: z.string().optional(),
  items: z.array(createPurchaseInvoiceItemSchema).min(1, { message: 'Bill must contain at least 1 item' }),
});

export type CreatePurchaseInvoiceInput = z.infer<typeof createPurchaseInvoiceSchema>;
