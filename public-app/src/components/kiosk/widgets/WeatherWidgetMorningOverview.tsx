'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { useQuery } from '@tanstack/react-query';
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

type Season = 'winter' | 'spring' | 'summer' | 'autumn';
type TimeOfDay = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';

const getCurrentSeason = (date: Date = new Date()): Season => {
  const month = date.getMonth(); // 0-11
  if (month >= 2 && month <= 4) return 'spring';    // Μάρτιος-Μάιος
  if (month >= 5 && month <= 8) return 'summer';    // Ιούνιος-Σεπτέμβριος
  if (month >= 9 && month <= 10) return 'autumn';   // Οκτώβριος-Νοέμβριος
  return 'winter';                                   // Δεκέμβριος-Φεβρουάριος
};

const getTimeOfDay = (date: Date = new Date()): TimeOfDay => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';     // 05:00-11:59
  if (hour >= 12 && hour < 14) return 'noon';       // 12:00-13:59
  if (hour >= 14 && hour < 18) return 'afternoon';  // 14:00-17:59
  if (hour >= 18 && hour < 22) return 'evening';    // 18:00-21:59
  return 'night';                                    // 22:00-04:59
};

const getGreeting = (timeOfDay: TimeOfDay): string => {
  switch (timeOfDay) {
    case 'morning':
      return 'Καλημέρα';
    case 'noon':
      return 'Καλό μεσημέρι';
    case 'afternoon':
      return 'Καλό απόγευμα';
    case 'evening':
      return 'Καλησπέρα';
    case 'night':
      return 'Καληνύχτα';
  }
};

const getSpecialDayMessages = (date: Date): string[] => {
  const messages: string[] = [];
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();
  const month = date.getMonth();

  if (dayOfWeek === 1) {
    messages.push('Καλή εβδομάδα!');
  }
  if (dayOfMonth === 1) {
    messages.push('Καλό μήνα!');
  }
  if (dayOfMonth === 1 && month === 0) {
    messages.push('Καλή χρονιά!');
  }

  return messages;
};

