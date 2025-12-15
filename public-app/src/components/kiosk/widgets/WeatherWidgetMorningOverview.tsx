'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type MorningWeatherData = {
  temperature: number;
  weathercode: number;
  description: string;
  location: string;
  temp_max?: number;
  temp_min?: number;
  precipitation_probability?: number;
  wind_speed?: number;
};

type WeatherKind = 'clear' | 'partly_cloudy' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm' | 'unknown';

const getWeatherDescription = (weathercode: number) => {
  if (weathercode === 0) return 'Καθαρός ουρανός';
  if (weathercode === 1 || weathercode === 2) return 'Λίγα σύννεφα';
  if (weathercode === 3) return 'Νεφελώδης';
  if (weathercode >= 45 && weathercode <= 48) return 'Ομίχλη';
  if (weathercode >= 51 && weathercode <= 67) return 'Βροχή';
  if (weathercode >= 71 && weathercode <= 77) return 'Χιόνι';
  if (weathercode >= 80 && weathercode <= 82) return 'Μπόρες';
  if (weathercode >= 95 && weathercode <= 99) return 'Καταιγίδα';
  return 'Άγνωστο';
};

const getWeatherEmoji = (weathercode: number) => {
  if (weathercode === 0) return '☀️';
  if (weathercode === 1 || weathercode === 2) return '🌤️';
  if (weathercode === 3) return '☁️';
  if (weathercode >= 45 && weathercode <= 48) return '🌫️';
  if (weathercode >= 51 && weathercode <= 67) return '🌧️';
  if (weathercode >= 71 && weathercode <= 77) return '❄️';
  if (weathercode >= 80 && weathercode <= 82) return '🌦️';
  if (weathercode >= 95 && weathercode <= 99) return '⛈️';
  return '🌤️';
};

const classifyWeather = (weathercode: number, precipitationProbability?: number): WeatherKind => {
  if (weathercode === 0) return 'clear';
  if (weathercode === 1 || weathercode === 2) return 'partly_cloudy';
  if (weathercode === 3) return 'cloudy';
  if (weathercode >= 45 && weathercode <= 48) return 'fog';
  if (weathercode >= 95 && weathercode <= 99) return 'storm';
  if (weathercode >= 71 && weathercode <= 77) return 'snow';
  if (weathercode >= 51 && weathercode <= 67) return 'rain';
  if (weathercode >= 80 && weathercode <= 82) return 'rain';
  if (typeof precipitationProbability === 'number' && precipitationProbability >= 60) return 'rain';
  return 'unknown';
};

const uniqueTips = (tips: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tip of tips) {
    const normalized = tip.trim();
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
};

const buildTipPool = ({
  kind,
  temperature,
  precipitationProbability,
  windSpeed,
}: {
  kind: WeatherKind;
  temperature: number;
  precipitationProbability?: number;
  windSpeed?: number;
}) => {
  const tips: string[] = [
    'Δείτε αναλυτικά την πρόγνωση στην εφαρμογή.',
    'Καλημέρα! Καλή συνέχεια στην ημέρα σας.',
  ];

  if (kind === 'rain') {
    tips.push('Σήμερα θα χρειαστεί ομπρέλα.');
    tips.push('Πήρες την ομπρέλα σου σήμερα;');
    tips.push('Προσοχή στις γλιστερές επιφάνειες στην είσοδο.');
    tips.push('Άφησε λίγο παραπάνω χρόνο για τη μετακίνηση.');
  }

  if (kind === 'storm') {
    tips.push('Πιθανή καταιγίδα: απόφυγε άσκοπες μετακινήσεις αν δυναμώσει ο καιρός.');
    tips.push('Κλείσε καλά πόρτες και παράθυρα πριν φύγεις.');
    tips.push('Ασφάλισε αντικείμενα στο μπαλκόνι.');
  }

  if (kind === 'snow') {
    tips.push('Ντύσου ζεστά σήμερα.');
    tips.push('Προσοχή στον πάγο και στις γλιστερές επιφάνειες.');
    tips.push('Προτίμησε αντιολισθητικά παπούτσια αν μπορείς.');
  }

  if (kind === 'fog') {
    tips.push('Χαμηλή ορατότητα: κράτα αποστάσεις και προσοχή στην οδήγηση.');
    tips.push('Χρησιμοποίησε φώτα πορείας όπου χρειάζεται.');
  }

  if (kind === 'clear' || kind === 'partly_cloudy') {
    tips.push('Γυαλιά ηλίου και καλή διάθεση.');
    tips.push('Αν θα είσαι έξω, ένα αντηλιακό βοηθάει.');
  }

  if (temperature >= 30) {
    tips.push('Ζέστη σήμερα: πιες νερό και προτίμησε σκιά.');
    tips.push('Απόφυγε έκθεση στον ήλιο 12:00–16:00.');
  } else if (temperature <= 8) {
    tips.push('Κρύο σήμερα: πάρε ζακέτα ή μπουφάν.');
    tips.push('Ένα ζεστό ρόφημα πριν φύγεις κάνει τη διαφορά.');
  } else if (temperature <= 14) {
    tips.push('Πιθανόν να χρειαστεί μια ελαφριά ζακέτα.');
  }

  if (typeof precipitationProbability === 'number' && precipitationProbability >= 60) {
    tips.push('Μεγάλη πιθανότητα βροχής: πάρε ομπρέλα ή αδιάβροχο.');
  }

  if (typeof windSpeed === 'number' && windSpeed >= 30) {
    tips.push('Έχει αρκετό αέρα: κράτα καλά την πόρτα στην είσοδο.');
    tips.push('Στερέωσε ό,τι είναι ελαφρύ σε μπαλκόνι/βεράντα.');
  }

  return uniqueTips(tips);
};

