import { useState, useEffect, useMemo } from 'react';
import { useMeterReadings } from '@/hooks/useMeterReadings';

interface ChartData {
  readings: Array<{
    period: string;
    apartments: Record<string, {
      value: number;
      consumption: number;
      readings: number;
    }>;
  }>;
  consumption: Array<{
    period: string;
    total: number;
    apartments: Record<string, number>;
  }>;
  trends: Array<{
    period: string;
    change: number;
  }>;
  statistics: {
    totalReadings: number;
    averageConsumption: number;
    periodCount: number;
  };
}

interface ChartOptions {
  apartmentId?: number;
  period?: 'month' | 'quarter' | 'year';
}

export const useChartData = (options: ChartOptions = {}) => {
  const { readings, loading, error } = useMeterReadings();
  
  const [chartData, setChartData] = useState<ChartData>({
    readings: [],
    consumption: [],
    trends: [],
    statistics: {
      totalReadings: 0,
      averageConsumption: 0,
      periodCount: 0,
    },
  });

  const processedData = useMemo(() => {
    if (!readings || readings.length === 0) {
      return chartData;
    }

    // Φιλτράρισμα ανά διαμέρισμα αν δοθεί apartmentId
    let filteredReadings = readings;
    if (options.apartmentId) {
      filteredReadings = readings.filter(
        (reading) => reading.apartment === options.apartmentId
      );
    }

    const period = options.period || 'month';

    // Συνάρτηση για μορφοποίηση ημερομηνίας ανά περίοδο
    const formatDate = (date: Date, periodType: string) => {
      if (periodType === 'month') {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (periodType === 'quarter') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `${date.getFullYear()}-Q${quarter}`;
      } else if (periodType === 'year') {
        return date.getFullYear().toString();
      }
      return date.toLocaleDateString('el-GR');
    }

    // Επεξεργασία δεδομένων
    const readingsData = filteredReadings.reduce((acc, reading) => {
      const date = new Date(reading.reading_date);
      const periodKey = formatDate(date, period);
      const apartmentName = reading.apartment_number?.toString() || 'Unknown';
      const consumption = Number(reading.consumption) || 0;

      if (!acc[periodKey]) {
        acc[periodKey] = {};
      }

      if (!acc[periodKey][apartmentName]) {
        acc[periodKey][apartmentName] = {
          value: Number(reading.value) || 0,
          consumption: consumption,
          readings: 1,
        };
      } else {
        acc[periodKey][apartmentName].value = Number(reading.value) || 0;
        acc[periodKey][apartmentName].consumption += consumption;
        acc[periodKey][apartmentName].readings += 1;
      }

      return acc;
    }, {} as Record<string, Record<string, { value: number; consumption: number; readings: number }>>);

    // Μετατροπή σε array
    const readingsArray = Object.entries(readingsData).map(([period, apartments]) => ({
      period,
      apartments,
    }));

    // Υπολογισμός consumption data
    const consumptionData = Object.entries(readingsData).map(([period, apartments]) => {
      const total = Object.values(apartments).reduce((sum, apt) => sum + apt.consumption, 0);
      const apartmentsConsumption = Object.entries(apartments).reduce((acc, [aptName, aptData]) => {
        acc[aptName] = aptData.consumption;
        return acc;
      }, {} as Record<string, number>);

      return {
        period,
        total,
        apartments: apartmentsConsumption,
      };
    });

    // Υπολογισμός trends
    const trendsData = consumptionData.map((current, index) => {
      if (index === 0) return { period: current.period, change: 0 };
      
      const previous = consumptionData[index - 1];
      return {
        period: current.period,
        change: previous.total === 0 ? 0 : ((current.total - previous.total) / previous.total) * 100,
      };
    });

    // Υπολογισμός στατιστικών
    const totalReadings = filteredReadings.length;
    const totalConsumption = consumptionData.reduce((sum, period) => sum + period.total, 0);
    const averageConsumption = consumptionData.length > 0 ? totalConsumption / consumptionData.length : 0;

    const statistics = {
      totalReadings,
      averageConsumption,
      periodCount: consumptionData.length,
    };

    return {
      readings: readingsArray,
      consumption: consumptionData,
      trends: trendsData,
      statistics,
    };
  }, [readings, options.apartmentId, options.period]);

  useEffect(() => {
    setChartData(processedData);
  }, [processedData]);

  const getApartmentNames = (): string[] => {
    if (!readings) return [];
    const names = new Set(readings.map(reading => reading.apartment_number?.toString() || 'Unknown'));
    return Array.from(names);
  };

  const getPeriodData = (periodKey: string) => {
    return chartData.readings.find(data => data.period === periodKey);
  };

  const getConsumptionTrend = (periodKey: string) => {
    const trend = chartData.trends.find(t => t.period === periodKey);
    return trend ? trend.change : 0;
  };

  const getTopConsumers = (limit: number = 5): Array<{ apartment: string; consumption: number }> => {
    if (!readings) return [];

    const apartmentConsumption = readings.reduce((acc, reading) => {
      const apartmentName = reading.apartment_number?.toString() || 'Unknown';
      const consumption = Number(reading.consumption) || 0;

      if (!acc[apartmentName]) {
        acc[apartmentName] = 0;
      }
      acc[apartmentName] += consumption;

      return acc;
    }, {} as Record<string, number>);

    return Object.entries(apartmentConsumption)
      .map(([apartment, consumption]) => ({ apartment, consumption }))
      .sort((a, b) => b.consumption - a.consumption)
      .slice(0, limit);
  };

  return {
    chartData,
    loading,
    error,
    getApartmentNames,
    getPeriodData,
    getConsumptionTrend,
    getTopConsumers,
  };
};