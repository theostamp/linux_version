import { useMemo } from 'react';

/**
 * Custom hook για έξυπνη επιλογή default ημερομηνίας 
 * με βάση τον επιλεγμένο μήνα
 */
export const useSmartDateDefault = (selectedMonth?: string) => {
  const smartDefaultDate = useMemo(() => {
    if (!selectedMonth) {
      // No month selected, use current date
      return new Date().toISOString().split('T')[0];
    }
    
    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7); // YYYY-MM format
    
    if (selectedMonth === currentMonth) {
      // Current month selected, use today's date
      return now.toISOString().split('T')[0];
    } else if (selectedMonth < currentMonth) {
      // Past month selected, use last day of that month
      const [year, month] = selectedMonth.split('-').map(Number);
      const lastDayOfMonth = new Date(year, month, 0); // month is 1-indexed, so this gives last day of (month-1)
      return lastDayOfMonth.toISOString().split('T')[0];
    } else {
      // Future month selected, use first day of that month
      const [year, month] = selectedMonth.split('-').map(Number);
      const firstDayOfMonth = new Date(year, month - 1, 1); // month is 1-indexed
      return firstDayOfMonth.toISOString().split('T')[0];
    }
  }, [selectedMonth]);

  const getMonthContext = (selectedMonth?: string) => {
    if (!selectedMonth) return null;
    
    const now = new Date();
    const currentMonth = now.toISOString().substring(0, 7);
    
    if (selectedMonth < currentMonth) {
      return {
        type: 'past' as const,
        label: 'Παρελθόν',
        description: 'Η ημερομηνία προτάθηκε για το τέλος του επιλεγμένου μήνα'
      };
    } else if (selectedMonth === currentMonth) {
      return {
        type: 'current' as const,
        label: 'Τρέχων μήνας',
        description: 'Χρησιμοποιείται η σημερινή ημερομηνία'
      };
    } else {
      return {
        type: 'future' as const,
        label: 'Μέλλον',
        description: 'Η ημερομηνία προτάθηκε για την αρχή του επιλεγμένου μήνα'
      };
    }
  };

  const monthContext = getMonthContext(selectedMonth);

  return {
    smartDefaultDate,
    monthContext,
    isHistoricalEntry: monthContext?.type === 'past',
    isFutureEntry: monthContext?.type === 'future',
    isCurrentMonth: monthContext?.type === 'current'
  };
};

export default useSmartDateDefault;


