'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, Quote, Waves, Leaf, Thermometer, Smartphone } from 'lucide-react';
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

type VisualAsset = {
  id: string;
  title: string;
  description: string;
  src: string;
  type: 'image' | 'video';
  overlay?: string;
  poster?: string;
};

const fallbackQuotes = [
  { text: 'Η ηρεμία είναι ο καλύτερος οδηγός της ημέρας.', author: 'Ελληνική παροιμία' },
  { text: 'Όταν η κοινότητα αναπνέει, όλα λειτουργούν καλύτερα.', author: 'New Concierge' },
  { text: 'Η οργάνωση είναι ο πιο γλυκός ήχος της πολυκατοικίας.', author: 'Σύλλογος Διαχειριστών' },
];

const LOCAL_VISUAL_LIBRARY: VisualAsset[] = [
  {
    id: 'aurora',
    title: 'Aurora Drift',
    description: 'Ήρεμες αποχρώσεις για μια κομψή παύση ανάμεσα στις ενημερώσεις.',
    src: '/kiosk/assets/visuals/aurora-drift.svg',
    type: 'image',
    overlay: 'linear-gradient(120deg, rgba(2,6,23,0.75), rgba(15,23,42,0.35))',
  },
  {
    id: 'sunset',
    title: 'Sunset Haze',
    description: 'Ζεστό σούρουπο που δίνει ζωντάνια στην προβολή.',
    src: '/kiosk/assets/visuals/sunset-haze.svg',
    type: 'image',
    overlay: 'linear-gradient(180deg, rgba(8,7,20,0.65), rgba(74,29,150,0.35))',
  },
  {
    id: 'ocean',
    title: 'Calm Waves',
    description: 'Απαλές κινήσεις θάλασσας για διαλείμματα χαλάρωσης.',
    src: '/kiosk/assets/visuals/calm-waves.svg',
    type: 'image',
    overlay: 'linear-gradient(180deg, rgba(2,8,23,0.65), rgba(4,29,70,0.4))',
  },
];

const formatGreekDate = (date: Date) =>
  date.toLocaleDateString('el-GR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

const extractTemperature = (data?: KioskData | null): number | null => {
  const weather = (data as any)?.weather;
  const candidates = [
    weather?.current?.temperature,
    weather?.current?.temp,
    weather?.current?.temp_c,
    weather?.temperature,
    weather?.temp,
  ].filter((value) => typeof value === 'number');

  if (candidates.length) {
    return Math.round(candidates[0] as number);
  }

  return null;
};

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
          controls={false}
          controlsList="nodownload nofullscreen noremoteplayback"
          disablePictureInPicture
          preload="auto"
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
  <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-white backdrop-blur">
    <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">{label}</p>
    <p className="mt-1 text-2xl font-semibold">{value}</p>
    {description && <p className="mt-1 text-xs text-white/70">{description}</p>}
  </div>
);

