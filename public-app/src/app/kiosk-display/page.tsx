'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CloudSun, PhoneCall, QrCode, ShieldAlert, TrendingUp } from 'lucide-react';
import { useKioskData } from '@/hooks/useKioskData';
import { useKioskWeather } from '@/hooks/useKioskWeather';
import { useNews } from '@/hooks/useNews';
import QRCodeGenerator from '@/components/QRCodeGenerator';

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
    description: 'Πυροσβεστική: 199 · Άμεση Βοήθεια: 166 · Αστυνομία: 100',
  },
] as const;

export default function KioskDisplayPage() {
  const [selectedBuildingId] = useState<number | null>(1);
  const [sidebarIndex, setSidebarIndex] = useState(0);
  const [dashboardUrl, setDashboardUrl] = useState(
    () => (typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : '')
  );

  // Fetch real data
  const { data: kioskData, isLoading: kioskLoading, error: kioskError } = useKioskData(selectedBuildingId);
  const { weather, isLoading: weatherLoading } = useKioskWeather(300000);
  const { news, loading: newsLoading } = useNews(300000);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDashboardUrl(`${window.location.origin}/dashboard`);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSidebarIndex((prev) => (prev + 1) % SIDEBAR_WIDGETS.length);
    }, 9000);

    return () => clearInterval(interval);
  }, []);

  const currentSidebarWidget = useMemo(() => SIDEBAR_WIDGETS[sidebarIndex], [sidebarIndex]);

  // Extract announcements
  const announcements = kioskData?.announcements || [];

  // Extract apartment debts from financial data
  const apartmentDebts = useMemo(() => {
    const maskName = (name?: string | null) => {
      if (!name) {
        return '';
      }
      const parts = name.trim().split(' ');
      if (parts.length === 1) {
        return `${parts[0]} ***`;
      }
      return `${parts[0]} ${parts[1][0]}***`;
    };

    if (!kioskData?.financial) {
      return {
        totalDebt: '€0',
        topDebtors: [],
      };
    }

    const financial = kioskData.financial;
    const totalDebtValue =
      typeof financial.total_obligations === 'number'
        ? financial.total_obligations
        : (financial.apartment_balances || []).reduce(
            (sum: number, apt: { net_obligation?: number }) => sum + Math.max(0, apt.net_obligation || 0),
            0
          );

    const rawDebtors =
      financial.top_debtors && financial.top_debtors.length > 0
        ? financial.top_debtors
        : (financial.apartment_balances || []).filter(
            (apt: { net_obligation?: number }) => (apt.net_obligation || 0) > 0
          );

    const topDebtors = rawDebtors
      .sort(
        (a: { amount?: number; net_obligation?: number }, b: { amount?: number; net_obligation?: number }) =>
          (b.amount ?? b.net_obligation ?? 0) - (a.amount ?? a.net_obligation ?? 0)
      )
      .slice(0, 3)
      .map((debtor: any) => {
        const amountValue = debtor.amount ?? debtor.net_obligation ?? 0;
        const occupantName = maskName(debtor.occupant_name || debtor.tenant_name || debtor.owner_name);
        return {
          apartment: debtor.apartment_number || '—',
          occupant: occupantName,
          amount: `€${amountValue.toFixed(0)}`,
        };
      });

    return {
      totalDebt: `€${totalDebtValue.toFixed(0)}`,
      topDebtors,
    };
  }, [kioskData?.financial]);

  // Management office info
  const managementOffice = {
    name: kioskData?.building_info?.management_office_name || 'Γραφείο Διαχείρισης',
    phone: kioskData?.building_info?.management_office_phone || '',
    email: kioskData?.building_info?.management_office_email || '',
  };

  if (kioskLoading || weatherLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Φόρτωση δεδομένων...</p>
        </div>
      </div>
    );
  }

  if (kioskError) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white">
        <div className="text-center text-red-300">
          <p className="text-lg font-semibold">Σφάλμα φόρτωσης δεδομένων</p>
          <p className="text-sm mt-2">{kioskError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white overflow-hidden pb-14">
      {/* Scene badge */}
      <div className="absolute top-4 left-4 z-20 bg-black/40 backdrop-blur px-4 py-2 rounded-lg text-sm font-semibold">
        Πρωινή Επισκόπηση
      </div>

      <div className="flex h-screen">
        {/* Left column - 23% */}
        <div className="w-[23%] flex flex-col space-y-4 p-4">
          <section className="flex-1 rounded-2xl bg-white/5 border border-white/10 shadow-2xl p-4 overflow-hidden">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-purple-300" />
              Σημαντικές Ανακοινώσεις
            </h2>
            <div className="space-y-3 overflow-y-auto pr-1 h-full">
              {announcements.length > 0 ? (
                announcements.slice(0, 5).map((announcement) => (
                  <article key={announcement.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs text-purple-200 mb-1">
                      {announcement.date || announcement.created_at 
                        ? new Date(announcement.date || announcement.created_at).toLocaleDateString('el-GR', {
                            day: 'numeric',
                            month: 'long',
                          })
                        : ''}
                    </p>
                    <h3 className="font-semibold">{announcement.title}</h3>
                    {announcement.description && (
                      <p className="text-sm text-slate-200 line-clamp-2">{announcement.description}</p>
                    )}
                  </article>
                ))
              ) : (
                <div className="text-center text-slate-400 py-8">
                  <p>Δεν υπάρχουν ανακοινώσεις</p>
                </div>
              )}
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
                    {widget.id === 'qr' ? (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="bg-white p-2 rounded-lg">
                          <QRCodeGenerator
                            url={dashboardUrl}
                            size={120}
                            className="rounded"
                          />
                        </div>
                        <p className="text-base leading-relaxed text-slate-100 text-center">{widget.description}</p>
                      </div>
                    ) : (
                      <p className="text-base leading-relaxed text-slate-100">
                        {widget.description}
                        {managementOffice.phone && (
                          <span className="block mt-2">Διαχείριση: {managementOffice.phone}</span>
                        )}
                      </p>
                    )}
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

        {/* Center column - 54% */}
        <div className="w-[54%] flex flex-col space-y-4 p-4">
          <section className="h-[15%] rounded-2xl bg-white/5 border border-blue-200/30 shadow-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-200">Γραφείο Διαχείρισης</p>
              <h2 className="text-2xl font-bold">{managementOffice.name}</h2>
            </div>
            <div className="text-right space-y-1 text-sm">
              {managementOffice.phone && <p>{managementOffice.phone}</p>}
              {managementOffice.email && <p>{managementOffice.email}</p>}
            </div>
          </section>

          <section className="h-[50%] rounded-2xl bg-white/5 border border-purple-200/30 shadow-2xl p-6 flex items-center justify-between">
            {weather ? (
              <>
                <div>
                  <p className="text-sm text-purple-200 mb-2">Καιρός</p>
                  <h2 className="text-5xl font-semibold">{weather.current.temperature}°C</h2>
                  <p className="text-lg text-purple-100">{weather.current.condition}</p>
                  <p className="text-sm text-purple-100/80">
                    Υγρασία {weather.current.humidity}% · Άνεμος {weather.current.wind_speed} km/h
                  </p>
                </div>
                <div className="text-8xl">
                  {weather.current.condition.includes('Ηλιόλουστο') || weather.current.condition.includes('Καθαρός') ? '☀️' :
                   weather.current.condition.includes('Συννεφιά') ? '☁️' :
                   weather.current.condition.includes('Βροχή') ? '🌧️' : '🌤️'}
                </div>
              </>
            ) : (
              <div className="w-full text-center text-purple-200">
                <CloudSun className="w-32 h-32 mx-auto mb-4 opacity-50" />
                <p>Δεδομένα καιρού δεν είναι διαθέσιμα</p>
              </div>
            )}
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

        {/* Right column - 23% */}
        <div className="w-[23%] p-4">
          <section className="h-full rounded-2xl bg-[#222D59] border border-indigo-200/30 shadow-2xl p-4 flex flex-col justify-between">
            <div>
              <p className="text-sm text-indigo-200 mb-2">Οφειλές Διαμερισμάτων</p>
              <h2 className="text-3xl font-bold">{apartmentDebts.totalDebt}</h2>
            </div>
            <div className="space-y-3 mt-4">
              {apartmentDebts.topDebtors.length > 0 ? (
                apartmentDebts.topDebtors.map((debtor, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-300" />
                        <span className="font-medium">{debtor.apartment}</span>
                      </div>
                      {debtor.occupant && (
                        <p className="text-xs text-indigo-200 mt-0.5">{debtor.occupant}</p>
                      )}
                    </div>
                    <span className="text-red-300 font-semibold">{debtor.amount}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-indigo-300/70 py-4">
                  <p className="text-sm">Δεν υπάρχουν οφειλές</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* News ticker */}
      <div className="fixed bottom-0 left-0 right-0 h-12 bg-slate-900/90 border-t border-white/10 flex items-center text-sm text-white px-6 gap-4">
        <TrendingUp className="w-4 h-4 text-green-300" />
        <div className="overflow-hidden flex-1">
          <div className="animate-scroll-left whitespace-nowrap">
            {news && news.length > 0 ? (
              news.map((title, index) => (
                <span key={index}>
                  {title}
                  {index < news.length - 1 && ' • '}
                </span>
              ))
            ) : (
              <span>Δεν υπάρχουν ειδήσεις</span>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        .animate-scroll-left {
          animation: scroll-left 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
