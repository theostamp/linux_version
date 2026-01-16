/**
 * API client for notifications
 */
import { apiClient } from '@/lib/apiClient';
import type {
  Notification,
  NotificationTemplate,
  NotificationRecipient,
  NotificationCreateRequest,
  NotificationCreateResponse,
  NotificationStatistics,
  EmailBatch,
  EmailBatchStatistics,
  TemplatePreviewRequest,
  TemplatePreviewResponse,
  NotificationEvent,
  PendingEventsResponse,
  DigestPreview,
  DigestPreviewRequest,
  SendDigestRequest,
  SendDigestResponse,
} from '@/types/notifications';

const BASE_URL = '/api/notifications';
export const COMMON_EXPENSES_SENT_EVENT = 'common-expenses:sent';
export const COMMON_EXPENSES_ATTEMPT_KEY = 'common-expenses:last-attempt';

export type CommonExpensesSendAttempt = {
  status: 'success' | 'failed' | 'queued';
  mode: 'legacy' | 'personalized' | 'bulk';
  building_id?: number;
  building_ids?: number[];
  month?: string;
  queued_count?: number;
  error?: string;
  timestamp: string;
};

export const getLastCommonExpensesAttempt = (): CommonExpensesSendAttempt | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(COMMON_EXPENSES_ATTEMPT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CommonExpensesSendAttempt;
    if (!parsed || !parsed.timestamp || !parsed.status) return null;
    return parsed;
  } catch {
    return null;
  }
};

const storeCommonExpensesAttempt = (attempt: CommonExpensesSendAttempt) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COMMON_EXPENSES_ATTEMPT_KEY, JSON.stringify(attempt));
  } catch {
    // Ignore storage errors
  }
};

const notifyCommonExpensesSent = (detail?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(COMMON_EXPENSES_SENT_EVENT, { detail }));
};

const getAttemptErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  return 'Αποτυχία αποστολής.';
};

/**
 * Notification Templates
 */
export const notificationTemplatesApi = {
  /**
   * Get all notification templates
   */
  list: async (params?: {
    category?: string;
    is_active?: boolean;
    building?: number;
  }) => {
    // The apiClient.get returns data directly
    const response = await apiClient.get<{ results?: NotificationTemplate[] } | NotificationTemplate[]>(
      `${BASE_URL}/templates/`,
      { params }
    );
    // Handle both paginated and non-paginated responses
    return Array.isArray(response) ? response : (response as { results?: NotificationTemplate[] }).results || [];
  },

  /**
   * Get template by ID
   */
  get: async (id: number) => {
    const response = await apiClient.get<NotificationTemplate>(
      `${BASE_URL}/templates/${id}/`
    );
    // The apiClient returns data directly
    return response;
  },

  /**
   * Create new template
   */
  create: async (data: Partial<NotificationTemplate>) => {
    const response = await apiClient.post<NotificationTemplate>(
      `${BASE_URL}/templates/`,
      data
    );
    // The apiClient returns data directly
    return response;
  },

  /**
   * Update template
   */
  update: async (id: number, data: Partial<NotificationTemplate>) => {
    const response = await apiClient.put<NotificationTemplate>(
      `${BASE_URL}/templates/${id}/`,
      data
    );
    // The apiClient returns data directly
    return response;
  },

  /**
   * Delete template
   */
  delete: async (id: number) => {
    await apiClient.delete(`${BASE_URL}/templates/${id}/`);
  },

  /**
   * Preview rendered template
   */
  preview: async (data: TemplatePreviewRequest) => {
    const response = await apiClient.post<TemplatePreviewResponse>(
      `${BASE_URL}/templates/${data.template_id}/preview/`,
      { context: data.context }
    );
    // The apiClient returns data directly
    return response;
  },
};

/**
 * Notifications
 */
