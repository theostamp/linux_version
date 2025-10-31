// lib/api/user.ts
// Updated: 2025-10-31 - Added resident_role and resident_profile to UserProfile interface

import { apiClient } from './client';

// Types
export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  date_joined: string;
  last_login?: string;
  email_verified: boolean;
  role?: string; // Backward compat (same as system_role)
  system_role?: 'superuser' | 'admin' | 'manager' | null; // CustomUser.SystemRole
  resident_role?: 'manager' | 'owner' | 'tenant' | null; // Resident.Role (apartment level)
  resident_profile?: {
    apartment: string;
    building_id: number;
    building_name: string;
    phone?: string | null;
  } | null;
  office_name?: string;
  office_phone?: string;
  office_address?: string;
  apartments: Array<{
    id: number;
    building_name: string;
    apartment_number: string;
    role: string;
  }>;
  subscription?: {
    plan_name: string;
    status: string;
    current_period_end: string;
    price: number;
    currency: string;
  };
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  plan_type: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  max_buildings: number;
  max_apartments: number;
  max_users: number;
  max_api_calls: number;
  max_storage_gb: number;
  features: {
    has_analytics: boolean;
    has_custom_integrations: boolean;
    has_priority_support: boolean;
    has_white_label: boolean;
  };
  trial_days: number;
  yearly_discount_percentage: number;
}

export interface UserSubscription {
  id: string;
  plan: SubscriptionPlan;
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
  usage: {
    buildings: number;
    apartments: number;
    users: number;
  };
  usage_limits: {
    buildings: number;
    apartments: number;
    users: number;
  };
}

export interface BillingCycle {
  id: string;
  subscription_id: string;
  plan_name: string;
  period_start: string;
  period_end: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  paid_at?: string;
  due_date: string;
  stripe_invoice_id?: string;
}

export interface NotificationSettings {
  email_notifications: boolean;
  payment_reminders: boolean;
  maintenance_notices: boolean;
  community_updates: boolean;
  emergency_alerts: boolean;
}

export interface ActiveSession {
  id: string;
  device: string;
  ip_address: string;
  location: string;
  last_activity: string;
  current: boolean;
}

// User Profile API
export const userProfileApi = {
  // Get user profile
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get('/users/profile/');
    return response.data;
  },

  // Update user profile
  updateProfile: async (profileData: Partial<UserProfile>) => {
    const response = await apiClient.put('/users/profile/', profileData);
    return response.data;
  },

  // Change password
  changePassword: async (passwordData: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) => {
    const response = await apiClient.post('/users/profile/change-password/', passwordData);
    return response.data;
  },

  // Get notification settings
  getNotificationSettings: async (): Promise<NotificationSettings> => {
    const response = await apiClient.get('/users/profile/notifications/');
    return response.data;
  },

  // Update notification settings
  updateNotificationSettings: async (settings: Partial<NotificationSettings>) => {
    const response = await apiClient.put('/users/profile/notifications/', settings);
    return response.data;
  },

  // Get active sessions
  getActiveSessions: async (): Promise<{ sessions: ActiveSession[]; total: number }> => {
    const response = await apiClient.get('/users/profile/sessions/');
    return response.data;
  },

  // Revoke session
  revokeSession: async (sessionId: string) => {
    const response = await apiClient.delete('/users/profile/sessions/', {
      data: { session_id: sessionId }
    });
    return response.data;
  },

  // Request account deletion
  requestAccountDeletion: async (password: string) => {
    const response = await apiClient.post('/users/profile/delete-account/', {
      password
    });
    return response.data;
  }
};

// User Subscription API
export const userSubscriptionApi = {
  // Get current subscription
  getCurrentSubscription: async (): Promise<{ subscription: UserSubscription | null }> => {
    const response = await apiClient.get('/api/billing/subscriptions/current/');
    return response.data;
  },

  // Get available subscription plans
  getSubscriptionPlans: async (): Promise<{ plans: SubscriptionPlan[] }> => {
    const response = await apiClient.get('/api/billing/plans/');
    return response.data;
  },

  // Get billing history
  getBillingHistory: async (limit: number = 10): Promise<{
    billing_cycles: BillingCycle[];
    total: number;
  }> => {
    const response = await apiClient.get('/api/billing/analytics/billing-history/', {
      params: { limit }
    });
    return response.data;
  },

  // Perform subscription action
  performAction: async (action: string, data?: any) => {
    const response = await apiClient.post('/api/users/subscription/actions/', {
      action,
      ...data
    });
    return response.data;
  },

  // Cancel subscription
  cancelSubscription: async () => {
    return userSubscriptionApi.performAction('cancel');
  },

  // Reactivate subscription
  reactivateSubscription: async () => {
    return userSubscriptionApi.performAction('reactivate');
  },

  // Upgrade subscription
  upgradeSubscription: async (planId: number) => {
    return userSubscriptionApi.performAction('upgrade', { plan_id: planId });
  },

  // Create new subscription
  createSubscription: async (subscriptionData: {
    plan_id: number;
    billing_interval: 'month' | 'year';
    payment_method_id?: string;
  }) => {
    const response = await apiClient.post('/api/users/subscription/create/', subscriptionData);
    return response.data;
  }
};

// Utility functions
export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('el-GR');
};

export const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('el-GR');
};

export const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
    case 'paid':
    case 'verified':
      return 'default';
    case 'trial':
    case 'pending':
      return 'outline';
    case 'canceled':
    case 'failed':
    case 'inactive':
      return 'destructive';
    case 'past_due':
      return 'secondary';
    default:
      return 'secondary';
  }
};


