// lib/api/admin.ts

import { apiClient } from './client';

// Types
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  email_verified: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  role?: string;
  office_name?: string;
  office_phone?: string;
  office_address?: string;
  date_joined: string;
  last_login?: string;
  buildings_count?: number;
  subscription?: {
    id: string;
    plan_name: string;
    status: string;
    current_period_end: string;
  };
}

export interface Subscription {
  id: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  plan: {
    id: number;
    name: string;
    plan_type: string;
    monthly_price: number;
    yearly_price: number;
  };
  status: string;
  billing_interval: string;
  trial_start?: string;
  trial_end?: string;
  current_period_start: string;
  current_period_end: string;
  price: number;
  currency: string;
  created_at: string;
  days_until_renewal?: number;
  usage_stats?: {
    buildings: number;
    apartments: number;
    users: number;
  };
}

export interface BillingStats {
  overview: {
    total_revenue: number;
    monthly_revenue: number;
    yearly_revenue: number;
    pending_revenue: number;
    total_invoices: number;
    paid_invoices: number;
    pending_invoices: number;
    failed_invoices: number;
    payment_rate: number;
  };
  revenue_trends: {
    daily: Array<{ date: string; revenue: number }>;
    monthly: Array<{ month: string; revenue: number }>;
  };
  payment_methods: Array<{ card_brand: string; count: number }>;
  metrics: {
    avg_invoice_amount: number;
    churn_rate: number;
    customer_lifetime_value: number;
    mrr: number;
    arr: number;
  };
}

export interface SystemSettings {
  site_name: string;
  site_description: string;
  site_url: string;
  default_language: string;
  timezone: string;
  currency: string;
  email_enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  stripe_enabled: boolean;
  stripe_public_key: string;
  stripe_secret_key: string;
  registration_enabled: boolean;
  email_verification_required: boolean;
  maintenance_mode: boolean;
  debug_mode: boolean;
}

export interface SystemStatus {
  database: {
    status: string;
    user_count?: number;
    error?: string;
  };
  email: {
    status: string;
    message?: string;
    error?: string;
  };
  payments: {
    status: string;
    success_rate: number;
    total_payments: number;
    successful_payments: number;
    error?: string;
  };
  storage: {
    status: string;
    provider: string;
    free_space_gb?: number;
    total_space_gb?: number;
    free_percentage?: number;
    error?: string;
  };
  overall_health: string;
  last_check: string;
}

// Admin Users API
export const adminUsersApi = {
  // Get all users with filters
  getUsers: async (params?: {
    search?: string;
    status?: string;
    role?: string;
    page?: number;
  }) => {
    const response = await apiClient.get('/admin/users/', { params });
    return response.data;
  },

  // Get user by ID
  getUser: async (id: number) => {
    const response = await apiClient.get(`/admin/users/${id}/`);
    return response.data;
  },

  // Activate user
  activateUser: async (id: number) => {
    const response = await apiClient.post(`/admin/users/${id}/activate/`);
    return response.data;
  },

  // Deactivate user
  deactivateUser: async (id: number) => {
    const response = await apiClient.post(`/admin/users/${id}/deactivate/`);
    return response.data;
  },

  // Verify user email
  verifyUserEmail: async (id: number) => {
    const response = await apiClient.post(`/admin/users/${id}/verify_email/`);
    return response.data;
  },

  // Reset user password
  resetUserPassword: async (id: number) => {
    const response = await apiClient.post(`/admin/users/${id}/reset_password/`);
    return response.data;
  },

  // Get user statistics
  getUserStats: async () => {
    const response = await apiClient.get('/admin/users/stats/');
    return response.data;
  },

  // Export users
  exportUsers: async () => {
    const response = await apiClient.get('/admin/users/export/', {
      responseType: 'blob'
    });
    return response.data;
  }
};

// Admin Subscriptions API
export const adminSubscriptionsApi = {
  // Get all subscriptions with filters
  getSubscriptions: async (params?: {
    search?: string;
    status?: string;
    plan?: string;
    page?: number;
  }) => {
    const response = await apiClient.get('/admin/subscriptions/', { params });
    return response.data;
  },

  // Get subscription by ID
  getSubscription: async (id: string) => {
    const response = await apiClient.get(`/admin/subscriptions/${id}/`);
    return response.data;
  },

  // Cancel subscription
  cancelSubscription: async (id: string) => {
    const response = await apiClient.post(`/admin/subscriptions/${id}/cancel/`);
    return response.data;
  },

  // Reactivate subscription
  reactivateSubscription: async (id: string) => {
    const response = await apiClient.post(`/admin/subscriptions/${id}/reactivate/`);
    return response.data;
  },

  // Extend trial
  extendTrial: async (id: string, days: number = 7) => {
    const response = await apiClient.post(`/admin/subscriptions/${id}/extend_trial/`, {
      days
    });
    return response.data;
  },

  // Generate invoice
  generateInvoice: async (id: string) => {
    const response = await apiClient.post(`/admin/subscriptions/${id}/generate_invoice/`);
    return response.data;
  },

  // Get subscription statistics
  getSubscriptionStats: async () => {
    const response = await apiClient.get('/admin/subscriptions/stats/');
    return response.data;
  },

  // Export subscriptions
  exportSubscriptions: async () => {
    const response = await apiClient.get('/admin/subscriptions/export/', {
      responseType: 'blob'
    });
    return response.data;
  }
};

// Admin Billing API
export const adminBillingApi = {
  // Get billing statistics
  getBillingStats: async (period: string = '30d') => {
    const response = await apiClient.get('/admin/billing/stats/', {
      params: { period }
    });
    return response.data;
  },

  // Get recent payments
  getRecentPayments: async (limit: number = 10) => {
    const response = await apiClient.get('/admin/billing/recent-payments/', {
      params: { limit }
    });
    return response.data;
  },

  // Generate monthly invoices
  generateMonthlyInvoices: async () => {
    const response = await apiClient.post('/admin/billing/generate-monthly-invoices/');
    return response.data;
  },

  // Export billing data
  exportBillingData: async (type: 'invoices' | 'revenue' = 'invoices') => {
    const response = await apiClient.get('/admin/billing/export/', {
      params: { type },
      responseType: 'blob'
    });
    return response.data;
  }
};

// Admin Settings API
export const adminSettingsApi = {
  // Get system settings
  getSettings: async (): Promise<SystemSettings> => {
    const response = await apiClient.get('/admin/settings/');
    return response.data;
  },

  // Update system settings
  updateSettings: async (settings: Partial<SystemSettings>) => {
    const response = await apiClient.put('/admin/settings/', settings);
    return response.data;
  },

  // Get system status
  getSystemStatus: async (): Promise<SystemStatus> => {
    const response = await apiClient.get('/admin/system/status/');
    return response.data;
  },

  // Get backup information
  getBackupInfo: async () => {
    const response = await apiClient.get('/admin/system/backup/');
    return response.data;
  },

  // Create manual backup
  createBackup: async () => {
    const response = await apiClient.post('/admin/system/backup/');
    return response.data;
  },

  // Get system logs
  getSystemLogs: async (type: string = 'error', limit: number = 100) => {
    const response = await apiClient.get('/admin/system/logs/', {
      params: { type, limit }
    });
    return response.data;
  }
};

