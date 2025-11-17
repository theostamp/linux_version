import { NextRequest, NextResponse } from 'next/server';

// Store last send time per session to prevent abuse
const lastSentMap = new Map<string, number>();
const COOLDOWN_MS = 60 * 1000; // 60 seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Check cooldown
    const lastSent = lastSentMap.get(sessionId);
    const now = Date.now();
    
    if (lastSent && (now - lastSent) < COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((COOLDOWN_MS - (now - lastSent)) / 1000);
      return NextResponse.json(
        { 
          error: 'Please wait before requesting another email',
          remainingSeconds,
          canResendAt: lastSent + COOLDOWN_MS
        },
        { status: 429 }
      );
    }

    // Get tenant subdomain from Stripe session
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Stripe configuration missing' },
        { status: 500 }
      );
    }

    const Stripe = require('stripe');
    const stripe = new Stripe(apiKey, { apiVersion: '2025-09-30.clover' });
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const metadata = session.metadata || {};
    const tenantSubdomain = metadata.tenant_subdomain;

    if (!tenantSubdomain) {
      return NextResponse.json(
        { error: 'Tenant subdomain not found' },
        { status: 404 }
      );
    }

    // Request backend to resend verification email
    let coreApiUrl = process.env.CORE_API_URL || process.env.NEXT_PUBLIC_CORE_API_URL;
    const internalApiKey = process.env.INTERNAL_API_SECRET_KEY;

    if (!coreApiUrl || !internalApiKey) {
      return NextResponse.json(
        { error: 'Backend configuration missing' },
        { status: 500 }
      );
    }

    // Extract base URL if needed
    try {
      const url = new URL(coreApiUrl);
      if (url.pathname.includes('/api/')) {
        coreApiUrl = `${url.protocol}//${url.host}`;
      }
    } catch (e) {
      console.warn('Could not parse CORE_API_URL, using as-is:', coreApiUrl);
    }

    // Call backend to resend verification email
    const resendResponse = await fetch(
      `${coreApiUrl}/api/internal/tenants/${tenantSubdomain}/resend-verification/`,
      {
        method: 'POST',
        headers: {
          'X-Internal-API-Key': internalApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json().catch(() => ({}));
      return NextResponse.json(
        { 
          error: errorData.error || 'Failed to resend verification email',
          details: errorData
        },
        { status: resendResponse.status }
      );
    }

    // Update last sent time
    lastSentMap.set(sessionId, now);

    // Clean up old entries (older than 5 minutes)
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    for (const [key, timestamp] of lastSentMap.entries()) {
      if (timestamp < fiveMinutesAgo) {
        lastSentMap.delete(key);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Το email επιβεβαίωσης στάλθηκε ξανά',
      canResendAt: now + COOLDOWN_MS
    });

  } catch (error) {
    console.error('Error resending verification email:', error);
    return NextResponse.json(
      { 
        error: 'Failed to resend verification email',
        message: 'Προέκυψε σφάλμα κατά την αποστολή του email'
      },
      { status: 500 }
    );
  }
}

