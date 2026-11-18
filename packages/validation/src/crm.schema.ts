import { z } from 'zod';

export const leadStatusEnum = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL',
  'WON',
  'LOST',
]);

export const createLeadSchema = z.object({
  name: z.string().min(1, 'Lead contact name is required').max(150),
  companyName: z.string().max(150).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().max(20).optional().nullable(),
  source: z.string().max(50).optional().nullable(),
  status: leadStatusEnum.optional().default('NEW'),
  estimatedValue: z.number().min(0).optional().default(0),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateLeadStatusSchema = z.object({
  status: leadStatusEnum,
  notes: z.string().max(1000).optional().nullable(),
});

export const addLeadActivitySchema = z.object({
  activityType: z.enum(['CALL', 'MEETING', 'EMAIL', 'NOTE']),
  summary: z.string().min(1, 'Activity summary is required').max(500),
  scheduledAt: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
export type AddLeadActivityInput = z.infer<typeof addLeadActivitySchema>;
