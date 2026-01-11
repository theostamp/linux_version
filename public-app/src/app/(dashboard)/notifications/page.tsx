'use client';

import { useState } from 'react';
import { Bell, Send, History, Settings } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// New simplified components
import SendPanel from '@/components/notifications-v2/SendPanel';
import HistoryPanel from '@/components/notifications-v2/HistoryPanel';
import { ExtendedSettingsPanel } from '@/components/notifications-v2/SettingsPanel';

function NotificationsPageContent() {
  const [activeTab, setActiveTab] = useState('send');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-indigo-100 p-2.5 text-indigo-600">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h1 className="page-title-sm">Ειδοποιήσεις</h1>
              <p className="text-sm text-gray-500">
                Αποστολή μηνυμάτων στους ενοίκους
              </p>
            </div>
          </div>
          <BuildingFilterIndicator className="mt-3" />
        </div>
      </div>

      {/* Main Tabs - Simplified to 3 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span>Αποστολή</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span>Ιστορικό</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Ρυθμίσεις</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-6">
          <SendPanel />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <HistoryPanel />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <ExtendedSettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <NotificationsPageContent />
      </SubscriptionGate>
    </AuthGate>
  );
}
