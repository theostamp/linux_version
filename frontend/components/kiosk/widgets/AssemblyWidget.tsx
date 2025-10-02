'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { Calendar, Clock, MapPin, Video } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import MarkdownRenderer from '@/components/kiosk/MarkdownRenderer';

export default function AssemblyWidget({ data, isLoading, error }: BaseWidgetProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-300"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Φιλτράρουμε ανακοινώσεις συνέλευσης
  const assemblyAnnouncements = data?.announcements?.filter((a: any) =>
    a.title?.includes('Συνέλευση') || a.title?.includes('Σύγκληση')
  ) || [];

  if (assemblyAnnouncements.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-300">
        <div className="text-center">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Δεν υπάρχει προγραμματισμένη συνέλευση</h3>
          <p className="text-sm">Θα ενημερωθείτε όταν προκύψει</p>
        </div>
      </div>
    );
  }

  // Παίρνουμε την πρώτη (πιο πρόσφατη) ανακοίνωση συνέλευσης
  const assembly = assemblyAnnouncements[0];

  // Εξάγουμε πληροφορίες από την περιγραφή
  const extractInfo = (description: string, label: string): string | null => {
    const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n*]+)`, 'i');
    const match = description.match(regex);
    return match ? match[1].trim() : null;
  };

  const dateTimeInfo = extractInfo(assembly.description, 'Ημερομηνία και Ώρα Συνέλευσης');
  const locationInfo = extractInfo(assembly.description, 'Τοποθεσία');
  const zoomLinkMatch = assembly.description.match(/\*\*Σύνδεσμος:\*\*\s*(https?:\/\/[^\s]+)/i);
  const isOnline = assembly.description.includes('Διαδικτυακή Συνέλευση') || assembly.description.includes('Zoom');

  // Εξάγουμε το τμήμα των θεμάτων
  const topicsSection = assembly.description.match(/\*\*ΘΕΜΑΤΑ ΗΜΕΡΗΣΙΑΣ ΔΙΑΤΑΞΗΣ:\*\*([\s\S]*?)\*\*Σημαντικό:\*\*/);
  const topicsContent = topicsSection ? topicsSection[1].trim() : '';

  // Εξάγουμε θέματα
  const topicsRegex = /###\s*Θέμα:\s*([^\n]+)/g;
  const topics: string[] = [];
  let match;
  while ((match = topicsRegex.exec(assembly.description)) !== null) {
    topics.push(match[1].trim());
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Compact Header με πληροφορίες */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-purple-300" />
            <h2 className="text-base font-bold text-white">Γενική Συνέλευση</h2>
          </div>
          <div className="text-xs text-purple-200">
            {topics.length} {topics.length === 1 ? 'Θέμα' : 'Θέματα'}
          </div>
        </div>

        {/* Compact date/time/location */}
        <div className="bg-purple-900/30 rounded-lg p-2 text-xs space-y-1">
          <div className="flex items-center space-x-2 text-purple-200">
            <Clock className="w-3 h-3" />
            <span>{dateTimeInfo || 'Δεν έχει οριστεί'}</span>
          </div>
          <div className="flex items-center space-x-2 text-purple-200">
            {isOnline ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
            <span>{isOnline ? 'Zoom Meeting' : (locationInfo || 'Θα ανακοινωθεί')}</span>
          </div>
        </div>
      </div>

      {/* Θέματα - takes full remaining space */}
      <div className="flex-1 overflow-y-auto">
        {topicsContent ? (
          <MarkdownRenderer content={topicsContent} className="space-y-3" />
        ) : (
          <p className="text-sm text-gray-400 italic">Δεν έχουν οριστεί θέματα ακόμα</p>
        )}
      </div>

      {/* Footer note */}
      <div className="mt-3 bg-yellow-900/20 border border-yellow-500/30 p-2 rounded-lg">
        <p className="text-xs text-yellow-200 text-center">
          ⚠️ Η συμμετοχή σας είναι απαραίτητη
        </p>
      </div>
    </div>
  );
}
