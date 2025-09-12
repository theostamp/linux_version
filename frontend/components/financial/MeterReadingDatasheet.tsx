'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useMeterReadings } from '../../hooks/useMeterReadings';
import { fetchBuilding, fetchApartments } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { CalendarIcon, Loader2, FileSpreadsheet, Building, TrendingUp, Gauge } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '../../lib/utils';

interface ApartmentReading {
  apartment_id: number;
  apartment_number: string;
  owner_name: string;
  heating_mills: number;
  participation_mills: number;
  previous_reading?: number;
  current_reading: number;
  heating_percentage: number;
  notes?: string;
}

interface MeterReadingDatasheetFormData {
  reading_date: string;
  meter_type: string;
  readings: ApartmentReading[];
}

interface MeterReadingDatasheetProps {
  buildingId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const MeterReadingDatasheet: React.FC<MeterReadingDatasheetProps> = ({
  buildingId,
  onSuccess,
  onCancel,
}) => {
  const [meterTypes, setMeterTypes] = useState<Array<{value: string, label: string}>>([]);
  const [buildingData, setBuildingData] = useState<any>(null);
  const [apartments, setApartments] = useState<any[]>([]);
  const [apartmentsLoading, setApartmentsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [totalHeatingMills, setTotalHeatingMills] = useState(0);
  const loadingReadingsRef = useRef(false);
  const { createReading, fetchMeterTypes, fetchReadings, readings, loading } = useMeterReadings(buildingId);

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
      meter_type: '',
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

  // Stable replace reference
  const stableReplace = useCallback((data: any) => {
    replace(data);
  }, [replace]);

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

        // Fetch meter types
        const types = await fetchMeterTypes();
        console.log('📊 Meter types:', types);
        
        // Transform meter types based on heating system
        const transformedTypes: Array<{value: string, label: string}> = [];
        
        if (building?.heating_system === 'hour_meters') {
          transformedTypes.push(
            { value: 'heating_hours', label: '🔥 Θέρμανση (Ώρες)' },
            { value: 'water', label: '💧 Νερό (m³)' },
            { value: 'electricity', label: '⚡ Ηλεκτρικό (kWh)' }
          );
        } else if (building?.heating_system === 'heat_meters') {
          transformedTypes.push(
            { value: 'heating_kwh', label: '🔥 Θέρμανση (kWh)' },
            { value: 'water', label: '💧 Νερό (m³)' },
            { value: 'electricity', label: '⚡ Ηλεκτρικό (kWh)' }
          );
        } else {
          transformedTypes.push(
            { value: 'water', label: '💧 Νερό (m³)' },
            { value: 'electricity', label: '⚡ Ηλεκτρικό (kWh)' }
          );
        }
        
        setMeterTypes(transformedTypes);

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
      if (!watchedMeterType || !apartments.length || loadingReadingsRef.current) return;

      console.log('📊 Loading previous readings for meter type:', watchedMeterType);
      loadingReadingsRef.current = true;

      try {
        await stableFetchReadings({
          meter_type: watchedMeterType
        });

      } catch (error) {
        console.error('Error loading previous readings:', error);
      } finally {
        loadingReadingsRef.current = false;
      }
    };

    loadPreviousReadings();
  }, [watchedMeterType, apartments.length, buildingId, stableFetchReadings]);

  // Separate effect to update form when readings change
  useEffect(() => {
    if (!readings.length || !apartments.length || !fields.length) return;

    console.log('🔄 Updating form with readings:', readings.length, 'readings for', apartments.length, 'apartments');

    // Group readings by apartment and find the latest reading for each
    const latestReadings = apartments.map(apartment => {
      const apartmentReadings = readings?.filter(
        (r: any) => r.apartment?.id === apartment.id
      ) || [];
      
      const sortedReadings = apartmentReadings.sort(
        (a: any, b: any) => new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime()
      );

      return {
        apartment_id: apartment.id,
        previous_reading: sortedReadings[0]?.value || undefined
      };
    });

    // Only update if we have changes
    const hasChanges = fields.some((field, index) => {
      const expectedReading = latestReadings.find(r => r.apartment_id === field.apartment_id)?.previous_reading;
      return field.previous_reading !== expectedReading;
    });

    if (hasChanges) {
      console.log('✅ Updating form fields with previous readings');
      const currentReadings = fields.map((field) => ({
        ...field,
        previous_reading: latestReadings.find(r => r.apartment_id === field.apartment_id)?.previous_reading
      }));

      stableReplace(currentReadings);
    }
  }, [readings, apartments, fields, stableReplace]);

  const onSubmit = async (data: MeterReadingDatasheetFormData) => {
    try {
      console.log('📋 Submitting datasheet readings:', data);
      
      // Create readings for each apartment
      const promises = data.readings.map(reading => {
        if (reading.current_reading > 0) {
          return createReading({
            apartment: reading.apartment_id,
            reading_date: data.reading_date,
            value: reading.current_reading,
            meter_type: data.meter_type,
            notes: reading.notes || ''
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          Φύλλο Μετρήσεων - Landscape View
        </CardTitle>
        <CardDescription>
          Εισαγωγή μετρήσεων για όλα τα διαμερίσματα σε μορφή πίνακα
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Header Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
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
                    initialFocus
                    locale={el}
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
                    <th className="p-3 text-left font-medium text-gray-700">Διαμέρισμα</th>
                    <th className="p-3 text-left font-medium text-gray-700">Ιδιοκτήτης</th>
                    <th className="p-3 text-center font-medium text-gray-700">Χιλιοστά<br/>Συμμετοχής</th>
                    {(buildingData?.heating_system === 'hour_meters' || buildingData?.heating_system === 'heat_meters') && (
                      <>
                        <th className="p-3 text-center font-medium text-gray-700">Χιλιοστά<br/>Θέρμανσης</th>
                        <th className="p-3 text-center font-medium text-gray-700">% Θέρμανσης</th>
                      </>
                    )}
                    <th className="p-3 text-center font-medium text-gray-700">Προηγούμενη<br/>Μέτρηση</th>
                    <th className="p-3 text-center font-medium text-gray-700">Νέα Μέτρηση *</th>
                    <th className="p-3 text-center font-medium text-gray-700">Κατανάλωση</th>
                    <th className="p-3 text-left font-medium text-gray-700">Σημειώσεις</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
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
                          <div className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {field.previous_reading !== undefined ? field.previous_reading.toLocaleString() : '-'}
                          </div>
                        </td>
                        
                        <td className="p-3">
                          <Controller
                            name={`readings.${index}.current_reading`}
                            control={control}
                            render={({ field: inputField }) => (
                              <Input
                                {...inputField}
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                className="w-20 text-center"
                                onChange={(e) => inputField.onChange(parseFloat(e.target.value) || 0)}
                              />
                            )}
                          />
                        </td>
                        
                        <td className="p-3 text-center">
                          <div className={`text-sm font-medium px-2 py-1 rounded ${
                            consumption > 0 ? 'text-green-700 bg-green-100' : 'text-gray-500'
                          }`}>
                            {consumption > 0 ? consumption.toLocaleString() : '-'}
                          </div>
                        </td>
                        
                        <td className="p-3">
                          <Controller
                            name={`readings.${index}.notes`}
                            control={control}
                            render={({ field: inputField }) => (
                              <Input
                                {...inputField}
                                placeholder="Σημειώσεις..."
                                className="w-32 text-xs"
                              />
                            )}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary Stats */}
          {fields.length > 0 && watchedMeterType && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
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