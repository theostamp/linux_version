"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Video, Settings, Link as LinkIcon, Shield, Users, Clock, Info, HelpCircle } from "lucide-react";

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
  initialSettings = {},
}: ZoomSettingsModalProps) {
  const [settings, setSettings] = useState<ZoomSettings>({
    meetingUrl: initialSettings.meetingUrl || "",
    meetingId: initialSettings.meetingId || "",
    password: initialSettings.password || "",
    waitingRoom: initialSettings.waitingRoom ?? true,
    participantVideo: initialSettings.participantVideo ?? false,
    hostVideo: initialSettings.hostVideo ?? true,
    muteOnEntry: initialSettings.muteOnEntry ?? true,
    autoRecord: initialSettings.autoRecord ?? false,
    notes: initialSettings.notes || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const isValidZoomUrl = (url: string): boolean => {
    const zoomUrlPattern = /^https:\/\/[\w-]+\.zoom\.us\/j\/\d+/;
    return zoomUrlPattern.test(url);
  };

  const extractMeetingId = (url: string): string => {
    const match = url.match(/\/j\/(\d+)/);
    return match ? match[1] : "";
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!settings.meetingUrl.trim()) {
      newErrors.meetingUrl = "Ο σύνδεσμος Zoom είναι υποχρεωτικός";
    } else if (!isValidZoomUrl(settings.meetingUrl)) {
      newErrors.meetingUrl = "Παρακαλώ εισάγετε έγκυρο σύνδεσμο Zoom";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUrlChange = (url: string) => {
    setSettings((prev) => ({
      ...prev,
      meetingUrl: url,
      meetingId: extractMeetingId(url),
    }));

    if (errors.meetingUrl) {
      setErrors((prev) => ({ ...prev, meetingUrl: "" }));
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
      meetingUrl: initialSettings.meetingUrl || "",
      meetingId: initialSettings.meetingId || "",
      password: initialSettings.password || "",
      waitingRoom: initialSettings.waitingRoom ?? true,
      participantVideo: initialSettings.participantVideo ?? false,
      hostVideo: initialSettings.hostVideo ?? true,
      muteOnEntry: initialSettings.muteOnEntry ?? true,
      autoRecord: initialSettings.autoRecord ?? false,
      notes: initialSettings.notes || "",
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-blue-600" />
              Ρύθμιση Zoom Συνέλευσης
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <HelpCircle className="w-4 h-4" />
              Οδηγίες Setup
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Βασικές Πληροφορίες
            </h3>

            <div>
              <Label htmlFor="meetingUrl">Σύνδεσμος Zoom *</Label>
              <Input
                id="meetingUrl"
                placeholder="https://us06web.zoom.us/j/123456789"
                value={settings.meetingUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                className={errors.meetingUrl ? "border-red-500" : ""}
              />
              {errors.meetingUrl && (
                <p className="text-sm text-red-500 mt-1">{errors.meetingUrl}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="meetingId">Meeting ID</Label>
                <Input
                  id="meetingId"
                  value={settings.meetingId}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, meetingId: e.target.value }))
                  }
                  placeholder="123 4567 8901"
                />
              </div>

              <div>
                <Label htmlFor="password">Κωδικός</Label>
                <Input
                  id="password"
                  value={settings.password}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="π.χ. 123456"
                />
              </div>
            </div>
          </div>

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
                    setSettings((prev) => ({ ...prev, waitingRoom: checked as boolean }))
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
                    setSettings((prev) => ({ ...prev, muteOnEntry: checked as boolean }))
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
                    setSettings((prev) => ({ ...prev, hostVideo: checked as boolean }))
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
                    setSettings((prev) => ({ ...prev, participantVideo: checked as boolean }))
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
                  setSettings((prev) => ({ ...prev, autoRecord: checked as boolean }))
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

          <div className="space-y-2">
            <Label htmlFor="notes">Σημειώσεις</Label>
            <Textarea
              id="notes"
              placeholder="Προαιρετικές σημειώσεις για τη συνάντηση..."
              value={settings.notes}
              onChange={(e) => setSettings((prev) => ({ ...prev, notes: e.target.value }))}
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

      {/* Help Dialog */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Οδηγίες Ρύθμισης Zoom Συνέλευσης
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Εισαγωγή */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Ακολουθήστε τα παρακάτω βήματα για να ρυθμίσετε σωστά μια Zoom συνέλευση για τη γενική συνέλευση της πολυκατοικίας σας.
              </p>
            </div>

            {/* Βήμα 1 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">1</span>
                Δημιουργία Zoom Meeting
              </h3>
              <div className="pl-10 space-y-2 text-sm text-gray-700">
                <p><strong>α)</strong> Συνδεθείτε στον λογαριασμό σας στο <a href="https://zoom.us" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">zoom.us</a></p>
                <p><strong>β)</strong> Κάντε κλικ στο <strong>"Schedule a Meeting"</strong> ή <strong>"Προγραμματισμός Συνάντησης"</strong></p>
                <p><strong>γ)</strong> Συμπληρώστε:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Topic:</strong> Τίτλος συνέλευσης (π.χ. "Γενική Συνέλευση - Δεκέμβριος 2024")</li>
                  <li><strong>Date & Time:</strong> Ημερομηνία και ώρα συνέλευσης</li>
                  <li><strong>Duration:</strong> Εκτιμώμενη διάρκεια</li>
                </ul>
              </div>
            </div>

            {/* Βήμα 2 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">2</span>
                Αντιγραφή Συνδέσμου και Meeting ID
              </h3>
              <div className="pl-10 space-y-2 text-sm text-gray-700">
                <p><strong>α)</strong> Μετά τη δημιουργία, θα δείτε:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Join URL:</strong> Σύνδεσμος τύπου <code className="bg-gray-100 px-1 rounded">https://us06web.zoom.us/j/123456789</code></li>
                  <li><strong>Meeting ID:</strong> Αριθμός τύπου <code className="bg-gray-100 px-1 rounded">123 4567 8901</code></li>
                  <li><strong>Password:</strong> Κωδικός πρόσβασης (αν έχει οριστεί)</li>
                </ul>
                <p><strong>β)</strong> Αντιγράψτε αυτά τα στοιχεία και επικολλήστε τα στα αντίστοιχα πεδία της φόρμας.</p>
              </div>
            </div>

            {/* Βήμα 3 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">3</span>
                Ρυθμίσεις Ασφαλείας (Συνιστώμενες)
              </h3>
              <div className="pl-10 space-y-2 text-sm text-gray-700">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="font-semibold text-green-900 mb-2">Συνιστώμενες ρυθμίσεις:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-green-800">
                    <li><strong>Αίθουσα Αναμονής:</strong> Ενεργή ✓ - Εξασφαλίζει ότι μόνο εσείς μπορείτε να εγκρίνετε συμμετέχοντες</li>
                    <li><strong>Σίγαση κατά την Είσοδο:</strong> Ενεργή ✓ - Αποφεύγει θορύβους κατά την είσοδο</li>
                    <li><strong>Κωδικός:</strong> Προαιρετικό, αλλά συνιστάται για επιπλέον ασφάλεια</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Βήμα 4 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">4</span>
                Ρυθμίσεις Βίντεο
              </h3>
              <div className="pl-10 space-y-2 text-sm text-gray-700">
                <p><strong>Βίντεο Οργανωτή:</strong> Συνιστάται ενεργό για καλύτερη επικοινωνία</p>
                <p><strong>Βίντεο Συμμετεχόντων:</strong> Μπορείτε να το αφήσετε ανενεργό και να το ενεργοποιήσετε κατά τη διάρκεια της συνέλευσης</p>
              </div>
            </div>

            {/* Βήμα 5 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">5</span>
                Εγγραφή Συνάντησης
              </h3>
              <div className="pl-10 space-y-2 text-sm text-gray-700">
                <p><strong>Αυτόματη Εγγραφή:</strong> Χρήσιμο για τη διατήρηση πρακτικών, αλλά:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Απαιτεί Zoom Pro ή Business account</li>
                  <li>Χρειάζεται άδεια από το Zoom</li>
                  <li>Η εγγραφή αποθηκεύεται στο cloud ή τοπικά (ανάλογα με τις ρυθμίσεις)</li>
                </ul>
              </div>
            </div>

            {/* Συμβουλές */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Συμβουλές
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-amber-800">
                <li>Δοκιμάστε τον σύνδεσμο πριν την συνέλευση για να βεβαιωθείτε ότι λειτουργεί</li>
                <li>Στείλτε τον σύνδεσμο στους συμμετέχοντες τουλάχιστον 2-3 ημέρες πριν</li>
                <li>Συνδυάστε με φυσική παρουσία (hybrid) για καλύτερη συμμετοχή</li>
                <li>Καταγράψτε το Meeting ID και Password για εφεδρική πρόσβαση</li>
              </ul>
            </div>

            {/* Χρήσιμοι Σύνδεσμοι */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Χρήσιμοι Σύνδεσμοι</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://support.zoom.us/hc/en-us/articles/201362413-Scheduling-meetings" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    Zoom Support: Scheduling Meetings
                  </a>
                </li>
                <li>
                  <a href="https://support.zoom.us/hc/en-us/articles/201362183-How-Do-I-Share-A-Meeting-Link" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    How to Share Meeting Link
                  </a>
                </li>
                <li>
                  <a href="https://zoom.us/meeting" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    Zoom Meeting Scheduler
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsHelpOpen(false)}>
              Κατάλαβα
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
