import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  try {
    const response = await fetch(`${BACKEND_URL}/api/vote-by-email/${token}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[vote-by-email] GET Error:', error);
    return NextResponse.json(
      { error: 'Αδυναμία σύνδεσης με τον διακομιστή' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/vote-by-email/${token}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[vote-by-email] POST Error:', error);
    return NextResponse.json(
      { error: 'Αδυναμία αποστολής ψήφων' },
      { status: 500 }
    );
  }
}
