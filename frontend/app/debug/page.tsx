'use client';

export default function DebugPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">🔍 Debug Περιβάλλοντος</h1>
      <p>
        <strong>NEXT_PUBLIC_API_URL:</strong>{' '}
        <code>{process.env.NEXT_PUBLIC_API_URL ?? '🚫 Undefined'}</code>
      </p>
    </div>
  );
}
