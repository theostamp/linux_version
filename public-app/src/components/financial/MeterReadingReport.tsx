'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useMeterReadings } from '../../hooks/useMeterReadings';
import { useExpenses } from '../../hooks/useExpenses';
import { fetchBuilding, fetchApartments } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  CalendarIcon,
  Building,
  TrendingUp,
  FileSpreadsheet,
  Thermometer,
  Droplets,
  Zap,
  Edit,
  Printer
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog';
import { MeterReadingDatasheet } from './MeterReadingDatasheet';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { typography } from '@/lib/typography';

interface ApartmentReading {
  apartment_id: number;
  apartment_number: string;
  owner_name: string;
  heating_mills: number;
  participation_mills: number;
  previous_reading?: number;
  current_reading: number;
  heating_percentage: number;
}

interface MeterReadingReportProps {
  buildingId: number;
  selectedMonth?: string;
}

export const MeterReadingReport: React.FC<MeterReadingReportProps> = ({
  buildingId,
  selectedMonth,
}) => {
  const [buildingData, setBuildingData] = useState<any>(null);
  const [apartments, setApartments] = useState<any[]>([]);
  const [heatingExpenseAmount, setHeatingExpenseAmount] = useState<number>(0);
  const [previousMonthExpense, setPreviousMonthExpense] = useState<number>(0);
  const [yearlyExpenseTotal, setYearlyExpenseTotal] = useState<number>(0);
  const [apartmentsLoading, setApartmentsLoading] = useState(true);
  const [showEditDatasheet, setShowEditDatasheet] = useState(false);
  
  const {
    readings,
    loading,
    statistics,
    fetchReadings,
  } = useMeterReadings(buildingId);
  
  const { getExpenses } = useExpenses();

  // Load building and apartment data
  useEffect(() => {
    const loadBuildingData = async () => {
      try {
        setApartmentsLoading(true);
        const [buildingResponse, apartmentsResponse] = await Promise.all([
          fetchBuilding(buildingId),
          fetchApartments(buildingId)
        ]);
        
        setBuildingData(buildingResponse);
        setApartments(apartmentsResponse);
      } catch (error) {
        console.error('Error loading building data:', error);
      } finally {
        setApartmentsLoading(false);
      }
    };

    loadBuildingData();
  }, [buildingId]);

  // Get heating meter type from readings
  const heatingMeterType = useMemo(() => {
    const heatingReading = readings.find(r => 
      r.meter_type === 'heating_hours' || r.meter_type === 'heating_kwh'
    );
    return heatingReading?.meter_type || 'heating_hours';
  }, [readings]);

  // Load heating expenses when meter type changes
  useEffect(() => {
    const loadHeatingExpenses = async () => {
      if ((heatingMeterType === 'heating_hours' || heatingMeterType === 'heating_kwh') && buildingId) {
        try {
          // Current month expenses - get all heating-related categories
          const baseFilters: any = {
            building_id: buildingId
          };
          
          if (selectedMonth) {
            const [year, month] = selectedMonth.split('-');
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            baseFilters.date_from = `${selectedMonth}-01`;
            baseFilters.date_to = `${selectedMonth}-${lastDay.toString().padStart(2, '0')}`;
          }
          
          // Get heating expenses from all heating-related categories
          const heatingCategories = ['heating_fuel', 'heating_gas', 'heating_maintenance', 'heating_repair', 'heating_inspection', 'heating_modernization'];
          const allExpenses = [];
          
          // Try each heating category separately to handle errors gracefully
          for (const category of heatingCategories) {
            try {
              const expenses = await getExpenses({ ...baseFilters, category });
              allExpenses.push(...expenses);
            } catch (error) {
              console.warn(`🔥 Could not fetch ${category} expenses:`, error);
            }
          }
          
          const currentTotal = allExpenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount.toString()), 0);
          setHeatingExpenseAmount(currentTotal);
          
          // Previous month expenses
          if (selectedMonth) {
            const [year, month] = selectedMonth.split('-');
            const prevMonth = parseInt(month) - 1;
            const prevYear = prevMonth === 0 ? parseInt(year) - 1 : parseInt(year);
            const actualPrevMonth = prevMonth === 0 ? 12 : prevMonth;
            const prevMonthStr = `${prevYear}-${actualPrevMonth.toString().padStart(2, '0')}`;
            
            const prevLastDay = new Date(prevYear, actualPrevMonth, 0).getDate();
            const prevBaseFilters = {
              building_id: buildingId,
              date_from: `${prevMonthStr}-01`,
              date_to: `${prevMonthStr}-${prevLastDay.toString().padStart(2, '0')}`
            };
            
            // Get previous month expenses from all heating-related categories
            const allPrevExpenses = [];
            
            // Try each heating category separately to handle errors gracefully
            for (const category of heatingCategories) {
              try {
                const prevExpenses = await getExpenses({ ...prevBaseFilters, category });
                allPrevExpenses.push(...prevExpenses);
              } catch (error) {
                console.warn(`🔥 Could not fetch ${category} expenses for previous month:`, error);
              }
            }
            
            const prevTotal = allPrevExpenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount.toString()), 0);
            setPreviousMonthExpense(prevTotal);
          }
          
          // Yearly total expenses
          if (selectedMonth) {
            const [year] = selectedMonth.split('-');
            const yearlyBaseFilters = {
              building_id: buildingId,
              date_from: `${year}-01-01`,
              date_to: `${year}-12-31`
            };
            
            // Get yearly expenses from all heating-related categories
            const allYearlyExpenses = [];
            
            // Try each heating category separately to handle errors gracefully
            for (const category of heatingCategories) {
              try {
                const yearlyExpenses = await getExpenses({ ...yearlyBaseFilters, category });
                allYearlyExpenses.push(...yearlyExpenses);
              } catch (error) {
                console.warn(`🔥 Could not fetch ${category} expenses for yearly total:`, error);
              }
            }
            
            const yearlyTotal = allYearlyExpenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount.toString()), 0);
            setYearlyExpenseTotal(yearlyTotal);
          }
          
          console.log('🔥 MeterReadingReport heating expenses loaded:', {
            current: currentTotal,
            previous: 'loading...',
            yearly: 'loading...'
          });
          
        } catch (error) {
          console.error('Error fetching heating expenses:', error);
          setHeatingExpenseAmount(0);
          setPreviousMonthExpense(0);
          setYearlyExpenseTotal(0);
        }
      }
    };

    loadHeatingExpenses();
  }, [heatingMeterType, buildingId, selectedMonth, getExpenses]);

  // Group readings by apartment and create datasheet format
  const apartmentReadings = useMemo(() => {
    if (!apartments.length || !readings.length) return [];

    console.log('🏠 MeterReadingReport apartmentReadings calculation:', {
      apartments: apartments.length,
      readings: readings.length,
      heatingMeterType,
      sampleApartment: apartments[0] ? { id: apartments[0].id, number: apartments[0].number } : null,
      sampleReading: readings[0] ? { apartment: readings[0].apartment, meter_type: readings[0].meter_type } : null
    });

    return apartments.map(apartment => {
      // Find readings for this apartment with the heating meter type
      // Since apartment field in readings contains strings like "Αλκμάνος 22 - 1", we need to match by apartment number
      const apartmentReadingData = readings.filter(r => {
        if (r.meter_type !== heatingMeterType) return false;
        
        // Try exact ID match first (in case apartment is a number)
        if (r.apartment === apartment.id) return true;
        
        // Try apartment number match (for string format like "Αλκμάνος 22 - 1")
        const apartmentStr = r.apartment?.toString() || '';
        const apartmentNumberFromString = apartmentStr.split(' - ')[1] || apartmentStr.split('-')[1]?.trim();
        
        return apartmentNumberFromString === apartment.number?.toString();
      });
      
      console.log(`🔍 Apartment ${apartment.number} (ID: ${apartment.id}) - Found ${apartmentReadingData.length} readings for ${heatingMeterType}`, {
        readingApartmentValues: readings.map(r => r.apartment).slice(0, 3)
      });

      // Get the most recent reading
      const mostRecentReading = apartmentReadingData
        .sort((a, b) => new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime())[0];

      const currentReading = mostRecentReading ? parseFloat(mostRecentReading.value.toString()) : 0;
      const previousReading = mostRecentReading?.previous_value ? parseFloat(mostRecentReading.previous_value.toString()) : 0;

      return {
        apartment_id: apartment.id,
        apartment_number: apartment.number,
        owner_name: apartment.owner_name || '-',
        heating_mills: apartment.heating_mills || 0,
        participation_mills: apartment.participation_mills || 0,
        previous_reading: previousReading,
        current_reading: currentReading,
        heating_percentage: apartment.heating_mills ? (apartment.heating_mills / 1000) * 100 : 0,
        reading_date: mostRecentReading?.reading_date || '',
      };
    });
  }, [apartments, readings, heatingMeterType]);

  // Calculate totals
  const totalConsumption = apartmentReadings.reduce((sum, reading) => {
    const consumption = Math.max(0, reading.current_reading - (reading.previous_reading || 0));
    return sum + consumption;
  }, 0);

  const totalHeatingMills = apartmentReadings.reduce((sum, reading) => sum + reading.heating_mills, 0);

  // Handler functions
  const handleEditDatasheetSuccess = () => {
    setShowEditDatasheet(false);
    fetchReadings();
  };

  const handleEditDatasheetCancel = () => {
    setShowEditDatasheet(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const getMeterTypeIcon = (meterType: string) => {
    switch (meterType) {
      case 'heating_hours':
      case 'heating_kwh':
        return <Thermometer className="h-4 w-4" />;
      case 'water_cold':
      case 'water_hot':
        return <Droplets className="h-4 w-4" />;
      case 'electricity':
        return <Zap className="h-4 w-4" />;
      default:
        return <FileSpreadsheet className="h-4 w-4" />;
    }
  };

  if (loading || apartmentsLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-pulse">Φόρτωση φύλλου μετρήσεων...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header με στατιστικά - optimized for print */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:gap-2">
          {/* Current Month Expense */}
          <Card>
            <CardContent className="p-4 print:p-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600 print:h-4 print:w-4" />
                <div>
                  <p className="text-sm text-muted-foreground print:text-xs">Τρέχων Μήνας</p>
                  <p className="text-2xl font-bold text-blue-600 print:text-lg">€{heatingExpenseAmount.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Previous Month Expense */}
          <Card>
            <CardContent className="p-4 print:p-2">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-5 w-5 text-gray-500 print:h-4 print:w-4" />
                <div>
                  <p className="text-sm text-muted-foreground print:text-xs">Προηγ. Μήνας</p>
                  <p className="text-2xl font-bold text-gray-600 print:text-lg">€{previousMonthExpense.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Monthly Difference */}
          <Card>
            <CardContent className="p-4 print:p-2">
              <div className="flex items-center space-x-2">
                {(() => {
                  const difference = heatingExpenseAmount - previousMonthExpense;
                  const isIncrease = difference > 0;
                  const percentage = previousMonthExpense > 0 ? ((difference / previousMonthExpense) * 100) : 0;
                  
                  return (
                    <>
                      <div className={`h-5 w-5 print:h-4 print:w-4 ${isIncrease ? 'text-red-500' : difference < 0 ? 'text-green-500' : 'text-gray-500'}`}>
                        {isIncrease ? '📈' : difference < 0 ? '📉' : '➖'}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground print:text-xs">Διαφορά</p>
                        <p className={`text-2xl font-bold print:text-lg ${isIncrease ? 'text-red-600' : difference < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                          {difference > 0 ? '+' : ''}€{difference.toFixed(0)}
                        </p>
                        {previousMonthExpense > 0 && (
                          <p className={`text-xs print:text-[10px] ${isIncrease ? 'text-red-500' : difference < 0 ? 'text-green-500' : 'text-gray-500'}`}>
                            {percentage > 0 ? '+' : ''}{percentage.toFixed(1)}%
                          </p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
          
          {/* Yearly Total */}
          <Card>
            <CardContent className="p-4 print:p-2">
              <div className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-purple-600 print:h-4 print:w-4" />
                <div>
                  <p className="text-sm text-muted-foreground print:text-xs">Σύνολο Έτους</p>
                  <p className="text-2xl font-bold text-purple-600 print:text-lg">€{yearlyExpenseTotal.toFixed(0)}</p>
                  {selectedMonth && (
                    <p className="text-xs text-gray-500 print:text-[10px]">
                      {selectedMonth.split('-')[0]}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      {apartments.length > 0 && (
        <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border print:hidden">
          <div>
            <p className="font-medium text-blue-900">Ενέργειες</p>
            <p className="text-sm text-blue-700">
              {apartmentReadings.length > 0 ? 'Επεξεργασία ή εκτύπωση φύλλου' : 'Δημιουργία νέου φύλλου μετρήσεων'}
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={showEditDatasheet} onOpenChange={setShowEditDatasheet}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white hover:bg-blue-50">
                  <Edit className="h-4 w-4 mr-2" />
                  {apartmentReadings.length > 0 ? 'Επεξεργασία' : 'Νέα Μέτρηση'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {apartmentReadings.length > 0 ? 'Επεξεργασία Φύλλου Μετρήσεων' : 'Νέο Φύλλο Μετρήσεων'}
                  </DialogTitle>
                  <DialogDescription>
                    {apartmentReadings.length > 0 
                      ? 'Επεξεργασία όλων των μετρήσεων σε μορφή πίνακα - Αλλάξτε όποιες τιμές χρειάζεται'
                      : 'Δημιουργία νέου φύλλου μετρήσεων για όλα τα διαμερίσματα'
                    }
                  </DialogDescription>
                </DialogHeader>
                <MeterReadingDatasheet
                  buildingId={buildingId}
                  selectedMonth={selectedMonth}
                  onSuccess={handleEditDatasheetSuccess}
                  onCancel={handleEditDatasheetCancel}
                />
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="default" 
              size="sm" 
              onClick={handlePrint}
              className="bg-green-600 hover:bg-green-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Εκτύπωση
            </Button>
          </div>
        </div>
      )}

      {/* Building Info */}
      {buildingData && (
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border print:p-2 print:bg-white">
          <Building className="h-4 w-4 text-gray-600" />
          <div>
            <p className="font-medium text-gray-800 print:text-sm">{buildingData.name}</p>
            <p className="text-sm text-gray-600 print:text-xs">
              {buildingData.heating_system === 'hour_meters' ? '🔥 Αυτονομία με Ωρομετρητές' : 
               buildingData.heating_system === 'heat_meters' ? '🔥 Αυτονομία με Θερμιδομετρητές' :
               buildingData.heating_system === 'conventional' ? '🔥 Συμβατικό Σύστημα' :
               '❄️ Χωρίς Κεντρική Θέρμανση'}
            </p>
          </div>
        </div>
      )}

      {/* Datasheet Table - Main Content */}
      {apartmentReadings.length > 0 && (
        <Card>
          <CardHeader className="print:p-2">
            <CardTitle className="flex items-center gap-2 print:text-lg">
              Φύλλο Μετρήσεων - {selectedMonth}
              <Badge variant="secondary" className="print:text-xs">
                {apartmentReadings.length} διαμερίσματα
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="print:p-1">
            <div className="overflow-x-auto border rounded-lg print:border-gray-400">
              <table className="w-full text-sm print:text-xs">
                <thead className="bg-gray-50 border-b print:bg-gray-100">
                  <tr>
                    <th className={`p-2 text-center ${typography.tableHeader} leading-tight print:p-1`}>
                      Διαμέρισμα
                    </th>
                    <th className={`p-2 text-center ${typography.tableHeader} leading-tight print:p-1`}>
                      Ιδιοκτήτης
                    </th>
                    <th className={`p-2 text-center ${typography.tableHeader} leading-tight print:p-1`}>
                      Χιλιοστά<br/>Συμμετοχής
                    </th>
                    {(buildingData?.heating_system === 'hour_meters' || buildingData?.heating_system === 'heat_meters') && (
                      <>
                        <th className={`p-2 text-center ${typography.tableHeader} leading-tight print:p-1`}>
                          Χιλιοστά<br/>Θέρμανσης
                        </th>
                        <th className={`p-2 text-center ${typography.tableHeader} leading-tight print:p-1`}>
                          %<br/>Θέρμανσης
                        </th>
                      </>
                    )}
                    <th className={`p-2 text-center ${typography.tableHeader} leading-tight print:p-1`}>
                      Προηγούμενη<br/>Μέτρηση
                    </th>
                    <th className={`p-2 text-center ${typography.tableHeader} leading-tight print:p-1`}>
                      Τρέχουσα<br/>Μέτρηση
                    </th>
                    <th className={`p-2 text-center ${typography.tableHeader} leading-tight print:p-1`}>
                      Κατανάλωση<br/>(Διαφορά)
                    </th>
                    {(heatingMeterType === 'heating_hours' || heatingMeterType === 'heating_kwh') && (
                      <>
                        <th className={`p-2 text-center ${typography.tableHeader} leading-tight bg-blue-50 print:p-1`}>
                          Πάγιο<br/>(€)
                        </th>
                        <th className={`p-2 text-center ${typography.tableHeader} leading-tight bg-green-50 print:p-1`}>
                          Κατανάλωση<br/>(€)
                        </th>
                        <th className={`p-2 text-center ${typography.tableHeader} leading-tight print:p-1`}>
                          Σύνολο<br/>(€)
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {apartmentReadings.map((reading, index) => {
                    const consumption = Math.max(0, reading.current_reading - (reading.previous_reading || 0));
                    
                    // Calculate amounts if heating expense exists
                    const fixedChargePercentage = (buildingData?.heating_fixed_percentage || 30) / 100;
                    const fixedAmount = (reading.participation_mills / 1000) * heatingExpenseAmount * fixedChargePercentage;
                    const variableChargePercentage = 1 - fixedChargePercentage;
                    const consumptionAmount = totalConsumption > 0 
                      ? (consumption / totalConsumption) * heatingExpenseAmount * variableChargePercentage
                      : 0;
                    const totalAmount = fixedAmount + consumptionAmount;

                    return (
                      <tr key={reading.apartment_id} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'} print:hover:bg-white`}>
                        <td className="p-3 font-medium text-blue-700 print:p-1 print:text-black">{reading.apartment_number}</td>
                        <td className="p-3 print:p-1">{reading.owner_name}</td>
                        <td className="p-3 text-center text-sm text-gray-600 print:p-1">{reading.participation_mills}‰</td>
                        
                        {(buildingData?.heating_system === 'hour_meters' || buildingData?.heating_system === 'heat_meters') && (
                          <>
                            <td className="p-3 text-center text-sm text-orange-600 font-medium print:p-1">
                              {reading.heating_mills || '-'}‰
                            </td>
                            <td className="p-3 text-center text-sm text-orange-600 font-medium print:p-1">
                              {reading.heating_percentage > 0 ? `${reading.heating_percentage.toFixed(1)}%` : '-'}
                            </td>
                          </>
                        )}
                        
                        <td className="p-3 text-center print:p-1">
                          <div className="text-sm font-mono px-2 py-1 rounded bg-blue-50 border border-blue-200 print:bg-transparent print:border-none">
                            {reading.previous_reading !== undefined 
                              ? `${reading.previous_reading.toFixed(2)}` 
                              : 'Δεν υπάρχει'}
                          </div>
                        </td>
                        
                        <td className="p-3 text-center print:p-1">
                          <div className="text-sm font-mono px-2 py-1 rounded bg-green-50 border border-green-200 print:bg-transparent print:border-none">
                            {reading.current_reading.toFixed(2)}
                          </div>
                        </td>
                        
                        <td className="p-3 text-center print:p-1">
                          <div className={`text-sm font-medium px-2 py-1 rounded ${
                            consumption > 0 ? 'text-green-700 bg-green-100 print:bg-transparent' : 'text-gray-500'
                          }`}>
                            {consumption > 0 ? consumption.toFixed(2) : '-'}
                          </div>
                        </td>
                        
                        {(heatingMeterType === 'heating_hours' || heatingMeterType === 'heating_kwh') && (
                          <>
                            {/* Fixed Charge Column */}
                            <td className="p-3 text-center print:p-1">
                              <div className={`text-sm font-medium px-2 py-1 rounded bg-blue-50 print:bg-transparent ${
                                fixedAmount > 0 ? 'text-blue-700' : 'text-gray-500'
                              }`}>
                                {heatingExpenseAmount > 0 ? `€${fixedAmount.toFixed(2)}` : '€0.00'}
                              </div>
                            </td>
                            
                            {/* Consumption Charge Column */}
                            <td className="p-3 text-center print:p-1">
                              <div className={`text-sm font-medium px-2 py-1 rounded bg-green-50 print:bg-transparent ${
                                consumptionAmount > 0 ? 'text-green-700' : 'text-gray-500'
                              }`}>
                                {heatingExpenseAmount > 0 ? `€${consumptionAmount.toFixed(2)}` : '€0.00'}
                              </div>
                            </td>
                            
                            {/* Total Amount Column */}
                            <td className="p-3 text-center print:p-1">
                              <div className={`text-sm font-medium px-2 py-1 rounded ${
                                totalAmount > 0 ? 'text-orange-700 bg-orange-100 print:bg-transparent' : 'text-gray-500'
                              }`}>
                                {heatingExpenseAmount > 0 ? `€${totalAmount.toFixed(2)}` : '€0.00'}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning message when no heating expenses */}
      {apartmentReadings.length > 0 && (heatingMeterType === 'heating_hours' || heatingMeterType === 'heating_kwh') && heatingExpenseAmount === 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 print:hidden">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Σημείωση:</strong> Τα ποσά εμφανίζονται ως €0.00 επειδή δεν έχει καταχωρηθεί δαπάνη θέρμανσης για τον μήνα {selectedMonth || 'αυτό'}.
                Προσθέστε δαπάνη θέρμανσης για να υπολογιστούν τα σωστά ποσά.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats - optimized for print */}
      {apartmentReadings.length > 0 && heatingMeterType && (
        <div className={`grid grid-cols-1 ${(heatingMeterType === 'heating_hours' || heatingMeterType === 'heating_kwh') && heatingExpenseAmount > 0 ? 'md:grid-cols-6' : 'md:grid-cols-3'} gap-4 p-4 bg-green-50 rounded-lg border border-green-200 print:bg-white print:border-slate-200 print:gap-2 print:p-2`}>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-700 print:text-lg">{apartmentReadings.length}</div>
            <div className="text-sm text-green-600 print:text-xs">Διαμερίσματα</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-700 print:text-lg">
              {totalConsumption.toFixed(2)}
            </div>
            <div className="text-sm text-green-600 print:text-xs">Συνολική Κατανάλωση</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-700 print:text-lg">{totalHeatingMills}‰</div>
            <div className="text-sm text-green-600 print:text-xs">Χιλιοστά Θέρμανσης</div>
          </div>
          {(heatingMeterType === 'heating_hours' || heatingMeterType === 'heating_kwh') && (() => {
            const fixedChargePercentage = (buildingData?.heating_fixed_percentage || 30) / 100;
            const variableChargePercentage = 1 - fixedChargePercentage;
            const totalFixedAmount = heatingExpenseAmount * fixedChargePercentage;
            const totalVariableAmount = heatingExpenseAmount * variableChargePercentage;
            
            return (
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-700 print:text-lg">€{heatingExpenseAmount.toFixed(2)}</div>
                  <div className="text-sm text-orange-600 print:text-xs">Σύνολο Δαπάνης</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-700 print:text-lg">€{totalFixedAmount.toFixed(2)}</div>
                  <div className="text-sm text-blue-600 print:text-xs">Πάγιο ({(fixedChargePercentage * 100).toFixed(0)}%)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700 print:text-lg">€{totalVariableAmount.toFixed(2)}</div>
                  <div className="text-sm text-green-600 print:text-xs">Κατανάλωση ({(variableChargePercentage * 100).toFixed(0)}%)</div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Print footer */}
      <div className="hidden print:block text-center text-xs text-gray-500 mt-4">
        Φύλλο Μετρήσεων - {buildingData?.name} - {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: el })}
      </div>
    </div>
  );
};