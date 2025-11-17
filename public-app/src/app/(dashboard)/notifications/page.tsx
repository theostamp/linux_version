'use client';

import { useState } from 'react';
import { Bell, History, Calendar, FileText, BarChart3 } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import NotificationsList from '@/components/notifications/NotificationsList';
import MonthlyTasksManager from '@/components/notifications/MonthlyTasksManager';
import NotificationTemplateEditor from '@/components/notifications/NotificationTemplateEditor';
import NotificationAnalytics from '@/components/notifications/NotificationAnalytics';

function NotificationsPageContent() {
  const [activeTab, setActiveTab] = useState('history');

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-indigo-100 p-2 text-indigo-600">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ειδοποιήσεις & Ενημερώσεις</h1>
              <p className="text-sm text-gray-500">
                Διαχείριση ειδοποιήσεων, μηνιαίων αποστολών και προτύπων
              </p>
            </div>
          </div>
          <BuildingFilterIndicator className="mt-3" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Ιστορικό</span>
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Μηνιαίες</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Πρότυπα</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-6">
          <NotificationsList />
        </TabsContent>

        <TabsContent value="monthly" className="mt-6">
          <MonthlyTasksManager />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <NotificationTemplateEditor />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <NotificationAnalytics />
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
