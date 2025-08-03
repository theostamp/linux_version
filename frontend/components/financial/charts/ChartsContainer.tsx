import React, { useState } from 'react';
import { MeterReadingChart } from './MeterReadingChart';
import { ConsumptionChart } from './ConsumptionChart';
import { TrendAnalysis } from './TrendAnalysis';

interface ChartsContainerProps {
  apartmentId?: number;
  height?: number;
}

type ChartType = 'readings' | 'consumption' | 'trends';

export const ChartsContainer: React.FC<ChartsContainerProps> = ({
  apartmentId,
  height = 400,
}) => {
  const [activeChart, setActiveChart] = useState<ChartType>('readings');
  const [chartSubType, setChartSubType] = useState<string>('line');
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [showPredictions, setShowPredictions] = useState(true);

  const chartTypes = [
    { id: 'readings', label: 'Μετρήσεις', icon: '📊' },
    { id: 'consumption', label: 'Κατανάλωση', icon: '⚡' },
    { id: 'trends', label: 'Τάσεις', icon: '📈' },
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
  };

  const periods = [
    { id: 'month', label: 'Μηνιαία' },
    { id: 'quarter', label: 'Τριμηνιαία' },
    { id: 'year', label: 'Ετήσια' },
  ];

  const renderActiveChart = () => {
    const commonProps = {
      apartmentId,
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
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header Controls */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Chart Type Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Γράφημα:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {chartTypes.map((chart) => (
                <button
                  key={chart.id}
                  onClick={() => {
                    setActiveChart(chart.id as ChartType);
                    // Reset subtype to first available option
                    const firstSubType = chartSubTypes[chart.id as ChartType]?.[0]?.id;
                    if (firstSubType) {
                      setChartSubType(firstSubType);
                    }
                  }}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    activeChart === chart.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <span className="mr-1">{chart.icon}</span>
                  {chart.label}
                </button>
              ))}
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Περίοδος:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'month' | 'quarter' | 'year')}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Apartment Filter */}
          {apartmentId && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Διαμέρισμα:</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                #{apartmentId}
              </span>
            </div>
          )}
        </div>

        {/* Sub-type Selector */}
        {chartSubTypes[activeChart] && chartSubTypes[activeChart].length > 1 && (
          <div className="mt-3 flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Τύπος:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {chartSubTypes[activeChart].map((subType) => (
                <button
                  key={subType.id}
                  onClick={() => setChartSubType(subType.id)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    chartSubType === subType.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {subType.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trend-specific controls */}
        {activeChart === 'trends' && (
          <div className="mt-3 flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showPredictions}
                onChange={(e) => setShowPredictions(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Εμφάνιση προβλέψεων</span>
            </label>
          </div>
        )}
      </div>

      {/* Chart Content */}
      <div className="p-4">
        {renderActiveChart()}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Ενεργό γράφημα: {chartTypes.find(c => c.id === activeChart)?.label}</span>
            <span>•</span>
            <span>Περίοδος: {periods.find(p => p.id === period)?.label}</span>
            {chartSubTypes[activeChart] && chartSubTypes[activeChart].length > 1 && (
              <>
                <span>•</span>
                <span>Τύπος: {chartSubTypes[activeChart].find(s => s.id === chartSubType)?.label}</span>
              </>
            )}
          </div>
          <div className="text-right">
            <span>Τελευταία ενημέρωση: {new Date().toLocaleTimeString('el-GR')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 