'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { MeterReadingFormData, MeterType } from '../../types/financial';
import { useMeterReadings } from '../../hooks/useMeterReadings';
import { useResidents } from '../../hooks/useResidents';
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
// import { el } from 'date-fns/locale/el';
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    reading ? new Date(reading.reading_date) : new Date()
  );

  const { apartments, loading: apartmentsLoading } = useResidents(buildingId);
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
      meter_type: reading?.meter_type || MeterType.HEATING,
      notes: reading?.notes || '',
    },
  });

  const watchedApartment = watch('apartment');
  const watchedMeterType = watch('meter_type');

  // Λήψη τύπων μετρητών
  useEffect(() => {
    const loadMeterTypes = async () => {
      const types = await fetchMeterTypes();
      setMeterTypes(types);
    };
    loadMeterTypes();
  }, [fetchMeterTypes]);

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
                    {apartments.map((apartment) => (
                      <SelectItem key={apartment.id} value={apartment.id.toString()}>
                        {apartment.number} - {apartment.owner_name || 'Άγνωστος'}
                      </SelectItem>
                    ))}
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
            <Label htmlFor="value">Τιμή Μετρήσης *</Label>
            <Controller
              name="value"
              control={control}
              rules={{
                required: 'Η τιμή μετρήσης είναι υποχρεωτική',
                min: { value: 0, message: 'Η τιμή πρέπει να είναι θετική' },
                pattern: {
                  value: /^\d+(\.\d{1,2})?$/,
                  message: 'Εισάγετε έγκυρη τιμή (π.χ. 123.45)'
                }
              }}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="π.χ. 123.45"
                />
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