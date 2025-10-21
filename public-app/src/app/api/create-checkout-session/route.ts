import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      plan, 
      userData, 
      tenantSubdomain 
    } = body;

    // Validate required fields
    if (!plan || !userData || !tenantSubdomain) {
      return NextResponse.json(
        { error: 'Missing required fields: plan, userData, tenantSubdomain' },
        { status: 400 }
      );
    }

    // Plan configuration
    const plans = {
      basic: {
        priceId: 'price_1SKa7uB8WcZR1y86JEXtzwJB', // Basic Plan - €29.00/month
        amount: 2900, // €29.00 in cents
        name: 'Basic Plan',
        description: 'Perfect for small buildings - Up to 20 apartments'
      },
      professional: {
        priceId: 'price_1SKa7vB8WcZR1y86Ru5cZFWu', // Professional Plan - €59.00/month
        amount: 5900, // €59.00 in cents
        name: 'Professional Plan',
        description: 'Ideal for medium buildings - Up to 50 apartments'
      },
      enterprise: {
        priceId: 'price_1SKa7vB8WcZR1y86ypH2sSlS', // Enterprise Plan - €99.00/month
        amount: 9900, // €99.00 in cents
        name: 'Enterprise Plan',
        description: 'For large complexes - Unlimited apartments'
      }
    };

    const selectedPlan = plans[plan as keyof typeof plans];
    if (!selectedPlan) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: userData.email,
      name: `${userData.firstName} ${userData.lastName}`,
      metadata: {
        tenant_subdomain: tenantSubdomain,
        plan: plan,
        first_name: userData.firstName,
        last_name: userData.lastName
      }
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: selectedPlan.name,
              description: selectedPlan.description,
            },
            unit_amount: selectedPlan.amount,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/verify-payment/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/signup?plan=${plan}`,
      metadata: {
        tenant_subdomain: tenantSubdomain,
        plan: plan,
        user_email: userData.email,
        user_first_name: userData.firstName,
        user_last_name: userData.lastName
      },
      subscription_data: {
        metadata: {
          tenant_subdomain: tenantSubdomain,
          plan: plan,
          user_email: userData.email
        }
      },
      // Enable trial period (30 days)
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          tenant_subdomain: tenantSubdomain,
          plan: plan,
          user_email: userData.email
        }
      }
    });

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
