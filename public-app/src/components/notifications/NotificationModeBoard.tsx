'use client';

import type { JSX } from 'react';
import { AlertTriangle, BellRing, CreditCard, Megaphone, Users, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import type { NotificationCategory } from '@/types/notifications';
import {
  getPreferenceForCategory,
  useNotificationPreferences,
} from '@/hooks/useNotificationPreferences';

const CATEGORY_CONFIG: Array<{
  category: NotificationCategory;
  label: string;
  description: string;
  icon: JSX.Element;
  accent: string;
}> = [
  {
    category: 'announcement',
    label: 'Ανακοινώσεις',
    description: 'Ενημερώσεις προς όλους τους ενοίκους.',
    icon: <Megaphone className="h-4 w-4 text-indigo-600" />,
    accent: 'bg-indigo-50 border-indigo-100',
  },
  {
    category: 'payment',
    label: 'Πληρωμές',
    description: 'Υπενθυμίσεις για οφειλές και ειδοποιήσεις πληρωμών.',
    icon: <CreditCard className="h-4 w-4 text-emerald-600" />,
    accent: 'bg-emerald-50 border-emerald-100',
  },
  {
    category: 'maintenance',
    label: 'Συντηρήσεις',
    description: 'Εργασίες ή βλάβες που χρειάζονται ενημέρωση.',
    icon: <Wrench className="h-4 w-4 text-amber-600" />,
    accent: 'bg-amber-50 border-amber-100',
  },
  {
    category: 'meeting',
    label: 'Συνελεύσεις',
    description: 'Προσκλητήρια και follow-up συνελεύσεων.',
    icon: <Users className="h-4 w-4 text-blue-600" />,
    accent: 'bg-blue-50 border-blue-100',
  },
  {
    category: 'reminder',
    label: 'Υπενθυμίσεις',
    description: 'Digest ή περιοδικές υπενθυμίσεις.',
    icon: <BellRing className="h-4 w-4 text-purple-600" />,
    accent: 'bg-purple-50 border-purple-100',
  },
  {
    category: 'emergency',
    label: 'Έκτακτα',
    description: 'Κρίσιμες ενημερώσεις που δεν πρέπει να καθυστερούν.',
    icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
    accent: 'bg-red-50 border-red-100',
  },
];

export default function NotificationModeBoard() {
  const { preferences, updatePreference, resetPreferences } = useNotificationPreferences();

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-lg">Διακόπτες αποστολής</CardTitle>
          <p className="text-sm text-gray-500">
            Επίλεξε με on/off τι θα φεύγει άμεσα και τι θα μπαίνει σε πρόγραμμα. Χωρίς τεχνικούς
            όρους, μόνο ξεκάθαρες επιλογές.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={resetPreferences}>
          Επαναφορά
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {CATEGORY_CONFIG.map((cfg) => {
          const pref = getPreferenceForCategory(preferences, cfg.category);
          return (
            <div
              key={cfg.category}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3 ${cfg.accent}`}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-white/70 p-2 shadow-sm">{cfg.icon}</div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900">{cfg.label}</p>
                    {pref.instant && <Badge variant="outline">Άμεση</Badge>}
                    {pref.scheduled && (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                        Προγραμματισμένη
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{cfg.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <Switch
                    checked={pref.instant}
                    onCheckedChange={(checked) =>
                      updatePreference(cfg.category, { instant: checked })
                    }
                  />
                  <span>Άμεση</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <Switch
                    checked={pref.scheduled}
                    onCheckedChange={(checked) =>
                      updatePreference(cfg.category, { scheduled: checked })
                    }
                  />
                  <span>Προγραμματισμένη</span>
                </label>
              </div>
            </div>
          );
        })}
        <div className="text-xs text-gray-500 text-right">
          Οι επιλογές εφαρμόζονται ως προεπιλογές στην φόρμα αποστολής παρακάτω.
        </div>
      </CardContent>
    </Card>
  );
}
