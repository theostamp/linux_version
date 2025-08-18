import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCommonExpenses } from '@/hooks/useCommonExpenses';
import { ApartmentShare } from '@/types/financial';
import { toast } from 'sonner';
import { Calculator, FileText, Send, Zap, Calendar, Info } from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';

interface CommonExpenseCalculatorProps {
  buildingId: number;
  selectedMonth?: string; // Add selectedMonth prop
}

export const CommonExpenseCalculator: React.FC<CommonExpenseCalculatorProps> = ({ buildingId, selectedMonth }) => {
  const [periodName, setPeriodName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shares, setShares] = useState<Record<string, ApartmentShare>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [isQuickMode, setIsQuickMode] = useState(false);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [advancedShares, setAdvancedShares] = useState<any>(null);
  
  const { calculateShares, calculateAdvancedShares, issueCommonExpenses } = useCommonExpenses();
  const { payments } = usePayments(buildingId, selectedMonth);
  
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
      
      if (isAdvancedMode) {
        const result = await calculateAdvancedShares({
          building_id: buildingId,
          period_start_date: quickStart,
          period_end_date: quickEnd
        });
        
        setAdvancedShares(result);
        setShares(result.shares);
        setTotalExpenses(result.total_expenses);
        
        toast.success('Γρήγορος προηγμένος υπολογισμός τρέχοντος μήνα ολοκληρώθηκε επιτυχώς');
      } else {
        const result = await calculateShares({
          building_id: buildingId
        });
        
        setShares(result.shares);
        setTotalExpenses(result.total_expenses);
        setAdvancedShares(null);
        
        toast.success('Γρήγορος υπολογισμός τρέχοντος μήνα ολοκληρώθηκε επιτυχώς');
      }
    } catch (error) {
      console.error('Error in quick calculation:', error);
      toast.error('Σφάλμα κατά τον γρήγορο υπολογισμό');
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
      
      if (isAdvancedMode) {
        const result = await calculateAdvancedShares({
          building_id: buildingId,
          period_start_date: prevStart,
          period_end_date: prevEnd
        });
        
        setAdvancedShares(result);
        setShares(result.shares);
        setTotalExpenses(result.total_expenses);
        
        toast.success('Γρήγορος προηγμένος υπολογισμός προηγούμενου μήνα ολοκληρώθηκε επιτυχώς');
      } else {
        const result = await calculateShares({
          building_id: buildingId
        });
        
        setShares(result.shares);
        setTotalExpenses(result.total_expenses);
        setAdvancedShares(null);
        
        toast.success('Γρήγορος υπολογισμός προηγούμενου μήνα ολοκληρώθηκε επιτυχώς');
      }
    } catch (error) {
      console.error('Error in previous month calculation:', error);
      toast.error('Σφάλμα κατά τον υπολογισμό προηγούμενου μήνα');
    } finally {
      setIsCalculating(false);
    }
  };
  
  const handleCalculate = async () => {
    if (!periodName || !startDate || !endDate) {
      toast.error('Παρακαλώ συμπληρώστε όλα τα πεδία');
      return;
    }
    
    setIsQuickMode(false);
    
    try {
      setIsCalculating(true);
      
      if (isAdvancedMode) {
        // Προηγμένος υπολογιστής
        const result = await calculateAdvancedShares({
          building_id: buildingId,
          period_start_date: startDate,
          period_end_date: endDate
        });
        
        setAdvancedShares(result);
        setShares(result.shares);
        setTotalExpenses(result.total_expenses);
        
        toast.success('Προηγμένος υπολογισμός ολοκληρώθηκε επιτυχώς');
      } else {
        // Απλός υπολογιστής
        const result = await calculateShares({
          building_id: buildingId
        });
        
        setShares(result.shares);
        setTotalExpenses(result.total_expenses);
        setAdvancedShares(null);
        
        toast.success('Υπολογισμός ολοκληρώθηκε επιτυχώς');
      }
    } catch (error) {
      console.error('Error calculating shares:', error);
      toast.error('Σφάλμα κατά τον υπολογισμό');
    } finally {
      setIsCalculating(false);
    }
  };
  
  const handleIssue = async () => {
    if (Object.keys(shares).length === 0) {
      toast.error('Παρακαλώ κάντε πρώτα υπολογισμό');
      return;
    }
    
    try {
      setIsIssuing(true);
      
      // Μετατροπή των shares σε μορφή που περιμένει το backend
      const sharesData: Record<string, { total_amount: number; breakdown: Record<string, any> }> = {};
      
      Object.entries(shares).forEach(([apartmentId, share]) => {
        sharesData[apartmentId] = {
          total_amount: share.total_amount,
          breakdown: share.breakdown.reduce((acc: Record<string, any>, item) => {
            acc[item.expense_id] = {
              expense_title: item.expense_title,
              expense_amount: item.expense_amount,
              apartment_share: item.apartment_share,
              distribution_type: item.distribution_type,
              distribution_type_display: item.distribution_type_display
            };
            return acc;
          }, {} as Record<string, any>)
        };
      });
      
      await issueCommonExpenses({
        building_id: buildingId,
        period_data: {
          name: periodName,
          start_date: startDate,
          end_date: endDate
        },
        shares: sharesData,
        expense_ids: Object.values(shares).flatMap(share => 
          share.breakdown.map(item => item.expense_id)
        )
      });
      
      toast.success('Κοινοχρήστων εκδόθηκαν επιτυχώς');
      
      // Reset form
      setPeriodName('');
      setStartDate('');
      setEndDate('');
      setShares({});
      setTotalExpenses(0);
      setIsQuickMode(false);
    } catch (error) {
      console.error('Error issuing common expenses:', error);
      toast.error('Σφάλμα κατά την έκδοση κοινοχρήστων');
    } finally {
      setIsIssuing(false);
    }
  };
  
  const formatAmount = (amount: number) => {
    return amount.toFixed(2);
  };

  // Derived metrics for summary cards
  const apartmentsCount = useMemo(() => Object.keys(shares).length, [shares]);
  const reservePlanned = useMemo(() => {
    return Object.values(shares).reduce((sum: number, s: any) => sum + (s.reserve_fund_amount || 0), 0);
  }, [shares]);
  const paymentsCommonTotal = useMemo(() => {
    return (payments || []).reduce((sum: number, p: any) => sum + (p.payment_type === 'common_expense' ? (p.amount || 0) : 0), 0);
  }, [payments]);
  const paymentsReserveTotal = useMemo(() => {
    return (payments || []).reduce((sum: number, p: any) => sum + (p.payment_type === 'reserve_fund' ? (p.amount || 0) : 0), 0);
  }, [payments]);
  const cashNow = useMemo(() => paymentsCommonTotal + paymentsReserveTotal, [paymentsCommonTotal, paymentsReserveTotal]);
  const reserveRemaining = useMemo(() => Math.max(0, reservePlanned - paymentsReserveTotal), [reservePlanned, paymentsReserveTotal]);
  
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
            <span className="text-xs text-muted-foreground">
              {isAdvancedMode ? 'Ενεργό' : 'Απλό'}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="periodName">Όνομα Περιόδου</Label>
              <Input
                id="periodName"
                value={periodName}
                onChange={(e) => setPeriodName(e.target.value)}
                placeholder="π.χ. Ιανουάριος 2024"
                className={isQuickMode ? 'bg-blue-50 border-blue-200' : ''}
              />
            </div>
            <div>
              <Label htmlFor="startDate">Ημερομηνία Έναρξης</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={isQuickMode ? 'bg-blue-50 border-blue-200' : ''}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Ημερομηνία Λήξης</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={isQuickMode ? 'bg-blue-50 border-blue-200' : ''}
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
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
                <Send className="h-4 w-4" />
                {isIssuing ? 'Έκδοση...' : 'Έκδοση Κοινοχρήστων'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Αποτελέσματα Υπολογισμού */}
      {Object.keys(shares).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Αποτελέσματα Υπολογισμού
              {isQuickMode && (
                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                  Γρήγορη Λειτουργία
                </Badge>
              )}
            </CardTitle>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border bg-white">
                <div className="text-xs text-gray-600">Κοινοχρήστες Δαπάνες (χωρίς αποθεματικό)</div>
                <div className="text-xl font-bold text-blue-700">{formatAmount(totalExpenses)}€</div>
                <div className="text-xs text-gray-500">Διαμερίσματα: {apartmentsCount}</div>
              </div>
              <div className="p-3 rounded-lg border bg-white">
                <div className="text-xs text-gray-600">Αποθεματικό</div>
                <div className="text-xl font-bold text-teal-700">{formatAmount(paymentsReserveTotal)}€</div>
                <div className="text-xs text-gray-500">Στόχος: {formatAmount(reservePlanned)}€ • Υπόλοιπο: {formatAmount(reserveRemaining)}€</div>
              </div>
              <div className="p-3 rounded-lg border bg-white">
                <div className="text-xs text-gray-600">Εισπράξεις Κοινοχρήστων (χωρίς αποθεματικό)</div>
                <div className="text-xl font-bold text-green-700">{formatAmount(paymentsCommonTotal)}€</div>
                <div className="text-xs text-gray-500">Περίοδος: {selectedMonth ? new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' }) : '-'}</div>
              </div>
              <div className="p-3 rounded-lg border bg-white">
                <div className="text-xs text-gray-600">Ταμείο (εισπραχθέντα με αποθεματικό)</div>
                <div className="text-xl font-bold text-purple-700">{formatAmount(cashNow)}€</div>
                <div className="text-xs text-gray-500">Κοιν.: {formatAmount(paymentsCommonTotal)}€ • Αποθ.: {formatAmount(paymentsReserveTotal)}€</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Διαμέρισμα</TableHead>
                  <TableHead>Ιδιοκτήτης</TableHead>
                  <TableHead>Χιλιοστά</TableHead>
                  <TableHead>Προηγούμενο Υπόλοιπο</TableHead>
                  <TableHead>Μερίδιο Δαπανών</TableHead>
                  <TableHead>Αποθεματικό</TableHead>
                  <TableHead>Συνολικό Οφειλόμενο</TableHead>
                  <TableHead>Κατάσταση</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(shares).map((share) => (
                  <TableRow key={share.apartment_id}>
                    <TableCell className="font-medium">
                      {share.apartment_number}
                    </TableCell>
                    <TableCell>{share.owner_name}</TableCell>
                    <TableCell>{share.participation_mills}</TableCell>
                    <TableCell className={share.previous_balance < 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatAmount(share.previous_balance)}€
                    </TableCell>
                    <TableCell>{formatAmount(share.total_amount)}€</TableCell>
                    <TableCell className="text-blue-600 font-medium">
                      {share.reserve_fund_amount ? formatAmount(share.reserve_fund_amount) + '€' : '-'}
                    </TableCell>
                    <TableCell className={`font-semibold ${
                      share.total_due < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatAmount(share.total_due)}€
                    </TableCell>
                    <TableCell>
                      <Badge variant={share.total_due < 0 ? 'destructive' : 'default'}>
                        {share.total_due < 0 ? 'Οφειλόμενο' : 'Ενεργό'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
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
                  <div className="space-y-2">
                    {share.breakdown.map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="flex-1">{item.expense_title}</span>
                        <span className="text-muted-foreground">
                          {getDistributionTypeLabel(item.distribution_type)}
                        </span>
                        <span className="font-medium">
                          {formatAmount(item.apartment_share)}€
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Προηγμένος Υπολογιστής - Λεπτομερής Ανάλυση */}
      {isAdvancedMode && advancedShares && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Calculator className="h-5 w-5" />
              Προηγμένος Υπολογιστής - Λεπτομερής Ανάλυση
            </CardTitle>
            <div className="text-sm text-green-600">
              Ανάλυση μεριδίων με ειδική διαχείριση θέρμανσης, ανελκυστήρα και αποθεματικού
            </div>
          </CardHeader>
          <CardContent>
            {/* Σύνοψη Δαπανών */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-800 mb-2">Συνολικές Δαπάνες</h4>
                <div className="text-2xl font-bold text-blue-600">
                  {formatAmount(advancedShares.total_expenses)}€
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-800 mb-2">Θέρμανση</h4>
                <div className="text-2xl font-bold text-orange-600">
                  {formatAmount(advancedShares.heating_costs?.total || 0)}€
                </div>
                <div className="text-sm text-gray-600">
                  Πάγιο: {formatAmount(advancedShares.heating_costs?.fixed || 0)}€ | 
                  Μεταβλητό: {formatAmount(advancedShares.heating_costs?.variable || 0)}€
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <h4 className="font-semibold text-gray-800 mb-2">Ανελκυστήρας</h4>
                <div className="text-2xl font-bold text-purple-600">
                  {formatAmount(advancedShares.elevator_costs || 0)}€
                </div>
              </div>
            </div>
            
            {/* Ανάλυση ανά Κατηγορία */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800">Ανάλυση ανά Κατηγορία Δαπάνης</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Κατηγορία</TableHead>
                    <TableHead>Συνολικό Ποσό</TableHead>
                    <TableHead>Ανά Διαμέρισμα</TableHead>
                    <TableHead>Μέθοδος Κατανομής</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advancedShares.expense_breakdown?.map((category: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{category.category}</TableCell>
                      <TableCell>{formatAmount(category.total_amount)}€</TableCell>
                      <TableCell>{formatAmount(category.per_apartment)}€</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {category.distribution_method}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Ειδικά Χιλιοστά Ανελκυστήρα */}
            {advancedShares.elevator_shares && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-800 mb-3">Ειδικά Χιλιοστά Ανελκυστήρα</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Διαμέρισμα</TableHead>
                      <TableHead>Χιλιοστά Ανελκυστήρα</TableHead>
                      <TableHead>Μερίδιο Ανελκυστήρα</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.values(advancedShares.elevator_shares).map((share: any) => (
                      <TableRow key={share.apartment_id}>
                        <TableCell className="font-medium">
                          {share.apartment_number}
                        </TableCell>
                        <TableCell>{share.elevator_mills}</TableCell>
                        <TableCell>{formatAmount(share.elevator_share)}€</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* Εισφορά Αποθεματικού */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Εισφορά Αποθεματικού</h4>
              <div className="text-sm text-blue-700">
                Κατανομή αποθεματικού ανά χιλιοστά - Συνολικά: {formatAmount(advancedShares.reserve_contribution || 0)}€
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Αυτόματη προσθήκη στο συνολικό μερίδιο κάθε διαμερίσματος
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 