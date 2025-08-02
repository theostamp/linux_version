'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useLoading } from '@/components/contexts/LoadingContext';
import { useNavigationWithLoading } from '@/hooks/useNavigationWithLoading';

export default function LoadingDemo() {
  const { startLoading, stopLoading } = useLoading();
  const { navigateWithLoading } = useNavigationWithLoading();

  const handleManualLoading = async () => {
    startLoading('Επεξεργασία δεδομένων...');
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    stopLoading();
  };

  const handleNavigationLoading = async () => {
    await navigateWithLoading('/dashboard', 'Μετάβαση στον πίνακα ελέγχου...');
  };

  const handleFormSimulation = async () => {
    startLoading('Αποθήκευση φόρμας...');
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await navigateWithLoading('/requests', 'Μετάβαση στη λίστα αιτημάτων...');
  };

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold mb-4">Loading System Demo</h2>
      
      <div className="space-y-3">
        <Button 
          onClick={handleManualLoading}
          className="w-full"
        >
          Manual Loading (3s)
        </Button>
        
        <Button 
          onClick={handleNavigationLoading}
          variant="outline"
          className="w-full"
        >
          Navigation Loading
        </Button>
        
        <Button 
          onClick={handleFormSimulation}
          variant="secondary"
          className="w-full"
        >
          Form Simulation
        </Button>
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">Features:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Backdrop blur effect</li>
          <li>• Animated spinner</li>
          <li>• Progress dots</li>
          <li>• Custom messages</li>
          <li>• Dark mode support</li>
        </ul>
      </div>
    </div>
  );
}