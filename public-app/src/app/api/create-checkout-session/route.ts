import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getMonthlyPrice, getYearlyPrice, isFreeEligible, PlanId, PLAN_RATES } from '@/lib/pricing';

/**
 * Τιμολογιακή Πολιτική:
 * - Free: 1-7 διαμερίσματα → €0
 * - Web: €1.0/διαμέρισμα
 * - Premium: €1.8/διαμέρισμα
 * - Premium + IoT: €2.3/διαμέρισμα
 */
const PLAN_NAMES: Record<PlanId, string> = {
  free: 'Concierge Free',
  web: 'Concierge Web',
  premium: 'Concierge Premium',
  premium_iot: 'Concierge Premium + IoT',
};

function getTierLabel(apartments: number): string {
  return `${apartments} διαμερίσματα`;
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
      tenantSubdomain,
      oauth = false  // Flag for OAuth users (no password needed)
    } = body;

    if (!plan || !userData || !tenantSubdomain) {
      return NextResponse.json(
        { error: 'Missing required fields: plan, userData, tenantSubdomain' },
        { status: 400 }
      );
    }

    // Validate plan
    const validPlans: PlanId[] = ['free', 'web', 'premium', 'premium_iot'];
    if (!validPlans.includes(plan as PlanId)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be free, web, premium, or premium_iot' },
        { status: 400 }
      );
    }
    const planId = plan as PlanId;

    // Handle Free plan (no payment needed)
    if (planId === 'free') {
      if (!isFreeEligible(apartments)) {
        return NextResponse.json(
          { error: 'Free plan is available up to 7 apartments' },
          { status: 400 }
        );
      }
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
    const monthlyPrice = getMonthlyPrice(planId, apartments);

    // Calculate final price based on billing interval
    const isYearly = billingInterval === 'year';
    const priceAmount = isYearly
      ? getYearlyPrice(monthlyPrice) * 100 // 10 months (2 free) in cents
      : monthlyPrice * 100; // Monthly in cents

    const planName = PLAN_NAMES[planId] || planId;
    const tierLabel = getTierLabel(apartments);
    const planRate = planId === 'free' ? 0 : PLAN_RATES[planId];

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: userData.email,
      name: `${userData.firstName} ${userData.lastName}`,
      metadata: {
        tenant_subdomain: tenantSubdomain,
        plan: planId,
        apartments: apartments.toString(),
        first_name: userData.firstName,
        last_name: userData.lastName
      }
    });

    // Create checkout session with dynamic pricing
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      payment_method_collection: 'if_required',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: planName,
              description: `${tierLabel} • €${planRate}/διαμέρισμα • ${isYearly ? 'Ετήσια συνδρομή (2 μήνες δωρεάν)' : 'Μηνιαία συνδρομή'}`,
              metadata: {
                plan: planId,
                apartments: apartments.toString(),
                tier: tierLabel,
                plan_rate: planRate.toString(),
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
        plan: planId,
        apartments: apartments.toString(),
        billing_interval: billingInterval,
        user_email: userData.email,
        user_first_name: userData.firstName,
        user_last_name: userData.lastName,
        user_password: oauth ? '' : (userData.password || ''), // OAuth users don't need password
        is_oauth: oauth ? 'true' : 'false',
        monthly_price: monthlyPrice.toString(),
        tier_label: tierLabel,
      },
      subscription_data: {
        trial_period_days: 14, // 14 ημέρες δοκιμαστική περίοδος
        metadata: {
          tenant_subdomain: tenantSubdomain,
          plan: planId,
          apartments: apartments.toString(),
          user_email: userData.email
        }
      }
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      plan: planId,
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
