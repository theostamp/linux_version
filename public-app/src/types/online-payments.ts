export type OnlineChargeStatus =
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type OnlineChargeCategory = 'operational' | 'reserve' | 'fee';

export type RouteDestination = 'client_funds' | 'office_fees';

export type OnlineCharge = {
  id: string;
  building: number;
  apartment: number;
  resident_user_id?: number | null;
  category: OnlineChargeCategory;
  amount: number | string;
  currency: string;
  period: string; // YYYY-MM
  description: string;
  status: OnlineChargeStatus;
  due_date?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
  routed_to: RouteDestination;
};

export type CheckoutResponse = {
  checkout_url: string;
  provider_session_id: string;
};