export const notificationsApi = {
  /**
   * Get all notifications
   */
  list: async (params?: {
    status?: string;
    notification_type?: string;
    priority?: string;
    building?: number;
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get<{ results: Notification[] }>(
      `${BASE_URL}/notifications/`,
      { params }
    );
    // Return just the results array from paginated response
    // Handle both paginated and non-paginated responses
    return Array.isArray(response) ? response : (response as { results?: any[] }).results || [];
  },

  /**
   * Get notification by ID
   */
  get: async (id: number) => {
    const response = await apiClient.get<Notification>(
      `${BASE_URL}/notifications/${id}/`
    );
    // The apiClient returns data directly
    return response;
  },

  /**
   * Create and send notification
   */
  create: async (data: NotificationCreateRequest) => {
    const response = await apiClient.post<NotificationCreateResponse>(
      `${BASE_URL}/notifications/`,
      data
    );
    // The apiClient returns data directly
    return response;
  },

  /**
   * Resend failed notifications
   */
  resend: async (id: number) => {
    const response = await apiClient.post<{
      resent: number;
      failed: number;
    }>(`${BASE_URL}/notifications/${id}/resend/`);
    // The apiClient returns data directly
    return response;
  },

  /**
   * Get notification statistics
   */
  stats: async (params?: {
    status?: string;
    notification_type?: string;
    priority?: string;
    building?: number;
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get<NotificationStatistics>(
      `${BASE_URL}/notifications/stats/`,
      { params }
    );
    // The apiClient returns data directly
    return response;
  },

  /**
   * Send common expenses sheet with JPG attachment
   */
  sendCommonExpenses: async (data: {
    attachment: File;
    subject: string;
    body: string;
    building_id: number;
    month?: string;
    send_to_all?: boolean;
  }) => {
    const formData = new FormData();
    formData.append('attachment', data.attachment);
    formData.append('subject', data.subject);
    formData.append('body', data.body);
    formData.append('building_id', String(data.building_id));
    if (data.month) formData.append('month', data.month);
    formData.append('send_to_all', String(data.send_to_all ?? true));

    try {
      const response = await apiClient.post<{
        id: number;
        status: string;
        total_recipients: number;
        successful_sends: number;
        failed_sends: number;
        attachment_url?: string;
      }>(`${BASE_URL}/notifications/send_common_expenses/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      storeCommonExpensesAttempt({
        status: 'success',
        mode: 'legacy',
        building_id: data.building_id,
        month: data.month,
        timestamp: new Date().toISOString(),
      });
      notifyCommonExpensesSent({ mode: 'legacy', building_id: data.building_id });
      return response;
    } catch (error) {
      storeCommonExpensesAttempt({
        status: 'failed',
        mode: 'legacy',
        building_id: data.building_id,
        month: data.month,
        error: getAttemptErrorMessage(error),
        timestamp: new Date().toISOString(),
      });
      notifyCommonExpensesSent({ mode: 'legacy', status: 'failed', building_id: data.building_id });
      throw error;
    }
  },

  /**
   * Send personalized common expense notifications
   * Each apartment receives their own payment notification (Ειδοποιητήριο)
   */
  sendPersonalizedCommonExpenses: async (data: {
    building_id: number;
    month: string;
    period_id?: number;
    include_sheet?: boolean;
    include_notification?: boolean;
    custom_message?: string;
    attachment?: File | null;
    apartment_ids?: number[];
    mark_period_sent?: boolean;
    skip_if_already_sent?: boolean;
    sent_source?: string;
  }) => {
    const formData = new FormData();
    formData.append('building_id', String(data.building_id));
    formData.append('month', data.month);
    formData.append('include_sheet', String(data.include_sheet ?? true));
    formData.append('include_notification', String(data.include_notification ?? true));

    if (data.custom_message) {
      formData.append('custom_message', data.custom_message);
    }

    if (data.attachment) {
      formData.append('attachment', data.attachment);
    }

    if (data.period_id !== undefined && data.period_id !== null) {
      formData.append('period_id', String(data.period_id));
    }

    if (data.apartment_ids && data.apartment_ids.length > 0) {
      formData.append('apartment_ids', data.apartment_ids.join(','));
    }
    if (data.mark_period_sent !== undefined) {
      formData.append('mark_period_sent', String(data.mark_period_sent));
    }
    if (data.skip_if_already_sent !== undefined) {
      formData.append('skip_if_already_sent', String(data.skip_if_already_sent));
    }
    if (data.sent_source) {
      formData.append('sent_source', data.sent_source);
    }

    try {
      const response = await apiClient.post<{
        success: boolean;
        sent_count: number;
        failed_count: number;
        sheet_attached: boolean;
        notification_included: boolean;
        details: Array<{
          apartment: string;
          email?: string;
          status: string;
          amount?: number;
          error?: string;
          reason?: string;
        }>;
      }>(`${BASE_URL}/notifications/send_personalized_common_expenses/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      storeCommonExpensesAttempt({
        status: 'success',
        mode: 'personalized',
        building_id: data.building_id,
        month: data.month,
        timestamp: new Date().toISOString(),
      });
      notifyCommonExpensesSent({ mode: 'personalized', building_id: data.building_id });
      return response;
    } catch (error) {
      storeCommonExpensesAttempt({
        status: 'failed',
        mode: 'personalized',
        building_id: data.building_id,
        month: data.month,
        error: getAttemptErrorMessage(error),
        timestamp: new Date().toISOString(),
      });
      notifyCommonExpensesSent({ mode: 'personalized', status: 'failed', building_id: data.building_id });
      throw error;
    }
  },

  /**
   * Queue personalized common expense notifications for multiple buildings
   */
  sendPersonalizedCommonExpensesBulk: async (data: {
    building_ids: number[];
    month: string;
    include_sheet?: boolean;
    include_notification?: boolean;
    custom_message?: string;
    mark_period_sent?: boolean;
    skip_if_already_sent?: boolean;
    sent_source?: string;
    stagger_seconds?: number;
  }) => {
    try {
      const response = await apiClient.post<{
        queued_count: number;
        queued: Array<{
          building_id: number;
          task_id: string;
          countdown: number;
        }>;
      }>(`${BASE_URL}/notifications/send_personalized_common_expenses_bulk/`, data);
      storeCommonExpensesAttempt({
        status: 'queued',
        mode: 'bulk',
        building_ids: data.building_ids,
        month: data.month,
        queued_count: response.queued_count,
        timestamp: new Date().toISOString(),
      });
      notifyCommonExpensesSent({
        mode: 'bulk',
        queued_count: response.queued_count,
      });
      return response;
    } catch (error) {
      storeCommonExpensesAttempt({
        status: 'failed',
        mode: 'bulk',
        building_ids: data.building_ids,
        month: data.month,
        error: getAttemptErrorMessage(error),
        timestamp: new Date().toISOString(),
      });
      notifyCommonExpensesSent({ mode: 'bulk', status: 'failed' });
      throw error;
    }
  },

  /**
   * Send personalized debt reminders with breakdown + total (month-based).
   */
  sendDebtReminders: async (data: {
    building_id: number;
    month: string; // YYYY-MM
    min_debt?: string | number;
    apartment_ids?: number[];
    custom_message?: string;
  }) => {
    const response = await apiClient.post<{
      notification_id: number;
      month: string;
      sent: number;
      failed: number;
      skipped: number;
      details: Array<{
        apartment: string;
        status: string;
        email?: string;
        total_due?: string;
        reason?: string;
        error?: string;
      }>;
    }>(`${BASE_URL}/notifications/send_debt_reminders/`, data);
    return response;
  },
};

/**
 * Email batch history (bulk sends like common expenses)
 */
export const emailBatchesApi = {
  list: async (params?: {
    purpose?: string;
    building?: number;
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get<{ results?: EmailBatch[] } | EmailBatch[]>(
      `${BASE_URL}/email-batches/`,
      { params }
    );
    return Array.isArray(response) ? response : response.results || [];
  },
  stats: async (params?: {
    purpose?: string;
    building?: number;
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get<EmailBatchStatistics>(
      `${BASE_URL}/email-batches/stats/`,
      { params }
    );
    return response;
  },
};

/**
 * Notification Recipients
 */
export const notificationRecipientsApi = {
  /**
   * Get all recipients
   */
  list: async (params?: {
    status?: string;
    notification?: number;
    apartment?: number;
  }) => {
    const response = await apiClient.get<{ results: NotificationRecipient[] }>(
      `${BASE_URL}/recipients/`,
      { params }
    );
    // Return just the results array from paginated response
    // Handle both paginated and non-paginated responses
    return Array.isArray(response) ? response : (response as { results?: any[] }).results || [];
  },

  /**
   * Get recipient by ID
   */
  get: async (id: number) => {
    const response = await apiClient.get<NotificationRecipient>(
      `${BASE_URL}/recipients/${id}/`
    );
    // The apiClient returns data directly
    return response;
  },
};

/**
 * Monthly Notification Tasks API
 */
export const monthlyTasksApi = {
  /**
   * Get all monthly tasks
   */
  list: async (params?: {
    status?: string;
    task_type?: string;
    building?: number;
    period_month?: string;
  }) => {
    const response = await apiClient.get<{ results: import('@/types/notifications').MonthlyNotificationTask[] }>(
      `${BASE_URL}/monthly-tasks/`,
      { params }
    );
    // Handle both paginated and non-paginated responses
    return Array.isArray(response) ? response : (response as { results?: any[] }).results || [];
  },

  /**
   * Get pending tasks (for modal)
   */
  pending: async () => {
    const response = await apiClient.get<import('@/types/notifications').MonthlyNotificationTask[]>(
      `${BASE_URL}/monthly-tasks/pending/`
    );
    // The apiClient returns data directly
    return response;
  },

  /**
   * Get task by ID
   */
  get: async (id: number) => {
    const response = await apiClient.get<import('@/types/notifications').MonthlyNotificationTask>(
      `${BASE_URL}/monthly-tasks/${id}/`
    );
    // The apiClient returns data directly
    return response;
  },

  /**
   * Confirm a monthly task
   */
  confirm: async (
    id: number,
    data: import('@/types/notifications').MonthlyTaskConfirmRequest
  ) => {
    const response = await apiClient.post<import('@/types/notifications').MonthlyNotificationTask>(
      `${BASE_URL}/monthly-tasks/${id}/confirm/`,
      data
    );
    // The apiClient returns data directly
    return response;
  },

  /**
   * Skip a monthly task
   */
  skip: async (id: number) => {
    const response = await apiClient.post<import('@/types/notifications').MonthlyNotificationTask>(
      `${BASE_URL}/monthly-tasks/${id}/skip/`
    );
    // The apiClient returns data directly
    return response;
  },

  /**
   * Enable auto-send for task
   */
  enableAutoSend: async (id: number) => {
    const response = await apiClient.post<{ message: string; auto_send_enabled: boolean }>(
      `${BASE_URL}/monthly-tasks/${id}/enable_auto_send/`
    );
    // The apiClient returns data directly
    return response;
  },

  /**
   * Disable auto-send for task
   */
  disableAutoSend: async (id: number) => {
    const response = await apiClient.post<{ message: string; auto_send_enabled: boolean }>(
      `${BASE_URL}/monthly-tasks/${id}/disable_auto_send/`
    );
    // The apiClient returns data directly
    return response;
  },

  /**
   * Delete a monthly task
   */
  remove: async (id: number) => {
    const response = await apiClient.delete<void>(
      `${BASE_URL}/monthly-tasks/${id}/`
    );
    return response;
  },

  /**
   * Configure or create a recurring task
   */
  configure: async (data: {
    task_type: 'common_expense' | 'balance_reminder' | 'custom';
    building?: number | null;
    recurrence_type?: 'once' | 'weekly' | 'biweekly' | 'monthly';
    day_of_week?: number | null; // 0=Monday, 6=Sunday
    day_of_month?: number | null;
    time_to_send: string;
    template?: number;
    auto_send_enabled?: boolean;
    period_month?: string;
  }) => {
    const response = await apiClient.post<import('@/types/notifications').MonthlyNotificationTask>(
      `${BASE_URL}/monthly-tasks/configure/`,
      data
    );
    return response;
  },

  /**
   * Get scheduled tasks
   */
  schedule: async (params?: { building_id?: number }) => {
    const response = await apiClient.get<import('@/types/notifications').MonthlyNotificationTask[]>(
      `${BASE_URL}/monthly-tasks/schedule/`,
      { params }
    );
    return Array.isArray(response) ? response : (response as { results?: any[] }).results || [];
  },

  /**
   * Preview notification for a task
   */
  preview: async (id: number, context?: Record<string, string>) => {
    const response = await apiClient.post<{
      subject: string;
      body: string;
      sms: string;
      task: {
        id: number;
        task_type: string;
        building_name: string;
        day_of_month: number;
        time_to_send: string;
        period_month: string;
      };
    }>(`${BASE_URL}/monthly-tasks/${id}/preview/`, { context });
    return response;
  },

  /**
   * Send test notification for a task
   */
  testSend: async (id: number, testEmail: string) => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      notification_id: number;
    }>(`${BASE_URL}/monthly-tasks/${id}/test/`, { test_email: testEmail });
    return response;
  },
};

/**
 * Notification Events
 */
export const notificationEventsApi = {
  /**
   * Get all notification events
   */
  list: async (params?: {
    event_type?: string;
    building?: number;
    is_urgent?: boolean;
    included_in_digest?: boolean;
    sent_immediately?: boolean;
  }) => {
    const response = await apiClient.get<{ results: NotificationEvent[] }>(
      `${BASE_URL}/events/`,
      { params }
    );
    // Handle both paginated and non-paginated responses
    return Array.isArray(response) ? response : (response as { results?: any[] }).results || [];
  },

  /**
   * Get event by ID
   */
  get: async (id: number) => {
    const response = await apiClient.get<NotificationEvent>(
      `${BASE_URL}/events/${id}/`
    );
    // The apiClient returns data directly
    return response;
  },

  /**
   * Get pending events (not sent yet)
   */
  pending: async (buildingId: number, sinceDate?: string) => {
    const params: any = { building_id: buildingId };
    if (sinceDate) {
      params.since_date = sinceDate;
    }

    const response = await apiClient.get<PendingEventsResponse>(
      `${BASE_URL}/events/pending/`,
      { params }
    );
    // The apiClient returns data directly
    return response;
  },

  /**
   * Preview digest email
   */
  previewDigest: async (request: DigestPreviewRequest) => {
    const response = await apiClient.post<DigestPreview>(
      `${BASE_URL}/events/digest_preview/`,
      request
    );
    // The apiClient returns data directly
    return response;
  },

  /**
   * Send digest email to all residents
   */
  sendDigest: async (request: SendDigestRequest) => {
    const response = await apiClient.post<SendDigestResponse>(
      `${BASE_URL}/events/send_digest/`,
      request
    );
    // The apiClient returns data directly
    return response;
  },
};
