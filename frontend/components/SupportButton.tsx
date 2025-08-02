'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useSupportRequest } from '@/hooks/useSupportRequest';

interface SupportButtonProps {
  readonly requestId: number;
  readonly initialSupported?: boolean;
  readonly disabled?: boolean;
}

export default function SupportButton({
  requestId,
  initialSupported = false,
  disabled = false,
}: SupportButtonProps) {
  const [supported, setSupported] = useState(initialSupported);
  const { mutate: support, isPending } = useSupportRequest();

  const handleSupport = () => {
    if (supported || isPending || disabled) return;

    support(requestId, {
      onSuccess: () => {
        toast.success('Η υποστήριξή σας καταχωρήθηκε!');
        setSupported(true);
      },
      onError: () => {
        toast.error('Αποτυχία υποστήριξης');
      },
    });
  };

  let buttonLabel = '🤝 Υποστήριξη';
  if (supported) {
    buttonLabel = '✅ Υποστηρίχθηκε';
  } else if (isPending) {
    buttonLabel = 'Υποβολή...';
  }

  return (
    <button
      onClick={handleSupport}
      disabled={supported || isPending || disabled}
      className={`mt-4 px-4 py-2 rounded text-sm font-medium transition ${
        supported
          ? 'bg-green-100 text-green-700 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {buttonLabel}
    </button>
  );
}
