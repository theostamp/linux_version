'use client';

import { Calendar, MapPin, Clock, FileText, AlertCircle } from 'lucide-react';
import { format, parseISO, differenceInDays, differenceInHours, isPast } from 'date-fns';
import { el } from 'date-fns/locale';
import { useState, useEffect } from 'react';

interface AssemblyAnnouncementWidgetProps {
  data?: any;
  isLoading?: boolean;
  error?: string | null;
}

export default function AssemblyAnnouncementWidget({ data, isLoading, error }: AssemblyAnnouncementWidgetProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);
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

  // Debug logging
  console.log('[AssemblyWidget] Data received:', {
    hasData: !!data,
    announcementsCount: data?.announcements?.length || 0,
    announcements: data?.announcements
  });

  // Filter for assembly/vote announcements
  // Filter announcements for General Assembly or Votes (future events only)
  const importantAnnouncements = (data?.announcements || [])
    .filter((ann: any) => {
      const isAssemblyOrVote = ann.title?.toLowerCase().includes('συνέλευση') || 
                               ann.title?.toLowerCase().includes('σύγκληση') ||
                               ann.title?.toLowerCase().includes('ψηφοφορ');
      
      if (!isAssemblyOrVote) return false;
      
      // Only show future events
      if (ann.start_date) {
        const eventDate = parseISO(ann.start_date);
        return !isPast(eventDate);
      }
      
      return true; // If no date, show it
    })
    .sort((a: any, b: any) => {
      // Sort by start_date ascending (nearest first)
      const dateA = a.start_date ? parseISO(a.start_date) : new Date();
      const dateB = b.start_date ? parseISO(b.start_date) : new Date();
      return dateA.getTime() - dateB.getTime();
    });

  console.log('[AssemblyWidget] Filtered announcements:', {
    count: importantAnnouncements.length,
    titles: importantAnnouncements.map((a: any) => ({ title: a.title, start: a.start_date }))
  });

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
          let assemblyDate = announcement.start_date 
            ? parseISO(announcement.start_date) 
            : new Date(announcement.created_at);
          
          // Extract time, location and topic from description if formatted correctly
          // Expected format in description: "Ώρα: [time]\nΤοποθεσία: [location]\nΘέμα: [topic]"
          const time = extractTime(announcement.description);
          const location = extractLocation(announcement.description);
          const topic = extractTopic(announcement.description);
          
          // If time is found, combine it with the date for accurate countdown
          if (time) {
            const [hours, minutes] = time.split(':').map(Number);
            assemblyDate = new Date(assemblyDate);
            assemblyDate.setHours(hours, minutes, 0, 0);
          }
          
          // Calculate countdown
          const daysRemaining = differenceInDays(assemblyDate, currentTime);
          const hoursRemaining = differenceInHours(assemblyDate, currentTime) % 24;
          const isPastEvent = isPast(assemblyDate);
          const isToday = daysRemaining === 0 && hoursRemaining >= 0 && !isPastEvent;
          
          // Check if it's an assembly announcement
          const isAssembly = announcement.title?.toLowerCase().includes('συνέλευση') || 
                            announcement.title?.toLowerCase().includes('σύγκληση');
          
          return (
            <div 
              key={announcement.id}
              className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-sm p-3 rounded-lg border border-purple-500/30"
            >
              {isAssembly ? (
                // Assembly format with countdown: "Σε X ημέρες και Y ώρες έχουμε γενική συνέλευση..."
                <div className="space-y-2">
                  {!isPastEvent && daysRemaining >= 0 ? (
                    <>
                      {/* Countdown Header - Special styling for TODAY */}
                      {isToday ? (
                        /* ΣΗΜΕΡΑ - Έντονο πορτοκαλί πλαίσιο */
                        <div className="bg-gradient-to-r from-orange-600/50 to-red-600/50 rounded-lg p-3 border-2 border-orange-400 shadow-lg shadow-orange-500/30 animate-pulse">
                          <div className="flex items-center justify-center space-x-2">
                            <AlertCircle className="w-5 h-5 text-orange-200 animate-bounce" />
                            <div className="text-center">
                              <div className="text-white font-extrabold text-base uppercase tracking-wide">
                                ΣΗΜΕΡΑ
                              </div>
                              <div className="text-orange-100 text-sm font-bold mt-1">
                                έχουμε Γενική Συνέλευση
                              </div>
                              {time && (
                                <div className="text-orange-200 text-xs mt-1 flex items-center justify-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  στις {time}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Κανονικό countdown για άλλες ημέρες */
                        <div className="bg-gradient-to-r from-purple-600/30 to-indigo-600/30 rounded-lg p-2 border border-purple-400/40">
                          <div className="flex items-center justify-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-purple-300 animate-pulse" />
                            <div className="text-center">
                              <div className="text-white font-bold text-sm">
                                Σε {daysRemaining > 0 && `${daysRemaining} ${daysRemaining === 1 ? 'ημέρα' : 'ημέρες'}`}
                                {daysRemaining > 0 && hoursRemaining > 0 && ' και '}
                                {(daysRemaining === 0 || hoursRemaining > 0) && `${hoursRemaining} ${hoursRemaining === 1 ? 'ώρα' : 'ώρες'}`}
                              </div>
                              <div className="text-purple-200 text-xs mt-0.5">
                                έχουμε Γενική Συνέλευση
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Θέμα */}
                      {topic && (
                        <div className="text-xs">
                          <span className="text-purple-300 font-medium">Θέμα: </span>
                          <span className="text-white line-clamp-2">{topic}</span>
                        </div>
                      )}
                      
                      {/* Τοποθεσία */}
                      {location && (
                        <div className="flex items-center text-xs">
                          <MapPin className="w-3.5 h-3.5 mr-1.5 text-purple-300 flex-shrink-0" />
                          <span className="text-purple-200 line-clamp-1">{location}</span>
                        </div>
                      )}
                      
                      {/* Date and Time Details */}
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-purple-500/20">
                        <div className="flex items-center text-purple-300">
                          <Calendar className="w-3 h-3 mr-1" />
                          <span>{format(assemblyDate, 'dd/MM/yyyy', { locale: el })}</span>
                        </div>
                        {time && (
                          <div className="flex items-center text-purple-300">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>{time}</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    // Past event or detailed view
                    <div className="space-y-1.5">
                      <div className="font-bold text-white text-sm">
                        {isPastEvent ? 'Πραγματοποιήθηκε' : 'Γενική Συνέλευση'}
                      </div>
                      
                      {/* Ημέρα και Ημερομηνία */}
                      <div className="flex items-center text-purple-200 text-xs">
                        <Calendar className="w-3.5 h-3.5 mr-2 text-purple-300" />
                        <span className="font-medium">
                          {format(assemblyDate, 'EEEE', { locale: el })}{' '}
                          {format(assemblyDate, 'dd/MM/yyyy', { locale: el })}
                        </span>
                      </div>
                      
                      {/* Ώρα */}
                      {time && (
                        <div className="flex items-center text-purple-200 text-xs">
                          <Clock className="w-3.5 h-3.5 mr-2 text-purple-300" />
                          <span>{time}</span>
                        </div>
                      )}
                      
                      {/* Τοποθεσία */}
                      {location && (
                        <div className="flex items-center text-purple-200 text-xs">
                          <MapPin className="w-3.5 h-3.5 mr-2 text-purple-300" />
                          <span className="line-clamp-1">{location}</span>
                        </div>
                      )}
                      
                      {/* Θέμα */}
                      {topic && (
                        <div className="flex items-start text-purple-200 text-xs">
                          <FileText className="w-3.5 h-3.5 mr-2 mt-0.5 text-purple-300 flex-shrink-0" />
                          <span className="line-clamp-2">{topic}</span>
                        </div>
                      )}
                    </div>
                  )}
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

