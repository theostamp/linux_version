import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, Calendar, Zap, Info, FileText } from 'lucide-react';
import { useCommonExpenses } from '@/hooks/useCommonExpenses';
import { formatAmount } from '@/lib/utils';

interface CommonExpenseCalculatorProps {
  buildingId: number;
  selectedMonth?: string;
}

export const CommonExpenseCalculator: React.FC<CommonExpenseCalculatorProps> = ({ buildingId, selectedMonth }) => {
  const [periodName, setPeriodName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shares, setShares] = useState<any>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [isQuickMode, setIsQuickMode] = useState(false);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [advancedShares, setAdvancedShares] = useState<any>(null);
  
  const { calculateShares, calculateAdvancedShares, issueCommonExpenses } = useCommonExpenses();

  // Helper function to convert YYYY-MM format to Greek month name
  const formatSelectedMonth = (monthString: string) => {
    if (!monthString) return '';
    
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
  };
  
  // Helper function to get month start and end dates from YYYY-MM format
  const getMonthDates = (monthString: string) => {
    if (!monthString) return { startDate: '', endDate: '' };
    
    const [year, month] = monthString.split('-');
    const yearNum = parseInt(year);
    const monthNum = parseInt(month) - 1; // JavaScript months are 0-based
    
    // First day of the month
    const firstDay = new Date(yearNum, monthNum, 1);
    // Last day of the month
    const lastDay = new Date(yearNum, monthNum + 1, 0);
    
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0]
    };
  };
  
  // Auto-fill period name and dates when selectedMonth changes
  useEffect(() => {
    if (selectedMonth) {
      const formattedMonth = formatSelectedMonth(selectedMonth);
      const { startDate, endDate } = getMonthDates(selectedMonth);
      
      setPeriodName(formattedMonth);
      setStartDate(startDate);
      setEndDate(endDate);
    }
  }, [selectedMonth]);
  
  // Helper function to get current month dates
  const getCurrentMonthDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // First day of current month
    const firstDay = new Date(year, month, 1);
    // Last day of current month
    const lastDay = new Date(year, month + 1, 0);
    
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0],
      periodName: `${firstDay.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}`
    };
  };
  
  // Helper function to get previous month dates
  const getPreviousMonthDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() - 1;
    
    // First day of previous month
    const firstDay = new Date(year, month, 1);
    // Last day of previous month
    const lastDay = new Date(year, month + 1, 0);
    
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0],
      periodName: `${firstDay.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}`
    };
  };
  
  // Quick calculation for current month
  const handleQuickCalculate = async () => {
    const { startDate: quickStart, endDate: quickEnd, periodName: quickPeriod } = getCurrentMonthDates();
    
    setStartDate(quickStart);
    setEndDate(quickEnd);
    setPeriodName(quickPeriod);
    setIsQuickMode(true);
    
    try {
      setIsCalculating(true);
      
      const result = await calculateShares({
        building_id: buildingId,
        start_date: quickStart,
        end_date: quickEnd,
        period_name: quickPeriod
      });
      
      setShares(result.shares || {});
      setTotalExpenses(result.total_expenses || 0);
    } catch (error) {
      console.error('Error in quick calculation:', error);
    } finally {
      setIsCalculating(false);
    }
  };
  
  // Quick calculation for previous month
  const handlePreviousMonthCalculate = async () => {
    const { startDate: prevStart, endDate: prevEnd, periodName: prevPeriod } = getPreviousMonthDates();
    
    setStartDate(prevStart);
    setEndDate(prevEnd);
    setPeriodName(prevPeriod);
    setIsQuickMode(true);
    
    try {
      setIsCalculating(true);
      
      const result = await calculateShares({
        building_id: buildingId,
        start_date: prevStart,
        end_date: prevEnd,
        period_name: prevPeriod
      });
      
      setShares(result.shares || {});
      setTotalExpenses(result.total_expenses || 0);
    } catch (error) {
      console.error('Error in previous month calculation:', error);
    } finally {
      setIsCalculating(false);
    }
  };
  
  // Manual calculation
  const handleCalculate = async () => {
    if (!startDate || !endDate || !periodName) {
      alert('Παρακαλώ συμπληρώστε όλα τα πεδία');
      return;
    }
    
    try {
      setIsCalculating(true);
      setIsQuickMode(false);
      
      if (isAdvancedMode && advancedShares) {
        const result = await calculateAdvancedShares({
          building_id: buildingId,
          start_date: startDate,
          end_date: endDate,
          period_name: periodName,
          advanced_shares: advancedShares
        });
        
        setShares(result.shares || {});
        setTotalExpenses(result.total_expenses || 0);
      } else {
        const result = await calculateShares({
          building_id: buildingId,
          start_date: startDate,
          end_date: endDate,
          period_name: periodName
        });
        
        setShares(result.shares || {});
        setTotalExpenses(result.total_expenses || 0);
      }
    } catch (error) {
      console.error('Error in calculation:', error);
    } finally {
      setIsCalculating(false);
    }
  };
  
  // Issue common expenses
  const handleIssue = async () => {
    if (Object.keys(shares).length === 0) {
      alert('Παρακαλώ εκτελέστε πρώτα τον υπολογισμό');
      return;
    }
    
    try {
      setIsIssuing(true);
      
      await issueCommonExpenses({
        building_id: buildingId,
        start_date: startDate,
        end_date: endDate,
        period_name: periodName,
        shares: shares,
        total_expenses: totalExpenses
      });
      
      alert('Οι κοινοχρήστες εκδόθηκαν επιτυχώς!');
      setShares({});
      setTotalExpenses(0);
    } catch (error) {
      console.error('Error issuing common expenses:', error);
      alert('Σφάλμα κατά την έκδοση των κοινοχρήστων');
    } finally {
      setIsIssuing(false);
    }
  };
  
  const getDistributionTypeLabel = (type: string) => {
    switch (type) {
      case 'by_participation_mills':
        return 'Ανά Χιλιοστά';
      case 'equal_share':
        return 'Ισόποσα';
      case 'specific_apartments':
        return 'Συγκεκριμένα';
      case 'by_meters':
        return 'Μετρητές';
      default:
        return type;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Quick Calculation Panel */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Zap className="h-5 w-5" />
            Γρήγορος Υπολογισμός
          </CardTitle>
          <div className="text-sm text-blue-600 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Επιλέξτε για αυτόματο υπολογισμό χωρίς manual input
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={handleQuickCalculate} 
              disabled={isCalculating}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Calendar className="h-4 w-4" />
              {isCalculating ? 'Υπολογισμός...' : 'Υπολογισμός Τρέχοντος Μήνα'}
            </Button>
            
            <Button 
              onClick={handlePreviousMonthCalculate} 
              disabled={isCalculating}
              variant="outline"
              className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <Calendar className="h-4 w-4" />
              {isCalculating ? 'Υπολογισμός...' : 'Υπολογισμός Προηγούμενου Μήνα'}
            </Button>
          </div>
          
          {isQuickMode && (
            <div className="mt-3 p-3 bg-blue-100 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-800">
                <strong>Γρήγορη λειτουργία ενεργή:</strong> Ημερομηνίες συμπληρώθηκαν αυτόματα
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Φόρμα Υπολογισμού */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Χειροκίνητος Υπολογισμός Κοινοχρήστων
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Συμπληρώστε τα πεδία για προσαρμοσμένο υπολογισμό
          </div>
          
          {/* Advanced Calculator Toggle */}
          <div className="flex items-center space-x-2 mt-4">
            <Label htmlFor="advanced-mode" className="text-sm font-medium">
              Προηγμένος Υπολογιστής
            </Label>
            <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2">
              <input
                type="checkbox"
                id="advanced-mode"
                checked={isAdvancedMode}
                onChange={(e) => setIsAdvancedMode(e.target.checked)}
                className="sr-only"
              />
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAdvancedMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period-name">Όνομα Περιόδου</Label>
              <Input
                id="period-name"
                value={periodName}
                onChange={(e) => setPeriodName(e.target.value)}
                placeholder="π.χ. Αύγουστος 2025"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="start-date">Ημερομηνία Έναρξης</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end-date">Ημερομηνία Λήξης</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <Button 
              onClick={handleCalculate} 
              disabled={isCalculating}
              className="flex items-center gap-2"
            >
              <Calculator className="h-4 w-4" />
              {isCalculating ? 'Υπολογισμός...' : 'Υπολογισμός'}
            </Button>
            
            {Object.keys(shares).length > 0 && (
              <Button 
                onClick={handleIssue} 
                disabled={isIssuing}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {isIssuing ? 'Έκδοση...' : 'Έκδοση Κοινοχρήστων'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Ανάλυση Μεριδίων */}
      {Object.keys(shares).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ανάλυση Μεριδίων ανά Δαπάνη</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.values(shares).map((share) => (
                <div key={share.apartment_id} className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">
                    Διαμέρισμα {share.apartment_number} - {share.owner_name}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Χιλιοστά</div>
                      <div className="font-medium">{share.participation_mills}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Προηγούμενο Υπόλοιπο</div>
                      <div className={`font-medium ${share.previous_balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatAmount(share.previous_balance)}€
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Μερίδιο Δαπανών</div>
                      <div className="font-medium">{formatAmount(share.total_amount)}€</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Συνολικό Οφειλόμενο</div>
                      <div className={`font-medium ${share.total_due < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatAmount(share.total_due)}€
                      </div>
                    </div>
                  </div>
                  
                  {share.reserve_fund_amount && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm text-gray-600">Αποθεματικό</div>
                      <div className="font-medium text-blue-600">{formatAmount(share.reserve_fund_amount)}€</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 