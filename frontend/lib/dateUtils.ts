/**
 * Utility functions for date handling and filtering
 */

/**
 * Gets the current month date range
 * @returns Object with formatted dates for the first and last day of current month
 */
export const getCurrentMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return {
    from: formatDate(firstDay),
    to: formatDate(lastDay),
    monthName: now.toLocaleDateString('el-GR', { 
      month: 'long', 
      year: 'numeric' 
    })
  };
};

/**
 * Gets a specific month's date range
 * @param year - The year
 * @param month - The month (0-based, like Date constructor)
 * @returns Object with formatted dates for the first and last day of specified month
 */
export const getMonthRange = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return {
    from: formatDate(firstDay),
    to: formatDate(lastDay),
    monthName: firstDay.toLocaleDateString('el-GR', { 
      month: 'long', 
      year: 'numeric' 
    })
  };
};

/**
 * Gets the previous month date range
 * @returns Object with formatted dates for the first and last day of previous month
 */
export const getPreviousMonthRange = () => {
  const now = new Date();
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return getMonthRange(previousMonth.getFullYear(), previousMonth.getMonth());
};

/**
 * Generate month options for dropdowns/selects
 * @param monthsCount - Number of months to include (default 12)
 * @returns Array of month options with value and label
 */
export const generateMonthOptions = (monthsCount: number = 12) => {
  const options = [];
  const currentDate = new Date();
  
  for (let i = 0; i < monthsCount; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const monthName = date.toLocaleDateString('el-GR', { 
      month: 'long', 
      year: 'numeric' 
    });
    
    options.push({ 
      value: `${year}-${month}`, 
      label: monthName,
      isCurrent: i === 0
    });
  }
  
  return options;
};

/**
 * Check if a date string is within the current month
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns true if the date is within current month
 */
export const isCurrentMonth = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
};

/**
 * Format date for display
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Formatted date string in Greek format
 */
export const formatDateForDisplay = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('el-GR', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });
};