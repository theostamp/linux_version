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
} from '@/types/notifications';

const BASE_URL = '/notifications';

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
    const response = await apiClient.get<NotificationTemplate[]>(
      `${BASE_URL}/templates/`,
      { params }
    );
    return response.data;
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
    const response = await apiClient.get<Notification[]>(
      `${BASE_URL}/notifications/`,
      { params }
    );
    return response.data;
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
    const response = await apiClient.get<NotificationRecipient[]>(
      `${BASE_URL}/recipients/`,
      { params }
    );
    return response.data;
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