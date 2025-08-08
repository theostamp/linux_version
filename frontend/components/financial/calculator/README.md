# 🔄 Common Expense Calculator - Redesigned

## 📋 Overview

This directory contains the redesigned Common Expense Calculator components that implement a modern wizard-style interface for calculating and issuing common expenses.

## 🏗️ Component Structure

```
calculator/
├── CalculatorWizard.tsx          # Main wizard container
├── PeriodSelectionStep.tsx       # Step 1: Period selection
├── CalculationStep.tsx           # Step 2: Calculation process
├── ResultsStep.tsx               # Step 3: Results display
├── CommonExpenseCalculatorNew.tsx # Main component wrapper
└── index.ts                      # Exports
```

## 🎯 Features

### **Step 1: Period Selection**
- **Quick Selection**: Current month, previous month buttons
- **Custom Period**: Manual date range input
- **Advanced Options**: Reserve fund, heating percentage, elevator mills
- **Auto-fill**: Integration with selected month from parent component

### **Step 2: Calculation**
- **Progress Indicators**: Real-time calculation progress
- **Preview Mode**: Preview results before full calculation
- **Error Handling**: User-friendly error messages
- **Loading States**: Visual feedback during processing

### **Step 3: Results**
- **Summary Cards**: Key metrics display
- **Detailed Table**: Complete results with breakdown
- **Collapsible Details**: Expandable expense breakdown per apartment
- **Advanced Analysis**: Special handling for heating and elevator costs
- **Export Options**: PDF, Excel, Print functionality
- **Issue Common Expenses**: Direct integration with backend

## 🎨 Design Features

### **Wizard Interface**
- **Progress Bar**: Visual step progression
- **Step Indicators**: Clear navigation between steps
- **Validation**: Step-by-step validation
- **Responsive Design**: Mobile-friendly layout

### **Smart Defaults**
- **Auto-detection**: Current month selection
- **Pre-fill**: Period names and dates
- **Remember Settings**: Advanced options persistence

### **Visual Improvements**
- **Color-coded Sections**: Different colors for different types of content
- **Status Badges**: Clear status indicators
- **Loading Animations**: Smooth transitions
- **Modern UI**: Clean, professional appearance

## 🔧 Usage

### **Basic Usage**
```tsx
import { CommonExpenseCalculatorNew } from '@/components/financial/calculator';

<CommonExpenseCalculatorNew 
  buildingId={3} 
  selectedMonth="2024-01" 
/>
```

### **Advanced Usage**
```tsx
import { CalculatorWizard } from '@/components/financial/calculator';

<CalculatorWizard
  buildingId={3}
  selectedMonth="2024-01"
  onComplete={(results) => {
    console.log('Calculation completed:', results);
    // Handle completion
  }}
/>
```

## 📊 State Management

The calculator uses a centralized state object (`CalculatorState`) that includes:

```typescript
interface CalculatorState {
  // Step 1: Period Selection
  periodMode: 'quick' | 'custom' | 'advanced';
  quickOptions: { currentMonth: boolean; previousMonth: boolean; customRange: boolean; };
  customPeriod: { startDate: string; endDate: string; periodName: string; };
  advancedOptions: { includeReserveFund: boolean; heatingFixedPercentage: number; elevatorMills: boolean; };
  
  // Step 2: Calculation
  isCalculating: boolean;
  calculationProgress: number;
  calculationError: string | null;
  
  // Step 3: Results
  shares: Record<string, any>;
  totalExpenses: number;
  advancedShares: any;
  isIssuing: boolean;
}
```

## 🔄 Migration from Old Component

The old `CommonExpenseCalculator.tsx` has been:
- ✅ Backed up as `CommonExpenseCalculator.old.tsx`
- ✅ Replaced with `CommonExpenseCalculatorNew.tsx`
- ✅ Updated in `FinancialPage.tsx`
- ✅ Maintains backward compatibility

## 🧪 Testing

### **Manual Testing Checklist**
- [ ] Quick selection (current month)
- [ ] Quick selection (previous month)
- [ ] Custom period input
- [ ] Advanced options toggle
- [ ] Calculation process
- [ ] Preview functionality
- [ ] Results display
- [ ] Export options
- [ ] Issue common expenses
- [ ] Error handling
- [ ] Responsive design

### **Integration Points**
- [ ] `useCommonExpenses` hook
- [ ] `FinancialPage.tsx` integration
- [ ] Month selector integration
- [ ] Building context integration

## 🚀 Future Enhancements

### **Planned Features**
- [ ] Export to PDF functionality
- [ ] Export to Excel functionality
- [ ] Advanced analytics dashboard
- [ ] Template system for common periods
- [ ] Batch processing for multiple buildings

### **Performance Optimizations**
- [ ] Lazy loading of components
- [ ] Memoization of expensive calculations
- [ ] Virtual scrolling for large result sets
- [ ] Caching of calculation results

## 📝 Notes

- **Dependencies**: No external dependencies required
- **Styling**: Uses Tailwind CSS with custom color scheme
- **Icons**: Uses Lucide React icons
- **State**: Centralized state management with step validation
- **Error Handling**: Comprehensive error handling with user feedback

## 🔗 Related Files

- `../CommonExpenseCalculator.old.tsx` - Original component (backup)
- `../FinancialPage.tsx` - Parent component integration
- `../../ui/collapsible.tsx` - Custom collapsible component
- `../../../hooks/useCommonExpenses.ts` - Backend integration
