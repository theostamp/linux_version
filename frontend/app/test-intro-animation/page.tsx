"use client";

import React, { useState } from 'react';
import EnhancedIntroAnimation from '@/components/EnhancedIntroAnimation';
import { GreekButton, GreekCard, GreekSectionHeader, GreekFeatureGrid } from '@/components/GreekThemeElements';
import { PageWrapper, StaggerWrapper, FadeInWrapper } from '@/components/SmoothTransitions';
import { Building2, Users, Shield, Euro, Calendar, FileText } from 'lucide-react';

export default function TestIntroAnimation() {
  const [showIntro, setShowIntro] = useState(false);

  const features = [
    {
      icon: <Building2 className="w-6 h-6" />,
      title: "Διαχείριση Κτηρίων",
      description: "Πλήρης διαχείριση όλων των κτηρίων και διαμερισμάτων"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Διαχείριση Μισθωτών",
      description: "Αποτελεσματική διαχείριση μισθωτών και επικοινωνίας"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Ασφάλεια",
      description: "Προστασία δεδομένων και ασφαλής πρόσβαση"
    },
    {
      icon: <Euro className="w-6 h-6" />,
      title: "Οικονομικά",
      description: "Διαχείριση κοινόχρηστων και οικονομικών υποχρεώσεων"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Συντήρηση",
      description: "Προγραμματισμός και παρακολούθηση εργασιών συντήρησης"
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Αναφορές",
      description: "Λεπτομερείς αναφορές και στατιστικά στοιχεία"
    }
  ];

  const handleShowIntro = () => {
    setShowIntro(true);
  };

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  return (
    <PageWrapper className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {showIntro && (
        <EnhancedIntroAnimation onComplete={handleIntroComplete} />
      )}

      <div className="container mx-auto px-4 py-8">
        <StaggerWrapper>
          <GreekSectionHeader
            title="Ψηφιακός Θυρωρός"
            subtitle="Σύστημα Διαχείρισης Κτηρίων"
            icon={<Building2 className="w-8 h-8" />}
            className="mb-12"
          />

          <FadeInWrapper delay={0.2} className="text-center mb-12">
            <GreekButton
              onClick={handleShowIntro}
              variant="primary"
              size="lg"
              icon={<Building2 className="w-5 h-5" />}
            >
              Εμφάνιση Intro Animation
            </GreekButton>
          </FadeInWrapper>

          <GreekFeatureGrid features={features} className="mb-12" />

          <FadeInWrapper delay={0.4}>
            <GreekCard
              title="Πληροφορίες Συστήματος"
              icon={<Building2 className="w-6 h-6" />}
              variant="primary"
              className="max-w-2xl mx-auto"
            >
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                  Το σύστημα Ψηφιακός Θυρωρός προσφέρει μια ολοκληρωμένη λύση για τη διαχείριση 
                  κτηρίων και διαμερισμάτων. Με σύγχρονα εργαλεία και μια εύκολη στη χρήση διεπαφή, 
                  μπορείτε να διαχειριστείτε αποτελεσματικά όλες τις πτυχές του κτιρίου σας.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                      Βασικά Χαρακτηριστικά
                    </h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• Διαχείριση μισθωτών</li>
                      <li>• Οικονομικά και κοινόχρηστα</li>
                      <li>• Συντήρηση και επισκευές</li>
                      <li>• Αναφορές και στατιστικά</li>
                    </ul>
                  </div>
                  
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
                      Τεχνολογίες
                    </h4>
                    <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                      <li>• Next.js 15+ με TypeScript</li>
                      <li>• Django REST Framework</li>
                      <li>• PostgreSQL Database</li>
                      <li>• Framer Motion Animations</li>
                    </ul>
                  </div>
                </div>
              </div>
            </GreekCard>
          </FadeInWrapper>
        </StaggerWrapper>
      </div>
    </PageWrapper>
  );
}
