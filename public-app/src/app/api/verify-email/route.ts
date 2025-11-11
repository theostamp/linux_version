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
    const coreApiUrl = process.env.CORE_API_URL;
    if (!coreApiUrl) {
      return NextResponse.json(
        { error: 'Backend API not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(`${coreApiUrl}/api/users/verify-email/?token=${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
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
    console.error('Error verifying email:', error);
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    );
  }
}

