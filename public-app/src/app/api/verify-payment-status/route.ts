import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Stripe configuration missing' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(apiKey, { apiVersion: '2024-12-18.acacia' });
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check payment status
    const paymentStatus = session.payment_status; // 'paid', 'unpaid', 'no_payment_required'
    const status = session.status; // 'complete', 'open', 'expired'

    // Get metadata
    const metadata = session.metadata || {};
    const tenantSubdomain = metadata.tenant_subdomain;

    // Determine overall status
    let verificationStatus: 'pending' | 'processing' | 'ready' | 'error' = 'pending';
    let message = '';
    let tenantUrl: string | null = null;
    let emailSent = false;

    if (status === 'complete' && paymentStatus === 'paid') {
      // Payment successful - check if tenant is ready
      // In a real implementation, you'd check your database/backend
      // For now, we'll check if webhook has processed it
      // This is a simplified check - in production, query your database
      
      // TODO: Query backend/database to check tenant creation status
      // For now, assume tenant is being created (webhook processes it)
      verificationStatus = 'processing';
      message = 'Η πληρωμή σας επιβεβαιώθηκε. Προετοιμάζουμε το workspace σας...';
      
      // In production, check database for tenant status
      // If tenant exists and email verified → 'ready'
      // If tenant exists but email not verified → 'processing' (waiting for email)
      // If tenant doesn't exist yet → 'processing' (webhook still processing)
    } else if (status === 'expired') {
      verificationStatus = 'error';
      message = 'Η συνεδρία πληρωμής έχει λήξει. Παρακαλώ ξαναδοκιμάστε.';
    } else {
      verificationStatus = 'pending';
      message = 'Εξετάζουμε την κατάσταση της πληρωμής σας...';
    }

    return NextResponse.json({
      status: verificationStatus,
      paymentStatus,
      sessionStatus: status,
      message,
      tenantUrl,
      emailSent,
      tenantSubdomain,
    });
  } catch (error) {
    console.error('Error verifying payment status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to verify payment status',
        status: 'error',
        message: 'Προέκυψε σφάλμα κατά την επαλήθευση της πληρωμής.'
      },
      { status: 500 }
    );
  }
}

