import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  Euro, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Building,
  Users,
  Calculator
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface ApartmentObligation {
  apartment_id: number;
  apartment_number: string;
  owner_name: string;
  participation_mills: number;
  current_balance: number;
  total_obligations: number;
  total_payments: number;
  net_obligation: number;
  expense_share: number;
  previous_balance: number;
  expense_breakdown: ExpenseBreakdown[];
  payment_breakdown: PaymentBreakdown[];
}

interface ExpenseBreakdown {
  expense_id: number;
  expense_title: string;
  expense_amount: number;
  share_amount: number;
  distribution_type: string;
  date: string;
  month: string;
  month_display: string;
  mills?: number;
  total_mills?: number;
}

interface PaymentBreakdown {
  payment_id: number;
  payment_date: string;
  payment_amount: number;
  payer_name: string;
}

interface PreviousObligationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildingId: number;
  selectedMonth?: string;
}

export const PreviousObligationsModal: React.FC<PreviousObligationsModalProps> = ({
  isOpen,
  onClose,
  buildingId,
  selectedMonth
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apartmentObligations, setApartmentObligations] = useState<ApartmentObligation[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadPreviousObligations();
    }
  }, [isOpen, buildingId, selectedMonth]);

  const loadPreviousObligations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Loading previous obligations for building:', buildingId);
      
      // Load financial summary first
      const summaryParams = new URLSearchParams({
        building_id: buildingId.toString(),
        ...(selectedMonth && { month: selectedMonth })
      });
      
      const summaryResponse = await api.get(`/financial/dashboard/summary/?${summaryParams}`);
      setSummary(summaryResponse.data);
      
      // Load apartment obligations breakdown
      const obligationsParams = new URLSearchParams({
        building_id: buildingId.toString(),
        ...(selectedMonth && { month: selectedMonth })
      });
      
      const obligationsResponse = await api.get(`/financial/dashboard/apartment_obligations/?${obligationsParams}`);
      setApartmentObligations(obligationsResponse.data.apartments || []);
      
    } catch (err) {
      console.error('❌ Error loading previous obligations:', err);
      setError('Σφάλμα κατά τη φόρτωση των οφειλών προηγούμενων μηνών');
    } finally {
      setIsLoading(false);
    }
  };

  const getDistributionTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'by_participation_mills': 'Ανά Χιλιοστά',
      'equal_share': 'Ισόποσα',
      'specific_apartments': 'Συγκεκριμένα',
      'by_meters': 'Μετρητές'
    };
    return labels[type] || type;
  };

  const getStatusIcon = (netObligation: number) => {
    if (netObligation > 0) {
      return <XCircle className="h-5 w-5 text-red-600" />;
    } else if (netObligation < 0) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    return <Info className="h-5 w-5 text-blue-600" />;
  };

  const getStatusText = (netObligation: number) => {
    if (netObligation > 0) {
      return 'Υπάρχει Οφειλή';
    } else if (netObligation < 0) {
      return 'Πιστωτικό Υπόλοιπο';
    }
    return 'Μηδενικό Υπόλοιπο';
  };

  // Use the correct previous_obligations from API instead of calculating from apartments
  const totalObligations = summary?.previous_obligations || 0;
  const totalPayments = apartmentObligations.reduce((sum, apt) => sum + apt.total_payments, 0);
  // Use the same value as totalObligations since this represents previous obligations
  const totalNetObligations = totalObligations;
  const apartmentsWithObligations = apartmentObligations.filter(apt => apt.net_obligation > 0).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-purple-600" />
            <div className="flex flex-col">
              <span>Οφειλές Προηγούμενων Μηνών</span>
              {selectedMonth && (
                <span className="text-sm font-normal text-gray-600 mt-1">
                  Περίοδος: {new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="border-2 border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">Συνολικές Υποχρεώσεις</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-purple-800 mt-2">
                    {formatCurrency(totalObligations)}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-100 bg-gradient-to-r from-green-50 to-emerald-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Euro className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Συνολικές Πληρωμές</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green-800 mt-2">
                    {formatCurrency(totalPayments)}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-red-100 bg-gradient-to-r from-red-50 to-pink-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-medium text-red-700">Συνολικές Οφειλές</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-red-800 mt-2">
                    {formatCurrency(totalNetObligations)}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">Διαμερίσματα με Οφειλές</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-800 mt-2">
                    {apartmentsWithObligations}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-indigo-600" />
                      <span className="text-sm font-medium text-indigo-700">Μελλοντικές Δαπάνες</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-indigo-800 mt-2">
                    {formatCurrency(Math.max(0, (apartmentObligations.reduce((sum, apt) => sum + apt.total_obligations, 0)) - (summary?.previous_obligations || 0)))}
                  </div>

                </CardContent>
              </Card>
            </div>

            {/* Analysis of Previous Obligations */}
            <Card className="border-2 border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="h-5 w-5 text-purple-600" />
                  <span className="font-medium text-lg text-purple-800">Ανάλυση Παλαιότερων Οφειλών</span>
                </div>
                <div className="space-y-3">
                  {/* Συσσωρευμένες οφειλές διαμερισμάτων */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Συσσωρευμένες οφειλές διαμερισμάτων:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-red-700">
                        {formatCurrency(totalObligations)}
                      </span>
                      <span className="text-xs text-gray-500">(αρνητικά υπόλοιπα)</span>
                    </div>
                  </div>
                  
                  {/* Εκκρεμείς πληρωμές προηγούμενων μηνών */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Εκκρεμείς πληρωμές προηγούμενων μηνών:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-orange-700">
                        {formatCurrency(summary?.pending_payments || 0)}
                      </span>
                      <span className="text-xs text-gray-500">(μη εξοφλημένες)</span>
                    </div>
                  </div>
                  
                  {/* Δαπάνες που δεν έχουν καλυφθεί */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Δαπάνες που δεν έχουν καλυφθεί:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-yellow-700">
                        {formatCurrency(summary?.pending_expenses || 0)}
                      </span>
                      <span className="text-xs text-gray-500">(εκκρεμείς δαπάνες)</span>
                    </div>
                  </div>
                  
                  {/* Μελλοντικές δαπάνες από δόσεις έργων */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Μελλοντικές δαπάνες:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-indigo-700">
                        {formatCurrency(Math.max(0, (apartmentObligations.reduce((sum, apt) => sum + apt.total_obligations, 0)) - (summary?.previous_obligations || 0)))}
                      </span>
                      <span className="text-xs text-gray-500">(δόσεις έργων)</span>
                    </div>
                  </div>
                  
                  {/* Συνολικές παλαιότερες οφειλές */}
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-800">Συνολικές παλαιότερες οφειλές:</span>
                      <span className="font-bold text-lg text-purple-600">
                        {formatCurrency(totalObligations)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Συσσωρευμένες οφειλές διαμερισμάτων + Εκκρεμείς πληρωμές + Δαπάνες που δεν έχουν καλυφθεί
                    </div>
                  </div>
                  
                  {/* Συνολικό ποσό με μελλοντικές δαπάνες */}
                  <div className="pt-2 border-t-2 border-indigo-200 bg-indigo-50 p-3 rounded">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-indigo-800">Συνολικό ποσό (συμπεριλαμβανομένων μελλοντικών):</span>
                      <span className="font-bold text-lg text-indigo-700">
                        {formatCurrency(apartmentObligations.reduce((sum, apt) => sum + apt.total_obligations, 0))}
                      </span>
                    </div>
                    <div className="text-xs text-indigo-600 mt-1">
                      Παλαιότερες οφειλές + Μελλοντικές δαπάνες (δόσεις έργων)
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Apartment Details */}
            <Tabs defaultValue="apartments" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="apartments">Διαμερίσματα</TabsTrigger>
                <TabsTrigger value="breakdown">Αναλυτική Εξέταση</TabsTrigger>
              </TabsList>

              <TabsContent value="apartments" className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {apartmentObligations.map((apartment) => (
                    <Card key={apartment.apartment_id} className="border-l-4 border-purple-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(apartment.net_obligation)}
                            <div>
                              <h3 className="font-semibold text-lg">
                                Διαμέρισμα {apartment.apartment_number}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {apartment.owner_name}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xl font-bold ${
                              apartment.net_obligation > 0 ? 'text-red-600' : 
                              apartment.net_obligation < 0 ? 'text-green-600' : 'text-gray-600'
                            }`}>
                              {formatCurrency(apartment.net_obligation)}
                            </div>
                            <Badge variant={apartment.net_obligation > 0 ? "destructive" : "default"} className="mt-1">
                              {getStatusText(apartment.net_obligation)}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Χιλιοστά:</span>
                            <div className="font-medium">{apartment.participation_mills}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Προηγούμενο Υπόλοιπο:</span>
                            <div className="font-medium">{Math.abs(apartment.net_obligation) <= 0.30 ? '-' : formatCurrency(apartment.previous_balance)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Μερίδιο Δαπανών:</span>
                            <div className="font-medium">{formatCurrency(apartment.expense_share)}</div>
                          </div>
                        </div>

                                                 {apartment.expense_breakdown && apartment.expense_breakdown.length > 0 && (
                           <div className="mt-3 pt-3 border-t border-gray-200">
                             <h4 className="text-sm font-medium text-gray-700 mb-2">Breakdown Δαπανών:</h4>
                             <div className="space-y-2">
                               {(() => {
                                 // Group expenses by month
                                 const groupedExpenses = (apartment.expense_breakdown || []).reduce((groups, expense) => {
                                   const month = expense.month;
                                   if (!groups[month]) {
                                     groups[month] = {
                                       month: month,
                                       month_display: expense.month_display,
                                       expenses: []
                                     };
                                   }
                                   groups[month].expenses.push(expense);
                                   return groups;
                                 }, {} as { [key: string]: { month: string; month_display: string; expenses: any[] } });
                                 
                                 return Object.values(groupedExpenses).map((group, groupIndex) => (
                                   <div key={groupIndex} className="border border-gray-200 rounded overflow-hidden">
                                     <div className="bg-gray-50 px-2 py-1 border-b border-gray-200">
                                       <h5 className="text-xs font-semibold text-gray-600">{group.month_display}</h5>
                                     </div>
                                     <div className="space-y-1 p-2">
                                       {group.expenses.map((expense, index) => (
                                         <div key={index} className="flex justify-between text-xs">
                                           <span className="text-gray-600">{expense.expense_title}</span>
                                           <span className="font-medium">{formatCurrency(expense.share_amount)}</span>
                                         </div>
                                       ))}
                                       <div className="border-t border-gray-200 pt-1 mt-1">
                                         <div className="flex justify-between text-xs font-semibold">
                                           <span className="text-gray-600">Σύνολο:</span>
                                           <span className="text-blue-600">
                                             {formatCurrency(group.expenses.reduce((sum, exp) => sum + exp.share_amount, 0))}
                                           </span>
                                         </div>
                                       </div>
                                     </div>
                                   </div>
                                 ));
                               })()}
                             </div>
                           </div>
                         )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="breakdown" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-blue-600" />
                      Πώς Υπολογίζονται οι Οφειλές
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">📊 Τύποι Κατανομής Δαπανών:</h4>
                      <div className="space-y-2 text-sm text-blue-700">
                        <div>• <strong>Ανά Χιλιοστά:</strong> Κατανομή βάσει των χιλιοστών συμμετοχής κάθε διαμερίσματος</div>
                        <div>• <strong>Ισόποσα:</strong> Ίση κατανομή σε όλα τα διαμερίσματα</div>
                        <div>• <strong>Μετρητές:</strong> Κατανομή βάσει μετρητών (θέρμανση, νερό, κλπ.)</div>
                        <div>• <strong>Συγκεκριμένα:</strong> Κατανομή μόνο σε συγκεκριμένα διαμερίσματα</div>
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-2">💰 Τύπος Υπολογισμού:</h4>
                      <div className="text-sm text-green-700">
                        <strong>Καθαρή Οφειλή = Συνολικές Υποχρεώσεις - Συνολικές Πληρωμές</strong>
                      </div>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="font-medium text-yellow-800 mb-2">⚠️ Σημαντικές Σημειώσεις:</h4>
                      <div className="space-y-1 text-sm text-yellow-700">
                        <div>• Οι οφειλές υπολογίζονται από όλες τις δαπάνες που έχουν καταχωρηθεί</div>
                        <div>• Οι πληρωμές αφαιρούνται από τις συνολικές υποχρεώσεις</div>
                        <div>• Το τρέχον balance μπορεί να διαφέρει λόγω άλλων χρεώσεων</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
