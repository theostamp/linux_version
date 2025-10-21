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
    const response = await apiClient.get<{ results: NotificationTemplate[] }>(
      `${BASE_URL}/templates/`,
      { params }
    );
    // Return just the results array from paginated response
    return response.data.results || response.data as any;
  },

  /**
   * Get template by ID
   */
  get: async (id: number) => {
    const response = await apiClient.get<NotificationTemplate>(
      `${BASE_URL}/templates/${id}/`
    );
    return response.data;
  },

  /**
   * Create new template
   */
  create: async (data: Partial<NotificationTemplate>) => {
    const response = await apiClient.post<NotificationTemplate>(
      `${BASE_URL}/templates/`,
      data
    );
    return response.data;
  },

  /**
   * Update template
   */
  update: async (id: number, data: Partial<NotificationTemplate>) => {
    const response = await apiClient.put<NotificationTemplate>(
      `${BASE_URL}/templates/${id}/`,
      data
    );
    return response.data;
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
    return response.data;
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
  }) => {
    const response = await apiClient.get<{ results: Notification[] }>(
      `${BASE_URL}/notifications/`,
      { params }
    );
    // Return just the results array from paginated response
    return response.data.results || response.data as any;
  },

  /**
   * Get notification by ID
   */
  get: async (id: number) => {
    const response = await apiClient.get<Notification>(
      `${BASE_URL}/notifications/${id}/`
    );
    return response.data;
  },

  /**
   * Create and send notification
   */
  create: async (data: NotificationCreateRequest) => {
    const response = await apiClient.post<NotificationCreateResponse>(
      `${BASE_URL}/notifications/`,
      data
    );
    return response.data;
  },

  /**
   * Resend failed notifications
   */
  resend: async (id: number) => {
    const response = await apiClient.post<{
      resent: number;
      failed: number;
    }>(`${BASE_URL}/notifications/${id}/resend/`);
    return response.data;
  },

  /**
   * Get notification statistics
   */
  stats: async () => {
    const response = await apiClient.get<NotificationStatistics>(
      `${BASE_URL}/notifications/stats/`
    );
    return response.data;
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
    return response.data;
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
    return response.data.results || response.data as any;
  },

  /**
   * Get recipient by ID
   */
  get: async (id: number) => {
    const response = await apiClient.get<NotificationRecipient>(
      `${BASE_URL}/recipients/${id}/`
    );
    return response.data;
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
    return response.data.results || response.data as any;
  },

  /**
   * Get pending tasks (for modal)
   */
  pending: async () => {
    const response = await apiClient.get<import('@/types/notifications').MonthlyNotificationTask[]>(
      `${BASE_URL}/monthly-tasks/pending/`
    );
    return response.data;
  },

  /**
   * Get task by ID
   */
  get: async (id: number) => {
    const response = await apiClient.get<import('@/types/notifications').MonthlyNotificationTask>(
      `${BASE_URL}/monthly-tasks/${id}/`
    );
    return response.data;
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
    return response.data;
  },

  /**
   * Skip a monthly task
   */
  skip: async (id: number) => {
    const response = await apiClient.post<import('@/types/notifications').MonthlyNotificationTask>(
      `${BASE_URL}/monthly-tasks/${id}/skip/`
    );
    return response.data;
  },

  /**
   * Enable auto-send for task
   */
  enableAutoSend: async (id: number) => {
    const response = await apiClient.post<{ message: string; auto_send_enabled: boolean }>(
      `${BASE_URL}/monthly-tasks/${id}/enable_auto_send/`
    );
    return response.data;
  },

  /**
   * Disable auto-send for task
   */
  disableAutoSend: async (id: number) => {
    const response = await apiClient.post<{ message: string; auto_send_enabled: boolean }>(
      `${BASE_URL}/monthly-tasks/${id}/disable_auto_send/`
    );
    return response.data;
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
    return response.data.results || response.data as any;
  },

  /**
   * Get event by ID
   */
  get: async (id: number) => {
    const response = await apiClient.get<NotificationEvent>(
      `${BASE_URL}/events/${id}/`
    );
    return response.data;
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
    return response.data;
  },

  /**
   * Preview digest email
   */
  previewDigest: async (request: DigestPreviewRequest) => {
    const response = await apiClient.post<DigestPreview>(
      `${BASE_URL}/events/digest_preview/`,
      request
    );
    return response.data;
  },

  /**
   * Send digest email to all residents
   */
  sendDigest: async (request: SendDigestRequest) => {
    const response = await apiClient.post<SendDigestResponse>(
      `${BASE_URL}/events/send_digest/`,
      request
    );
    return response.data;
  },
};
