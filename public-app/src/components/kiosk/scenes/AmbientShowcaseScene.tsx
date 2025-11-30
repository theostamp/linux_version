'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, Quote, Waves, Leaf } from 'lucide-react';
import type { KioskData } from '@/hooks/useKioskData';
import AppSpotlightCard from '@/components/kiosk/widgets/AppSpotlightCard';
import {
  AmbientBrandingConfig,
  AmbientBackgroundConfig,
  resolveAmbientBranding,
} from '@/components/kiosk/scenes/branding';

interface AmbientShowcaseSceneProps {
  data?: KioskData | null;
  buildingId?: number | null;
  brandingConfig?: Partial<AmbientBrandingConfig>;
}

const fallbackQuotes = [
  { text: 'Η ηρεμία είναι ο καλύτερος οδηγός της ημέρας.', author: 'Ελληνική παροιμία' },
  { text: 'Όταν η κοινότητα αναπνέει, όλα λειτουργούν καλύτερα.', author: 'New Concierge' },
  { text: 'Η οργάνωση είναι ο πιο γλυκός ήχος της πολυκατοικίας.', author: 'Σύλλογος Διαχειριστών' },
];

const formatGreekDate = (date: Date) =>
  date.toLocaleDateString('el-GR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

const AmbientBackground = ({ background }: { background: AmbientBackgroundConfig }) => {
  const blurStyle = background.blur ? { filter: `blur(${background.blur}px)`, transform: 'scale(1.05)' } : undefined;

  if (background.type === 'video' && background.src) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <video
          className="h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          poster={background.poster}
          style={blurStyle}
        >
          <source src={background.src} />
        </video>
        {background.overlayColor && (
          <div className="absolute inset-0" style={{ backgroundColor: background.overlayColor }} />
        )}
      </div>
    );
  }

  if (background.type === 'image' && background.src) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <img src={background.src} alt="Ambient" className="h-full w-full object-cover" style={blurStyle} />
        {background.overlayColor && (
          <div className="absolute inset-0" style={{ backgroundColor: background.overlayColor }} />
        )}
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          background.gradient ||
          'radial-gradient(circle at 20% 20%, rgba(236,72,153,0.25), transparent 60%), linear-gradient(135deg, #020617, #1e1b4b)',
      }}
    />
  );
};

const MetricPill = ({ label, value, description }: { label: string; value: string; description?: string }) => (
  <div className="rounded-3xl border border-white/25 bg-white/5 px-6 py-4 text-white backdrop-blur-xl">
    <p className="text-xs uppercase tracking-[0.25em] text-white/60">{label}</p>
    <p className="mt-2 text-3xl font-semibold">{value}</p>
    {description && <p className="mt-1 text-sm text-white/70">{description}</p>}
  </div>
);

