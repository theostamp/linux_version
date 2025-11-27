'use client';

import { CheckCircle2, Mail, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SendConfirmationProps {
  title: string;
  recipientCount: number;
  onNewMessage: () => void;
  onViewHistory: () => void;
}

export default function SendConfirmation({
  title,
  recipientCount,
  onNewMessage,
  onViewHistory,
}: SendConfirmationProps) {
  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="p-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-full bg-green-100">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>

          <div>
            <h3 className="text-xl font-semibold text-green-900">
              Το μήνυμα στάλθηκε επιτυχώς!
            </h3>
            <p className="mt-2 text-green-700">
              {title}
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm text-green-700">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{recipientCount} παραλήπτες</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Μόλις τώρα</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onViewHistory}>
              Προβολή Ιστορικού
            </Button>
            <Button onClick={onNewMessage}>
              Νέο Μήνυμα
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

