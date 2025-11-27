import React, { useState } from 'react';
import { MeterReadingChart } from './MeterReadingChart';
import { ConsumptionChart } from './ConsumptionChart';
import { TrendAnalysis } from './TrendAnalysis';
import { HeatingConsumptionChart } from './HeatingConsumptionChart';
import { ElectricityExpensesChart } from './ElectricityExpensesChart';
import { useBuilding } from '@/components/contexts/BuildingContext';

interface ChartsContainerProps {
  apartmentId?: number;
  height?: number;
  selectedMonth?: string;
}

type ChartType = 'readings' | 'consumption' | 'trends' | 'heating' | 'electricity';

export const ChartsContainer: React.FC<ChartsContainerProps> = ({
  apartmentId,
  height = 400,
  selectedMonth,
}) => {
  // Use BuildingContext instead of props
  const { selectedBuilding } = useBuilding();
  const buildingId = selectedBuilding?.id;
  
  // Debug: Log buildingId to verify it's correct
  console.log('[ChartsContainer] BuildingId from context:', buildingId, typeof buildingId);
  
  const [activeChart, setActiveChart] = useState<ChartType>('heating');
  const [chartSubType, setChartSubType] = useState<string>('bar');
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [showPredictions, setShowPredictions] = useState(true);
  const currentYear = new Date().getFullYear();
  const [heatingYear, setHeatingYear] = useState<string>(currentYear.toString());
  const [electricityYear, setElectricityYear] = useState<string>(currentYear.toString());
  const [compareYear, setCompareYear] = useState<string>((currentYear - 1).toString());
  const [showComparison, setShowComparison] = useState(false);

  // Simplified chart types - focus on heating and electricity
  const chartTypes = [
    { id: 'heating', label: 'Θέρμανση', icon: '🔥', description: 'Κατανάλωση θέρμανσης (Σεπ-Μάι)' },
    { id: 'electricity', label: 'Ηλεκτρικό Ρεύμα', icon: '💡', description: 'Δαπάνες ρεύματος (Ιαν-Δεκ)' },
    { id: 'readings', label: 'Μετρήσεις', icon: '📊', description: 'Μετρήσεις διαμερισμάτων' },
    { id: 'consumption', label: 'Κατανάλωση', icon: '⚡', description: 'Ανάλυση κατανάλωσης' },
  ];

  const chartSubTypes = {
    readings: [
      { id: 'line', label: 'Γραμμικό' },
      { id: 'bar', label: 'Ράβδων' },
      { id: 'consumption', label: 'Κατανάλωση' },
    ],
    consumption: [
      { id: 'bar', label: 'Ράβδων' },
      { id: 'pie', label: 'Πίτας' },
      { id: 'line', label: 'Γραμμικό' },
    ],
    trends: [
      { id: 'area', label: 'Περιοχή' },
    ],
    heating: [
      { id: 'line', label: 'Γραμμικό' },
      { id: 'bar', label: 'Ράβδων' },
    ],
    electricity: [
      { id: 'bar', label: 'Ράβδων' },
      { id: 'line', label: 'Γραμμικό' },
    ],
  };

  const periods = [
    { id: 'month', label: 'Μηνιαία' },
    { id: 'quarter', label: 'Τριμηνιαία' },
    { id: 'year', label: 'Ετήσια' },
  ];

  const renderActiveChart = () => {
    const commonProps = {
      apartmentId,
      buildingId,
      selectedMonth,
      height,
      period,
    };

    switch (activeChart) {
      case 'readings':
        return (
          <MeterReadingChart
            {...commonProps}
            chartType={chartSubType as 'line' | 'bar' | 'consumption'}
          />
        );
      case 'consumption':
        return (
          <ConsumptionChart
            {...commonProps}
            chartType={chartSubType as 'bar' | 'pie' | 'line'}
          />
        );
      case 'trends':
        return (
          <TrendAnalysis
            {...commonProps}
            showPrediction={showPredictions}
            predictionMonths={3}
          />
        );
      case 'heating':
        if (!buildingId || buildingId <= 0) {
          console.error('[ChartsContainer] Invalid buildingId for heating chart:', buildingId);
          return (
            <div className="flex items-center justify-center h-64 text-red-500">
              <span>Σφάλμα: Μη έγκυρο ID κτιρίου</span>
            </div>
          );
        }
        return (
          <HeatingConsumptionChart
            heatingYear={heatingYear}
            compareYear={compareYear}
            showComparison={showComparison}
            chartType={chartSubType as 'line' | 'bar'}
            height={height}
          />
        );
      case 'electricity':
        if (!buildingId || buildingId <= 0) {
          console.error('[ChartsContainer] Invalid buildingId for electricity chart:', buildingId);
          return (
            <div className="flex items-center justify-center h-64 text-red-500">
              <span>Σφάλμα: Μη έγκυρο ID κτιρίου</span>
            </div>
          );
        }
        return (
          <ElectricityExpensesChart
            year={electricityYear}
            compareYear={compareYear}
            showComparison={showComparison}
            chartType={chartSubType as 'line' | 'bar' | 'area'}
            height={height}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Main Header */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-t-lg border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-gray-800">Ενεργειακά Διαγράμματα Κτιρίου</h2>
          {selectedMonth && (
            <div className="text-sm text-gray-600">
              📅 Τρέχων μήνας: {new Date(selectedMonth + '-01').toLocaleDateString('el-GR', {
                month: 'long',
                year: 'numeric'
              })}
            </div>
          )}
        </div>
        {/* Chart Type Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {chartTypes.map((chart) => (
            <button
              key={chart.id}
              onClick={() => {
                setActiveChart(chart.id as ChartType);
                const firstSubType = chartSubTypes[chart.id as ChartType]?.[0]?.id;
                if (firstSubType) {
                  setChartSubType(firstSubType);
                }
              }}
              className={`p-3 rounded-lg transition-all ${
                activeChart === chart.id
                  ? 'bg-white shadow-md border-2 border-primary'
                  : 'bg-muted hover:bg-accent border border-input'
              }`}
            >
              <div className="flex flex-col items-center">
                <span className="text-2xl mb-1">{chart.icon}</span>
                <span className="font-medium text-sm">{chart.label}</span>
                <span className="text-xs text-gray-500 mt-1">{chart.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Controls Section */}
      <div className="p-4 bg-muted border-b border-slate-200/50">
        <div className="flex flex-wrap items-center gap-4">

          {/* Period Selector - only for relevant charts */}
          {(activeChart === 'readings' || activeChart === 'consumption') && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Περίοδος:</span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as 'month' | 'quarter' | 'year')}
                className="px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Comparison Toggle */}
          {(activeChart === 'heating' || activeChart === 'electricity') && (
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showComparison}
                onChange={(e) => setShowComparison(e.target.checked)}
                className="rounded border-input text-primary focus:ring-ring"
              />
              <span className="text-sm text-gray-700">Σύγκριση με προηγούμενη περίοδο</span>
            </label>
          )}

          {/* Apartment Filter */}
          {apartmentId && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Διαμέρισμα:</span>
              <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm font-medium">
                #{apartmentId}
              </span>
            </div>
          )}
        </div>

        {/* Sub-type Selector */}
        {chartSubTypes[activeChart] && chartSubTypes[activeChart].length > 1 && (
          <div className="mt-3 flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Τύπος:</span>
            <div className="flex bg-muted rounded-lg p-1">
              {chartSubTypes[activeChart].map((subType) => (
                <button
                  key={subType.id}
                  onClick={() => setChartSubType(subType.id)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    chartSubType === subType.id
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {subType.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chart-specific controls */}
        <div className="mt-3">
          {activeChart === 'heating' && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">🔥 Περίοδος θέρμανσης:</span>
                <select
                  value={heatingYear}
                  onChange={(e) => setHeatingYear(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {Array.from({ length: 5 }, (_, i) => currentYear - 3 + i).map(year => (
                    <option key={year} value={year.toString()}>
                      {year}-{year + 1} (Σεπτέμβριος - Μάιος)
                    </option>
                  ))}
                </select>
              </div>
              {showComparison && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Σύγκριση με:</span>
                  <select
                    value={compareYear}
                    onChange={(e) => setCompareYear(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  >
                    {Array.from({ length: 5 }, (_, i) => currentYear - 4 + i).map(year => (
                      <option key={year} value={year.toString()}>
                        {year}-{year + 1}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          {activeChart === 'electricity' && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">💡 Έτος ηλεκτρικού:</span>
                <select
                  value={electricityYear}
                  onChange={(e) => setElectricityYear(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {Array.from({ length: 5 }, (_, i) => currentYear - 3 + i).map(year => (
                    <option key={year} value={year.toString()}>
                      {year} (Ιανουάριος - Δεκέμβριος)
                    </option>
                  ))}
                </select>
              </div>
              {showComparison && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Σύγκριση με:</span>
                  <select
                    value={compareYear}
                    onChange={(e) => setCompareYear(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  >
                    {Array.from({ length: 5 }, (_, i) => currentYear - 4 + i).map(year => (
                      <option key={year} value={year.toString()}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chart Content */}
      <div className="p-4">
        {renderActiveChart()}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-blue-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Ενεργό:</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {chartTypes.find(c => c.id === activeChart)?.icon} {chartTypes.find(c => c.id === activeChart)?.label}
              </span>
            </div>
            {chartSubTypes[activeChart] && chartSubTypes[activeChart].length > 1 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Τύπος:</span>
                <span className="text-sm font-medium text-gray-800">
                  {chartSubTypes[activeChart].find(s => s.id === chartSubType)?.label}
                </span>
              </div>
            )}
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500">Τελευταία ενημέρωση: {new Date().toLocaleTimeString('el-GR')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 