'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePayments } from '@/hooks/usePayments';
import { Payment, PaymentMethod, PaymentType } from '@/types/financial';
import { useToast } from '@/hooks/use-toast';

const paymentFormSchema = z.object({
  apartment_id: z.number().min(1, 'Παρακαλώ επιλέξτε διαμέρισμα'),
  amount: z.number().min(0.01, 'Το ποσό πρέπει να είναι μεγαλύτερο από 0'),
  payment_date: z.string().min(1, 'Παρακαλώ επιλέξτε ημερομηνία'),
  payment_method: z.nativeEnum(PaymentMethod, {
    errorMap: () => ({ message: 'Παρακαλώ επιλέξτε μέθοδο πληρωμής' }),
  }),
  payment_type: z.nativeEnum(PaymentType, {
    errorMap: () => ({ message: 'Παρακαλώ επιλέξτε τύπο πληρωμής' }),
  }),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  buildingId: number;
  apartments: Array<{ id: number; number: string; owner_name?: string }>;
  onSuccess?: (payment: Payment) => void;
  onCancel?: () => void;
  initialData?: Partial<PaymentFormData>;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  buildingId,
  apartments,
  onSuccess,
  onCancel,
  initialData,
}) => {
  const { toast } = useToast();
  const { createPayment, isLoading } = usePayments(buildingId);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      apartment_id: initialData?.apartment_id || 0,
      amount: initialData?.amount || 0,
      payment_date: initialData?.payment_date || new Date().toISOString().split('T')[0],
      payment_method: initialData?.payment_method || PaymentMethod.CASH,
      payment_type: initialData?.payment_type || PaymentType.COMMON_EXPENSE,
      reference_number: initialData?.reference_number || '',
      notes: initialData?.notes || '',
    },
  });

  const selectedApartmentId = watch('apartment_id');
  const selectedApartment = apartments.find(apt => apt.id === selectedApartmentId);

  const onSubmit = async (data: PaymentFormData) => {
    try {
      const payment = await createPayment({
        ...data,
        building_id: buildingId,
      });

      toast({
        title: 'Επιτυχία!',
        description: 'Η πληρωμή καταχωρήθηκε επιτυχώς.',
      });

      reset();
      onSuccess?.(payment);
    } catch (error) {
      toast({
        title: 'Σφάλμα',
        description: error instanceof Error ? error.message : 'Προέκυψε σφάλμα κατά την καταχώρηση της πληρωμής.',
        variant: 'destructive',
      });
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    const labels: Record<PaymentMethod, string> = {
      [PaymentMethod.CASH]: 'Μετρητά',
      [PaymentMethod.BANK_TRANSFER]: 'Τραπεζική Μεταφορά',
      [PaymentMethod.CHECK]: 'Επιταγή',
      [PaymentMethod.CREDIT_CARD]: 'Πιστωτική Κάρτα',
      [PaymentMethod.DEBIT_CARD]: 'Χρεωστική Κάρτα',
      [PaymentMethod.OTHER]: 'Άλλο',
    };
    return labels[method];
  };

  const getPaymentTypeLabel = (type: PaymentType) => {
    const labels: Record<PaymentType, string> = {
      [PaymentType.COMMON_EXPENSE]: 'Κοινόχρηστα',
      [PaymentType.RESERVE_FUND]: 'Ταμείο Εφεδρείας',
      [PaymentType.SPECIAL_EXPENSE]: 'Ειδική Δαπάνη',
      [PaymentType.ADVANCE]: 'Προκαταβολή',
      [PaymentType.OTHER]: 'Άλλο',
    };
    return labels[type];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Νέα Πληρωμή</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Apartment Selection */}
          <div className="space-y-2">
            <Label htmlFor="apartment_id">Διαμέρισμα *</Label>
            <Select
              value={selectedApartmentId?.toString() || ''}
              onValueChange={(value) => setValue('apartment_id', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε διαμέρισμα" />
              </SelectTrigger>
              <SelectContent>
                {apartments.map((apartment) => (
                  <SelectItem key={apartment.id} value={apartment.id.toString()}>
                    {apartment.number}
                    {apartment.owner_name && ` - ${apartment.owner_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.apartment_id && (
              <p className="text-sm text-red-600">{errors.apartment_id.message}</p>
            )}
            {selectedApartment && (
              <p className="text-sm text-gray-600">
                Επιλεγμένο: {selectedApartment.number}
                {selectedApartment.owner_name && ` (${selectedApartment.owner_name})`}
              </p>
            )}
          </div>

          {/* Amount and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Ποσό (€) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                {...register('amount', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_date">Ημερομηνία Πληρωμής *</Label>
              <Input
                id="payment_date"
                type="date"
                {...register('payment_date')}
              />
              {errors.payment_date && (
                <p className="text-sm text-red-600">{errors.payment_date.message}</p>
              )}
            </div>
          </div>

          {/* Payment Method and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_method">Μέθοδος Πληρωμής *</Label>
              <Select
                value={watch('payment_method')}
                onValueChange={(value) => setValue('payment_method', value as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε μέθοδο" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PaymentMethod).map((method) => (
                    <SelectItem key={method} value={method}>
                      {getPaymentMethodLabel(method)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.payment_method && (
                <p className="text-sm text-red-600">{errors.payment_method.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_type">Τύπος Πληρωμής *</Label>
              <Select
                value={watch('payment_type')}
                onValueChange={(value) => setValue('payment_type', value as PaymentType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε τύπο" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PaymentType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {getPaymentTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.payment_type && (
                <p className="text-sm text-red-600">{errors.payment_type.message}</p>
              )}
            </div>
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="reference_number">Αριθμός Αναφοράς</Label>
            <Input
              id="reference_number"
              {...register('reference_number')}
              placeholder="π.χ. Τραπεζική αναφορά, αριθμός επιταγής"
            />
            {errors.reference_number && (
              <p className="text-sm text-red-600">{errors.reference_number.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Σημειώσεις</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Προαιρετικές σημειώσεις για την πληρωμή"
              rows={3}
            />
            {errors.notes && (
              <p className="text-sm text-red-600">{errors.notes.message}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Καταχώρηση...' : 'Καταχώρηση Πληρωμής'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Ακύρωση
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}; 