export default function AmbientShowcaseScene({ data, buildingId, brandingConfig }: AmbientShowcaseSceneProps) {
  const [now, setNow] = useState(new Date());
  const [communityIndex, setCommunityIndex] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [visualIndex, setVisualIndex] = useState(0);

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

  const visualPlaylist = useMemo(() => {
    const derived: VisualAsset[] = [];
    if (branding.background?.src) {
      derived.push({
        id: 'branding-source',
        src: branding.background.src,
        type: branding.background.type === 'video' ? 'video' : 'image',
        title: branding.tagline,
        description: branding.subline || 'Εμπειρία New Concierge',
        overlay: branding.background.overlayColor,
        poster: branding.background.poster,
      });
    }
    return [...derived, ...LOCAL_VISUAL_LIBRARY];
  }, [branding.background, branding.subline, branding.tagline]);

  useEffect(() => {
    setVisualIndex(0);
  }, [visualPlaylist.length]);

  useEffect(() => {
    if (visualPlaylist.length <= 1) {
      return;
    }
    const interval = setInterval(() => {
      setVisualIndex((prev) => (prev + 1) % visualPlaylist.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [visualPlaylist.length]);

  const currentVisual = visualPlaylist[visualIndex] ?? LOCAL_VISUAL_LIBRARY[0];

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
  const temperature = extractTemperature(data);
  const formattedTime = now.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  const formattedDate = formatGreekDate(now);

  return (
    <div className="relative h-screen w-screen overflow-hidden text-white">
      <AmbientBackground background={branding.background} />
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/55 to-indigo-950/60" />
      <div className="relative z-10 flex h-full">
        <aside className="hidden lg:flex w-[18%] min-w-[260px] max-w-[360px] flex-col gap-4 bg-black/25 px-6 py-8 backdrop-blur-2xl">
          <div className="rounded-3xl border border-white/15 bg-white/5 p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-[0.58rem] uppercase tracking-[0.5em] text-white/60">
              <Clock className="h-3.5 w-3.5" />
              {greeting}
            </div>
            <p className="mt-3 text-[2.5rem] font-semibold tabular-nums leading-none">{formattedTime}</p>
            <p className="text-sm text-white/70">{formattedDate}</p>
            <div className="mt-4 flex items-center justify-between text-white/80">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                <span className="text-sm">
                  {temperature !== null ? `${temperature}°C` : '—°C'}
                </span>
              </div>
              <span className="text-xs uppercase tracking-[0.2em]">{data?.building_info?.city || '—'}</span>
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/5 p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-[0.55rem] uppercase tracking-[0.45em] text-white/60">
              <Leaf className="h-3.5 w-3.5" />
              {branding.highlight?.title || 'Σημερινό highlight'}
            </div>
            <p className="mt-3 text-sm text-white/85 leading-relaxed">
              {branding.highlight?.description || 'Ηρεμία, ενημέρωση και όμορφη εμπειρία για όλους.'}
            </p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/5 p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-[0.55rem] uppercase tracking-[0.45em] text-white/60">
              <Waves className="h-3.5 w-3.5" />
              Νέα από την κοινότητα
            </div>
            <p className="mt-4 text-base font-semibold leading-snug text-white">
              {activeHeadline}
            </p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/5 p-5 backdrop-blur flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[0.55rem] uppercase tracking-[0.45em] text-white/60">
              <Smartphone className="h-3.5 w-3.5" />
              New Concierge App
            </div>
            <p className="text-sm text-white/80">
              Ζήστε την εμπειρία του γραφείου διαχείρισης από το κινητό σας.
            </p>
            <ul className="text-xs text-white/70 space-y-1.5">
              <li>• Αιτήματα & ειδοποιήσεις σε πραγματικό χρόνο</li>
              <li>• Πληρωμές κοινοχρήστων σε 2 βήματα</li>
              <li>• Αυτόματη ενημέρωση όλων των ενοίκων</li>
            </ul>
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

        <main className="relative flex-1 overflow-hidden">
          <div className="absolute inset-0">
            {visualPlaylist.map((visual, index) => (
              <div
                key={visual.id + index}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  index === visualIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {visual.type === 'video' ? (
                  <video
                    className="h-full w-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls={false}
                    controlsList="nodownload nofullscreen noremoteplayback"
                    disablePictureInPicture
                    preload="auto"
                    poster={visual.poster}
                  >
                    <source src={visual.src} />
                  </video>
                ) : (
                  <img src={visual.src} alt={visual.title} className="h-full w-full object-cover" />
                )}
                <div
                  className="absolute inset-0"
                  style={{ background: visual.overlay || 'linear-gradient(135deg, rgba(2,6,23,0.8), rgba(15,23,42,0.4))' }}
                />
              </div>
            ))}
          </div>

          <div className="relative flex h-full flex-col justify-between px-6 py-10 md:px-10 lg:px-12 lg:py-12">
            <div className="max-w-4xl">
              <p className="text-xs uppercase tracking-[0.5em] text-white/60">Lifestyle & Community</p>
              <h1 className="mt-4 text-[clamp(2.2rem,4vw,3.75rem)] font-semibold leading-tight text-white drop-shadow-2xl">
                {currentVisual.title || branding.tagline}
              </h1>
              <p className="mt-3 text-[clamp(1rem,2vw,1.5rem)] text-white/85 max-w-3xl">
                {currentVisual.description || branding.subline}
              </p>
            </div>

            <div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats.map((stat) => (
                  <MetricPill key={stat.label} label={stat.label} value={stat.value} description={stat.description} />
                ))}
              </div>

              <div className="mt-6 rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur">
                <div className="flex items-center gap-2 text-[0.55rem] uppercase tracking-[0.45em] text-white/70">
                  <Quote className="h-3.5 w-3.5" />
                  Έμπνευση της ημέρας
                </div>
                <p className="mt-3 text-[clamp(1.1rem,2.2vw,1.7rem)] font-light italic leading-relaxed">
                  “{activeQuote?.text}”
                </p>
                {activeQuote?.author && <p className="mt-2 text-right text-sm text-white/70">— {activeQuote.author}</p>}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

