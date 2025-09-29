'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { MeterReadingFormData, MeterType } from '../../types/financial';
import { useMeterReadings } from '../../hooks/useMeterReadings';
import { fetchBuilding, fetchApartments } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '../../lib/utils';

interface MeterReadingFormProps {
  buildingId: number;
  reading?: any; // Για edit mode
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const MeterReadingForm: React.FC<MeterReadingFormProps> = ({
  buildingId,
  reading,
  onSuccess,
  onCancel,
}) => {
  const [meterTypes, setMeterTypes] = useState<Array<{value: string, label: string}>>([]);
  const [buildingHeatingSystem, setBuildingHeatingSystem] = useState<string>('');
  const [apartments, setApartments] = useState<any[]>([]);
  const [apartmentsLoading, setApartmentsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    reading ? new Date(reading.reading_date) : new Date()
  );
  const { createReading, updateReading, fetchMeterTypes, loading } = useMeterReadings(buildingId);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<MeterReadingFormData>({
    defaultValues: {
      apartment: reading?.apartment || '',
      reading_date: reading?.reading_date || format(new Date(), 'yyyy-MM-dd'),
      value: reading?.value || '',
      meter_type: reading?.meter_type || MeterType.WATER,
      notes: reading?.notes || '',
    },
  });

  const watchedApartment = watch('apartment');
  const watchedMeterType = watch('meter_type');

  // Λήψη πληροφοριών κτιρίου, τύπων μετρητών και διαμερισμάτων
  useEffect(() => {
    const loadData = async () => {
      try {
        setApartmentsLoading(true);
        
        // Load building info
        const building = await fetchBuilding(buildingId);
        setBuildingHeatingSystem(building.heating_system || 'none');
        
        // Load apartments
        const apartmentsList = await fetchApartments(buildingId);
        setApartments(apartmentsList || []);
        
        // Load meter types
        const allTypes = [
          { value: MeterType.WATER, label: 'Νερό' },
          { value: MeterType.ELECTRICITY, label: 'Ηλεκτρικό' },
          { value: MeterType.HEATING_HOURS, label: 'Θέρμανση (Ώρες)' },
          { value: MeterType.HEATING_ENERGY, label: 'Θέρμανση (kWh/MWh)' },
        ];
        setMeterTypes(allTypes);
        
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Σφάλμα φόρτωσης δεδομένων');
      } finally {
        setApartmentsLoading(false);
      }
    };

    loadData();
  }, [buildingId]);

  const onSubmit = async (data: MeterReadingFormData) => {
    try {
      if (reading) {
        // Edit mode
        await updateReading(reading.id, data);
      } else {
        // Create mode
        await createReading(data);
      }
      
      reset();
      onSuccess?.();
      toast.success(reading ? 'Η μετρήση ενημερώθηκε επιτυχώς' : 'Η μετρήση δημιουργήθηκε επιτυχώς');
    } catch (error) {
      console.error('Σφάλμα:', error);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      // Ενημέρωση του form με την επιλεγμένη ημερομηνία
      const formattedDate = format(date, 'yyyy-MM-dd');
      // Χειροκίνητη ενημέρωση του form value
      const event = {
        target: { name: 'reading_date', value: formattedDate }
      } as any;
      // Αυτό είναι ένα workaround για το react-hook-form
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) {
          const dateInput = form.querySelector('input[name="reading_date"]') as HTMLInputElement;
          if (dateInput) {
            dateInput.value = formattedDate;
          }
        }
      }, 0);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {reading ? 'Επεξεργασία Μετρήσης' : 'Νέα Μετρήση'}
        </CardTitle>
        <CardDescription>
          {reading ? 'Ενημέρωση υπάρχουσας μετρήσης' : 'Εισαγωγή νέας μετρήσης'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Επιλογή Διαμερίσματος */}
          <div className="space-y-2">
            <Label htmlFor="apartment">Διαμέρισμα *</Label>
            <Controller
              name="apartment"
              control={control}
              rules={{ required: 'Η επιλογή διαμερίσματος είναι υποχρεωτική' }}
              render={({ field }) => (
                <Select
                  value={field.value?.toString()}
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  disabled={apartmentsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε διαμέρισμα" />
                  </SelectTrigger>
                  <SelectContent>
                    {apartments && apartments.length > 0 ? (
                      apartments.map((apartment) => (
                        <SelectItem key={apartment.id} value={apartment.id.toString()}>
                          {apartment.number} - {apartment.owner_name || 'Άγνωστος'}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>
                        {apartmentsLoading ? 'Φόρτωση διαμερισμάτων...' : 'Δεν βρέθηκαν διαμερίσματα'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.apartment && (
              <p className="text-sm text-red-500">{errors.apartment.message}</p>
            )}
          </div>

          {/* Τύπος Μετρητή */}
          <div className="space-y-2">
            <Label htmlFor="meter_type">Τύπος Μετρητή *</Label>
            
            {/* Πληροφορίες για σύστημα θέρμανσης */}
            {buildingHeatingSystem && buildingHeatingSystem !== 'none' && (
              <div className={`p-3 rounded-lg text-sm ${
                buildingHeatingSystem === 'hour_meters' 
                  ? 'bg-blue-50 border border-blue-200 text-blue-800'
                  : buildingHeatingSystem === 'heat_meters'
                  ? 'bg-purple-50 border border-purple-200 text-purple-800'
                  : buildingHeatingSystem === 'conventional'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-gray-50 border border-gray-200 text-gray-800'
              }`}>
                <div className="flex items-start space-x-2">
                  <span className="text-lg">🔥</span>
                  <div>
                    <p className="font-medium">Σύστημα Θέρμανσης Κτιρίου: {
                      buildingHeatingSystem === 'hour_meters' 
                        ? 'Αυτονομία με Ωρομετρητές'
                        : buildingHeatingSystem === 'heat_meters'
                        ? 'Αυτονομία με Θερμιδομετρητές'
                        : buildingHeatingSystem === 'conventional'
                        ? 'Συμβατικό (Κατανομή με χιλιοστά)'
                        : 'Άγνωστο'
                    }</p>
                    <p className="text-xs mt-1">
                      {buildingHeatingSystem === 'hour_meters' && 
                        '💡 Για αυτό το κτίριο χρησιμοποιήστε "Θέρμανση (Ώρες)" για καταγραφή ωρομετρητών.'
                      }
                      {buildingHeatingSystem === 'heat_meters' && 
                        '💡 Για αυτό το κτίριο χρησιμοποιήστε "Θέρμανση (kWh/MWh)" για καταγραφή θερμιδομετρητών.'
                      }
                      {buildingHeatingSystem === 'conventional' && 
                        '💡 Αυτό το κτίριο χρησιμοποιεί συμβατικό σύστημα θέρμανσης. Δεν χρειάζονται ειδικοί μετρητές.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {buildingHeatingSystem === 'none' && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                <div className="flex items-start space-x-2">
                  <span>ℹ️</span>
                  <p>Αυτό το κτίριο δεν διαθέτει κεντρική θέρμανση. Χρησιμοποιήστε "Νερό" ή "Ηλεκτρικό" για άλλους μετρητές.</p>
                </div>
              </div>
            )}
            
            <Controller
              name="meter_type"
              control={control}
              rules={{ required: 'Η επιλογή τύπου μετρητή είναι υποχρεωτική' }}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε τύπο μετρητή" />
                  </SelectTrigger>
                  <SelectContent>
                    {meterTypes.map((type) => (
                      <SelectItem 
                        key={type.value} 
                        value={type.value}
                        className={
                          // Highlight recommended meter type based on heating system
                          (buildingHeatingSystem === 'hour_meters' && type.value === MeterType.HEATING_HOURS) ||
                          (buildingHeatingSystem === 'heat_meters' && type.value === MeterType.HEATING_ENERGY)
                            ? 'bg-blue-50 font-medium'
                            : ''
                        }
                      >
                        {type.label}
                        {buildingHeatingSystem === 'hour_meters' && type.value === MeterType.HEATING_HOURS && ' (Προτεινόμενο)'}
                        {buildingHeatingSystem === 'heat_meters' && type.value === MeterType.HEATING_ENERGY && ' (Προτεινόμενο)'}
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

          {/* Ημερομηνία Μετρήσης */}
          <div className="space-y-2">
            <Label htmlFor="reading_date">Ημερομηνία Μετρήσης *</Label>
            <Controller
              name="reading_date"
              control={control}
              rules={{ required: 'Η ημερομηνία μετρήσης είναι υποχρεωτική' }}
              render={({ field }) => (
                <div className="flex space-x-2">
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
                        {selectedDate ? format(selectedDate, 'PPP') : 'Επιλέξτε ημερομηνία'}
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
                  <Input
                    {...field}
                    type="date"
                    className="w-32"
                  />
                </div>
              )}
            />
            {errors.reading_date && (
              <p className="text-sm text-red-500">{errors.reading_date.message}</p>
            )}
          </div>

          {/* Τιμή Μετρήσης */}
          <div className="space-y-2">
            <Label htmlFor="value">
              Ένδειξη Μετρητή * 
              <span className="text-sm text-gray-500 ml-2">
                ({
                  watchedMeterType === MeterType.HEATING_HOURS ? 'σε ώρες'
                  : watchedMeterType === MeterType.HEATING_ENERGY ? 'σε kWh ή MWh'
                  : watchedMeterType === MeterType.WATER ? 'σε κυβικά μέτρα'
                  : watchedMeterType === MeterType.ELECTRICITY ? 'σε kWh'
                  : 'μονάδες'
                })
              </span>
            </Label>
            
            {/* Επεξήγηση ανάλογα με τον τύπο μετρητή */}
            {watchedMeterType === MeterType.HEATING_HOURS && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p>📊 <strong>Ωρομετρητές:</strong> Εισάγετε τις ώρες λειτουργίας της θέρμανσης (π.χ. 150.5 ώρες)</p>
              </div>
            )}
            
            {watchedMeterType === MeterType.HEATING_ENERGY && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
                <p>⚡ <strong>Θερμιδομετρητές:</strong> Εισάγετε την κατανάλωση ενέργειας σε kWh ή MWh (π.χ. 1250.75 kWh)</p>
              </div>
            )}
            
            <Controller
              name="value"
              control={control}
              rules={{
                required: 'Η ένδειξη μετρητή είναι υποχρεωτική',
                min: { value: 0, message: 'Η ένδειξη πρέπει να είναι θετική' },
                pattern: {
                  value: /^\d+(\.\d{1,2})?$/,
                  message: 'Εισάγετε έγκυρη τιμή (π.χ. 123.45)'
                }
              }}
              render={({ field }) => (
                <div className="relative">
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    min="0"
                    max="999999.99"
                    placeholder={
                      watchedMeterType === MeterType.HEATING_HOURS ? 'π.χ. 150.5 (ώρες)'
                      : watchedMeterType === MeterType.HEATING_ENERGY ? 'π.χ. 1250.75 (kWh)'
                      : watchedMeterType === MeterType.WATER ? 'π.χ. 45.30 (m³)'
                      : watchedMeterType === MeterType.ELECTRICITY ? 'π.χ. 890.25 (kWh)'
                      : 'π.χ. 123.45'
                    }
                    className="pr-16"
                    onChange={(e) => {
                      // Allow user to type freely
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        field.onChange(value);
                      }
                    }}
                    onBlur={(e) => {
                      // Round to 2 decimal places when user finishes editing
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        const roundedValue = Math.round(value * 100) / 100;
                        e.target.value = roundedValue.toFixed(2);
                        field.onChange(roundedValue);
                      }
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-sm text-gray-500">
                      {watchedMeterType === MeterType.HEATING_HOURS ? 'ώρες'
                       : watchedMeterType === MeterType.HEATING_ENERGY ? 'kWh'
                       : watchedMeterType === MeterType.WATER ? 'm³'
                       : watchedMeterType === MeterType.ELECTRICITY ? 'kWh'
                       : ''}
                    </span>
                  </div>
                </div>
              )}
            />
            {errors.value && (
              <p className="text-sm text-red-500">{errors.value.message}</p>
            )}
          </div>

          {/* Σημειώσεις */}
          <div className="space-y-2">
            <Label htmlFor="notes">Σημειώσεις</Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  placeholder="Προαιρετικές σημειώσεις..."
                  rows={3}
                />
              )}
            />
          </div>

          {/* Κουμπιά */}
          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Ακύρωση
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading || apartmentsLoading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {reading ? 'Ενημέρωση' : 'Δημιουργία'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}; 