export default function AmbientShowcaseScene({ data, buildingId, brandingConfig }: AmbientShowcaseSceneProps) {
  const [now, setNow] = useState(new Date());
  const [communityIndex, setCommunityIndex] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const timeInterval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timeInterval);
  }, []);

  const communityHeadlines = useMemo(() => {
    const announcements = data?.announcements ?? [];
    if (announcements.length === 0) {
      return ['Συντονιστείτε με τις ανακοινώσεις του κτιρίου σας', 'Χαλαρώστε — όλα είναι υπό έλεγχο'];
    }
    return announcements.slice(0, 5).map((announcement) => announcement.title || announcement.content);
  }, [data?.announcements]);

  useEffect(() => {
    const interval = setInterval(
      () => setCommunityIndex((prev) => (prev + 1) % communityHeadlines.length),
      8000
    );
    return () => clearInterval(interval);
  }, [communityHeadlines.length]);

  useEffect(() => {
    const interval = setInterval(() => setQuoteIndex((prev) => (prev + 1) % fallbackQuotes.length), 12000);
    return () => clearInterval(interval);
  }, []);

  const branding = useMemo(
    () => resolveAmbientBranding(data, brandingConfig),
    [data, brandingConfig]
  );

  const greeting =
    now.getHours() < 12 ? 'Καλημέρα' : now.getHours() < 18 ? 'Καλή συνέχεια' : 'Καλησπέρα';
  const occupancyPercent =
    data?.statistics?.total_apartments && data?.statistics?.occupied
      ? Math.round((data.statistics.occupied / data.statistics.total_apartments) * 100)
      : null;

  const collectionRate = data?.financial?.collection_rate;
  const stats = [
    {
      label: 'Διαμερίσματα',
      value: data?.statistics?.total_apartments?.toString() ?? '—',
      description: 'Μέλη της κοινότητας',
    },
    {
      label: 'Πληρότητα',
      value: occupancyPercent !== null ? `${occupancyPercent}%` : '—',
      description: occupancyPercent !== null ? 'Κατοικημένα διαμερίσματα' : undefined,
    },
    {
      label: 'Είσπραξη',
      value: typeof collectionRate === 'number' ? `${collectionRate.toFixed(0)}%` : '—',
      description: 'Ρυθμός κοινοχρήστων',
    },
  ];

  const activeHeadline = communityHeadlines[communityIndex % communityHeadlines.length];
  const activeQuote = branding.quote || fallbackQuotes[quoteIndex];

  return (
    <div className="relative h-screen w-screen overflow-hidden text-white">
      <AmbientBackground background={branding.background} />
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/55 to-indigo-950/60" />
      <div className="relative z-10 flex h-full flex-col lg:flex-row">
        <aside className="hidden w-[28%] min-w-[320px] flex-col gap-6 bg-black/15 px-8 py-10 backdrop-blur-2xl lg:flex">
          <div className="rounded-3xl border border-white/20 bg-white/5 p-5 backdrop-blur-2xl">
            <div className="flex items-center gap-3 text-sm uppercase tracking-[0.4em] text-white/60">
              <Clock className="h-4 w-4" />
              {greeting}
            </div>
            <p className="mt-4 text-6xl font-semibold tabular-nums">{now.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p className="text-2xl text-white/80">{formatGreekDate(now)}</p>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/5 p-5 backdrop-blur-2xl">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-white/60">
              <Leaf className="h-3.5 w-3.5" />
              {branding.highlight?.title || 'Σημερινό highlight'}
            </div>
            <p className="mt-3 text-lg text-white/90">
              {branding.highlight?.description || 'Ηρεμία, ενημέρωση και όμορφη εμπειρία για όλους.'}
            </p>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/5 p-5 backdrop-blur-2xl">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-white/60">
              <Waves className="h-3.5 w-3.5" />
              Νέα από την κοινότητα
            </div>
            <p className="mt-4 text-2xl font-semibold leading-snug">
              {activeHeadline}
            </p>
          </div>

          <AppSpotlightCard
            buildingId={buildingId ?? data?.building_info?.id}
            buildingName={data?.building_info?.name}
            tagline="New Concierge App"
            helperText={branding.subline}
            ctaLabel={branding.cta?.label || 'Ζήστε το demo'}
            ctaSubtitle={branding.cta?.sublabel || 'Σκανάρετε για demo'}
          />
        </aside>

        <main className="flex-1 px-6 py-12 lg:px-12 lg:py-16">
          <div className="max-w-4xl">
            <p className="text-xs uppercase tracking-[0.5em] text-white/60">New Concierge / Showcase</p>
            <h1 className="mt-6 text-5xl font-semibold leading-tight text-white drop-shadow-2xl lg:text-6xl">
              {branding.tagline}
            </h1>
            <p className="mt-4 text-lg text-white/80 lg:text-2xl">{branding.subline}</p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
              <MetricPill key={stat.label} label={stat.label} value={stat.value} description={stat.description} />
            ))}
          </div>

          <div className="mt-12 rounded-3xl border border-white/20 bg-white/5 p-6 backdrop-blur-2xl">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-white/60">
              <Quote className="h-3.5 w-3.5" />
              Έμπνευση της ημέρας
            </div>
            <p className="mt-4 text-3xl font-light italic leading-relaxed">“{activeQuote?.text}”</p>
            {activeQuote?.author && <p className="mt-3 text-right text-sm text-white/70">— {activeQuote.author}</p>}
          </div>
        </main>
      </div>
    </div>
  );
}

