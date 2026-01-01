export type PlanId = 'free' | 'web' | 'premium' | 'premium_iot';

export const FREE_MAX_APARTMENTS = 7;
export const PREMIUM_MIN_MONTHLY = 30;
export const PREMIUM_IOT_MIN_MONTHLY = 35;

export const PLAN_RATES: Record<Exclude<PlanId, 'free'>, number> = {
  web: 1.0,
  premium: 1.8,
  premium_iot: 2.3,
};

const roundTo2 = (value: number) => Math.round(value * 100) / 100;

export const isFreeEligible = (apartments: number) => apartments <= FREE_MAX_APARTMENTS;

export const getMonthlyPrice = (plan: PlanId, apartments: number) => {
  if (plan === 'free') return 0;
  if (plan === 'web') {
    if (apartments <= FREE_MAX_APARTMENTS) return 0;
    return roundTo2(PLAN_RATES.web * apartments);
  }
  const base = PLAN_RATES[plan] * apartments;
  const minPrice = plan === 'premium' ? PREMIUM_MIN_MONTHLY : PREMIUM_IOT_MIN_MONTHLY;
  return roundTo2(Math.max(base, minPrice));
};

export const getYearlyPrice = (monthlyPrice: number) => roundTo2(monthlyPrice * 10);
