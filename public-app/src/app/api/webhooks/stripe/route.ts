import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!apiKey || !webhookSecret) {
      console.error('Stripe env vars missing: STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
      return NextResponse.json(
        { error: 'Stripe configuration missing' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(apiKey, { apiVersion: '2024-12-18.acacia' });

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('No Stripe signature found');
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log('Received Stripe webhook event:', event.type);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout.session.completed:', session.id);
  try {
    const metadata = session.metadata;
    if (!metadata) {
      console.error('No metadata found in checkout session');
      return;
    }

    const {
      tenant_subdomain,
      plan,
      user_email,
      user_first_name,
      user_last_name
    } = metadata;

    if (!tenant_subdomain || !plan || !user_email) {
      console.error('Missing required metadata:', { tenant_subdomain, plan, user_email });
      return;
    }

    console.log('Creating tenant via Core API:', {
      tenant_subdomain,
      plan,
      user_email
    });

    const coreApiResponse = await fetch(process.env.CORE_API_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Key': process.env.INTERNAL_API_SECRET_KEY!,
        'Host': 'localhost'
      },
      body: JSON.stringify({
        schema_name: tenant_subdomain,
        user_data: {
          email: user_email,
          first_name: user_first_name || '',
          last_name: user_last_name || '',
          password: 'temp_password_123'
        },
        plan_id: getPlanId(plan),
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        stripe_checkout_session_id: session.id
      })
    });

    if (!coreApiResponse.ok) {
      const errorData = await coreApiResponse.json();
      console.error('Core API error:', errorData);
      throw new Error(`Core API failed: ${errorData.error || 'Unknown error'}`);
    }

    const tenantData = await coreApiResponse.json();
    console.log('Tenant created successfully:', tenantData);

    // After tenant creation, send email verification
    // The backend should handle this, but we can also trigger it here if needed
    // The user should be created by the backend during tenant creation
    // and email verification should be sent automatically
    
    // If backend doesn't send email automatically, trigger it:
    if (tenantData.user_id) {
      try {
        const emailResponse = await fetch(`${process.env.CORE_API_URL}/api/users/send-verification-email/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-API-Key': process.env.INTERNAL_API_SECRET_KEY!,
          },
          body: JSON.stringify({
            user_id: tenantData.user_id,
          }),
        });

        if (emailResponse.ok) {
          console.log('Verification email sent successfully');
        } else {
          console.error('Failed to send verification email:', await emailResponse.text());
        }
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
        // Don't fail the webhook if email fails - tenant is already created
      }
    }
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Processing subscription.created:', subscription.id);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Processing subscription.updated:', subscription.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Processing subscription.deleted:', subscription.id);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Processing invoice.payment_succeeded:', invoice.id);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing invoice.payment_failed:', invoice.id);
}

function getPlanId(planName: string): number {
  const planMapping: Record<string, number> = {
    basic: 1,
    professional: 2,
    enterprise: 3,
  };
  return planMapping[planName] || 2;
}
