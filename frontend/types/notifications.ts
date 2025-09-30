/**
 * TypeScript types for notifications system
 */

export type NotificationCategory =
  | 'announcement'
  | 'payment'
  | 'maintenance'
  | 'meeting'
  | 'emergency'
  | 'reminder';

export type NotificationType = 'email' | 'sms' | 'both';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type NotificationStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed';

export type RecipientStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced';

export interface NotificationTemplate {
  id: number;
  name: string;
  category: NotificationCategory;
  category_display: string;
  description: string;
  subject: string;
  body_template: string;
  sms_template: string;
  is_active: boolean;
  is_system: boolean;
  building: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationRecipient {
  id: number;
  notification: number;
  apartment: number;
  apartment_number: string;
  recipient_name: string;
  email: string;
  phone: string;
  status: RecipientStatus;
  status_display: string;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string;
  retry_count: number;
  opened_at: string | null;
  clicked_at: string | null;
  provider_message_id: string;
}

export interface Notification {
  id: number;
  building: number;
  template: number | null;
  subject: string;
  body: string;
  sms_body: string;
  notification_type: NotificationType;
  notification_type_display: string;
  priority: NotificationPriority;
  priority_display: string;
  status: NotificationStatus;
  status_display: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  scheduled_at: string | null;
  sent_at: string | null;
  completed_at: string | null;
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  delivery_rate: number;
  error_message: string;
  recipients?: NotificationRecipient[];
}

export interface NotificationCreateRequest {
  // Template or manual content
  template_id?: number;
  subject?: string;
  body?: string;
  sms_body?: string;

  // Template context
  context?: Record<string, string>;

  // Recipients
  apartment_ids?: number[];
  send_to_all?: boolean;

  // Settings
  notification_type: NotificationType;
  priority: NotificationPriority;
  scheduled_at?: string;
}

export interface NotificationCreateResponse {
  id: number;
  status: 'sent' | 'scheduled';
  total_recipients: number;
  successful_sends?: number;
  failed_sends?: number;
  scheduled_at?: string;
}

export interface NotificationStatistics {
  total_notifications: number;
  total_sent: number;
  total_failed: number;
  total_recipients: number;
  average_delivery_rate: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  recent_notifications: Notification[];
}

export interface TemplatePreviewRequest {
  template_id: number;
  context: Record<string, string>;
}

export interface TemplatePreviewResponse {
  subject: string;
  body: string;
  sms: string;
}