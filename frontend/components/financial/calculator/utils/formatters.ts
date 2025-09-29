
// Formats a number into a Greek currency string
export const formatAmount = (amount: number): string => {
  if (isNaN(amount) || !isFinite(amount)) {
    return '0,00';
  }
  return new Intl.NumberFormat('el-GR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Gets the current date formatted for Greece
export const getCurrentDate = (): string => {
  return new Date().toLocaleDateString('el-GR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Safely converts a value to a number
export const toNumber = (v: any): number => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v || 0);
  return isNaN(n) ? 0 : n;
};
