'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Link, 
  CheckCircle2, 
  RefreshCw, 
  ArrowRight, 
  Users, 
  Smartphone, 
  Bell,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useConnectGoogleCalendar, useOAuthCallback } from '@/hooks/useGoogleCalendar';

interface CalendarSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  building?: {
    id: number;
    name: string;
    google_calendar_enabled?: boolean;
  };
}

export default function CalendarSetupModal({
  isOpen,
  onClose,
  building
}: CalendarSetupModalProps) {
  const [step, setStep] = useState(1); // 1: Welcome, 2: Connecting, 3: Success
  
  // API hooks
  const connectMutation = useConnectGoogleCalendar();
  const oauthCallback = useOAuthCallback();

  // Handle OAuth callback detection
  useEffect(() => {
    if (isOpen) {
      const callbackResult = oauthCallback.checkAndHandle();
      if (callbackResult === true) {
        // Successfully connected - show success step
        setStep(3);
      } else if (callbackResult === false) {
        // Error occurred - stay on welcome step
        setStep(1);
      }
    }
  }, [isOpen, oauthCallback]);

  const handleStartSetup = async () => {
    if (!building) return;
    
    setStep(2);
    
    try {
      const redirectUri = `${window.location.origin}${window.location.pathname}${window.location.search}`;
      
      await connectMutation.mutateAsync({
        buildingId: building.id,
        redirectUri
      });
      
    } catch (error) {
      console.error('Failed to start setup:', error);
      setStep(1);
    }
  };

  const handleSkipSetup = () => {
    onClose();
  };

  const features = [
    {
      icon: <Smartphone className="w-6 h-6 text-blue-600" />,
      title: "Mobile Sync",
      description: "Όλα τα events συγχρονίζονται με το κινητό σας"
    },
    {
      icon: <Bell className="w-6 h-6 text-green-600" />,
      title: "Smart Notifications", 
      description: "Λαμβάνετε ειδοποιήσεις για σημαντικά events"
    },
    {
      icon: <Users className="w-6 h-6 text-purple-600" />,
      title: "Κοινή Πρόσβαση",
      description: "Μοιραστείτε το calendar με κατοίκους και συνεργάτες"
    },
    {
      icon: <RefreshCw className="w-6 h-6 text-orange-600" />,
      title: "Αυτόματη Συγχρονισμός",
      description: "Νέα events εμφανίζονται αυτόματα στο Google Calendar"
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        {step === 1 && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl">
                      Σύνδεση Google Calendar
                    </DialogTitle>
                    <DialogDescription className="text-base">
                      Συγχρονίστε το {building?.name} με Google Calendar
                    </DialogDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Welcome Message */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-900">
                    🎉 Καλώς ήρθατε στο Google Calendar Integration!
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    Κάντε τη διαχείριση του κτιρίου σας ακόμα πιο εύκολη με αυτόματο 
                    συγχρονισμό όλων των events στο Google Calendar.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0 p-2 bg-gray-100 rounded-lg">
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{feature.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* What will happen */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Τι θα γίνει όταν συνδεθείτε;
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Θα δημιουργηθεί ένα νέο calendar στον Google λογαριασμό σας</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Όλα τα υπάρχοντα events θα συγχρονιστούν αυτόματα</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Νέα events θα εμφανίζονται αυτόματα στο Google Calendar</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Μπορείτε να μοιραστείτε το calendar με κατοίκους</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={handleSkipSetup}
                className="flex-1"
              >
                Ίσως Αργότερα
              </Button>
              <Button 
                onClick={handleStartSetup}
                disabled={connectMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {connectMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Σύνδεση...
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4 mr-2" />
                    Σύνδεση Τώρα
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl">Σύνδεση σε εξέλιξη...</DialogTitle>
              <DialogDescription className="text-center">
                Θα σας ανακατευθύνουμε στο Google για εξουσιοδότηση
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              
              <h3 className="text-lg font-medium mb-2">Προετοιμασία σύνδεσης...</h3>
              <p className="text-gray-600 text-center max-w-md">
                Σε λίγο θα ανοίξει παράθυρο του Google όπου θα χρειαστεί να 
                εγκρίνετε την πρόσβαση στο Google Calendar.
              </p>

              <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-md">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Ασφαλής Σύνδεση</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Η σύνδεση γίνεται άμεσα με το Google χωρίς να αποθηκεύουμε 
                      τα στοιχεία σας στους δικούς μας servers.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setStep(1);
                }}
                disabled={connectMutation.isPending}
              >
                Ακύρωση
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl text-green-600">
                Επιτυχής Σύνδεση! 🎉
              </DialogTitle>
              <DialogDescription className="text-center">
                Το Google Calendar συνδέθηκε επιτυχώς με το {building?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              
              <h3 className="text-lg font-medium mb-4">Όλα έτοιμα!</h3>
              
              <div className="space-y-3 max-w-md">
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Calendar δημιουργήθηκε στον Google λογαριασμό σας</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Υπάρχοντα events συγχρονίστηκαν</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Αυτόματος συγχρονισμός ενεργοποιήθηκε</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
              >
                Κλείσιμο
              </Button>
              <Button 
                onClick={() => {
                  // Open calendar preview or settings
                  onClose();
                }}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Προβολή Calendar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}