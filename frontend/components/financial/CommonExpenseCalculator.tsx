import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCommonExpenses } from '@/hooks/useCommonExpenses';
import { toast } from 'sonner';
import { Calculator, FileText, Send } from 'lucide-react';

interface CommonExpenseCalculatorProps {
  buildingId: number;
}

interface ApartmentShare {
  apartment_id: number;
  apartment_number: string;
  owner_name: string;
  participation_mills: number;
  current_balance: number;
  total_amount: number;
  previous_balance: number;
  total_due: number;
  breakdown: Array<{
    expense_id: number;
    expense_title: string;
    expense_amount: number;
    apartment_share: number;
    distribution_type: string;
    category: string;
  }>;
}

export const CommonExpenseCalculator: React.FC<CommonExpenseCalculatorProps> = ({ buildingId }) => {
  const [periodName, setPeriodName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shares, setShares] = useState<Record<string, ApartmentShare>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);
  
  const { calculateShares, issueCommonExpenses } = useCommonExpenses();
  
  const handleCalculate = async () => {
    if (!periodName || !startDate || !endDate) {
      toast.error('Παρακαλώ συμπληρώστε όλα τα πεδία');
      return;
    }
    
    try {
      setIsCalculating(true);
      
      const result = await calculateShares({
        building_id: buildingId,
        period_name: periodName,
        start_date: startDate,
        end_date: endDate
      });
      
      setShares(result.shares);
      setTotalExpenses(result.total_expenses);
      
      toast.success('Υπολογισμός ολοκληρώθηκε επιτυχώς');
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
      
      // Δημιουργία περιόδου
      const periodData = {
        building_id: buildingId,
        period_name: periodName,
        start_date: startDate,
        end_date: endDate
      };
      
      await issueCommonExpenses({
        period_data: periodData,
        apartment_shares: Object.values(shares)
      });
      
      toast.success('Κοινοχρήστων εκδόθηκαν επιτυχώς');
      
      // Reset form
      setPeriodName('');
      setStartDate('');
      setEndDate('');
      setShares({});
      setTotalExpenses(0);
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
      {/* Φόρμα Υπολογισμού */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Υπολογισμός Κοινοχρήστων
          </CardTitle>
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
              />
            </div>
            <div>
              <Label htmlFor="startDate">Ημερομηνία Έναρξης</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Ημερομηνία Λήξης</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Συνολικές δαπάνες: <span className="font-semibold">{formatAmount(totalExpenses)}€</span>
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
    </div>
  );
}; 