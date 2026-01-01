'use client';

import { useState } from 'react';
import {
  FileSpreadsheet,
  Wallet,
  Megaphone,
  Users,
  Wrench,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import CommonExpenseSender from './senders/CommonExpenseSender';
import DebtReminderSender from './senders/DebtReminderSender';
import AnnouncementSender from './senders/AnnouncementSender';
import MeetingSender from './senders/MeetingSender';
import MaintenanceSender from './senders/MaintenanceSender';
import EmergencySender from './senders/EmergencySender';

type MessageType =
  | 'common_expense'
  | 'debt_reminder'
  | 'announcement'
  | 'meeting'
  | 'maintenance'
  | 'emergency';

interface MessageTypeCard {
  type: MessageType;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

const MESSAGE_TYPES: MessageTypeCard[] = [
  {
    type: 'common_expense',
    icon: <FileSpreadsheet className="h-8 w-8" />,
    title: 'Κοινόχρηστα Μήνα',
    description: 'Αποστολή μηνιαίου λογαριασμού κοινοχρήστων',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
  },
  {
    type: 'debt_reminder',
    icon: <Wallet className="h-8 w-8" />,
    title: 'Υπενθύμιση Οφειλής',
    description: 'Ειδοποίηση για εκκρεμείς πληρωμές',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
  },
  {
    type: 'announcement',
    icon: <Megaphone className="h-8 w-8" />,
    title: 'Ανακοίνωση',
    description: 'Γενική ενημέρωση προς τους ενοίκους',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
  },
  {
    type: 'meeting',
    icon: <Users className="h-8 w-8" />,
    title: 'Πρόσκληση Συνέλευσης',
    description: 'Ενημέρωση για γενική συνέλευση',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
  },
  {
    type: 'maintenance',
    icon: <Wrench className="h-8 w-8" />,
    title: 'Εργασίες Συντήρησης',
    description: 'Ενημέρωση για προγραμματισμένες εργασίες',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 hover:bg-teal-100 border-teal-200',
  },
  {
    type: 'emergency',
    icon: <AlertTriangle className="h-8 w-8" />,
    title: 'Έκτακτη Ειδοποίηση',
    description: 'Επείγουσα ενημέρωση άμεσης σημασίας',
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100 border-red-200',
  },
];

export default function SendPanel() {
  const [selectedType, setSelectedType] = useState<MessageType | null>(null);

  const handleBack = () => {
    setSelectedType(null);
  };

  const handleSuccess = () => {
    // Επιστροφή στην επιλογή τύπου μετά από επιτυχή αποστολή
    setSelectedType(null);
  };

  // Αν έχει επιλεγεί τύπος, δείξε τη φόρμα
  if (selectedType) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Επιστροφή στην επιλογή
        </Button>

        {selectedType === 'common_expense' && (
          <CommonExpenseSender onSuccess={handleSuccess} onCancel={handleBack} />
        )}
        {selectedType === 'debt_reminder' && (
          <DebtReminderSender onSuccess={handleSuccess} onCancel={handleBack} />
        )}
        {selectedType === 'announcement' && (
          <AnnouncementSender onSuccess={handleSuccess} onCancel={handleBack} />
        )}
        {selectedType === 'meeting' && (
          <MeetingSender onSuccess={handleSuccess} onCancel={handleBack} />
        )}
        {selectedType === 'maintenance' && (
          <MaintenanceSender onSuccess={handleSuccess} onCancel={handleBack} />
        )}
        {selectedType === 'emergency' && (
          <EmergencySender onSuccess={handleSuccess} onCancel={handleBack} />
        )}
      </div>
    );
  }

  // Προβολή επιλογής τύπου μηνύματος
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Τι θέλετε να στείλετε;
        </h2>
        <p className="mt-1 text-gray-500">
          Επιλέξτε τον τύπο μηνύματος και συμπληρώστε τα στοιχεία
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MESSAGE_TYPES.map((item) => (
          <Card
            key={item.type}
            className={cn(
              'cursor-pointer border-2 transition-all duration-200',
              item.bgColor
            )}
            onClick={() => setSelectedType(item.type)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={cn('p-3 rounded-full bg-white shadow-sm', item.color)}>
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
