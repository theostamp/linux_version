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

export type NotificationType = 'email' | 'sms' | 'both' | 'viber';

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
  available_variables: string[];
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

  // Building scope
  building_ids?: number[]; // Array of building IDs for multi-building support

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

// Monthly Notification Tasks
export type MonthlyTaskType = 'common_expense' | 'balance_reminder' | 'custom';

export type MonthlyTaskStatus =
  | 'pending_confirmation'
  | 'confirmed'
  | 'sent'
  | 'skipped'
  | 'auto_sent';

export interface MonthlyNotificationTask {
  id: number;
  task_type: MonthlyTaskType;
  task_type_display: string;
  building: number | null;
  building_name: string;
  template: number | null;
  template_name: string;
  day_of_month: number;
  time_to_send: string;
  auto_send_enabled: boolean;
  period_month: string; // YYYY-MM-DD format
  status: MonthlyTaskStatus;
  status_display: string;
  notification: number | null;
  created_at: string;
  confirmed_at: string | null;
  sent_at: string | null;
  confirmed_by: number | null;
  is_due: boolean;
  can_auto_send: boolean;
}

export interface MonthlyTaskConfirmRequest {
  send_immediately?: boolean;
  enable_auto_send?: boolean;
}

// Notification Events
export type NotificationEventType =
  | 'announcement'
  | 'vote'
  | 'maintenance'
  | 'project'
  | 'common_expense'
  | 'urgent'
  | 'meeting'
  | 'general';

export interface NotificationEvent {
  id: number;
  event_type: NotificationEventType;
  event_type_display: string;
  building: number;
  title: string;
  description: string;
  url: string;
  icon: string;
  created_at: string;
  event_date: string | null;
  included_in_digest: boolean;
  digest_sent_at: string | null;
  sent_immediately: boolean;
  immediate_notification: number | null;
  is_urgent: boolean;
  is_pending: boolean;
  related_announcement_id: number | null;
  related_vote_id: number | null;
  related_maintenance_id: number | null;
  related_project_id: number | null;
}

export interface PendingEventsResponse {
  count: number;
  events: NotificationEvent[];
  events_by_type: Record<string, number>;
}

export interface DigestPreview {
  subject: string;
  body: string;
  event_count: number;
  events_by_type: Record<string, number>;
}

export interface DigestPreviewRequest {
  building_id: number;
  since_date?: string;
}

export interface SendDigestRequest {
  building_id: number;
  since_date?: string;
}

export interface SendDigestResponse {
  message: string;
  notification_id: number | null;
  subject?: string;
  recipients?: number;
}
