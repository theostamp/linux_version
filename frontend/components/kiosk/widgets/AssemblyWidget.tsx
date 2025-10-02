'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { Calendar, Clock, MapPin, Video } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

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

  // Εξάγουμε θέματα
  const topicsRegex = /###\s*Θέμα:\s*([^\n]+)/g;
  const topics: string[] = [];
  let match;
  while ((match = topicsRegex.exec(assembly.description)) !== null) {
    topics.push(match[1].trim());
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-purple-500/20">
        <Calendar className="w-6 h-6 text-purple-300" />
        <h2 className="text-lg font-bold text-white">Γενική Συνέλευση</h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Ημερομηνία & Ώρα */}
        <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-sm p-4 rounded-xl border border-purple-500/30">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-500/20 p-3 rounded-full">
              <Clock className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <p className="text-xs text-purple-300 uppercase tracking-wide mb-1">Ημερομηνία & Ώρα</p>
              <p className="text-lg font-bold text-white">{dateTimeInfo || 'Δεν έχει οριστεί'}</p>
            </div>
          </div>
        </div>

        {/* Τοποθεσία/Zoom */}
        <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-sm p-4 rounded-xl border border-purple-500/30">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-500/20 p-3 rounded-full">
              {isOnline ? (
                <Video className="w-6 h-6 text-purple-300" />
              ) : (
                <MapPin className="w-6 h-6 text-purple-300" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs text-purple-300 uppercase tracking-wide mb-1">
                {isOnline ? 'Διαδικτυακή Συνέλευση' : 'Τοποθεσία'}
              </p>
              {isOnline ? (
                <p className="text-sm text-white">Zoom Meeting</p>
              ) : (
                <p className="text-sm text-white">{locationInfo || 'Θα ανακοινωθεί'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Θέματα */}
        {topics.length > 0 && (
          <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-sm p-4 rounded-xl border border-purple-500/30">
            <h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wide mb-3">
              Θέματα Ημερήσιας Διάταξης ({topics.length})
            </h3>
            <ul className="space-y-2">
              {topics.slice(0, 4).map((topic, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-purple-400 font-bold mt-0.5">{index + 1}.</span>
                  <span className="text-sm text-white flex-1">{topic}</span>
                </li>
              ))}
              {topics.length > 4 && (
                <li className="text-xs text-purple-300 italic">
                  +{topics.length - 4} ακόμα θέματα
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Σημείωση */}
        <div className="bg-yellow-900/20 border border-yellow-500/30 p-3 rounded-lg">
          <p className="text-xs text-yellow-200 text-center">
            ⚠️ Η συμμετοχή σας είναι απαραίτητη για την απαρτία
          </p>
        </div>
      </div>
    </div>
  );
}
