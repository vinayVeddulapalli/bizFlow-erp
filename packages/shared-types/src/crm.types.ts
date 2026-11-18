export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';

export interface LeadActivityDto {
  id: string;
  leadId: string;
  activityType: string;
  summary: string;
  scheduledAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface LeadDto {
  id: string;
  organizationId: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  status: LeadStatus;
  estimatedValue: string | number;
  notes?: string | null;
  convertedToCustomerId?: string | null;
  activities?: LeadActivityDto[];
  createdAt: string;
  updatedAt: string;
}
