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

    const stripe = new Stripe(apiKey, { apiVersion: '2025-09-30.clover' });
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
      // Payment successful - check tenant and email verification status
      // Query backend to check tenant creation and email verification status
      try {
        // Use CORE_API_URL (server-side) or fallback to NEXT_PUBLIC_CORE_API_URL
        let coreApiUrl = process.env.CORE_API_URL || process.env.NEXT_PUBLIC_CORE_API_URL;
        const internalApiKey = process.env.INTERNAL_API_SECRET_KEY;
        
        if (coreApiUrl && internalApiKey && tenantSubdomain) {
          // Extract base URL if CORE_API_URL contains a path
          // e.g., "https://backend.com/api/internal/tenants/create/" -> "https://backend.com"
          try {
            const url = new URL(coreApiUrl);
            // If the path contains '/api/', extract base URL
            if (url.pathname.includes('/api/')) {
              coreApiUrl = `${url.protocol}//${url.host}`;
            }
          } catch (e) {
            // If URL parsing fails, use as-is
            console.warn('Could not parse CORE_API_URL, using as-is:', coreApiUrl);
          }
          
          // Check tenant status from backend
          const tenantStatusResponse = await fetch(
            `${coreApiUrl}/api/internal/tenants/${tenantSubdomain}/status/`,
            {
              headers: {
                'X-Internal-API-Key': internalApiKey,
              },
            }
          );

          if (tenantStatusResponse.ok) {
            const tenantStatus = await tenantStatusResponse.json();
            
            if (tenantStatus.email_verified && tenantStatus.tenant_ready) {
              verificationStatus = 'ready';
              message = 'Το workspace σας είναι έτοιμο!';
              tenantUrl = tenantStatus.tenant_url || `${tenantSubdomain}.newconcierge.app`;
              emailSent = tenantStatus.email_sent || false;
            } else if (tenantStatus.tenant_ready && !tenantStatus.email_verified) {
              verificationStatus = 'processing';
              message = 'Η πληρωμή σας επιβεβαιώθηκε. Έχουμε στείλει email επιβεβαίωσης. Παρακαλώ ελέγξτε το inbox σας.';
              emailSent = tenantStatus.email_sent || false;
            } else {
              verificationStatus = 'processing';
              message = 'Η πληρωμή σας επιβεβαιώθηκε. Προετοιμάζουμε το workspace σας...';
            }
          } else {
            // Backend not available or tenant not created yet
            verificationStatus = 'processing';
            message = 'Η πληρωμή σας επιβεβαιώθηκε. Προετοιμάζουμε το workspace σας...';
          }
        } else {
          // No backend configured - use default processing message
          verificationStatus = 'processing';
          message = 'Η πληρωμή σας επιβεβαιώθηκε. Προετοιμάζουμε το workspace σας...';
        }
      } catch (error) {
        console.error('Error checking tenant status:', error);
        verificationStatus = 'processing';
        message = 'Η πληρωμή σας επιβεβαιώθηκε. Προετοιμάζουμε το workspace σας...';
      }
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

