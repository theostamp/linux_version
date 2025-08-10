import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface UseModalStateOptions {
  modalKey: string;
  requiredTab?: string;
  buildingId: number;
}

export const useModalState = ({ modalKey, requiredTab, buildingId }: UseModalStateOptions) => {
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle URL parameters for modal
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const modalParam = searchParams.get('modal');
    
    // Only show modal if we're on the correct tab and modal parameter matches
    if (modalParam === modalKey && (!requiredTab || tabParam === requiredTab)) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [searchParams, modalKey, requiredTab]);

  const openModal = () => {
    setIsOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('modal', modalKey);
    if (requiredTab) {
      params.set('tab', requiredTab);
    }
    if (!params.has('building')) {
      params.set('building', buildingId.toString());
    }
    router.push(`/financial?${params.toString()}`);
  };

  const closeModal = () => {
    setIsOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('modal');
    router.push(`/financial?${params.toString()}`);
  };

  const closeModalWithoutUrlUpdate = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    openModal,
    closeModal,
    closeModalWithoutUrlUpdate
  };
};
