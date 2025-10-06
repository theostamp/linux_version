'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, MapPin, Video, ExternalLink, Users, Euro } from 'lucide-react';

interface AnnouncementContentProps {
  title: string;
  description: string;
  startDate?: string;
  endDate?: string;
}

export default function AnnouncementContent({ title, description, startDate, endDate }: AnnouncementContentProps) {
  // Έλεγχος αν είναι ανακοίνωση γενικής συνέλευσης
  const isAssemblyAnnouncement = title.toLowerCase().includes('συνέλευση') || title.toLowerCase().includes('assembly');
  
  if (!isAssemblyAnnouncement) {
    // Κανονική ανακοίνωση
    return (
      <div className="prose max-w-none">
        <p className="whitespace-pre-wrap">{description}</p>
      </div>
    );
  }

  // Ειδική μορφοποίηση για ανακοίνωση συνέλευσης
  const parseAssemblyContent = (content: string) => {
    const lines = content.split('\n');
    const sections = {
      header: '',
      assemblyDetails: '',
      topics: [] as Array<{
        title: string;
        cost: string;
        description: string;
      }>,
      footer: ''
    };

    let currentSection = 'header';
    let currentTopic: any = null;
    let inTopicsSection = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.includes('--- ΣΤΟΙΧΕΙΑ ΣΥΝΕΛΕΥΣΗΣ ---')) {
        currentSection = 'assemblyDetails';
        continue;
      } else if (trimmedLine.includes('Παρακαλούμε να συμμετάσχετε')) {
        currentSection = 'footer';
        sections.footer += line + '\n';
        continue;
      } else if (trimmedLine.includes('ΘΕΜΑΤΑ ΗΜΕΡΗΣΙΑΣ ΔΙΑΤΑΞΗΣ') || trimmedLine.includes('### Θέμα:')) {
        inTopicsSection = true;
        continue;
      }

      switch (currentSection) {
        case 'header':
          if (!trimmedLine.includes('Ανακοίνωση για τη γενική') && 
              !trimmedLine.includes('Περιγραφή έργου') && 
              !trimmedLine.includes('Εκτιμώμενο κόστος') &&
              !trimmedLine.includes('---')) {
            sections.header += line + '\n';
          }
          break;
        case 'assemblyDetails':
          if (inTopicsSection) {
            // Parse topics
            if (trimmedLine.startsWith('### Θέμα:')) {
              if (currentTopic) {
                sections.topics.push(currentTopic);
              }
              currentTopic = {
                title: trimmedLine.replace('### Θέμα:', '').trim(),
                cost: '',
                description: ''
              };
            } else if (trimmedLine.startsWith('**Εκτιμώμενο Κόστος:**') && currentTopic) {
              currentTopic.cost = trimmedLine.replace('**Εκτιμώμενο Κόστος:**', '').trim();
            } else if (trimmedLine.startsWith('**Περιγραφή:**') && currentTopic) {
              currentTopic.description = trimmedLine.replace('**Περιγραφή:**', '').trim();
            }
          } else {
            sections.assemblyDetails += line + '\n';
          }
          break;
        case 'footer':
          sections.footer += line + '\n';
          break;
      }
    }

    // Add last topic
    if (currentTopic) {
      sections.topics.push(currentTopic);
    }

    return sections;
  };

  const sections = parseAssemblyContent(description);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      {sections.header && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap text-blue-900 font-medium">{sections.header}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assembly Details */}
      {sections.assemblyDetails && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Calendar className="w-5 h-5" />
              Στοιχεία Συνέλευσης
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sections.assemblyDetails.split('\n').map((line, index) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return null;
                
                if (trimmedLine.includes('Η συνέλευση θα διεξαχθεί')) {
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                      <p className="text-green-900 font-medium">{trimmedLine}</p>
                    </div>
                  );
                } else if (trimmedLine.includes('Ώρα:')) {
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-green-700" />
                      <p className="text-green-900">{trimmedLine}</p>
                    </div>
                  );
                } else if (trimmedLine.includes('Zoom:') || trimmedLine.includes('σύνδεσμος')) {
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <Video className="w-4 h-4 text-green-700 mt-0.5" />
                      <div className="text-green-900">
                        <p className="font-medium mb-1">Σύνδεσμος Zoom:</p>
                        <a 
                          href={trimmedLine.includes('https://') ? trimmedLine.split('Zoom:')[1]?.trim() || trimmedLine : ''} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 underline hover:text-blue-800 break-all"
                        >
                          {trimmedLine.split('Zoom:')[1]?.trim() || trimmedLine}
                        </a>
                      </div>
                    </div>
                  );
                } else if (trimmedLine.includes('Τοποθεσία:')) {
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-green-700" />
                      <p className="text-green-900">{trimmedLine}</p>
                    </div>
                  );
                } else {
                  return (
                    <p key={index} className="text-green-900">{trimmedLine}</p>
                  );
                }
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Topics */}
      {sections.topics.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Users className="w-5 h-5" />
              Θέματα Ημερήσιας Διάταξης
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {sections.topics.map((topic, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-purple-200">
                  <h4 className="text-lg font-semibold text-purple-900 mb-3">{topic.title}</h4>
                  
                  {topic.cost && (
                    <div className="flex items-center gap-2 mb-3">
                      <Euro className="w-4 h-4 text-purple-700" />
                      <span className="font-medium text-purple-900">Εκτιμώμενο Κόστος: {topic.cost}</span>
                    </div>
                  )}
                  
                  {topic.description && (
                    <p className="text-purple-800">{topic.description}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      {sections.footer && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap text-amber-900 font-medium">{sections.footer}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Information */}
      {(startDate || endDate) && (
        <Card className="border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {startDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Ημ/νία έναρξης: {new Date(startDate).toLocaleDateString('el-GR')}</span>
                </div>
              )}
              {endDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Ημ/νία λήξης: {new Date(endDate).toLocaleDateString('el-GR')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
