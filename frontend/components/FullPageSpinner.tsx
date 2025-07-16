// frontend/components/FullPageSpinner.tsx

import React from 'react';

interface FullPageSpinnerProps {
  readonly message?: string;
}

export default function FullPageSpinner({ message = "Loading..." }: FullPageSpinnerProps) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(255,255,255,0.7)',
      zIndex: 1000
    }}>
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4" />
      <div style={{ color: '#333', fontSize: 18 }}>{message}</div>
    </div>
  );
}