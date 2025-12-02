'use client';

import { useState, useEffect } from 'react';
import TimeWidget from '@/components/kiosk/widgets/TimeWidget';
import { Sparkles, Lightbulb, Calendar, Quote, Sun, Moon, Cloud } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface LifestyleSceneCustomProps {
  data?: any;
  buildingId?: number | null;
}

// Tips pool - can be expanded or loaded from database
const tipsPool = [
  "Χαμηλώστε τη θέρμανση κατά 1°C για εξοικονόμηση έως 7% στην ενέργεια",
  "Κλείστε τις κάνουλες των καλοριφέρ στα δωμάτια που δεν χρησιμοποιείτε",
  "Ελέγξτε τα λάστιχα των παραθύρων πριν τον χειμώνα για καλύτερη μόνωση",
  "Χρησιμοποιήστε LED λάμπες - καταναλώνουν 75% λιγότερη ενέργεια",
  "Αερίστε το σπίτι για 10 λεπτά το πρωί αντί να έχετε παράθυρα ανοιχτά όλη μέρα",
  "Βάλτε πλαστικό φιλμ στα παράθυρα για επιπλέον θερμομόνωση",
  "Καθαρίστε τα φίλτρα του κλιματιστικού κάθε 2 μήνες",
  "Κλείστε τα ρολά το βράδυ για να κρατήσετε τη ζεστασιά μέσα",
];

const quotesPool = [
  { text: "Η γειτονιά κάνει το σπίτι", author: "Ελληνική παροιμία" },
  { text: "Ένας καλός γείτονας είναι πιο πολύτιμος από χρυσάφι", author: "Ελληνική παροιμία" },
  { text: "Μαζί είμαστε πιο δυνατοί", author: "" },
  { text: "Το σπίτι είναι εκεί που είναι η καρδιά", author: "" },
  { text: "Κάθε μέρα είναι μια νέα ευκαιρία", author: "" },
];

// Name days - simplified version (can be expanded with full calendar)
const getNameDay = (date: Date) => {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Sample name days - expand as needed
  const nameDays: { [key: string]: string } = {
    '11-29': 'Φίλιππος, Φιλίππα',
    '11-30': 'Ανδρέας, Ανδρέα',
    '12-6': 'Νικόλαος, Νικολέτα',
    '12-25': 'Χριστός, Χριστίνα',
    '1-1': 'Βασίλης, Βασιλική',
    '1-6': 'Θεοφάνης, Θεοφανία',
  };

  const key = `${month}-${day}`;
  return nameDays[key] || 'Καλή μέρα σε όλους';
};

// Weekly building events - can be loaded from database
const getWeeklyEvents = () => [
  { day: 'Δευτέρα', event: 'Καθαρισμός κλιμακοστασίου', icon: '🧹' },
  { day: 'Τετάρτη', event: 'Ανακύκλωση', icon: '♻️' },
  { day: 'Παρασκευή', event: 'Έλεγχος ασανσέρ', icon: '🔧' },
];

