import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  X, 
  Thermometer,
  Calculator,
  PieChart,
  BarChart3,
  Settings,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface HeatingAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildingId: number;
  totalHeatingCost: number;
  apartments: Array<{
    id: number;
    number: string;
    owner_name: string;
    heating_mills: number;
    participation_mills: number;
  }>;
  onHeatingCalculated: (heatingBreakdown: HeatingBreakdown) => void;
}

interface HeatingBreakdown {
  type: 'autonomous' | 'central';
  fixedPercentage: number;
  fixedCost: number;
  variableCost: number;
  apartmentShares: Record<number, {
    fixedShare: number;
    variableShare: number;
    totalShare: number;
    consumption?: number;
  }>;
  totalDistributed: number;
}

interface MeterReading {
  apartment_id: number;
  value: number;
  date: string;
}

export const HeatingAnalysisModal: React.FC<HeatingAnalysisModalProps> = ({
  isOpen,
  onClose,
  buildingId,
  totalHeatingCost,
  apartments,
  onHeatingCalculated
}) => {
  const [heatingType, setHeatingType] = useState<'autonomous' | 'central'>('autonomous');
  const [fixedPercentage, setFixedPercentage] = useState(30);
  const [meterReadings, setMeterReadings] = useState<Record<number, number>>({});
  const [isCalculating, setIsCalculating] = useState(false);

  // Υπολογισμός ανάλυσης θέρμανσης
  const heatingBreakdown = useMemo(() => {
    if (!isOpen) return null;

    const breakdown: HeatingBreakdown = {
      type: heatingType,
      fixedPercentage,
      fixedCost: (totalHeatingCost * fixedPercentage) / 100,
      variableCost: totalHeatingCost - ((totalHeatingCost * fixedPercentage) / 100),
      apartmentShares: {},
      totalDistributed: 0
    };

    const totalHeatingMills = apartments.reduce((sum, apt) => sum + (apt.heating_mills || 0), 0);
    const totalConsumption = Object.values(meterReadings).reduce((sum, val) => sum + val, 0);

    apartments.forEach(apartment => {
      const heatingMills = apartment.heating_mills || 0;
      const consumption = meterReadings[apartment.id] || 0;

      // Υπολογισμός πάγιου μεριδίου (ανά χιλιοστά θέρμανσης)
      let fixedShare = 0;
      if (totalHeatingMills > 0) {
        fixedShare = breakdown.fixedCost * (heatingMills / totalHeatingMills);
      }

      // Υπολογισμός μεταβλητού μεριδίου
      let variableShare = 0;
      if (heatingType === 'autonomous') {
        // Αυτονομία: ανά μετρήσεις
        if (totalConsumption > 0) {
          variableShare = breakdown.variableCost * (consumption / totalConsumption);
        }
      } else {
        // Κεντρική: ανά χιλιοστά θέρμανσης
        if (totalHeatingMills > 0) {
          variableShare = breakdown.variableCost * (heatingMills / totalHeatingMills);
        }
      }

      const totalShare = fixedShare + variableShare;

      breakdown.apartmentShares[apartment.id] = {
        fixedShare,
        variableShare,
        totalShare,
        consumption
      };

      breakdown.totalDistributed += totalShare;
    });

    return breakdown;
  }, [isOpen, heatingType, fixedPercentage, totalHeatingCost, apartments, meterReadings]);

  // Εισαγωγή μετρήσεων
  const handleMeterReadingChange = (apartmentId: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    setMeterReadings(prev => ({
      ...prev,
      [apartmentId]: numValue
    }));
  };

  // Εφαρμογή υπολογισμών
  const handleApplyCalculations = () => {
    if (!heatingBreakdown) return;

    // Έλεγχος αν τα αθροίσματα ταιριάζουν
    const difference = Math.abs(heatingBreakdown.totalDistributed - totalHeatingCost);
    if (difference > 0.01) {
      toast.error(`Προσοχή: Διαφορά ${difference.toFixed(2)}€ στους υπολογισμούς`);
    }

    onHeatingCalculated(heatingBreakdown);
    toast.success('✅ Υπολογισμοί θέρμανσης εφαρμόστηκαν!');
    onClose();
  };

  // Έλεγχος αν υπάρχουν μετρήσεις
  const hasMeterReadings = Object.values(meterReadings).some(val => val > 0);
  const totalMeterReadings = Object.values(meterReadings).reduce((sum, val) => sum + val, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Thermometer className="h-6 w-6 text-orange-500" />
            <div>
              <h2 className="text-xl font-semibold">Ανάλυση Θέρμανσης</h2>
              <p className="text-sm text-gray-600">Υπολογισμός κατανομής κόστους θέρμανσης</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          {/* Ρυθμίσεις */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Ρυθμίσεις Υπολογισμού
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Τύπος θέρμανσης */}
                <div>
                  <Label htmlFor="heating-type">Τύπος Θέρμανσης</Label>
                  <Select value={heatingType} onValueChange={(value: 'autonomous' | 'central') => setHeatingType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="autonomous">Αυτονομία Θέρμανσης</SelectItem>
                      <SelectItem value="central">Κεντρική Θέρμανση</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Πάγιο ποσοστό */}
                {heatingType === 'autonomous' && (
                  <div>
                    <Label htmlFor="fixed-percentage">Πάγιο Ποσοστό (%)</Label>
                    <Input
                      id="fixed-percentage"
                      type="number"
                      min="0"
                      max="100"
                      value={fixedPercentage}
                      onChange={(e) => setFixedPercentage(parseInt(e.target.value) || 0)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ποσοστό που κατανομείται ανά χιλιοστά θέρμανσης
                    </p>
                  </div>
                )}
              </div>

              {/* Πληροφορίες */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800">
                      {heatingType === 'autonomous' ? 'Αυτονομία Θέρμανσης' : 'Κεντρική Θέρμανση'}
                    </p>
                    {heatingType === 'autonomous' ? (
                      <p className="text-blue-700">
                        • Πάγιο κόστος ({fixedPercentage}%): {((totalHeatingCost * fixedPercentage) / 100).toFixed(2)}€ → κατανομή ανά χιλιοστά θέρμανσης<br/>
                        • Μεταβλητό κόστος ({100 - fixedPercentage}%): {(totalHeatingCost - ((totalHeatingCost * fixedPercentage) / 100)).toFixed(2)}€ → κατανομή ανά μετρήσεις
                      </p>
                    ) : (
                      <p className="text-blue-700">
                        • 100% του κόστους ({totalHeatingCost.toFixed(2)}€) → κατανομή ανά χιλιοστά θέρμανσης
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Μετρήσεις */}
          {heatingType === 'autonomous' && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Μετρήσεις Κατανάλωσης
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {apartments.map(apartment => (
                    <div key={apartment.id} className="space-y-2">
                      <Label htmlFor={`meter-${apartment.id}`}>
                        Διαμέρισμα {apartment.number}
                      </Label>
                      <Input
                        id={`meter-${apartment.id}`}
                        type="number"
                        min="0"
                        max="999999.99"
                        step="0.01"
                        placeholder="0.00"
                        value={meterReadings[apartment.id] ? Number(meterReadings[apartment.id]).toFixed(2) : ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value)) {
                            // Limit to 2 decimal places
                            const roundedValue = Math.round(value * 100) / 100;
                            handleMeterReadingChange(apartment.id, roundedValue.toString());
                          } else {
                            handleMeterReadingChange(apartment.id, '');
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
                
                {hasMeterReadings && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">
                      ✅ Συνολική κατανάλωση: {totalMeterReadings.toFixed(2)} μονάδες
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Ανάλυση */}
          {heatingBreakdown && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Ανάλυση Κατανομής
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Διαμέρισμα</TableHead>
                      <TableHead>Χιλιοστά Θέρμανσης</TableHead>
                      {heatingType === 'autonomous' && (
                        <>
                          <TableHead>Κατανάλωση</TableHead>
                          <TableHead>Πάγιο Μερίδιο</TableHead>
                          <TableHead>Μεταβλητό Μερίδιο</TableHead>
                        </>
                      )}
                      <TableHead>Συνολικό Μερίδιο</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apartments.map(apartment => {
                      const share = heatingBreakdown.apartmentShares[apartment.id];
                      return (
                        <TableRow key={apartment.id}>
                          <TableCell className="font-medium">
                            {apartment.number}
                          </TableCell>
                          <TableCell>{apartment.heating_mills || 0}</TableCell>
                          {heatingType === 'autonomous' && (
                            <>
                              <TableCell>{share?.consumption?.toFixed(2) || '0.00'}</TableCell>
                              <TableCell>{share?.fixedShare.toFixed(2)}€</TableCell>
                              <TableCell>{share?.variableShare.toFixed(2)}€</TableCell>
                            </>
                          )}
                          <TableCell className="font-semibold">
                            {share?.totalShare.toFixed(2)}€
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-gray-50">
                      <TableCell className="font-bold">ΣΥΝΟΛΑ</TableCell>
                      <TableCell className="font-bold">
                        {apartments.reduce((sum, apt) => sum + (apt.heating_mills || 0), 0)}
                      </TableCell>
                      {heatingType === 'autonomous' && (
                        <>
                          <TableCell className="font-bold">
                            {totalMeterReadings.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-bold">
                            {heatingBreakdown.fixedCost.toFixed(2)}€
                          </TableCell>
                          <TableCell className="font-bold">
                            {heatingBreakdown.variableCost.toFixed(2)}€
                          </TableCell>
                        </>
                      )}
                      <TableCell className="font-bold">
                        {heatingBreakdown.totalDistributed.toFixed(2)}€
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {/* Έλεγχος αθροισμάτων */}
                <div className="mt-4 p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Έλεγχος Αθροισμάτων</p>
                      <p className="text-sm text-gray-600">
                        Συνολικό κόστος: {totalHeatingCost.toFixed(2)}€ | 
                        Κατανομημένο: {heatingBreakdown.totalDistributed.toFixed(2)}€
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {Math.abs(heatingBreakdown.totalDistributed - totalHeatingCost) <= 0.01 ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      <Badge variant={Math.abs(heatingBreakdown.totalDistributed - totalHeatingCost) <= 0.01 ? "default" : "destructive"}>
                        {Math.abs(heatingBreakdown.totalDistributed - totalHeatingCost) <= 0.01 ? "Σωστά" : "Διαφορά"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Κουμπιά ενεργειών */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Ακύρωση
            </Button>
            <Button 
              onClick={handleApplyCalculations}
              disabled={!heatingBreakdown || (heatingType === 'autonomous' && !hasMeterReadings)}
            >
              Εφαρμογή Υπολογισμών
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