const buildTipPool = ({
  kind,
  temperature,
  precipitationProbability,
  windSpeed,
  season,
  timeOfDay,
  hour,
}: {
  kind: WeatherKind;
  temperature: number;
  precipitationProbability?: number;
  windSpeed?: number;
  season: Season;
  timeOfDay: TimeOfDay;
  hour: number;
}) => {
  const tips: string[] = [];
  const greeting = getGreeting(timeOfDay);
  const isRainyOrCloudy = kind === 'rain' || kind === 'storm' || kind === 'cloudy' || kind === 'fog';
  const isSunny = kind === 'clear' || kind === 'partly_cloudy';
  const willRain = typeof precipitationProbability === 'number' && precipitationProbability >= 50;
  const isDaytime = timeOfDay === 'morning' || timeOfDay === 'noon' || timeOfDay === 'afternoon';
  const isEarlyMorning = timeOfDay === 'morning' && hour < 9;

  // ===== ΒΡΟΧΗ / ΚΑΤΑΙΓΙΔΑ =====
  if (kind === 'rain' || willRain) {
    tips.push('Μη ξεχάσεις την ομπρέλα σου!');
    tips.push('Βροχερή μέρα – πάρε αδιάβροχο ή ομπρέλα.');
    tips.push('Προσοχή στις γλιστερές επιφάνειες.');
    if (isDaytime) {
      tips.push('Άφησε λίγο παραπάνω χρόνο για τη μετακίνηση.');
    }
    if (temperature <= 10) {
      tips.push('Κρύο και βροχή – ντύσου ζεστά και πάρε ομπρέλα.');
    }
  }

  if (kind === 'storm') {
    tips.push('Αναμένεται καταιγίδα – απόφυγε άσκοπες μετακινήσεις.');
    tips.push('Κλείσε καλά πόρτες και παράθυρα.');
    tips.push('Ασφάλισε τα αντικείμενα στο μπαλκόνι.');
  }

  // ===== ΧΙΟΝΙ =====
  if (kind === 'snow') {
    tips.push('Χιονίζει! Ντύσου πολύ ζεστά.');
    tips.push('Προσοχή στον πάγο – φόρεσε αντιολισθητικά παπούτσια.');
    tips.push('Πρόσεχε τις παγωμένες επιφάνειες στην είσοδο.');
  }

  // ===== ΟΜΙΧΛΗ =====
  if (kind === 'fog') {
    tips.push('Χαμηλή ορατότητα λόγω ομίχλης – προσοχή στην οδήγηση.');
    if (isDaytime) {
      tips.push('Χρησιμοποίησε τα φώτα ομίχλης αν οδηγείς.');
    }
  }

  // ===== ΗΛΙΟΦΑΝΕΙΑ - ΑΝΑΛΟΓΑ ΜΕ ΕΠΟΧΗ ΚΑΙ ΘΕΡΜΟΚΡΑΣΙΑ =====
  if (isSunny && !willRain) {
    // Καλοκαίρι με ζέστη
    if (season === 'summer' && temperature >= 25 && isDaytime) {
      tips.push('Πάρε αντηλιακό και γυαλιά ηλίου!');
      tips.push('Προτίμησε ελαφριά ρούχα σε ανοιχτά χρώματα.');
      if (temperature >= 30) {
        tips.push('Ιδανική μέρα για παραλία – μη ξεχάσεις το καπέλο.');
      }
    } else if (season === 'summer' && temperature >= 20 && isDaytime) {
      tips.push('Ευχάριστη ζέστη – ιδανική μέρα για βόλτα.');
      tips.push('Μη ξεχάσεις τα γυαλιά ηλίου σου!');
    }
    // Άνοιξη
    else if (season === 'spring') {
      if (temperature >= 20 && isDaytime) {
        tips.push('Ανοιξιάτικη μέρα – ιδανική για βόλτα!');
        tips.push('Ο ήλιος λάμπει – πάρε τα γυαλιά σου.');
      } else if (temperature >= 14) {
        tips.push('Καλός καιρός αλλά μπορεί να δροσίσει – πάρε μια ζακέτα.');
        tips.push('Απολαύστε την ανοιξιάτικη μέρα!');
      } else {
        tips.push('Ηλιοφάνεια αλλά κρύο – ντύσου σε στρώσεις.');
      }
    }
    // Φθινόπωρο
    else if (season === 'autumn') {
      if (temperature >= 18 && isDaytime) {
        tips.push('Φθινοπωρινή ζέστη – απόλαυσε τον ήλιο.');
        tips.push('Καλή μέρα για περπάτημα στη φύση!');
      } else if (temperature >= 12) {
        tips.push('Ηλιοφάνεια αλλά δροσιά – πάρε μια ζακέτα.');
      } else {
        tips.push('Ήλιος αλλά κρύο – φόρεσε κάτι ζεστό.');
      }
    }
    // Χειμώνας με ηλιοφάνεια
    else if (season === 'winter') {
      if (temperature >= 12 && isDaytime) {
        tips.push('Σπάνια ζεστή χειμωνιάτικη μέρα – βγες για λίγο έξω!');
        tips.push('Λιακάδα τον χειμώνα – απόλαυσέ την!');
      } else if (temperature >= 5) {
        tips.push('Ηλιοφάνεια αλλά κρύο – μην ξεγελαστείς, φόρεσε μπουφάν.');
        tips.push('Ο ήλιος βγήκε αλλά κάνει κρύο – ντύσου ζεστά.');
      } else {
        tips.push('Πολύ κρύο παρά τον ήλιο – ντύσου με γάντια και σκούφο.');
        tips.push('Παγωνιά σήμερα – φόρεσε πολλά στρώματα ρούχων.');
      }
    }
  }

  // ===== ΣΥΝΝΕΦΙΑ ΧΩΡΙΣ ΒΡΟΧΗ =====
  if (kind === 'cloudy' && !willRain) {
    if (season === 'winter') {
      tips.push('Συννεφιασμένος χειμωνιάτικος ουρανός – ντύσου ζεστά.');
    } else if (season === 'summer' && isDaytime) {
      tips.push('Συννεφιά σήμερα – ιδανικό αν θες να αποφύγεις τη ζέστη.');
    } else {
      tips.push('Συννεφιά αλλά χωρίς βροχή – καλή συνέχεια!');
    }
  }

  // ===== ΘΕΡΜΟΚΡΑΣΙΑ – ΓΕΝΙΚΑ =====
  const isWindy = typeof windSpeed === 'number' && windSpeed >= 25;

  if (temperature >= 35 && isDaytime) {
    tips.push('Καύσωνας! Πιες πολύ νερό και απόφυγε τον ήλιο 12:00–17:00.');
    tips.push('Πολύ μεγάλη ζέστη – προτίμησε κλιματιζόμενους χώρους.');
  } else if (temperature >= 30 && isDaytime) {
    tips.push('Ζεστά σήμερα – πιες αρκετό νερό.');
    tips.push('Απόφυγε την έκθεση στον ήλιο τις μεσημεριανές ώρες.');
  } else if (temperature <= 0) {
    tips.push('Θερμοκρασίες κάτω από το μηδέν – πιθανός παγετός.');
    tips.push('Προσοχή σε πάγο σε είσοδο/σκαλιά και στα πεζοδρόμια.');
  } else if (temperature <= 3) {
    tips.push('Πολύ κρύο σήμερα – κοντά στους 0–3°C υπάρχει κίνδυνος παγετού.');
    tips.push('Προσοχή σε γλιστερές επιφάνειες (σκαλιά/είσοδος).');
    if (timeOfDay === 'night' || isEarlyMorning) {
      tips.push('Αν οδηγείς, δώσε χρόνο για ξεθάμπωμα και πιθανό πάγο στο παρμπρίζ.');
    }
  } else if (temperature <= 7) {
    tips.push('Κρύο σήμερα – μπουφάν, κασκόλ και ζεστό ντύσιμο.');
    if (isEarlyMorning) {
      tips.push('Πρωινό κρύο: ένα επιπλέον στρώμα ρούχων θα βοηθήσει.');
    }
    if (isWindy) {
      tips.push('Με τον αέρα θα το νιώσεις πιο κρύο.');
    }
  } else if (temperature <= 12 && season !== 'summer') {
    tips.push('Ψύχρα σήμερα – ζακέτα ή ελαφρύ μπουφάν θα χρειαστεί.');
    if (isEarlyMorning && !isRainyOrCloudy) {
      tips.push('Το πρωί θα το νιώσεις πιο κρύο, ειδικά στη σκιά.');
    }
    if (isWindy) {
      tips.push('Με τον αέρα, η αίσθηση μπορεί να είναι χαμηλότερη.');
    }
  } else if (temperature <= 16 && season !== 'summer') {
    tips.push('Δροσερά – μια ζακέτα είναι καλή ιδέα.');
  }

  // ===== ΑΝΕΜΟΣ =====
  if (typeof windSpeed === 'number') {
    if (windSpeed >= 50) {
      tips.push('Θυελλώδεις άνεμοι! Απόφυγε τις εξόδους αν δεν είναι απαραίτητες.');
      tips.push('Μάζεψε τα ελαφριά αντικείμενα από το μπαλκόνι.');
    } else if (windSpeed >= 35) {
      tips.push('Δυνατός αέρας – κράτα καλά τις πόρτες.');
      tips.push('Στερέωσε ό,τι είναι ελαφρύ στο μπαλκόνι.');
    } else if (windSpeed >= 25) {
      tips.push('Έχει αρκετό αέρα σήμερα.');
    }
  }

  // ===== ΦΙΛΙΚΟΣ ΧΑΙΡΕΤΙΣΜΟΣ (ανά ώρα) =====
  if (timeOfDay === 'night') {
    tips.push(`${greeting}! Καλή ξεκούραση.`);
    tips.push('Καλό βράδυ!');
  } else if (timeOfDay === 'evening') {
    tips.push(`${greeting}! Καλό βράδυ.`);
    tips.push('Καλή συνέχεια!');
  } else if (timeOfDay === 'morning') {
    tips.push(`${greeting}! Καλή αρχή.`);
    tips.push(`${greeting}! Καλή συνέχεια στην ημέρα σας.`);
  } else {
    tips.push(`${greeting}! Καλή συνέχεια.`);
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
  const now = new Date();
  const timeOfDay = getTimeOfDay(now);
  const season = getCurrentSeason(now);
  const hour = now.getHours();
  const greeting = getGreeting(timeOfDay);
  const specialDayMessages = getSpecialDayMessages(now);

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
        season,
        timeOfDay,
        hour,
      }),
    [kind, weather.temperature, weather.precipitation_probability, weather.wind_speed, season, timeOfDay, hour]
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

  const temperatureTone = 'from-lime-200 via-lime-300 to-lime-400';

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

  const fallbackTip =
    timeOfDay === 'night'
      ? `${greeting}! Καλή ξεκούραση.`
      : timeOfDay === 'evening'
        ? `${greeting}! Καλό βράδυ.`
        : `${greeting}! Καλή συνέχεια στην ημέρα σας.`;

  const displayedTip = currentTip || tipPool[0] || fallbackTip;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.14em] text-blue-200/80">ΚΑΙΡΟΣ ΣΗΜΕΡΑ</p>
          <div className="mt-2 flex items-center gap-5">
            {/* Θερμοκρασία και Emoji */}
            <div className="flex items-end gap-3 flex-shrink-0">
              <div className={`text-[84px] font-extrabold leading-none tracking-tight bg-gradient-to-b ${temperatureTone} bg-clip-text text-transparent tabular-nums`}>
                {weather.temperature}°
              </div>
              <div className="pb-2">
                <div className="text-[54px] leading-none">{getWeatherEmoji(weather.weathercode)}</div>
              </div>
            </div>

            {/* Συμβουλή δίπλα από τη θερμοκρασία */}
            <div className="flex-1 min-w-0 self-center">
              {specialDayMessages.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2 text-lg font-semibold text-orange-100 leading-snug">
                  {specialDayMessages.map((message) => (
                    <span key={message} className="whitespace-nowrap">
                      {message}
                    </span>
                  ))}
                </div>
              )}
              <div key={tipAnimationKey} className="tipFadeIn text-xl text-orange-200 font-medium leading-relaxed">
                {displayedTip}
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="text-base text-blue-100 font-semibold leading-tight">{weather.description}</div>
            <span className="text-blue-400/50">•</span>
            <div className="text-sm text-blue-300 truncate">{weather.location}</div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
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
          <div className="text-[11px] text-blue-300/80">Ανανέωση κάθε 15'</div>
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
