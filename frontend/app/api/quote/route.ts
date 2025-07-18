import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const fallbackQuotes = [
  { content: 'Εν αρχή ην ο λόγος.' },
  { content: 'Keep it simple.' },
  { content: 'Simplicity is the ultimate sophistication.' },
];

export async function GET() {
  try {
    const res = await fetch('https://api.quotable.io/random');
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    console.error('quote api error', err);
  }

  const random = Math.floor(Math.random() * fallbackQuotes.length);
  return NextResponse.json(fallbackQuotes[random]);
}
