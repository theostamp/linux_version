'use client';

import { useState, useCallback, useMemo } from 'react';
import { Expense, ExpenseCategory, DistributionType, CommonExpenseShare } from '@/types/financial';

interface Apartment {
  id: number;
  number: string;
  owner_name?: string;
  participation_mills?: number;
  meters?: {
    heating?: number;
    water?: number;
    electricity?: number;
  };
}

interface ExpenseCalculationParams {
  amount: number;
  distributionType: DistributionType;
  apartments: Apartment[];
  category?: ExpenseCategory;
  notes?: string;
}

interface ExpenseCalculationResult {
  shares: CommonExpenseShare[];
  totalAmount: number;
  distributionType: DistributionType;
  isValid: boolean;
  errors: string[];
}

export const useExpenseCalculator = () => {
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateEqualDistribution = useCallback((
    amount: number,
    apartments: Apartment[]
  ): CommonExpenseShare[] => {
    if (apartments.length === 0) return [];
    
    const sharePerApartment = amount / apartments.length;
    
    return apartments.map(apartment => ({
      apartment_id: apartment.id,
      apartment_number: apartment.number,
      owner_name: apartment.owner_name,
      amount: sharePerApartment,
      percentage: (1 / apartments.length) * 100,
      participation_mills: apartment.participation_mills || 0,
      details: `Ισόποσα κατανομή: ${amount.toFixed(2)}€ ÷ ${apartments.length} διαμερίσματα = ${sharePerApartment.toFixed(2)}€`,
    }));
  }, []);

  const calculateMillsDistribution = useCallback((
    amount: number,
    apartments: Apartment[]
  ): CommonExpenseShare[] => {
    if (apartments.length === 0) return [];
    
    const totalMills = apartments.reduce((sum, apt) => sum + (apt.participation_mills || 0), 0);
    
    if (totalMills === 0) {
      // Fallback to equal distribution if no mills data
      return calculateEqualDistribution(amount, apartments);
    }
    
    return apartments.map(apartment => {
      const mills = apartment.participation_mills || 0;
      const shareAmount = (mills / totalMills) * amount;
      const percentage = totalMills > 0 ? (mills / totalMills) * 100 : 0;
      
      return {
        apartment_id: apartment.id,
        apartment_number: apartment.number,
        owner_name: apartment.owner_name,
        amount: shareAmount,
        percentage,
        participation_mills: mills,
        details: `Κατανομή ανά χιλιοστά: ${amount.toFixed(2)}€ × ${mills}χλ. ÷ ${totalMills}χλ. = ${shareAmount.toFixed(2)}€`,
      };
    });
  }, [calculateEqualDistribution]);

  const calculateMetersDistribution = useCallback((
    amount: number,
    apartments: Apartment[],
    category: ExpenseCategory
  ): CommonExpenseShare[] => {
    if (apartments.length === 0) return [];
    
    // Determine which meter type to use based on category
    let meterType: 'heating' | 'water' | 'electricity' | undefined;
    switch (category) {
      case ExpenseCategory.HEATING:
        meterType = 'heating';
        break;
      case ExpenseCategory.WATER:
        meterType = 'water';
        break;
      case ExpenseCategory.ELECTRICITY:
        meterType = 'electricity';
        break;
      default:
        // Fallback to equal distribution for categories without meters
        return calculateEqualDistribution(amount, apartments);
    }
    
    const apartmentsWithMeters = apartments.filter(apt => apt.meters?.[meterType!] !== undefined);
    
    if (apartmentsWithMeters.length === 0) {
      // Fallback to equal distribution if no meter data
      return calculateEqualDistribution(amount, apartments);
    }
    
    const totalMeterReading = apartmentsWithMeters.reduce(
      (sum, apt) => sum + (apt.meters?.[meterType!] || 0), 
      0
    );
    
    return apartments.map(apartment => {
      const meterReading = apartment.meters?.[meterType!] || 0;
      const shareAmount = totalMeterReading > 0 ? (meterReading / totalMeterReading) * amount : 0;
      const percentage = totalMeterReading > 0 ? (meterReading / totalMeterReading) * 100 : 0;
      
      return {
        apartment_id: apartment.id,
        apartment_number: apartment.number,
        owner_name: apartment.owner_name,
        amount: shareAmount,
        percentage,
        participation_mills: apartment.participation_mills || 0,
        details: `Κατανομή ανά μετρητές: ${amount.toFixed(2)}€ × ${meterReading}μ. ÷ ${totalMeterReading}μ. = ${shareAmount.toFixed(2)}€`,
      };
    });
  }, [calculateEqualDistribution]);

  const validateCalculation = useCallback((
    params: ExpenseCalculationParams
  ): string[] => {
    const errors: string[] = [];
    
    if (params.amount <= 0) {
      errors.push('Το ποσό πρέπει να είναι μεγαλύτερο από 0');
    }
    
    if (params.apartments.length === 0) {
      errors.push('Πρέπει να επιλέξετε τουλάχιστον ένα διαμέρισμα');
    }
    
    if (params.distributionType === DistributionType.MILLS) {
      const totalMills = params.apartments.reduce((sum, apt) => sum + (apt.participation_mills || 0), 0);
      if (totalMills === 0) {
        errors.push('Για κατανομή ανά χιλιοστά, τα διαμερίσματα πρέπει να έχουν καταχωρημένα χιλιοστά');
      }
    }
    
    if (params.distributionType === DistributionType.METERS) {
      if (!params.category) {
        errors.push('Για κατανομή ανά μετρητές, πρέπει να επιλέξετε κατηγορία δαπάνης');
      } else {
        const hasMeters = params.apartments.some(apt => {
          switch (params.category) {
            case ExpenseCategory.HEATING:
              return apt.meters?.heating !== undefined;
            case ExpenseCategory.WATER:
              return apt.meters?.water !== undefined;
            case ExpenseCategory.ELECTRICITY:
              return apt.meters?.electricity !== undefined;
            default:
              return false;
          }
        });
        
        if (!hasMeters) {
          errors.push(`Για κατανομή ανά μετρητές ${params.category}, τα διαμερίσματα πρέπει να έχουν καταχωρημένες μετρήσεις`);
        }
      }
    }
    
    return errors;
  }, []);

  const calculateExpense = useCallback(async (
    params: ExpenseCalculationParams
  ): Promise<ExpenseCalculationResult> => {
    setIsCalculating(true);
    
    try {
      // Validate parameters
      const errors = validateCalculation(params);
      
      if (errors.length > 0) {
        return {
          shares: [],
          totalAmount: params.amount,
          distributionType: params.distributionType,
          isValid: false,
          errors,
        };
      }
      
      let shares: CommonExpenseShare[];
      
      switch (params.distributionType) {
        case DistributionType.EQUAL:
          shares = calculateEqualDistribution(params.amount, params.apartments);
          break;
        case DistributionType.MILLS:
          shares = calculateMillsDistribution(params.amount, params.apartments);
          break;
        case DistributionType.METERS:
          shares = calculateMetersDistribution(params.amount, params.apartments, params.category!);
          break;
        default:
          shares = calculateEqualDistribution(params.amount, params.apartments);
      }
      
      // Validate calculation result
      const totalCalculated = shares.reduce((sum, share) => sum + share.amount, 0);
      const difference = Math.abs(totalCalculated - params.amount);
      
      if (difference > 0.01) {
        // Rounding adjustment - distribute the difference
        const adjustment = params.amount - totalCalculated;
        if (shares.length > 0) {
          shares[0].amount += adjustment;
          shares[0].details += ` (προσαρμογή στρογγυλοποίησης: +${adjustment.toFixed(2)}€)`;
        }
      }
      
      return {
        shares,
        totalAmount: params.amount,
        distributionType: params.distributionType,
        isValid: true,
        errors: [],
      };
    } catch (error) {
      return {
        shares: [],
        totalAmount: params.amount,
        distributionType: params.distributionType,
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Προέκυψε σφάλμα κατά τον υπολογισμό'],
      };
    } finally {
      setIsCalculating(false);
    }
  }, [validateCalculation, calculateEqualDistribution, calculateMillsDistribution, calculateMetersDistribution]);

  const getDistributionPreview = useCallback((
    amount: number,
    distributionType: DistributionType,
    apartments: Apartment[],
    category?: ExpenseCategory
  ) => {
    const params: ExpenseCalculationParams = {
      amount,
      distributionType,
      apartments,
      category,
    };
    
    const errors = validateCalculation(params);
    
    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        shares: [],
      };
    }
    
    let shares: CommonExpenseShare[];
    
    switch (distributionType) {
      case DistributionType.EQUAL:
        shares = calculateEqualDistribution(amount, apartments);
        break;
      case DistributionType.MILLS:
        shares = calculateMillsDistribution(amount, apartments);
        break;
      case DistributionType.METERS:
        shares = calculateMetersDistribution(amount, apartments, category!);
        break;
      default:
        shares = calculateEqualDistribution(amount, apartments);
    }
    
    return {
      isValid: true,
      errors: [],
      shares,
    };
  }, [validateCalculation, calculateEqualDistribution, calculateMillsDistribution, calculateMetersDistribution]);

  return {
    calculateExpense,
    getDistributionPreview,
    isCalculating,
    validateCalculation,
  };
}; 