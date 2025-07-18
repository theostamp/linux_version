// 
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://api.quotable.io/random');
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch quote' }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('quote api error', err);
    return NextResponse.json({ error: 'Error fetching quote' }, { status: 500 });
  }
}