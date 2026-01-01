import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Call backend API to verify email
    // Use CORE_API_URL (server-side) or fallback to NEXT_PUBLIC_CORE_API_URL
    let coreApiUrl = process.env.CORE_API_URL || process.env.NEXT_PUBLIC_CORE_API_URL;
    if (!coreApiUrl) {
      return NextResponse.json(
        { error: 'Backend API not configured. Please set CORE_API_URL or NEXT_PUBLIC_CORE_API_URL environment variable.' },
        { status: 500 }
      );
    }

    // Ensure URL has protocol
    if (!coreApiUrl.startsWith('http://') && !coreApiUrl.startsWith('https://')) {
      coreApiUrl = `https://${coreApiUrl}`;
    }

    // Remove trailing slash
    coreApiUrl = coreApiUrl.replace(/\/$/, '');

    // Build the full URL
    const verifyUrl = `${coreApiUrl}/api/users/verify-email/?token=${encodeURIComponent(token)}`;

    console.log('[verify-email] Calling backend:', verifyUrl);

    const response = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    let data;
    try {
      const text = await response.text();
      if (!text) {
        throw new Error('Empty response from backend');
      }
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('[verify-email] Failed to parse response:', parseError);
      return NextResponse.json(
        { error: `Backend returned invalid response (${response.status}). Please check backend is running and accessible.` },
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.error('[verify-email] Backend error:', data);
      return NextResponse.json(
        { error: data.error || 'Email verification failed' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      user: data.user,
      tenantUrl: data.tenant_url,
    });
  } catch (error) {
    console.error('[verify-email] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if it's a network error
    if (errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
      return NextResponse.json(
        { error: 'Cannot connect to backend API. Please check CORE_API_URL is set correctly and backend is running.' },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: `Failed to verify email: ${errorMessage}` },
      { status: 500 }
    );
  }
}
