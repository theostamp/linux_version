'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, Clock, Volume2, VolumeX, Users, Globe } from 'lucide-react';
import { useState } from 'react';

interface AirbnbApartment {
  id: number;
  apartmentNumber: string;
  isAirbnb: boolean;
  currentGuests?: number;
  maxGuests?: number;
  checkInDate?: string;
  checkOutDate?: string;
}

interface AirbnbInfoWidgetProps {
  data?: {
    apartments: AirbnbApartment[];
    quietHours: {
      start: string;
      end: string;
    };
    houseRules: {
      el: string[];
      en: string[];
    };
    welcomeMessage: {
      el: string;
      en: string;
    };
    contactInfo: {
      phone: string;
      email: string;
      emergency: string;
    };
  };
}

export default function AirbnbInfoWidget({ data }: AirbnbInfoWidgetProps) {
  const [language, setLanguage] = useState<'el' | 'en'>('el');

  // Mock data for demonstration
  const mockData = {
    apartments: [
      { id: 1, apartmentNumber: 'Α1', isAirbnb: true, currentGuests: 2, maxGuests: 4, checkInDate: '2025-09-27', checkOutDate: '2025-09-30' },
      { id: 2, apartmentNumber: 'Α2', isAirbnb: false },
      { id: 3, apartmentNumber: 'Α3', isAirbnb: true, currentGuests: 1, maxGuests: 2, checkInDate: '2025-09-26', checkOutDate: '2025-09-29' },
      { id: 4, apartmentNumber: 'Β1', isAirbnb: false },
      { id: 5, apartmentNumber: 'Β2', isAirbnb: true, currentGuests: 3, maxGuests: 6, checkInDate: '2025-09-28', checkOutDate: '2025-10-02' }
    ],
    quietHours: {
      start: '22:00',
      end: '08:00'
    },
    houseRules: {
      el: [
        'Ώρες κοινής ησυχίας: 22:00 - 08:00',
        'Απαγορεύεται το κάπνισμα σε όλους τους κοινόχρηστους χώρους',
        'Τα σκυλιά πρέπει να είναι πάντα με λουρί',
        'Απαγορεύεται η χρήση της πισίνας μετά τις 22:00',
        'Οι επισκέπτες πρέπει να σέβονται τους κατοίκους'
      ],
      en: [
        'Quiet hours: 22:00 - 08:00',
        'Smoking is prohibited in all common areas',
        'Dogs must always be on a leash',
        'Pool use is prohibited after 22:00',
        'Visitors must respect the residents'
      ]
    },
    welcomeMessage: {
      el: 'Καλώς ήρθατε στο κτίριο Αλκμάνος 22! Παρακαλώ σέβεστε τους κατοίκους και ακολουθήστε τους κανόνες του κτιρίου.',
      en: 'Welcome to building Alkmanos 22! Please respect the residents and follow the building rules.'
    },
    contactInfo: {
      phone: '210-1234567',
      email: 'info@alkmanos22.gr',
      emergency: '210-7654321'
    }
  };

  const displayData = data || mockData;
  const airbnbApartments = displayData.apartments.filter(apt => apt.isAirbnb);

  const translations = {
    el: {
      title: 'Πληροφορίες Airbnb Διαμερισμάτων',
      currentGuests: 'Τρέχοντες επισκέπτες',
      maxGuests: 'Μέγιστοι επισκέπτες',
      checkIn: 'Άφιξη',
      checkOut: 'Αναχώρηση',
      quietHours: 'Ώρες Κοινής Ησυχίας',
      houseRules: 'Κανόνες Κτιρίου',
      welcomeMessage: 'Μήνυμα Καλωσορίσματος',
      contactInfo: 'Στοιχεία Επικοινωνίας',
      language: 'Γλώσσα',
      emergency: 'Έκτακτης Ανάγκης'
    },
    en: {
      title: 'Airbnb Apartments Information',
      currentGuests: 'Current Guests',
      maxGuests: 'Max Guests',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      quietHours: 'Quiet Hours',
      houseRules: 'House Rules',
      welcomeMessage: 'Welcome Message',
      contactInfo: 'Contact Information',
      language: 'Language',
      emergency: 'Emergency'
    }
  };

  const t = translations[language];

  return (
    <div className="mt-8">
      <div className="bg-purple-600/20 p-6 rounded-lg border border-purple-400/30 max-w-5xl mx-auto">
        <div className="flex items-center justify-center mb-6">
          <Home className="w-8 h-8 mr-3" />
          <h3 className="text-2xl font-bold">{t.title}</h3>
        </div>

        {/* Language Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/10 rounded-lg p-1 flex">
            <button
              onClick={() => setLanguage('el')}
              className={`px-4 py-2 rounded-md transition-colors ${
                language === 'el' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              🇬🇷 Ελληνικά
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-4 py-2 rounded-md transition-colors ${
                language === 'en' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              🇺🇸 English
            </button>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-white/10 p-4 rounded-lg mb-6">
          <h4 className="text-lg font-semibold mb-3 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            {t.welcomeMessage}
          </h4>
          <p className="text-purple-200 leading-relaxed">
            {displayData.welcomeMessage[language]}
          </p>
        </div>

        {/* Airbnb Apartments Status */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-4 text-center">Κατάσταση Airbnb Διαμερισμάτων</h4>
          <div className="grid grid-cols-2 gap-4">
            {airbnbApartments.map((apartment) => (
              <div key={apartment.id} className="bg-white/10 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-semibold text-lg">{apartment.apartmentNumber}</h5>
                  <Badge className="bg-green-600/20 border-green-400/30 text-green-200">
                    Active
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-purple-200">{t.currentGuests}:</span>
                    <span className="font-semibold">{apartment.currentGuests}/{apartment.maxGuests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-200">{t.checkIn}:</span>
                    <span>{apartment.checkInDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-200">{t.checkOut}:</span>
                    <span>{apartment.checkOutDate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-3 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            {t.quietHours}
          </h4>
          <div className="bg-white/10 p-4 rounded-lg">
            <div className="flex items-center justify-center space-x-4">
              <Volume2 className="w-6 h-6 text-green-400" />
              <span className="text-lg font-semibold">
                {displayData.quietHours.end} - {displayData.quietHours.start}
              </span>
              <VolumeX className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-center text-purple-200 mt-2">
              {language === 'el' 
                ? 'Παρακαλώ τηρήστε την ησυχία κατά τις ώρες κοινής ησυχίας'
                : 'Please maintain quiet during quiet hours'
              }
            </p>
          </div>
        </div>

        {/* House Rules */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-3 flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            {t.houseRules}
          </h4>
          <div className="bg-white/10 p-4 rounded-lg">
            <ul className="space-y-2">
              {displayData.houseRules[language].map((rule, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                  <span className="text-purple-200">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white/10 p-4 rounded-lg">
          <h4 className="text-lg font-semibold mb-3 text-center">{t.contactInfo}</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-purple-200">Τηλέφωνο</p>
              <p className="font-semibold">{displayData.contactInfo.phone}</p>
            </div>
            <div>
              <p className="text-sm text-purple-200">Email</p>
              <p className="font-semibold text-sm">{displayData.contactInfo.email}</p>
            </div>
            <div>
              <p className="text-sm text-purple-200">{t.emergency}</p>
              <p className="font-semibold text-red-300">{displayData.contactInfo.emergency}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
