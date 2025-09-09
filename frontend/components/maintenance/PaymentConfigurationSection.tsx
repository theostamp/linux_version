'use client';

import { useState, useEffect } from 'react';
import { Control, Controller, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, CreditCard, Calculator, Clock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface PaymentConfiguration {
  enabled: boolean;
  payment_type: 'lump_sum' | 'advance_installments' | 'periodic' | 'milestone_based';
  total_amount: number;
  advance_percentage?: number;
  installment_count?: number;
  installment_frequency?: 'weekly' | 'biweekly' | 'monthly';
  periodic_amount?: number;
  periodic_frequency?: 'weekly' | 'biweekly' | 'monthly';
  notes?: string;
}

interface PaymentConfigurationSectionProps {
  control: Control<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  projectPrice?: number;
}

export function PaymentConfigurationSection({
  control,
  watch,
  setValue,
  projectPrice = 0
}: PaymentConfigurationSectionProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const paymentEnabled = watch('payment_config.enabled');
  const paymentType = watch('payment_config.payment_type');
  const totalAmount = watch('payment_config.total_amount') || projectPrice;
  const advancePercentage = watch('payment_config.advance_percentage') || 30;
  const installmentCount = watch('payment_config.installment_count') || 3;
  
  // Debug logging
  useEffect(() => {
    const paymentConfig = watch('payment_config');
    console.log('PaymentConfigurationSection - payment config watch values:', {
      enabled: paymentEnabled,
      type: paymentType,
      totalAmount,
      advancePercentage,
      installmentCount,
      fullConfig: paymentConfig,
      projectPrice
    });
  }, [paymentEnabled, paymentType, totalAmount, advancePercentage, installmentCount, watch, projectPrice]);

  // Sync total_amount with projectPrice when projectPrice changes
  useEffect(() => {
    if (projectPrice > 0 && (!totalAmount || totalAmount === 0)) {
      setValue('payment_config.total_amount', projectPrice, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
  }, [projectPrice, totalAmount, setValue]);

  // Auto-calculate amounts based on configuration
  useEffect(() => {
    if (paymentEnabled && paymentType === 'advance_installments' && totalAmount > 0) {
      const advanceAmount = (totalAmount * advancePercentage) / 100;
      const remainingAmount = totalAmount - advanceAmount;
      const installmentAmount = remainingAmount / installmentCount;
      
      setValue('payment_config.advance_amount', advanceAmount, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
      setValue('payment_config.remaining_amount', remainingAmount, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
      setValue('payment_config.installment_amount', installmentAmount, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
  }, [paymentEnabled, paymentType, totalAmount, advancePercentage, installmentCount, setValue]);

  // Payment config no longer needs separate start_date - uses scheduled_date from main form

  const calculateAdvanceAmount = () => {
    return totalAmount > 0 ? (totalAmount * advancePercentage) / 100 : 0;
  };

  const calculateInstallmentAmount = () => {
    if (totalAmount <= 0 || installmentCount <= 0) return 0;
    const advanceAmount = calculateAdvanceAmount();
    const remainingAmount = totalAmount - advanceAmount;
    return remainingAmount / installmentCount;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Always enabled - no need for toggle
  // Set enabled to true by default
  useEffect(() => {
    if (!paymentEnabled) {
      setValue('payment_config.enabled', true, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
  }, [paymentEnabled, setValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Διαχείριση Πληρωμών
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ρυθμίστε το χρονοδιάγραμμα πληρωμών για το έργο
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Type Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Τύπος Πληρωμής</Label>
          <Controller
            name="payment_config.payment_type"
            control={control}
            defaultValue="lump_sum"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε τύπο πληρωμής" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lump_sum">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Εφάπαξ Πληρωμή
                    </div>
                  </SelectItem>
                  <SelectItem value="advance_installments">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Προκαταβολή + Δόσεις
                    </div>
                  </SelectItem>
                  <SelectItem value="periodic">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Περιοδικές Καταβολές
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Total Amount - Single field */}
        <div className="space-y-2">
          <Label htmlFor="total-amount" className="text-sm font-medium">
            Συνολικό Ποσό (€)
          </Label>
          <Controller
            name="payment_config.total_amount"
            control={control}
            defaultValue={projectPrice}
            render={({ field }) => (
              <Input
                id="total-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
              />
            )}
          />
          <p className="text-xs text-muted-foreground">
            Χρησιμοποιείται η ημερομηνία έναρξης του έργου για τον υπολογισμό των δόσεων
          </p>
        </div>

        {/* Payment Type Specific Configuration */}
        {paymentType === 'advance_installments' && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Ρύθμιση Προκαταβολής & Δόσεων
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="advance-percentage" className="text-sm font-medium">
                  Ποσοστό Προκαταβολής (%)
                </Label>
                <Controller
                  name="payment_config.advance_percentage"
                  control={control}
                  defaultValue={30}
                  render={({ field }) => (
                    <Input
                      id="advance-percentage"
                      type="number"
                      min="0"
                      max="100"
                      step="5"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="installment-count" className="text-sm font-medium">
                  Αριθμός Δόσεων
                </Label>
                <Controller
                  name="payment_config.installment_count"
                  control={control}
                  defaultValue={3}
                  render={({ field }) => (
                    <Input
                      id="installment-count"
                      type="number"
                      min="1"
                      max="12"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Συχνότητα Δόσεων</Label>
              <Controller
                name="payment_config.installment_frequency"
                control={control}
                defaultValue="monthly"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Εβδομαδιαία</SelectItem>
                      <SelectItem value="biweekly">Κάθε 2 εβδομάδες</SelectItem>
                      <SelectItem value="monthly">Μηνιαία</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Payment Breakdown */}
            <div className="space-y-3 p-3 bg-background rounded border">
              <h5 className="font-medium text-sm">Ανάλυση Πληρωμών</h5>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Προκαταβολή:</span>
                  <div className="font-medium text-green-600">
                    {formatCurrency(calculateAdvanceAmount())}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Ανά δόση:</span>
                  <div className="font-medium text-blue-600">
                    {formatCurrency(calculateInstallmentAmount())}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Υπόλοιπο:</span>
                  <div className="font-medium">
                    {formatCurrency(totalAmount - calculateAdvanceAmount())}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {paymentType === 'periodic' && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Περιοδικές Καταβολές
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodic-amount" className="text-sm font-medium">
                  Ποσό ανά Περίοδο (€)
                </Label>
                <Controller
                  name="payment_config.periodic_amount"
                  control={control}
                  defaultValue={'' as any}
                  render={({ field }) => (
                    <Input
                      id="periodic-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Συχνότητα</Label>
                <Controller
                  name="payment_config.periodic_frequency"
                  control={control}
                  defaultValue="monthly"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Εβδομαδιαία</SelectItem>
                        <SelectItem value="biweekly">Κάθε 2 εβδομάδες</SelectItem>
                        <SelectItem value="monthly">Μηνιαία</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Οι περιοδικές καταβολές θα δημιουργηθούν αυτόματα για τους επόμενους 12 μήνες. 
                Μπορείτε να τις διαχειριστείτε μετά τη δημιουργία του έργου.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {paymentType === 'milestone_based' && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Πληρωμές Βάσει Ορόσημων
            </h4>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Οι πληρωμές βάσει ορόσημων θα ρυθμιστούν μετά τη δημιουργία του έργου 
                μέσω του πίνακα διαχείρισης πληρωμών.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Advanced Options */}
        <Separator />
        
        <div className="space-y-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-0 h-auto font-normal text-sm"
          >
            {showAdvanced ? 'Απόκρυψη' : 'Εμφάνιση'} Προχωρημένων Επιλογών
          </Button>

          {showAdvanced && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="payment-notes" className="text-sm font-medium">
                  Σημειώσεις Πληρωμής
                </Label>
                <Controller
                  name="payment_config.notes"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      id="payment-notes"
                      placeholder="Προσθέστε σημειώσεις για τη διαχείριση των πληρωμών..."
                      rows={3}
                      {...field}
                    />
                  )}
                />
              </div>


              <div className="flex items-center space-x-2">
                <Controller
                  name="payment_config.require_signature"
                  control={control}
                  defaultValue={true}
                  render={({ field }) => (
                    <Switch
                      id="require-signature"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="require-signature" className="text-sm">
                  Απαίτηση υπογραφής συνεργείου στις αποδείξεις
                </Label>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        {totalAmount > 0 && (
          <div className="p-4 bg-primary/5 rounded-lg border">
            <h5 className="font-medium mb-2">Σύνοψη Πληρωμών</h5>
            <div className="flex items-center justify-between text-sm">
              <span>Συνολικό ποσό:</span>
              <Badge variant="secondary" className="font-medium">
                {formatCurrency(totalAmount)}
              </Badge>
            </div>
            {paymentType === 'advance_installments' && (
              <div className="mt-2 text-xs text-muted-foreground">
                Προκαταβολή {advancePercentage}% + {installmentCount} δόσεις των {formatCurrency(calculateInstallmentAmount())}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