const pickDifferent = (pool: string[], previous?: string) => {
  if (pool.length === 0) return '';
  if (pool.length === 1) return pool[0];
  let next = previous;
  for (let attempts = 0; attempts < 6 && next === previous; attempts += 1) {
    next = pool[Math.floor(Math.random() * pool.length)];
  }
  return next && next !== previous ? next : pool[0];
};

export default function WeatherWidgetMorningOverview({ data, isLoading, error }: BaseWidgetProps) {
  const building = data?.building;

  const city = data?.building_info?.city || building?.city || 'Αθήνα';

  const parsedLatitude =
    typeof building?.latitude === 'number'
      ? building.latitude
      : typeof building?.latitude === 'string'
        ? Number(building.latitude)
        : undefined;
  const parsedLongitude =
    typeof building?.longitude === 'number'
      ? building.longitude
      : typeof building?.longitude === 'string'
        ? Number(building.longitude)
        : undefined;

  const hasCoords = Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude);
  const weatherQueryKey = hasCoords
    ? (['morning-weather', parsedLatitude, parsedLongitude] as const)
    : (['morning-weather', 'city', city] as const);

  const {
    data: weatherData,
    isLoading: isWeatherLoading,
    error: weatherError,
  } = useQuery({
    queryKey: weatherQueryKey,
    queryFn: async (): Promise<MorningWeatherData> => {
      let latitude = hasCoords ? (parsedLatitude as number) : undefined;
      let longitude = hasCoords ? (parsedLongitude as number) : undefined;
      let resolvedLocation = `${city}, Ελλάδα`;

      if (!hasCoords) {
        try {
          const geoResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=el&format=json`
          );
          if (geoResponse.ok) {
            const geoJson = await geoResponse.json();
            const best = geoJson?.results?.[0];
            if (typeof best?.latitude === 'number' && typeof best?.longitude === 'number') {
              latitude = best.latitude;
              longitude = best.longitude;
              if (typeof best?.name === 'string' && best.name.trim()) {
                resolvedLocation = `${best.name.trim()}, Ελλάδα`;
              }
            }
          }
        } catch {
        }
      }

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        latitude = 37.9755;
        longitude = 23.7348;
        resolvedLocation = 'Αθήνα, Ελλάδα';
      }

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max&timezone=Europe%2FAthens&forecast_days=1`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const apiData = await response.json();
      const daily = apiData?.daily;

      const todayWeathercode = Number(daily?.weathercode?.[0] ?? apiData?.current_weather?.weathercode ?? 1);
      const temperature = Math.round(Number(apiData?.current_weather?.temperature ?? 22));
      const windSpeed = apiData?.current_weather?.windspeed;

      const tempMax = daily?.temperature_2m_max?.[0];
      const tempMin = daily?.temperature_2m_min?.[0];
      const precipitationProbability = daily?.precipitation_probability_max?.[0];

      return {
        temperature,
        weathercode: todayWeathercode,
        description: getWeatherDescription(todayWeathercode),
        location: resolvedLocation,
        wind_speed: typeof windSpeed === 'number' ? Math.round(windSpeed) : undefined,
        temp_max: typeof tempMax === 'number' ? Math.round(tempMax) : undefined,
        temp_min: typeof tempMin === 'number' ? Math.round(tempMin) : undefined,
        precipitation_probability: typeof precipitationProbability === 'number' ? Math.round(precipitationProbability) : undefined,
      };
    },
    staleTime: 10 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });

  const weather = useMemo<MorningWeatherData>(() => {
    return (
      weatherData ?? {
        temperature: 22,
        weathercode: 1,
        description: 'Λίγα σύννεφα',
        location: `${city}, Ελλάδα`,
        temp_max: 25,
        temp_min: 18,
        precipitation_probability: 0,
        wind_speed: 12,
      }
    );
  }, [weatherData, city]);

  const kind = useMemo(
    () => classifyWeather(weather.weathercode, weather.precipitation_probability),
    [weather.weathercode, weather.precipitation_probability]
  );

  const tipPool = useMemo(
    () =>
      buildTipPool({
        kind,
        temperature: weather.temperature,
        precipitationProbability: weather.precipitation_probability,
        windSpeed: weather.wind_speed,
      }),
    [kind, weather.temperature, weather.precipitation_probability, weather.wind_speed]
  );

  const [currentTip, setCurrentTip] = useState('');
  const [tipAnimationKey, setTipAnimationKey] = useState(0);

  useEffect(() => {
    if (tipPool.length === 0) return;

    setCurrentTip((prev) => pickDifferent(tipPool, prev || undefined));
    setTipAnimationKey((prev) => prev + 1);

    const interval = setInterval(() => {
      setCurrentTip((prev) => pickDifferent(tipPool, prev || undefined));
      setTipAnimationKey((prev) => prev + 1);
    }, 9000);

    return () => clearInterval(interval);
  }, [tipPool]);

  const temperatureTone =
    weather.temperature >= 30
      ? 'from-amber-200 to-rose-200'
      : weather.temperature <= 8
        ? 'from-sky-200 to-indigo-200'
        : 'from-white to-blue-100';

  const hasPrecipitation =
    typeof weather.precipitation_probability === 'number' && weather.precipitation_probability > 0;

  const summaryChips = useMemo(() => {
    const chips: Array<{ label: string; value: string }> = [];
    if (typeof weather.temp_max === 'number' || typeof weather.temp_min === 'number') {
      const parts = [
        typeof weather.temp_max === 'number' ? `Υψηλή ${weather.temp_max}°` : null,
        typeof weather.temp_min === 'number' ? `Χαμηλή ${weather.temp_min}°` : null,
      ].filter(Boolean);
      if (parts.length > 0) {
        chips.push({ label: 'Σήμερα', value: parts.join(' • ') });
      }
    }
    if (hasPrecipitation) {
      chips.push({ label: 'Βροχή', value: `${weather.precipitation_probability}%` });
    }
    if (typeof weather.wind_speed === 'number' && weather.wind_speed > 0) {
      chips.push({ label: 'Άνεμος', value: `${weather.wind_speed} km/h` });
    }
    return chips;
  }, [weather.temp_max, weather.temp_min, weather.precipitation_probability, weather.wind_speed, hasPrecipitation]);

  if (isLoading || isWeatherLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300" />
      </div>
    );
  }

  if (error || weatherError) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-sm">{error || 'Weather data unavailable'}</p>
        </div>
      </div>
    );
  }

  const displayedTip = currentTip || tipPool[0] || 'Δείτε αναλυτικά την πρόγνωση στην εφαρμογή.';

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.14em] text-blue-200/80">ΚΑΙΡΟΣ ΣΗΜΕΡΑ</p>
          <div className="mt-2 flex items-end gap-4">
            <div className={`text-[84px] font-extrabold leading-none tracking-tight bg-gradient-to-b ${temperatureTone} bg-clip-text text-transparent tabular-nums`}>
              {weather.temperature}°
            </div>
            <div className="pb-2">
              <div className="text-[54px] leading-none">{getWeatherEmoji(weather.weathercode)}</div>
            </div>
          </div>
          <div className="mt-1 text-base text-blue-100 font-semibold leading-tight">{weather.description}</div>
          <div className="text-sm text-blue-300 truncate">{weather.location}</div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {summaryChips.length > 0 && (
            <div className="flex flex-col gap-2">
              {summaryChips.slice(0, 3).map((chip) => (
                <div
                  key={chip.label}
                  className="px-3 py-2 rounded-xl border border-blue-600/30 bg-blue-900/30 text-right"
                >
                  <div className="text-[10px] uppercase tracking-[0.12em] text-blue-200/70">{chip.label}</div>
                  <div className="text-sm font-semibold text-white">{chip.value}</div>
                </div>
              ))}
            </div>
          )}
          <div className="text-[11px] text-blue-300/80">Ανανέωση κάθε 15’</div>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-blue-200" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white">Μικρή συμβουλή</div>
              <div key={tipAnimationKey} className="tipFadeIn text-sm text-blue-100 leading-snug">
                {displayedTip}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .tipFadeIn {
          animation: tipFadeIn 420ms ease;
        }
        @keyframes tipFadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
