import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subdomain, apartments } = body;

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Το subdomain είναι υποχρεωτικό' },
        { status: 400 }
      );
    }

    // Get access token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Πρέπει να είστε συνδεδεμένος' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);

    // Call backend API
    let coreApiUrl = process.env.CORE_API_URL || process.env.NEXT_PUBLIC_CORE_API_URL;
    if (!coreApiUrl) {
      return NextResponse.json(
        { error: 'Backend API not configured' },
        { status: 500 }
      );
    }

    // Ensure URL has protocol
    if (!coreApiUrl.startsWith('http://') && !coreApiUrl.startsWith('https://')) {
      coreApiUrl = `https://${coreApiUrl}`;
    }
    
    // Remove trailing slash
    coreApiUrl = coreApiUrl.replace(/\/$/, '');

    console.log('[create-free-tenant] Calling backend:', `${coreApiUrl}/api/users/create-free-tenant/`);

    const response = await fetch(`${coreApiUrl}/api/users/create-free-tenant/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        subdomain,
        apartments: apartments || 7
      }),
    });

    let data;
    try {
      const text = await response.text();
      if (!text) {
        throw new Error('Empty response from backend');
      }
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('[create-free-tenant] Failed to parse response:', parseError);
      return NextResponse.json(
        { error: `Backend returned invalid response (${response.status})` },
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.error('[create-free-tenant] Backend error:', data);
      return NextResponse.json(
        { error: data.error || 'Αποτυχία δημιουργίας workspace' },
        { status: response.status }
      );
    }

    console.log('[create-free-tenant] Success:', data);

    return NextResponse.json({
      success: true,
      message: data.message || 'Το workspace δημιουργήθηκε επιτυχώς!',
      tenantUrl: data.tenantUrl,
      tenant: data.tenant,
      tokens: data.tokens
    });

  } catch (error) {
    console.error('[create-free-tenant] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: `Αποτυχία δημιουργίας workspace: ${errorMessage}` },
      { status: 500 }
    );
  }
}

