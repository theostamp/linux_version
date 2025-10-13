'use client';

import { Calendar, MapPin, Clock, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';

interface AssemblyAnnouncementWidgetProps {
  data?: any;
  isLoading?: boolean;
  error?: string | null;
}

export default function AssemblyAnnouncementWidget({ data, isLoading, error }: AssemblyAnnouncementWidgetProps) {
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

  // Filter for assembly/vote announcements
  const importantAnnouncements = (data?.announcements || []).filter((ann: any) => 
    ann.title?.toLowerCase().includes('συνέλευση') || 
    ann.title?.toLowerCase().includes('σύγκληση') ||
    ann.title?.toLowerCase().includes('ψηφοφορ')
  );

  if (importantAnnouncements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-purple-300">
        <Calendar className="w-10 h-10 mb-2 opacity-60" />
        <p className="text-sm text-center font-medium">Δεν υπάρχουν ενεργές</p>
        <p className="text-xs text-purple-400 mt-1">Συνελεύσεις/Ψηφοφορίες</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-purple-500/20">
        <Calendar className="w-5 h-5 text-purple-300" />
        <h3 className="text-sm font-bold text-white">Σημαντικές Ανακοινώσεις</h3>
      </div>
      
      {/* Announcements List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {importantAnnouncements.slice(0, 2).map((announcement: any) => {
          // Parse date if available
          const assemblyDate = announcement.start_date 
            ? parseISO(announcement.start_date) 
            : new Date(announcement.created_at);
          
          // Extract time, location and topic from description if formatted correctly
          // Expected format in description: "Ώρα: [time]\nΤοποθεσία: [location]\nΘέμα: [topic]"
          const time = extractTime(announcement.description);
          const location = extractLocation(announcement.description);
          const topic = extractTopic(announcement.description);
          
          // Check if it's an assembly announcement
          const isAssembly = announcement.title?.toLowerCase().includes('συνέλευση') || 
                            announcement.title?.toLowerCase().includes('σύγκληση');
          
          return (
            <div 
              key={announcement.id}
              className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-sm p-3 rounded-lg border border-purple-500/30"
            >
              {isAssembly ? (
                // Assembly format: Γενική συνέλευση <ημέρα> <ημερομηνία> <ώρα> <τοποθεσία> <θέμα>
                <div className="space-y-2">
                  <div className="font-bold text-white text-sm">
                    Γενική Συνέλευση
                  </div>
                  
                  <div className="space-y-1.5 text-xs">
                    {/* Ημέρα και Ημερομηνία */}
                    <div className="flex items-center text-purple-200">
                      <Calendar className="w-3.5 h-3.5 mr-2 text-purple-300" />
                      <span className="font-medium">
                        {format(assemblyDate, 'EEEE', { locale: el })}{' '}
                        {format(assemblyDate, 'dd/MM/yyyy', { locale: el })}
                      </span>
                    </div>
                    
                    {/* Ώρα */}
                    {time && (
                      <div className="flex items-center text-purple-200">
                        <Clock className="w-3.5 h-3.5 mr-2 text-purple-300" />
                        <span>{time}</span>
                      </div>
                    )}
                    
                    {/* Τοποθεσία */}
                    {location && (
                      <div className="flex items-center text-purple-200">
                        <MapPin className="w-3.5 h-3.5 mr-2 text-purple-300" />
                        <span className="line-clamp-1">{location}</span>
                      </div>
                    )}
                    
                    {/* Θέμα */}
                    {topic && (
                      <div className="flex items-start text-purple-200">
                        <FileText className="w-3.5 h-3.5 mr-2 mt-0.5 text-purple-300 flex-shrink-0" />
                        <span className="line-clamp-2">{topic}</span>
                      </div>
                    )}
                    
                    {/* Fallback: Show description if no structured data */}
                    {!location && !topic && announcement.description && (
                      <div className="text-purple-200/80 text-xs line-clamp-3 mt-2 pl-5">
                        {announcement.description}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Regular announcement format
                <div>
                  <div className="font-semibold text-white text-sm mb-2 line-clamp-2">
                    {announcement.title}
                  </div>
                  <div className="text-xs text-purple-200/80 line-clamp-3">
                    {announcement.description}
                  </div>
                  <div className="text-xs text-purple-300 mt-2 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(assemblyDate, 'dd/MM/yyyy', { locale: el })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper functions to extract structured data from description
function extractTime(description: string): string | null {
  if (!description) return null;
  
  // Try to find time in various formats
  const patterns = [
    /[ώω]ρα[:\s]+(\d{1,2}:\d{2})/i,
    /[ώω]ρα[:\s]+(\d{1,2}\.\d{2})/i,
    /στις\s+(\d{1,2}:\d{2})/i,
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1].trim().replace('.', ':');
    }
  }
  
  return null;
}

function extractLocation(description: string): string | null {
  if (!description) return null;
  
  // Try to find location in various formats
  const patterns = [
    /τοποθεσ[ίι]α[:\s]+([^\n]+)/i,
    /χ[ώω]ρος[:\s]+([^\n]+)/i,
    /αίθουσα[:\s]+([^\n]+)/i,
    /διεύθυνση[:\s]+([^\n]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

function extractTopic(description: string): string | null {
  if (!description) return null;
  
  // Try to find topic/agenda in various formats
  const patterns = [
    /θ[έε]μα[:\s]+([^\n]+)/i,
    /θ[έε]ματα[:\s]+([^\n]+)/i,
    /ημερησ[ίι]α\s+δι[άα]ταξη[:\s]+([^\n]+)/i,
    /για[:\s]+([^\n]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Fallback: use first line of description as topic
  const firstLine = description.split('\n')[0].trim();
  if (firstLine && firstLine.length < 100) {
    return firstLine;
  }
  
  return null;
}

