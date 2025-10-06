'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Video, Settings, Link, Shield, Users, Clock } from 'lucide-react';

interface ZoomSettings {
  meetingUrl: string;
  meetingId: string;
  password: string;
  waitingRoom: boolean;
  participantVideo: boolean;
  hostVideo: boolean;
  muteOnEntry: boolean;
  autoRecord: boolean;
  notes: string;
}

interface ZoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: ZoomSettings) => void;
  initialSettings?: Partial<ZoomSettings>;
}

export default function ZoomSettingsModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialSettings = {} 
}: ZoomSettingsModalProps) {
  const [settings, setSettings] = useState<ZoomSettings>({
    meetingUrl: initialSettings.meetingUrl || '',
    meetingId: initialSettings.meetingId || '',
    password: initialSettings.password || '',
    waitingRoom: initialSettings.waitingRoom ?? true,
    participantVideo: initialSettings.participantVideo ?? false,
    hostVideo: initialSettings.hostVideo ?? true,
    muteOnEntry: initialSettings.muteOnEntry ?? true,
    autoRecord: initialSettings.autoRecord ?? false,
    notes: initialSettings.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!settings.meetingUrl.trim()) {
      newErrors.meetingUrl = 'Ο σύνδεσμος Zoom είναι υποχρεωτικός';
    } else if (!isValidZoomUrl(settings.meetingUrl)) {
      newErrors.meetingUrl = 'Παρακαλώ εισάγετε έγκυρο σύνδεσμο Zoom';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidZoomUrl = (url: string): boolean => {
    const zoomUrlPattern = /^https:\/\/[\w-]+\.zoom\.us\/j\/\d+/;
    return zoomUrlPattern.test(url);
  };

  const extractMeetingId = (url: string): string => {
    const match = url.match(/\/j\/(\d+)/);
    return match ? match[1] : '';
  };

  const handleUrlChange = (url: string) => {
    setSettings(prev => ({
      ...prev,
      meetingUrl: url,
      meetingId: extractMeetingId(url)
    }));
    
    if (errors.meetingUrl) {
      setErrors(prev => ({ ...prev, meetingUrl: '' }));
    }
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(settings);
      onClose();
    }
  };

  const handleCancel = () => {
    setSettings({
      meetingUrl: initialSettings.meetingUrl || '',
      meetingId: initialSettings.meetingId || '',
      password: initialSettings.password || '',
      waitingRoom: initialSettings.waitingRoom ?? true,
      participantVideo: initialSettings.participantVideo ?? false,
      hostVideo: initialSettings.hostVideo ?? true,
      muteOnEntry: initialSettings.muteOnEntry ?? true,
      autoRecord: initialSettings.autoRecord ?? false,
      notes: initialSettings.notes || '',
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-600" />
            Ρύθμιση Zoom Συνέλευσης
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Βασικές Πληροφορίες */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Link className="w-4 h-4" />
              Βασικές Πληροφορίες
            </h3>
            
            <div>
              <Label htmlFor="meetingUrl">Σύνδεσμος Zoom *</Label>
              <Input
                id="meetingUrl"
                type="url"
                placeholder="https://zoom.us/j/123456789"
                value={settings.meetingUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                className={errors.meetingUrl ? 'border-red-500' : ''}
              />
              {errors.meetingUrl && (
                <p className="text-sm text-red-500 mt-1">{errors.meetingUrl}</p>
              )}
              <div className="mt-1 space-y-1">
                <p className="text-xs text-gray-500">
                  Εισάγετε τον πλήρη σύνδεσμο της συνάντησης Zoom
                </p>
                <p className="text-xs text-blue-600">
                  <a 
                    href="https://zoom.us/meeting/schedule" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-800"
                  >
                    📅 Δημιουργήστε νέα συνάντηση Zoom
                  </a>
                </p>
                <p className="text-xs text-gray-600">
                  Ή αν έχετε ήδη συνάντηση: 
                  <a 
                    href="https://zoom.us/meeting" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800 ml-1"
                  >
                    Εισέλθετε στη συνάντησή σας
                  </a>
                </p>
              </div>
            </div>

            {settings.meetingId && (
              <div>
                <Label htmlFor="meetingId">Meeting ID</Label>
                <Input
                  id="meetingId"
                  value={settings.meetingId}
                  readOnly
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Αυτόματη εξαγωγή από τον σύνδεσμο
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="password">Κωδικός Πρόσβασης (προαιρετικά)</Label>
              <Input
                id="password"
                type="text"
                placeholder="Εισάγετε κωδικό πρόσβασης αν υπάρχει"
                value={settings.password}
                onChange={(e) => setSettings(prev => ({ ...prev, password: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Κωδικός πρόσβασης για την συνάντηση (αν απαιτείται)
              </p>
            </div>
          </div>

          {/* Ρυθμίσεις Ασφαλείας */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Ρυθμίσεις Ασφαλείας
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="waitingRoom"
                  checked={settings.waitingRoom}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, waitingRoom: checked as boolean }))
                  }
                />
                <Label htmlFor="waitingRoom" className="cursor-pointer">
                  Αίθουσα Αναμονής
                </Label>
                <p className="text-xs text-gray-500 ml-2">
                  Οι συμμετέχοντες θα περιμένουν έγκριση από τον οργανωτή
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="muteOnEntry"
                  checked={settings.muteOnEntry}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, muteOnEntry: checked as boolean }))
                  }
                />
                <Label htmlFor="muteOnEntry" className="cursor-pointer">
                  Σίγαση κατά την Είσοδο
                </Label>
                <p className="text-xs text-gray-500 ml-2">
                  Οι συμμετέχοντες θα είναι σίγαση κατά την είσοδο
                </p>
              </div>
            </div>
          </div>

          {/* Ρυθμίσεις Βίντεο */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Ρυθμίσεις Βίντεο
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hostVideo"
                  checked={settings.hostVideo}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, hostVideo: checked as boolean }))
                  }
                />
                <Label htmlFor="hostVideo" className="cursor-pointer">
                  Βίντεο Οργανωτή
                </Label>
                <p className="text-xs text-gray-500 ml-2">
                  Ο οργανωτής θα έχει ενεργοποιημένο το βίντεο
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="participantVideo"
                  checked={settings.participantVideo}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, participantVideo: checked as boolean }))
                  }
                />
                <Label htmlFor="participantVideo" className="cursor-pointer">
                  Βίντεο Συμμετεχόντων
                </Label>
                <p className="text-xs text-gray-500 ml-2">
                  Οι συμμετέχοντες μπορούν να ενεργοποιήσουν το βίντεο
                </p>
              </div>
            </div>
          </div>

          {/* Ρυθμίσεις Εγγραφής */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Εγγραφή Συνάντησης
            </h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoRecord"
                checked={settings.autoRecord}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, autoRecord: checked as boolean }))
                }
              />
              <Label htmlFor="autoRecord" className="cursor-pointer">
                Αυτόματη Εγγραφή
              </Label>
              <p className="text-xs text-gray-500 ml-2">
                Η συνάντηση θα εγγραφεί αυτόματα (χρειάζεται άδεια Zoom)
              </p>
            </div>
          </div>

          {/* Σημειώσεις */}
          <div className="space-y-2">
            <Label htmlFor="notes">Σημειώσεις</Label>
            <Textarea
              id="notes"
              placeholder="Προαιρετικές σημειώσεις για τη συνάντηση..."
              value={settings.notes}
              onChange={(e) => setSettings(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel}>
            Ακύρωση
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            <Settings className="w-4 h-4 mr-2" />
            Αποθήκευση Ρυθμίσεων
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
