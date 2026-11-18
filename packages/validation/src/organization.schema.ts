import { z } from 'zod';

export const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Organization name must be at least 2 characters long' })
    .max(150, { message: 'Organization name cannot exceed 150 characters' })
    .trim(),
  legalName: z.string().max(200).optional(),
  gstin: z
    .string()
    .regex(gstinRegex, { message: 'Invalid 15-character Indian GSTIN format' })
    .toUpperCase()
    .optional()
    .or(z.literal('')),
  pan: z
    .string()
    .regex(panRegex, { message: 'Invalid 10-character Indian PAN format' })
    .toUpperCase()
    .optional()
    .or(z.literal('')),
  currencyCode: z.string().default('INR'),
  fiscalYearStartMonth: z.number().int().min(1).max(12).default(4), // April
  branchName: z.string().min(2).default('Head Office'),
  city: z.string().min(2).default('Mumbai'),
  state: z.string().min(2).default('Maharashtra'),
  stateCode: z.string().length(2).default('27'), // 27 = Maharashtra
  postalCode: z.string().min(4).max(10).default('400001'),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const createBranchSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20).toUpperCase(),
  gstin: z
    .string()
    .regex(gstinRegex, { message: 'Invalid GSTIN format' })
    .toUpperCase()
    .optional()
    .or(z.literal('')),
  addressLine1: z.string().min(3),
  city: z.string().min(2),
  state: z.string().min(2),
  stateCode: z.string().length(2),
  postalCode: z.string().min(4).max(10),
  isMainBranch: z.boolean().default(false),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
