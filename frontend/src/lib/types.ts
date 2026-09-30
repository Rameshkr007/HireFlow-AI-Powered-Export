export interface User {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface ExporterProfile {
  id: number;
  user_id: number;
  exporter_name?: string;
  company_name?: string;
  company_email?: string;
  phone?: string;
  website?: string;
  country?: string;
  address?: string;
  product_categories?: string[];
  company_description?: string;
  sender_name?: string;
}

export interface Buyer {
  id: number;
  user_id: number;
  buyer_name?: string;
  company_name?: string;
  email?: string;
  website?: string;
  country?: string;
  city?: string;
  state?: string;
  source_platform?: string;
  business_type?: string;
  page_url?: string;
  product?: string;
  company_description?: string;
  phone?: string;
  linkedin_url?: string;
  facebook_url?: string;
  email_status?: 'VALID' | 'INVALID' | 'UNKNOWN';
  outreach_status?: 'PENDING' | 'CONTACTED' | 'SKIPPED';
  ai_priority?: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCLASSIFIED';
  ai_score?: number;
  ai_confidence?: number;
  ai_reason?: string;
  ai_business_type?: string;
  last_contacted?: string;
  is_demo?: boolean;
  created_at?: string;
}

export interface BuyerListResponse {
  buyers: Buyer[];
  total: number;
  skip: number;
  limit: number;
}

export interface Campaign {
  id: number;
  user_id: number;
  name: string;
  product?: string;
  target_country?: string;
  target_audience?: string;
  email_subject?: string;
  email_body?: string;
  sending_limit: number;
  delay_seconds: number;
  attachment_id?: number;
  status: 'DRAFT' | 'READY' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  total_leads: number;
  is_demo: boolean;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
}

export interface EmailLog {
  id: number;
  campaign_id: number;
  buyer_id?: number;
  email_address?: string;
  subject?: string;
  status: string;
  error_message?: string;
  sent_at?: string;
  created_at?: string;
  buyer_name?: string;
  company_name?: string;
  country?: string;
  campaign_name?: string;
}

export interface DashboardStats {
  total_buyers: number;
  valid_emails: number;
  invalid_emails: number;
  high_priority: number;
  medium_priority: number;
  low_priority: number;
  emails_sent: number;
  emails_failed: number;
  emails_skipped: number;
  total_campaigns: number;
  active_campaigns: number;
  completed_campaigns: number;
}

export interface CampaignReport {
  campaign_id: number;
  campaign_name: string;
  product?: string;
  target_country?: string;
  total_buyers: number;
  valid_contacts: number;
  invalid_emails: number;
  duplicates_removed: number;
  already_contacted: number;
  emails_sent: number;
  emails_failed: number;
  emails_skipped: number;
  high_priority_leads: number;
  medium_priority_leads: number;
  low_priority_leads: number;
  status: string;
  started_at?: string;
  completed_at?: string;
  by_country: Record<string, number>;
  by_business_type: Record<string, number>;
}
