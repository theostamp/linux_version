'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { Calendar, Clock, MapPin, Video } from 'lucide-react';

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
    a.title?.includes('Συνέλευση') ||
    a.title?.includes('Σύγκληση') ||
    a.description?.includes('ΘΕΜΑΤΑ ΗΜΕΡΗΣΙΑΣ ΔΙΑΤΑΞΗΣ')
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
  const isOnline = assembly.description.includes('Zoom Meeting') || assembly.description.includes('Zoom');

  // Εξάγουμε θέματα με απλή λογική
  const extractTopics = (description: string): string[] => {
    const topicsSection = description.match(/\*\*ΘΕΜΑΤΑ ΗΜΕΡΗΣΙΑΣ ΔΙΑΤΑΞΗΣ:\*\*([\s\S]*?)\*\*Σημαντικό:\*\*/);
    if (!topicsSection) return [];

    const topicsContent = topicsSection[1];

    // Extract topics using regex for ### Θέμα: pattern
    const topicMatches = topicsContent.match(/###\s*Θέμα:\s*([^\n]+)/g);

    if (topicMatches && topicMatches.length > 0) {
      const topics = topicMatches.map(match =>
        match.replace(/###\s*Θέμα:\s*/, '').trim()
      ).filter(topic => topic.length > 0);

      // Remove duplicates and return
      return [...new Set(topics)];
    }

    return [];
  };

  const topics = extractTopics(assembly.description);

  // Format topics list
  const formatTopicsList = () => {
    if (topics.length === 0) return '';
    if (topics.length === 1) return topics[0];
    if (topics.length === 2) return `${topics[0]} και ${topics[1]}`;
    return `${topics.slice(0, -1).join(', ')} και ${topics[topics.length - 1]}`;
  };

  return (
    <div className="flex-1 p-4">
    <div className="h-full overflow-hidden flex flex-col">
        <div className="bg-teal-600 px-3 py-2 rounded-t-lg">
          <h2 className="text-lg font-bold text-white">Γενική Συνέλευση</h2>
          </div>
        <div className="flex-1 p-3 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                {topics.length > 0 ? (
                  <p className="text-sm text-gray-800 leading-relaxed">
                    Θα πραγματοποιηθεί γενική συνέλευση στις{' '}
                    <span className="font-semibold text-teal-700">
                      {dateTimeInfo || 'Δεν έχει οριστεί'}
                    </span>{' '}
                    στο{' '}
                    <span className="font-semibold text-teal-700">
                      {isOnline ? 'Zoom Meeting' : (locationInfo || 'Θα ανακοινωθεί')}
                    </span>{' '}
                    με {topics.length === 1 ? 'θέμα' : 'θέματα'}:{' '}
                    <span className="font-semibold text-gray-900">
                      {formatTopicsList()}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 italic">
                    Δεν έχουν οριστεί θέματα ακόma
                  </p>
                )}
          </div>
        </div>
            <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2">
              <p className="text-xs text-yellow-700 text-center">
                ⚠️ Η συμμετοχή σας είναι απαραίτητη
              </p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