export default function LifestyleSceneCustom({ data, buildingId }: LifestyleSceneCustomProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tipOfDay, setTipOfDay] = useState('');
  const [quoteOfDay, setQuoteOfDay] = useState({ text: '', author: '' });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Set tip and quote of the day (changes daily)
  useEffect(() => {
    const dayOfYear = Math.floor((currentTime.getTime() - new Date(currentTime.getFullYear(), 0, 0).getTime()) / 86400000);
    setTipOfDay(tipsPool[dayOfYear % tipsPool.length]);
    setQuoteOfDay(quotesPool[dayOfYear % quotesPool.length]);
  }, [currentTime.getDate()]);

  const nameDay = getNameDay(currentTime);
  const weeklyEvents = getWeeklyEvents();
  const hour = currentTime.getHours();
  const isNight = hour >= 20 || hour < 6;
  const isMorning = hour >= 6 && hour < 12;

  return (
    <div className="h-screen w-screen relative overflow-hidden pb-20">
      {/* Animated Background - Beautiful gradient with floating elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        {/* Overlay pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>

        {/* Floating orbs */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Content Layer */}
      <div className="relative z-10 h-full w-full p-8 flex flex-col">

        {/* Top Section - Time & Date - Large and centered */}
        <div className="flex-shrink-0 mb-6">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between gap-6">
              {/* Left - Time */}
              <div className="flex-1">
                <div className="flex items-center gap-2.5 mb-2">
                  {isNight ? (
                    <Moon className="w-6 h-6 text-blue-200" />
                  ) : isMorning ? (
                    <Sun className="w-6 h-6 text-yellow-200" />
                  ) : (
                    <Cloud className="w-6 h-6 text-blue-200" />
                  )}
                  <span className="text-[clamp(1.1rem,2vw,1.6rem)] font-light text-white/80">
                    {isNight ? 'Καλό βράδυ' : isMorning ? 'Καλημέρα' : 'Καλή σας μέρα'}
                  </span>
                </div>
                <div className="font-bold text-white tabular-nums tracking-tight text-[clamp(3rem,5vw,5.2rem)] leading-none">
                  {format(currentTime, 'HH:mm')}
                </div>
                <div className="text-white/60 mt-0.5 tabular-nums text-[clamp(1.2rem,2.2vw,2rem)]">
                  :{format(currentTime, 'ss')}
                </div>
              </div>

              {/* Right - Date */}
              <div className="text-right">
                <div className="font-bold text-white mb-1 text-[clamp(1.8rem,3vw,3.2rem)]">
                  {format(currentTime, 'EEEE', { locale: el })}
                </div>
                <div className="text-white/80 text-[clamp(1.2rem,2.2vw,2rem)]">
                  {format(currentTime, 'dd MMMM yyyy', { locale: el })}
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span className="text-[clamp(0.95rem,1.6vw,1.25rem)] text-yellow-200">
                    Γιορτάζουν: {nameDay}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section - 3 Columns */}
        <div className="flex-1 grid grid-cols-3 gap-6">

          {/* Left Column - Tip of the Day */}
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-xl rounded-3xl p-5 border border-green-300/30 shadow-2xl flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-green-400/30 rounded-2xl">
                <Lightbulb className="w-6 h-6 text-green-100" />
              </div>
              <h2 className="text-[clamp(1.2rem,2vw,1.9rem)] font-semibold text-white">Tip της ημέρας</h2>
            </div>
            <div className="flex-1 flex items-center">
              <p className="text-[clamp(1.05rem,1.9vw,1.5rem)] leading-relaxed text-white/90">
                {tipOfDay}
              </p>
            </div>
          </div>

          {/* Middle Column - Weekly Calendar */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/20 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-400/30 rounded-2xl">
                <Calendar className="w-6 h-6 text-blue-100" />
              </div>
              <h2 className="text-[clamp(1.2rem,2vw,1.9rem)] font-semibold text-white">Αυτή την εβδομάδα</h2>
            </div>
            <div className="space-y-4">
              {weeklyEvents.map((event, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{event.icon}</span>
                    <div>
                      <div className="text-[clamp(1rem,1.8vw,1.3rem)] font-semibold text-white">{event.day}</div>
                      <div className="text-[clamp(0.95rem,1.6vw,1.2rem)] text-white/70">{event.event}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Quote of the Day */}
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-xl rounded-3xl p-5 border border-purple-300/30 shadow-2xl flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-purple-400/30 rounded-2xl">
                <Quote className="w-6 h-6 text-purple-100" />
              </div>
              <h2 className="text-[clamp(1.2rem,2vw,1.9rem)] font-semibold text-white">Quote της ημέρας</h2>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-[clamp(1.2rem,2.2vw,1.8rem)] italic leading-relaxed text-white/90 mb-3">
                "{quoteOfDay.text}"
              </p>
              {quoteOfDay.author && (
                <p className="text-[clamp(1rem,1.8vw,1.3rem)] text-white/60 text-right">
                  — {quoteOfDay.author}
                </p>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Copyright Footer */}
      <div className="fixed bottom-0.5 left-0 right-0 h-3 flex items-center justify-center z-40">
        <p className="text-[9px] text-white/40 font-normal tracking-wide">
          © {new Date().getFullYear()} New Concierge. All rights reserved.
        </p>
      </div>
    </div>
  );
}
