import { useState, useEffect, useMemo } from 'react';
import { useMeterReadings } from './useMeterReadings';
import { MeterReading } from '../types/financial';

interface ChartDataOptions {
  apartmentId?: number;
  period?: 'month' | 'quarter' | 'year';
  chartType?: 'readings' | 'consumption' | 'trends';
}

interface ChartData {
  readings: any[];
  consumption: any[];
  trends: any[];
  statistics: {
    totalReadings: number;
    totalConsumption: number;
    averageConsumption: number;
    apartmentCount: number;
    periodCount: number;
  };
}

export const useChartData = (options: ChartDataOptions = {}) => {
  const { meterReadings, loading, error } = useMeterReadings();
  const [chartData, setChartData] = useState<ChartData>({
    readings: [],
    consumption: [],
    trends: [],
    statistics: {
      totalReadings: 0,
      totalConsumption: 0,
      averageConsumption: 0,
      apartmentCount: 0,
      periodCount: 0,
    },
  });

  const processedData = useMemo(() => {
    if (!meterReadings || meterReadings.length === 0) {
      return chartData;
    }

    // Φιλτράρισμα ανά διαμέρισμα αν δοθεί apartmentId
    let filteredReadings = meterReadings;
    if (options.apartmentId) {
      filteredReadings = meterReadings.filter(
        (reading) => reading.apartment === options.apartmentId
      );
    }

    const period = options.period || 'month';

    // Ομαδοποίηση ανά περίοδο και διαμέρισμα
    const groupedData = filteredReadings.reduce((acc, reading) => {
      const date = new Date(reading.reading_date);
      const periodKey = formatDate(date, period);
      const apartmentName = reading.apartment_name;
      const consumption = reading.consumption || 0;

      if (!acc[periodKey]) {
        acc[periodKey] = {};
      }

      if (!acc[periodKey][apartmentName]) {
        acc[periodKey][apartmentName] = {
          value: reading.current_value,
          consumption: consumption,
          readings: 1,
        };
      } else {
        acc[periodKey][apartmentName].value = reading.current_value;
        acc[periodKey][apartmentName].consumption += consumption;
        acc[periodKey][apartmentName].readings += 1;
      }

      return acc;
    }, {} as Record<string, Record<string, { value: number; consumption: number; readings: number }>>);

    // Ταξινόμηση περιόδων
    const sortedPeriods = Object.keys(groupedData).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });

    // Δημιουργία readings data
    const readingsData = sortedPeriods.map(periodKey => {
      const dataPoint: any = { period: periodKey };
      Object.entries(groupedData[periodKey]).forEach(([apartmentName, data]) => {
        dataPoint[apartmentName] = data.value;
      });
      return dataPoint;
    });

    // Δημιουργία consumption data
    const consumptionData = sortedPeriods.map(periodKey => {
      const dataPoint: any = { period: periodKey };
      Object.entries(groupedData[periodKey]).forEach(([apartmentName, data]) => {
        dataPoint[apartmentName] = data.consumption;
      });
      return dataPoint;
    });

    // Δημιουργία trends data (συνολική κατανάλωση ανά περίοδο)
    const trendsData = sortedPeriods.map(periodKey => {
      const totalConsumption = Object.values(groupedData[periodKey]).reduce(
        (sum, data) => sum + data.consumption, 0
      );
      return {
        period: periodKey,
        total: totalConsumption,
        average: totalConsumption / Object.keys(groupedData[periodKey]).length,
      };
    });

    // Υπολογισμός στατιστικών
    const allConsumptions = filteredReadings.map(reading => reading.consumption || 0);
    const totalConsumption = allConsumptions.reduce((sum, consumption) => sum + consumption, 0);
    const apartmentNames = new Set(filteredReadings.map(reading => reading.apartment_name));

    const statistics = {
      totalReadings: filteredReadings.length,
      totalConsumption: totalConsumption,
      averageConsumption: totalConsumption / allConsumptions.length,
      apartmentCount: apartmentNames.size,
      periodCount: sortedPeriods.length,
    };

    return {
      readings: readingsData,
      consumption: consumptionData,
      trends: trendsData,
      statistics,
    };
  }, [meterReadings, options.apartmentId, options.period]);

  useEffect(() => {
    setChartData(processedData);
  }, [processedData]);

  const formatDate = (date: Date, period: string): string => {
    switch (period) {
      case 'month':
        return date.toLocaleDateString('el-GR', { month: 'short', year: 'numeric' });
      case 'quarter':
        const quarter = Math.ceil((date.getMonth() + 1) / 3);
        return `Q${quarter} ${date.getFullYear()}`;
      case 'year':
        return date.getFullYear().toString();
      default:
        return date.toLocaleDateString('el-GR');
    }
  };

  const getApartmentNames = (): string[] => {
    if (!meterReadings) return [];
    const names = new Set(meterReadings.map(reading => reading.apartment_name));
    return Array.from(names);
  };

  const getPeriodData = (periodKey: string) => {
    return chartData.readings.find(data => data.period === periodKey);
  };

  const getConsumptionData = (periodKey: string) => {
    return chartData.consumption.find(data => data.period === periodKey);
  };

  const getTrendData = (periodKey: string) => {
    return chartData.trends.find(data => data.period === periodKey);
  };

  const calculateGrowthRate = (currentPeriod: string, previousPeriod: string): number => {
    const current = getTrendData(currentPeriod);
    const previous = getTrendData(previousPeriod);

    if (!current || !previous || previous.total === 0) {
      return 0;
    }

    return ((current.total - previous.total) / previous.total) * 100;
  };

  const getTopConsumers = (limit: number = 5): Array<{ apartment: string; consumption: number }> => {
    if (!meterReadings) return [];

    const apartmentConsumption = meterReadings.reduce((acc, reading) => {
      const apartmentName = reading.apartment_name;
      const consumption = reading.consumption || 0;

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
    getConsumptionData,
    getTrendData,
    calculateGrowthRate,
    getTopConsumers,
  };
}; 