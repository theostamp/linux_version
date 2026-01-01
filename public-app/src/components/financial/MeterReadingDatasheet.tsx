'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useMeterReadings } from '../../hooks/useMeterReadings';
import { useExpenses } from '../../hooks/useExpenses';
import { fetchBuilding, fetchApartments } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CalendarIcon, Loader2, FileSpreadsheet, Building, TrendingUp } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '../../lib/utils';
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
  amount?: number;
}

interface MeterReadingDatasheetFormData {
  reading_date: string;
  meter_type: string;
  readings: ApartmentReading[];
}

interface MeterReadingDatasheetProps {
  buildingId: number;
  selectedMonth?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const MeterReadingDatasheet: React.FC<MeterReadingDatasheetProps> = ({
  buildingId,
  selectedMonth: propSelectedMonth,
  onSuccess,
  onCancel,
}) => {
  const [meterTypes, setMeterTypes] = useState<Array<{value: string, label: string}>>([]);
  const [buildingData, setBuildingData] = useState<any>(null);
  const [apartments, setApartments] = useState<any[]>([]);
  const [apartmentsLoading, setApartmentsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<string>(propSelectedMonth || format(new Date(), 'yyyy-MM'));
  const [totalHeatingMills, setTotalHeatingMills] = useState(0);
  const [heatingExpenseAmount, setHeatingExpenseAmount] = useState<number>(0);
  const [loadingPreviousReadings, setLoadingPreviousReadings] = useState(false);
  const loadingReadingsRef = useRef(false);
  const { createReading, updateReading, fetchMeterTypes, fetchReadings, readings, loading } = useMeterReadings(buildingId);

  // Debug log readings changes
  useEffect(() => {
    console.log('🔍 Readings state changed:', {
      count: readings.length,
      buildingId: buildingId,
      readings: readings.map(r => ({
        id: r.id,
        apartment_id: r.apartment,
        apartment_number: r.apartment_number,
        meter_type: r.meter_type,
        value: r.value,
        reading_date: r.reading_date
      }))
    });
  }, [readings, buildingId]);
  const { getExpenses } = useExpenses();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<MeterReadingDatasheetFormData>({
    defaultValues: {
      reading_date: format(new Date(), 'yyyy-MM-dd'),
      meter_type: '', // Will be auto-set based on building heating system
      readings: []
    }
  });

  const { fields, replace } = useFieldArray({
    control,
    name: 'readings'
  });

  const watchedMeterType = watch('meter_type');

  // Stable fetchReadings reference
  const stableFetchReadings = useCallback(async (filters: any) => {
    if (fetchReadings) {
      return fetchReadings(filters);
    }
  }, [fetchReadings]);

  // Stable replace reference without fields dependency to prevent loops
  const stableReplace = useCallback((data: any) => {
    replace(data);
  }, [replace]);

  // Fetch heating expenses for the selected month
  const fetchHeatingExpenses = useCallback(async (date: string) => {
    try {
      const monthStart = format(new Date(date), 'yyyy-MM-01');
      const monthEnd = format(new Date(new Date(date).getFullYear(), new Date(date).getMonth() + 1, 0), 'yyyy-MM-dd');

      // Fetch all heating-related expenses
      const expenses = await getExpenses({
        building_id: buildingId,
        category: 'heating', // Generic heating category
        date_from: monthStart,
        date_to: monthEnd
      });

      // Also check for specific heating fuel types
      const fuelExpenses = await getExpenses({
        building_id: buildingId,
        category: 'heating_fuel', // πετρέλαιο θέρμανσης
        date_from: monthStart,
        date_to: monthEnd
      });

      const gasExpenses = await getExpenses({
        building_id: buildingId,
        category: 'heating_gas', // φυσικό αέριο θέρμανσης
        date_from: monthStart,
        date_to: monthEnd
      });

      const totalAmount = [...expenses, ...fuelExpenses, ...gasExpenses].reduce((sum, exp) => sum + exp.amount, 0);
      setHeatingExpenseAmount(totalAmount);

      console.log('🔥 Heating expenses for month:', { expenses, gasExpenses, totalAmount });

      return totalAmount;
    } catch (error) {
      console.error('Error fetching heating expenses:', error);
      return 0;
    }
  }, [buildingId, getExpenses]);


  // Load building data and apartments
  useEffect(() => {
    const loadData = async () => {
      try {
        setApartmentsLoading(true);

        // Fetch building data
        const building = await fetchBuilding(buildingId);
        setBuildingData(building);
        console.log('🏢 Building data:', building);

        // Fetch apartments
        const apartmentsList = await fetchApartments(buildingId);
        setApartments(apartmentsList || []);
        console.log('🏠 Apartments:', apartmentsList);

        // Also try to fetch any existing readings to populate the readings state
        console.log('🔄 Attempting to load all readings for building on component mount');
        try {
          await fetchReadings();
          console.log('✅ Successfully fetched readings on component mount');
        } catch (readingsError) {
          console.warn('⚠️ Could not fetch readings on component mount:', readingsError);
        }

        // Fetch meter types
        const types = await fetchMeterTypes();
        console.log('📊 Meter types:', types);

        // Transform meter types based on heating system
        const transformedTypes: Array<{value: string, label: string}> = [];
        let defaultMeterType = '';

        if (building?.heating_system === 'hour_meters') {
          transformedTypes.push(
            { value: 'heating_hours', label: '🔥 Θέρμανση (Ώρες)' },
            { value: 'water', label: '💧 Νερό (m³)' },
            { value: 'electricity', label: '⚡ Ηλεκτρικό (kWh)' }
          );
          defaultMeterType = 'heating_hours'; // Default για Αθήνα με ωρομετρητές
        } else if (building?.heating_system === 'heat_meters') {
          transformedTypes.push(
            { value: 'heating_kwh', label: '🔥 Θέρμανση (kWh)' },
            { value: 'water', label: '💧 Νερό (m³)' },
            { value: 'electricity', label: '⚡ Ηλεκτρικό (kWh)' }
          );
          defaultMeterType = 'heating_kwh'; // Default για θερμιδομετρητές
        } else {
          // Για κτίρια χωρίς κεντρική θέρμανση, προσφέρουμε νερό και ρεύμα
          transformedTypes.push(
            { value: 'water', label: '💧 Νερό (m³)' },
            { value: 'electricity', label: '⚡ Ηλεκτρικό (kWh)' }
          );
          defaultMeterType = 'water'; // Default για κτίρια χωρίς θέρμανση
        }

        setMeterTypes(transformedTypes);

        // Αυτόματη επιλογή του κατάλληλου τύπου μετρητή
        if (defaultMeterType) {
          console.log(`🎯 Auto-selecting meter type: ${defaultMeterType} for heating system: ${building?.heating_system}`);
          setValue('meter_type', defaultMeterType);
        }

        // Initialize readings array with apartment data
        if (apartmentsList && apartmentsList.length > 0) {
          const totalHeating = apartmentsList.reduce((sum, apt) => sum + (apt.heating_mills || 0), 0);
          setTotalHeatingMills(totalHeating);

          const initialReadings = apartmentsList.map(apartment => ({
            apartment_id: apartment.id,
            apartment_number: apartment.number,
            owner_name: apartment.owner_name || 'Άγνωστος',
            heating_mills: apartment.heating_mills || 0,
            participation_mills: apartment.participation_mills || 0,
            current_reading: 0,
            heating_percentage: totalHeating > 0 ? ((apartment.heating_mills || 0) / totalHeating * 100) : 0,
            notes: ''
          }));

          stableReplace(initialReadings);
        }

      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Σφάλμα φόρτωσης δεδομένων');
      } finally {
        setApartmentsLoading(false);
      }
    };

    if (buildingId) {
      loadData();
    }
  }, [buildingId, fetchMeterTypes, stableReplace]);

  // Load previous readings when meter type changes
  useEffect(() => {
    const loadPreviousReadings = async () => {
      if (!watchedMeterType || !apartments.length || loadingReadingsRef.current) {
        console.log('📊 Skipping readings load:', { watchedMeterType, apartments: apartments.length, loading: loadingReadingsRef.current });
        return;
      }

      console.log('📊 Loading previous readings for meter type:', watchedMeterType, 'for', apartments.length, 'apartments');
      loadingReadingsRef.current = true;
      setLoadingPreviousReadings(true);

      try {
        console.log('📊 Calling stableFetchReadings with:', {
          meter_type: watchedMeterType,
          buildingId: buildingId
        });

        const result = await stableFetchReadings({
          meter_type: watchedMeterType
        });

        console.log('📊 FetchReadings result:', result);
        console.log('📊 Previous readings loaded successfully');

      } catch (error) {
        console.error('❌ Error loading previous readings:', error);
      } finally {
        loadingReadingsRef.current = false;
        setLoadingPreviousReadings(false);
      }
    };

    loadPreviousReadings();
  }, [watchedMeterType, apartments.length, buildingId, stableFetchReadings]);

  // Separate effect to update form when readings change
  useEffect(() => {
    if (!readings.length || !apartments.length || !fields.length || !watchedMeterType) {
      console.log('🔄 Skipping form update:', { readings: readings.length, apartments: apartments.length, fields: fields.length, meterType: watchedMeterType });
      return;
    }

    console.log('🔄 Updating form with readings:', readings.length, 'readings for', apartments.length, 'apartments', 'fields:', fields.length);
    console.log('🔄 Current meter type:', watchedMeterType);
    console.log('🔄 All readings data:', readings.map(r => ({
      id: r.id,
      apartment_id: r.apartment,
      apartment_number: r.apartment_number,
      meter_type: r.meter_type,
      value: r.value
    })));
    console.log('🏠 Apartments data:', apartments.map(a => ({
      id: a.id,
      number: a.number,
      owner_name: a.owner_name
    })));

    // Group readings by apartment and get the previous_value from the API response
    const latestReadings = apartments.map(apartment => {
      // Enhanced matching logic for apartment readings
      const apartmentReadings = readings?.filter((r: any) => {
        if (r.meter_type !== watchedMeterType) return false;

        // Try exact ID match first (in case apartment is a number)
        if (r.apartment === apartment.id) return true;

        // Try apartment number match (for string format like "Αλκμάνος 22 - 1")
        const apartmentStr = r.apartment?.toString() || '';
        const apartmentNumberFromString = apartmentStr.split(' - ')[1] || apartmentStr.split('-')[1]?.trim();

        if (apartmentNumberFromString === apartment.number?.toString()) return true;

        // Fallback: try apartment_number field if it exists
        if (r.apartment_number === apartment.number) return true;

        return false;
      }) || [];

      console.log(`📋 Apartment ${apartment.number} (ID: ${apartment.id}) readings for ${watchedMeterType}:`, apartmentReadings.length);
      if (apartmentReadings.length > 0) {
        console.log('📋 Found readings:', apartmentReadings.map(r => ({
          apartment_id: r.apartment,
          apartment_number: r.apartment_number,
          meter_type: r.meter_type,
          value: r.value,
          date: r.reading_date
        })));
      } else {
        console.log('❌ No readings found for apartment', apartment.number, 'with meter_type', watchedMeterType);
        console.log('Available readings for this apartment:', readings.filter(r =>
          r.apartment === apartment.id ||
          r.apartment_number === apartment.number
        ));
      }

      // Filter readings to only include those BEFORE the selected month
      const selectedMonthStart = new Date(`${selectedMonth}-01`);
      const previousMonthReadings = apartmentReadings.filter((r: any) => {
        const readingDate = new Date(r.reading_date);
        return readingDate < selectedMonthStart;
      });

      // Sort by reading_date to get the most recent reading before selected month
      const sortedPreviousReadings = previousMonthReadings.sort(
        (a: any, b: any) => new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime()
      );

      // Use the most recent reading before selected month as the "previous reading"
      const latestPreviousReading = sortedPreviousReadings[0];
      const currentValueOfLatestReading = latestPreviousReading?.value; // This becomes our "previous reading"

      console.log(`📋 Previous month reading for apt ${apartment.number}:`, {
        selectedMonth,
        previousReadingsCount: previousMonthReadings.length,
        latestPreviousValue: currentValueOfLatestReading,
        latestPreviousDate: latestPreviousReading?.reading_date,
        willBeUsedAsPrevious: currentValueOfLatestReading
      });

      return {
        apartment_id: apartment.id,
        previous_reading: currentValueOfLatestReading !== undefined && currentValueOfLatestReading !== null ? parseFloat(currentValueOfLatestReading.toString()) : undefined
      };
    });

    // Only update if we have readings to populate and they're different
    const readingsWithValues = latestReadings.filter(r => r.previous_reading !== undefined);

    if (readingsWithValues.length > 0) {
      // Check if any field is missing a previous_reading that we now have
      const needsUpdate = readingsWithValues.some(latestReading => {
        const field = fields.find(f => f.apartment_id === latestReading.apartment_id);
        return field && field.previous_reading !== latestReading.previous_reading;
      });

      if (needsUpdate) {
        console.log('✅ Updating form fields with previous readings:', readingsWithValues);
        const currentReadings = fields.map((field) => ({
          ...field,
          previous_reading: latestReadings.find(r => r.apartment_id === field.apartment_id)?.previous_reading
        }));

        stableReplace(currentReadings);
      } else {
        console.log('ℹ️ No changes detected in previous readings');
      }
    }
  }, [readings, apartments, watchedMeterType, selectedMonth, stableReplace]);

  // Fetch heating expenses when meter type or month changes
  useEffect(() => {
    if (watchedMeterType && (watchedMeterType === 'heating_hours' || watchedMeterType === 'heating_kwh')) {
      // Use the selected month to determine the date for expense calculation
      const monthDate = `${selectedMonth}-15`; // Use middle of month for calculation
      fetchHeatingExpenses(monthDate);
    }
  }, [watchedMeterType, selectedMonth, fetchHeatingExpenses]);

  // Update selectedMonth when prop changes
  useEffect(() => {
    if (propSelectedMonth) {
      setSelectedMonth(propSelectedMonth);
    }
  }, [propSelectedMonth]);

  // Update reading date when month changes
  useEffect(() => {
    if (selectedMonth) {
      // Set reading date to middle of selected month
      const monthDate = `${selectedMonth}-15`;
      setValue('reading_date', monthDate);
      setSelectedDate(new Date(monthDate));
    }
  }, [selectedMonth, setValue]);

  const onSubmit = async (data: MeterReadingDatasheetFormData) => {
    try {
      console.log('📋 Submitting datasheet readings:', data);

      // Validate that new readings are not lower than previous readings
      const invalidReadings = data.readings.filter(reading => {
        if (reading.current_reading > 0 && reading.previous_reading !== undefined) {
          return reading.current_reading < reading.previous_reading;
        }
        return false;
      });

      if (invalidReadings.length > 0) {
        const invalidApartments = invalidReadings.map(r => r.apartment_number).join(', ');
        toast.error(`Οι νέες μετρήσεις δεν μπορούν να είναι μικρότερες από τις προηγούμενες. Διαμερίσματα: ${invalidApartments}`);
        return;
      }

      // Create or update readings for each apartment with delay to avoid database conflicts
      const validReadings = data.readings.filter(reading => reading.current_reading > 0);

      for (let i = 0; i < validReadings.length; i++) {
        const reading = validReadings[i];

        try {
          // Check if reading already exists for this apartment, date, and meter type
          const existingReadings = readings.filter(r =>
            r.apartment === reading.apartment_id &&
            r.meter_type === data.meter_type &&
            r.reading_date === data.reading_date
          );

          if (existingReadings.length > 0) {
            // Update existing reading
            console.log(`🔄 Updating existing reading for apartment ${reading.apartment_id}`);
            await updateReading(existingReadings[0].id, {
              apartment: reading.apartment_id,
              reading_date: data.reading_date,
              value: reading.current_reading,
              meter_type: data.meter_type
            });
          } else {
            // Create new reading
            console.log(`➕ Creating new reading for apartment ${reading.apartment_id}`);
            await createReading({
              apartment: reading.apartment_id,
              reading_date: data.reading_date,
              value: reading.current_reading,
              meter_type: data.meter_type
            });
          }
        } catch (error) {
          console.error(`❌ Error processing reading for apartment ${reading.apartment_id}:`, error);
          // Continue with next reading instead of stopping
        }

        // Add small delay between requests to avoid database conflicts
        if (i < validReadings.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
        }
      }

      reset();
      onSuccess?.();
      toast.success('Όλες οι μετρήσεις δημιουργήθηκαν επιτυχώς');
    } catch (error) {
      console.error('Σφάλμα:', error);
      toast.error('Σφάλμα κατά την αποθήκευση των μετρήσεων');
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setValue('reading_date', format(date, 'yyyy-MM-dd'));
    }
  };

  if (apartmentsLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Φόρτωση δεδομένων κτιρίου...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          Φύλλο Μετρήσεων
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Header Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            {/* Auto-selection info */}
            {watchedMeterType && (
              <div className="md:col-span-2 mb-2">
                <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-100 px-3 py-2 rounded-md">
                  <span className="text-blue-600">🎯</span>
                  <span>
                    Αυτόματη επιλογή: <strong>{meterTypes.find(t => t.value === watchedMeterType)?.label}</strong>
                    {buildingData?.heating_system === 'hour_meters' && ' (κύρια επιλογή για Αθήνα)'}
                  </span>
                </div>
              </div>
            )}

            {/* Month Selection */}
            <div className="space-y-2">
              <Label>Μήνας Μετρήσων *</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε μήνα" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const currentDate = new Date();
                    const months = [];
                    // Add current and next 3 months
                    for (let i = 0; i <= 3; i++) {
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
                      const monthStr = format(date, 'yyyy-MM');
                      const monthLabel = format(date, 'MMMM yyyy', { locale: el });
                      months.push({ value: monthStr, label: monthLabel });
                    }
                    // Add previous 6 months
                    for (let i = 1; i <= 6; i++) {
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
                      const monthStr = format(date, 'yyyy-MM');
                      const monthLabel = format(date, 'MMMM yyyy', { locale: el });
                      months.unshift({ value: monthStr, label: monthLabel });
                    }
                    return months.map(month => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label>Ημερομηνία Μετρήσης *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: el }) : "Επιλέξτε ημερομηνία"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    locale={el}
                    defaultMonth={selectedDate}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Meter Type Selection */}
            <div className="space-y-2">
              <Label>Τύπος Μετρητή *</Label>
              <Controller
                name="meter_type"
                control={control}
                rules={{ required: 'Ο τύπος μετρητή είναι υποχρεωτικός' }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Επιλέξτε τύπο μετρητή" />
                    </SelectTrigger>
                    <SelectContent>
                      {meterTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.meter_type && (
                <p className="text-sm text-red-500">{errors.meter_type.message}</p>
              )}
            </div>
          </div>

          {/* Building Info */}
          {buildingData && (
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border">
              <Building className="h-4 w-4 text-gray-600" />
              <div>
                <p className="font-medium text-gray-800">{buildingData.name}</p>
                <p className="text-sm text-gray-600">
                  {buildingData.heating_system === 'hour_meters' ? '🔥 Αυτονομία με Ωρομετρητές' :
                   buildingData.heating_system === 'heat_meters' ? '🔥 Αυτονομία με Θερμιδομετρητές' :
                   buildingData.heating_system === 'conventional' ? '🔥 Συμβατικό Σύστημα' :
                   '❄️ Χωρίς Κεντρική Θέρμανση'}
                </p>
              </div>
            </div>
          )}

          {/* Datasheet Table */}
          {fields.length > 0 && (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className={`p-2 text-center ${typography.tableHeader} leading-tight`}>
                      Διαμέρισμα
                    </th>
                    <th className={`p-2 text-center ${typography.tableHeader} leading-tight`}>
                      Ιδιοκτήτης
                    </th>
                    <th className={`p-2 text-center ${typography.tableHeader} leading-tight`}>
                      Χιλιοστά<br/>Συμμετοχής
                    </th>
                    {(buildingData?.heating_system === 'hour_meters' || buildingData?.heating_system === 'heat_meters') && (
                      <>
                        <th className={`p-2 text-center ${typography.tableHeader} leading-tight`}>
                          Χιλιοστά<br/>Θέρμανσης
                        </th>
                        <th className={`p-2 text-center ${typography.tableHeader} leading-tight`}>
                          %<br/>Θέρμανσης
                        </th>
                      </>
                    )}
                    <th className={`p-2 text-center ${typography.tableHeader} leading-tight`}>
                      Προηγούμενη<br/>Μέτρηση
                    </th>
                    <th className={`p-2 text-center ${typography.tableHeader} leading-tight`}>
                      Νέα<br/>Μέτρηση *
                    </th>
                    <th className={`p-2 text-center ${typography.tableHeader} leading-tight`}>
                      Κατανάλωση<br/>(Διαφορά)
                    </th>
                    {(watchedMeterType === 'heating_hours' || watchedMeterType === 'heating_kwh') && (
                      <>
                        <th className={`p-2 text-center ${typography.tableHeader} leading-tight bg-blue-50`}>
                          Πάγιο<br/>(€)
                        </th>
                        <th className={`p-2 text-center ${typography.tableHeader} leading-tight bg-green-50`}>
                          Κατανάλωση<br/>(€)
                        </th>
                        <th className={`p-2 text-center ${typography.tableHeader} leading-tight`}>
                          Σύνολο<br/>(€)
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Calculate total consumption for amount distribution
                    const totalConsumption = fields.reduce((sum, _, idx) => {
                      const currentReading = watch(`readings.${idx}.current_reading`) || 0;
                      const previousReading = fields[idx].previous_reading || 0;
                      const consumption = currentReading > previousReading ? currentReading - previousReading : 0;
                      return sum + consumption;
                    }, 0);

                    return fields.map((field, index) => {
                      const currentReading = watch(`readings.${index}.current_reading`);
                      const previousReading = field.previous_reading || 0;
                      const consumption = currentReading > previousReading ? currentReading - previousReading : 0;

                      return (
                      <tr key={field.id} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                        <td className="p-3 font-medium text-blue-700">{field.apartment_number}</td>
                        <td className="p-3">{field.owner_name}</td>
                        <td className="p-3 text-center text-sm text-gray-600">{field.participation_mills}‰</td>

                        {(buildingData?.heating_system === 'hour_meters' || buildingData?.heating_system === 'heat_meters') && (
                          <>
                            <td className="p-3 text-center text-sm text-orange-600 font-medium">
                              {field.heating_mills || '-'}‰
                            </td>
                            <td className="p-3 text-center text-sm text-orange-600 font-medium">
                              {field.heating_percentage > 0 ? `${field.heating_percentage.toFixed(1)}%` : '-'}
                            </td>
                          </>
                        )}

                        <td className="p-3 text-center">
                          <div className={`text-sm font-mono px-2 py-1 rounded ${
                            loadingPreviousReadings
                              ? 'text-gray-500 bg-gray-100 animate-pulse'
                              : field.previous_reading !== undefined
                                ? 'text-blue-700 bg-blue-50 border border-blue-200'
                                : 'text-gray-400 bg-gray-50'
                          }`}>
                            {loadingPreviousReadings
                              ? 'Φόρτωση...'
                              : field.previous_reading !== undefined
                                ? `${parseFloat(field.previous_reading.toString()).toFixed(2)}`
                                : 'Δεν υπάρχει'}
                          </div>
                        </td>

                        <td className="p-3">
                          <Controller
                            name={`readings.${index}.current_reading`}
                            control={control}
                            render={({ field: inputField }) => {
                              const currentValue = parseFloat(inputField.value?.toString() || '0');
                              const previousValue = field.previous_reading !== undefined ? parseFloat(field.previous_reading.toString()) : 0;
                              const isInvalid = currentValue > 0 && field.previous_reading !== undefined && currentValue < previousValue;

                              return (
                                <div className="space-y-1">
                                  <Input
                                    {...inputField}
                                    ref={(el) => {
                                      if (el) {
                                        el.setAttribute('data-index', index.toString());
                                      }
                                    }}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder=""
                                    value={inputField.value === 0 ? '' : inputField.value}
                                    className={`w-20 text-center ${isInvalid ? 'border-red-500 bg-red-50' : ''}`}
                                    onChange={(e) => {
                                      const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                      inputField.onChange(value);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        // Find next "Νέα Μέτρηση" input field
                                        const currentIndex = parseInt(e.currentTarget.getAttribute('data-index') || '0');
                                        const nextInput = document.querySelector(`input[data-index="${currentIndex + 1}"]`) as HTMLInputElement;
                                        if (nextInput) {
                                          nextInput.focus();
                                          nextInput.select();
                                        }
                                      }
                                    }}
                                  />
                                  {isInvalid && (
                                    <div className="text-xs text-red-600 text-center">
                                      Μικρότερη από προηγούμενη
                                    </div>
                                  )}
                                </div>
                              );
                            }}
                          />
                        </td>

                        <td className="p-3 text-center">
                          <div className={`text-sm font-medium px-2 py-1 rounded ${
                            consumption > 0 ? 'text-green-700 bg-green-100' : 'text-gray-500'
                          }`}>
                            {consumption > 0 ? consumption.toLocaleString() : '-'}
                          </div>
                        </td>

                        {(watchedMeterType === 'heating_hours' || watchedMeterType === 'heating_kwh') && (() => {
                          // Calculate fixed charge based on participation mills (building properties)
                          const fixedChargePercentage = (buildingData?.heating_fixed_percentage || 30) / 100;
                          const fixedAmount = (field.participation_mills / 1000) * heatingExpenseAmount * fixedChargePercentage;

                          // Calculate consumption charge based on heating mills and actual consumption
                          const variableChargePercentage = 0.7; // 70% variable charge based on consumption
                          const consumptionAmount = totalConsumption > 0
                            ? (consumption / totalConsumption) * heatingExpenseAmount * variableChargePercentage
                            : 0;

                          const totalAmount = fixedAmount + consumptionAmount;

                          return (
                            <>
                              {/* Fixed Charge Column */}
                              <td className="p-3 text-center">
                                <div className={`text-sm font-medium px-2 py-1 rounded bg-blue-50 ${
                                  fixedAmount > 0 ? 'text-blue-700' : 'text-gray-500'
                                }`}>
                                  {fixedAmount > 0 ? `€${fixedAmount.toFixed(2)}` : '-'}
                                </div>
                              </td>

                              {/* Consumption Charge Column */}
                              <td className="p-3 text-center">
                                <div className={`text-sm font-medium px-2 py-1 rounded bg-green-50 ${
                                  consumptionAmount > 0 ? 'text-green-700' : 'text-gray-500'
                                }`}>
                                  {consumptionAmount > 0 ? `€${consumptionAmount.toFixed(2)}` : '-'}
                                </div>
                              </td>

                              {/* Total Amount Column */}
                              <td className="p-3 text-center">
                                <div className={`text-sm font-medium px-2 py-1 rounded ${
                                  totalAmount > 0 ? 'text-orange-700 bg-orange-100' : 'text-gray-500'
                                }`}>
                                  {totalAmount > 0 ? `€${totalAmount.toFixed(2)}` : '-'}
                                </div>
                              </td>
                            </>
                          );
                        })()}
                      </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary Stats */}
          {fields.length > 0 && watchedMeterType && (
            <div className={`grid grid-cols-1 ${(watchedMeterType === 'heating_hours' || watchedMeterType === 'heating_kwh') ? 'md:grid-cols-6' : 'md:grid-cols-3'} gap-4 p-4 bg-green-50 rounded-lg border border-green-200`}>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">{fields.length}</div>
                <div className="text-sm text-green-600">Διαμερίσματα</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">
                  {fields.reduce((sum, _, index) => {
                    const reading = watch(`readings.${index}.current_reading`);
                    return sum + (reading || 0);
                  }, 0).toLocaleString()}
                </div>
                <div className="text-sm text-green-600">Σύνολο Μετρήσεων</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">{totalHeatingMills}‰</div>
                <div className="text-sm text-green-600">Χιλιοστά Θέρμανσης</div>
              </div>
              {(watchedMeterType === 'heating_hours' || watchedMeterType === 'heating_kwh') && (() => {
                const fixedChargePercentage = (buildingData?.heating_fixed_percentage || 30) / 100;
                const variableChargePercentage = 1 - fixedChargePercentage;
                const totalFixedAmount = heatingExpenseAmount * fixedChargePercentage;
                const totalVariableAmount = heatingExpenseAmount * variableChargePercentage;

                return (
                  <>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-700">€{heatingExpenseAmount.toFixed(2)}</div>
                      <div className="text-sm text-orange-600">Σύνολο Δαπάνης</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-700">€{totalFixedAmount.toFixed(2)}</div>
                      <div className="text-sm text-blue-600">Πάγιο ({(fixedChargePercentage * 100).toFixed(0)}%)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-700">€{totalVariableAmount.toFixed(2)}</div>
                      <div className="text-sm text-green-600">Κατανάλωση ({(variableChargePercentage * 100).toFixed(0)}%)</div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onCancel}>
              Ακύρωση
            </Button>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading || !watchedMeterType}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Αποθήκευση...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Αποθήκευση Όλων των Μετρήσεων
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
