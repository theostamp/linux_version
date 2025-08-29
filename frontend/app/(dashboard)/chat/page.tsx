'use client';

import React, { useState, useEffect } from 'react';
import ChatInterface from '@/components/ChatInterface';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, Building as BuildingIcon } from 'lucide-react';
import Link from 'next/link';
import { useBuilding } from '@/components/contexts/BuildingContext';
import BuildingSelectorButton from '@/components/BuildingSelectorButton';
import { useAuth } from '@/components/contexts/AuthContext';

export default function ChatPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const { currentBuilding, selectedBuilding, setSelectedBuilding } = useBuilding();

  useEffect(() => {
    if (!authLoading) setIsLoading(false);
  }, [authLoading]);

  const handleBuildingSelect = (building: any) => {
    setSelectedBuilding(building);
  };

  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p>Φόρτωση...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Σφάλμα φόρτωσης</h2>
              <p className="text-gray-600 mb-4">
                Δεν ήταν δυνατή η φόρτωση των στοιχείων χρήστη.
              </p>
              <Link href="/login">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Επιστροφή στη Σύνδεση
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentBuilding) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center">
              <BuildingIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Δεν έχει επιλεγεί κτίριο</h2>
              <p className="text-gray-600 mb-4">
                Παρακαλώ επιλέξτε ένα κτίριο για να συνεχίσετε στο chat.
              </p>
              <Link href="/dashboard">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Επιστροφή στο Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Επιστροφή
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Chat Room</h1>
              <p className="text-gray-600">
                Επικοινωνήστε με τους κατοίκους και διαχειριστές του κτιρίου
              </p>
            </div>
          </div>
          
          {/* Building Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Κτίριο:</span>
            <BuildingSelectorButton
              onBuildingSelect={handleBuildingSelect}
              selectedBuilding={selectedBuilding}
              className="min-w-[200px]"
            />
          </div>
        </div>
      </div>

      <div className="h-[calc(100vh-200px)]">
        <ChatInterface 
          currentUser={{
            id: user.id,
            name: user.name || user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
            email: user.email,
            role: user.role || 'resident',
          }} 
        />
      </div>
    </div>
  );
} 