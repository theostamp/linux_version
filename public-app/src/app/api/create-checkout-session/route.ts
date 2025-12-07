import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

/**
 * Τιμολογιακή Πολιτική:
 * - Free: 1-7 διαμερίσματα → €0
 * - Cloud: 8-20 → €18, 21-30 → €22, 31+ → €25
 * - Kiosk: 8-20 → €28, 21-30 → €35, 31+ → €40
 */

interface PricingTier {
  minApartments: number;
  maxApartments: number | null;
  monthlyPrice: number;
}

const PRICING_TIERS: Record<string, PricingTier[]> = {
  free: [{ minApartments: 1, maxApartments: 7, monthlyPrice: 0 }],
  cloud: [
    { minApartments: 8, maxApartments: 20, monthlyPrice: 18 },
    { minApartments: 21, maxApartments: 30, monthlyPrice: 22 },
    { minApartments: 31, maxApartments: null, monthlyPrice: 25 },
  ],
  kiosk: [
    { minApartments: 8, maxApartments: 20, monthlyPrice: 28 },
    { minApartments: 21, maxApartments: 30, monthlyPrice: 35 },
    { minApartments: 31, maxApartments: null, monthlyPrice: 40 },
  ],
};

const PLAN_NAMES: Record<string, string> = {
  free: 'Concierge Free',
  cloud: 'Concierge Cloud',
  kiosk: 'Concierge Info Point',
};

function getPriceForApartments(plan: string, apartments: number): number | null {
  const tiers = PRICING_TIERS[plan];
  if (!tiers) return null;

  for (const tier of tiers) {
    if (
      apartments >= tier.minApartments &&
      (tier.maxApartments === null || apartments <= tier.maxApartments)
    ) {
      return tier.monthlyPrice;
    }
  }
  return null;
}

function getTierLabel(apartments: number): string {
  if (apartments <= 7) return '1-7 διαμερίσματα';
  if (apartments <= 20) return '8-20 διαμερίσματα';
  if (apartments <= 30) return '21-30 διαμερίσματα';
  return '31+ διαμερίσματα';
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      console.error('Stripe env var missing: STRIPE_SECRET_KEY');
      return NextResponse.json(
        { error: 'Stripe configuration missing' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(apiKey, { apiVersion: '2025-09-30.clover' });

    const body = await request.json();
    const { 
      plan, 
      apartments = 15,
      billingInterval = 'month',
      userData, 
      tenantSubdomain 
    } = body;

    if (!plan || !userData || !tenantSubdomain) {
      return NextResponse.json(
        { error: 'Missing required fields: plan, userData, tenantSubdomain' },
        { status: 400 }
      );
    }

    // Validate plan
    const validPlans = ['free', 'cloud', 'kiosk'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be free, cloud, or kiosk' },
        { status: 400 }
      );
    }

    // Handle Free plan (no payment needed)
    if (plan === 'free') {
      // For free plan, we should create the account directly via backend
      // without going through Stripe
      try {
        const coreApiUrl = process.env.NEXT_PUBLIC_CORE_API_URL?.replace(/\/$/, '');
        
        const response = await fetch(`${coreApiUrl}/api/users/register/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userData.email,
            password: userData.password,
            first_name: userData.firstName,
            last_name: userData.lastName,
            tenant_subdomain: tenantSubdomain,
            plan: 'free',
            apartments: apartments,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          return NextResponse.json(
            { error: errorData.detail || 'Failed to create account' },
            { status: response.status }
          );
        }

        // Account created successfully
        return NextResponse.json({ 
          success: true,
          message: 'Account created successfully',
          redirectUrl: '/login?registered=true'
        });
      } catch (error) {
        console.error('Error creating free account:', error);
        return NextResponse.json(
          { error: 'Failed to create account' },
          { status: 500 }
        );
      }
    }

    // Calculate price for paid plans
    const monthlyPrice = getPriceForApartments(plan, apartments);
    if (monthlyPrice === null) {
      return NextResponse.json(
        { error: 'Could not calculate price for the given apartments' },
        { status: 400 }
      );
    }

    // Calculate final price based on billing interval
    const isYearly = billingInterval === 'year';
    const priceAmount = isYearly 
      ? monthlyPrice * 10 * 100 // 10 months (2 free) in cents
      : monthlyPrice * 100; // Monthly in cents

    const planName = PLAN_NAMES[plan] || plan;
    const tierLabel = getTierLabel(apartments);

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: userData.email,
      name: `${userData.firstName} ${userData.lastName}`,
      metadata: {
        tenant_subdomain: tenantSubdomain,
        plan: plan,
        apartments: apartments.toString(),
        first_name: userData.firstName,
        last_name: userData.lastName
      }
    });

    // Create checkout session with dynamic pricing
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: planName,
              description: `${tierLabel} - ${isYearly ? 'Ετήσια συνδρομή (2 μήνες δωρεάν)' : 'Μηνιαία συνδρομή'}`,
              metadata: {
                plan: plan,
                apartments: apartments.toString(),
                tier: tierLabel,
              },
            },
            unit_amount: priceAmount,
            recurring: { 
              interval: isYearly ? 'year' : 'month' 
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/verify-payment/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/signup?plan=${plan}&apartments=${apartments}`,
      metadata: {
        tenant_subdomain: tenantSubdomain,
        plan: plan,
        apartments: apartments.toString(),
        billing_interval: billingInterval,
        user_email: userData.email,
        user_first_name: userData.firstName,
        user_last_name: userData.lastName,
        user_password: userData.password, // Will be hashed by Django
        monthly_price: monthlyPrice.toString(),
        tier_label: tierLabel,
      },
      subscription_data: {
        trial_period_days: 14, // 14 ημέρες δοκιμαστική περίοδος
        metadata: {
          tenant_subdomain: tenantSubdomain,
          plan: plan,
          apartments: apartments.toString(),
          user_email: userData.email
        }
      }
    });

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url,
      plan: plan,
      apartments: apartments,
      monthlyPrice: monthlyPrice,
      billingInterval: billingInterval,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
