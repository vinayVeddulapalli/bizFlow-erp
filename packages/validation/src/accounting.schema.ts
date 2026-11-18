import { z } from 'zod';

export const accountCategoryEnum = z.enum([
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'EXPENSE',
]);

export const createAccountSchema = z.object({
  code: z.string().min(1, 'Account code is required').max(20),
  name: z.string().min(1, 'Account name is required').max(150),
  category: accountCategoryEnum,
  parentId: z.string().uuid().optional().nullable(),
  isSystem: z.boolean().optional(),
  openingBalance: z.number().optional().default(0),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  parentId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const journalEntryLineSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  debit: z.number().min(0, 'Debit must be non-negative').default(0),
  credit: z.number().min(0, 'Credit must be non-negative').default(0),
  description: z.string().max(255).optional().nullable(),
});

export const createJournalEntrySchema = z.object({
  entryDate: z.string().min(1, 'Entry date is required'),
  narration: z.string().min(1, 'Narration / Description is required'),
  referenceType: z.string().optional().nullable(),
  referenceId: z.string().optional().nullable(),
  lines: z
    .array(journalEntryLineSchema)
    .min(2, 'Journal entry must contain at least 2 lines (debit & credit)'),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type JournalEntryLineInput = z.infer<typeof journalEntryLineSchema>;
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
