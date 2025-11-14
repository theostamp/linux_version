'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CloudSun, PhoneCall, QrCode, ShieldAlert, TrendingUp } from 'lucide-react';

type Announcement = { id: number; title: string; description: string; date: string };

const MOCK_DATA = {
  sceneName: 'Πρωινή Επισκόπηση',
  managementOffice: {
    name: 'Theo Concierge',
    phone: '+30 210 1234567',
    email: 'support@newconcierge.app',
  },
  weather: {
    location: 'Αθήνα',
    temperature: 22,
    feelsLike: 23,
    condition: 'Ηλιόλουστο',
    humidity: 60,
    wind: '8 km/h',
  },
  announcements: [
    {
      id: 1,
      title: 'Έκτακτη Συνέλευση Ιδιοκτητών',
      description: 'Τετάρτη 20/11, 20:00 – Θέμα: Προϋπολογισμός συντήρησης 2026',
      date: '20 Νοεμβρίου',
    },
    {
      id: 2,
      title: 'Ψηφοφορία για νέα έργα',
      description: 'Ανοικτή μέχρι 22/11 – Πατήστε QR για συμμετοχή',
      date: 'Έως 22 Νοεμβρίου',
    },
  ] as Announcement[],
  apartmentDebts: {
    totalDebt: '€4.230',
    topDebtors: [
      { apartment: 'Β2', amount: '€760' },
      { apartment: 'Δ1', amount: '€590' },
      { apartment: 'Α3', amount: '€430' },
    ],
  },
  newsTicker: [
    'Συνεργείο καθαρισμού: Επίσκεψη την Παρασκευή 18:00',
    'Νέο widget κοινόχρηστων εξόδων διαθέσιμο στο kiosk',
    'Πρόγνωση καιρού: Ηλιοφάνεια όλη την εβδομάδα',
  ],
};

const SIDEBAR_WIDGETS = [
  {
    id: 'qr',
    icon: QrCode,
    title: 'Κοινόχρηστα Online',
    description: 'Σαρώστε το QR για να δείτε την ανάλυση κοινοχρήστων και να εξοφλήσετε ηλεκτρονικά.',
  },
  {
    id: 'emergency',
    icon: PhoneCall,
    title: 'Τηλέφωνα Έκτακτης Ανάγκης',
    description: 'Πυροσβεστική: 199 · Άμεση Βοήθεια: 166 · Αστυνομία: 100 · Διαχείριση: 210 1234567',
  },
] as const;

export default function KioskDisplayPage() {
  const [sidebarIndex, setSidebarIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSidebarIndex((prev) => (prev + 1) % SIDEBAR_WIDGETS.length);
    }, 9000);

    return () => clearInterval(interval);
  }, []);

  const currentSidebarWidget = useMemo(() => SIDEBAR_WIDGETS[sidebarIndex], [sidebarIndex]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white overflow-hidden pb-14">
      {/* Scene badge */}
      <div className="absolute top-4 left-4 z-20 bg-black/40 backdrop-blur px-4 py-2 rounded-lg text-sm font-semibold">
        {MOCK_DATA.sceneName}
      </div>

      <div className="flex h-screen">
        {/* Left column */}
        <div className="w-[23%] flex flex-col space-y-4 p-4">
          <section className="flex-1 rounded-2xl bg-white/5 border border-white/10 shadow-2xl p-4 overflow-hidden">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-purple-300" />
              Σημαντικές Ανακοινώσεις
            </h2>
            <div className="space-y-3 overflow-y-auto pr-1 h-full">
              {MOCK_DATA.announcements.map((announcement) => (
                <article key={announcement.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs text-purple-200 mb-1">{announcement.date}</p>
                  <h3 className="font-semibold">{announcement.title}</h3>
                  <p className="text-sm text-slate-200">{announcement.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="flex-1 rounded-2xl bg-white/5 border border-white/10 shadow-2xl p-4 relative overflow-hidden">
            <div className="absolute inset-0">
              <div
                className="absolute inset-0 transition-transform duration-[1500ms]"
                style={{ transform: `translateY(-${sidebarIndex * 100}%)` }}
              >
                {SIDEBAR_WIDGETS.map((widget) => (
                  <div key={widget.id} className="h-full flex flex-col justify-between py-4">
                    <div>
                      <p className="text-sm text-purple-200 mb-1">Quick Access</p>
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        <widget.icon className="w-5 h-5 text-purple-300" />
                        {widget.title}
                      </h3>
                    </div>
                    <p className="text-base leading-relaxed text-slate-100">{widget.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute top-4 right-4 flex gap-1">
              {SIDEBAR_WIDGETS.map((_, index) => (
                <span
                  key={index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === sidebarIndex ? 'w-8 bg-purple-300' : 'w-2 bg-white/20'
                  }`}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Center column */}
        <div className="w-[54%] flex flex-col space-y-4 p-4">
          <section className="h-[15%] rounded-2xl bg-white/5 border border-blue-200/30 shadow-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-200">Γραφείο Διαχείρισης</p>
              <h2 className="text-2xl font-bold">{MOCK_DATA.managementOffice.name}</h2>
            </div>
            <div className="text-right space-y-1 text-sm">
              <p>{MOCK_DATA.managementOffice.phone}</p>
              <p>{MOCK_DATA.managementOffice.email}</p>
            </div>
          </section>

          <section className="h-[50%] rounded-2xl bg-white/5 border border-purple-200/30 shadow-2xl p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-200 mb-2">Καιρός</p>
              <h2 className="text-5xl font-semibold">{MOCK_DATA.weather.temperature}°C</h2>
              <p className="text-lg text-purple-100">{MOCK_DATA.weather.condition}</p>
              <p className="text-sm text-purple-100/80">
                Αίσθηση {MOCK_DATA.weather.feelsLike}°C · Υγρασία {MOCK_DATA.weather.humidity}% · Άνεμος {MOCK_DATA.weather.wind}
              </p>
            </div>
            <CloudSun className="w-32 h-32 text-yellow-200" />
          </section>

          <section className="h-[20%] rounded-2xl bg-white/5 border border-blue-200/30 shadow-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-200">Άμεσες Ενημερώσεις</p>
              <h2 className="text-2xl font-semibold">Συνεδρίες & Ψηφοφορίες</h2>
            </div>
            <div className="text-right">
              <p className="text-sm">Τελευταία ενημέρωση: {new Date().toLocaleTimeString('el-GR')}</p>
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="w-[23%] p-4">
          <section className="h-full rounded-2xl bg-[#222D59] border border-indigo-200/30 shadow-2xl p-4 flex flex-col justify-between">
            <div>
              <p className="text-sm text-indigo-200">Οφειλές Διαμερισμάτων</p>
              <h2 className="text-3xl font-bold">{MOCK_DATA.apartmentDebts.totalDebt}</h2>
            </div>
            <div className="space-y-3">
              {MOCK_DATA.apartmentDebts.topDebtors.map((debtor) => (
                <div key={debtor.apartment} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-300" />
                    <span className="font-medium">{debtor.apartment}</span>
                  </div>
                  <span>{debtor.amount}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* News ticker */}
      <div className="fixed bottom-0 left-0 right-0 h-12 bg-slate-900/90 border-t border-white/10 flex items-center text-sm text-white px-6 gap-4">
        <TrendingUp className="w-4 h-4 text-green-300" />
        <div className="overflow-hidden flex-1">
          <div className="whitespace-nowrap" style={{ animation: 'kiosk-marquee 28s linear infinite' }}>
            {MOCK_DATA.newsTicker.map((item, index) => (
              <span key={index} className="mr-12 text-slate-100">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes kiosk-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
