'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Thermometer, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ConsumptionData {
  month: string;
  consumption: number;
  cost: number;
  efficiency: number;
}

interface HeatingConsumptionChartWidgetProps {
  data?: ConsumptionData[];
}

export default function HeatingConsumptionChartWidget({ data }: HeatingConsumptionChartWidgetProps) {
  // Mock data for demonstration
  const mockData: ConsumptionData[] = [
    { month: 'Ιαν', consumption: 1200, cost: 480.00, efficiency: 85 },
    { month: 'Φεβ', consumption: 1350, cost: 540.00, efficiency: 82 },
    { month: 'Μαρ', consumption: 1100, cost: 440.00, efficiency: 88 },
    { month: 'Απρ', consumption: 850, cost: 340.00, efficiency: 90 },
    { month: 'Μαϊ', consumption: 650, cost: 260.00, efficiency: 92 },
    { month: 'Ιουν', consumption: 400, cost: 160.00, efficiency: 95 },
    { month: 'Ιουλ', consumption: 300, cost: 120.00, efficiency: 96 },
    { month: 'Αυγ', consumption: 280, cost: 112.00, efficiency: 97 },
    { month: 'Σεπ', consumption: 450, cost: 180.00, efficiency: 93 },
    { month: 'Οκτ', consumption: 750, cost: 300.00, efficiency: 89 },
    { month: 'Νοε', consumption: 980, cost: 392.00, efficiency: 86 },
    { month: 'Δεκ', consumption: 1150, cost: 460.00, efficiency: 84 }
  ];

  const displayData = data || mockData;
  
  const maxConsumption = Math.max(...displayData.map(d => d.consumption));
  const currentMonth = displayData[displayData.length - 1];
  const previousMonth = displayData[displayData.length - 2];
  
  const consumptionChange = previousMonth ? 
    ((currentMonth.consumption - previousMonth.consumption) / previousMonth.consumption) * 100 : 0;

  const getTrendIcon = (change: number) => {
    if (change > 5) return <TrendingUp className="w-4 h-4 text-red-400" />;
    if (change < -5) return <TrendingDown className="w-4 h-4 text-green-400" />;
    return <Minus className="w-4 h-4 text-yellow-400" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 5) return 'text-red-400';
    if (change < -5) return 'text-green-400';
    return 'text-yellow-400';
  };

  return (
    <div className="mt-8">
      <div className="bg-orange-600/20 p-6 rounded-lg border border-orange-400/30 max-w-5xl mx-auto">
        <div className="flex items-center justify-center mb-6">
          <Thermometer className="w-8 h-8 mr-3" />
          <h3 className="text-2xl font-bold">Διάγραμμα Κατανάλωσης Θέρμανσης</h3>
        </div>

        {/* Current Month Stats */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-300">{currentMonth.consumption.toLocaleString()} kWh</p>
            <p className="text-sm text-orange-200">Τρέχουσα κατανάλωση</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-300">€{currentMonth.cost.toFixed(2)}</p>
            <p className="text-sm text-orange-200">Τρέχον κόστος</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-300">{currentMonth.efficiency}%</p>
            <p className="text-sm text-orange-200">Απόδοση συστήματος</p>
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-lg">
            {getTrendIcon(consumptionChange)}
            <span className={`font-semibold ${getTrendColor(consumptionChange)}`}>
              {consumptionChange > 0 ? '+' : ''}{consumptionChange.toFixed(1)}% από τον προηγούμενο μήνα
            </span>
          </div>
        </div>

        {/* Simple Bar Chart */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-4 text-center">Κατανάλωση ανά Μήνα</h4>
          <div className="flex items-end justify-between h-48 bg-white/5 p-4 rounded-lg">
            {displayData.map((item, index) => {
              const height = (item.consumption / maxConsumption) * 100;
              return (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div 
                    className="bg-orange-400 w-full rounded-t transition-all duration-500 hover:bg-orange-300"
                    style={{ height: `${height}%` }}
                    title={`${item.month}: ${item.consumption} kWh (€${item.cost.toFixed(2)})`}
                  />
                  <p className="text-xs mt-2 text-center">{item.month}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Efficiency Chart */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-4 text-center">Απόδοση Συστήματος</h4>
          <div className="grid grid-cols-4 gap-3">
            {displayData.slice(-4).map((item, index) => (
              <div key={index} className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="transparent"
                      className="text-white/20"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (1 - item.efficiency / 100)}`}
                      className="text-green-400"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold">{item.efficiency}%</span>
                  </div>
                </div>
                <p className="text-xs text-orange-200">{item.month}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-white/5 p-4 rounded-lg">
          <h4 className="text-lg font-semibold mb-3 text-center">Συμβουλές Εξοικονόμησης</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
              <p className="text-orange-200">Ρυθμίστε τη θερμοκρασία στους 20°C</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
              <p className="text-orange-200">Κλείστε τα παράθυρα όταν λειτουργεί η θέρμανση</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
              <p className="text-orange-200">Χρησιμοποιήστε προγραμματισμό θέρμανσης</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
              <p className="text-orange-200">Ελέγξτε την μόνωση των παραθύρων</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
