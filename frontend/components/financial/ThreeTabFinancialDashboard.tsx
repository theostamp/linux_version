import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useImprovedFinancialData } from '@/hooks/useImprovedFinancialData';
import { formatCurrency } from '@/lib/utils';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Euro,
  Calculator,
  Building2,
  Users,
  XCircle,
  PiggyBank,
  FileText,
  Receipt,
  DollarSign,
  BarChart3,
  Target,
  Building,
  Calendar,
  RefreshCw,
  Eye,
  ExternalLink,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ThreeTabFinancialDashboardProps {
  buildingId: number;
  selectedMonth: string;
}

export default function ThreeTabFinancialDashboard({ buildingId, selectedMonth }: ThreeTabFinancialDashboardProps) {
  const [isPreviousMonthModalOpen, setIsPreviousMonthModalOpen] = useState(false);
  const [isCurrentMonthModalOpen, setIsCurrentMonthModalOpen] = useState(false);
  const [isTotalBalanceModalOpen, setIsTotalBalanceModalOpen] = useState(false);
  
  const { data, isLoading, error, refetch } = useImprovedFinancialData({
    buildingId,
    selectedMonth
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <Alert className="bg-blue-50 border-blue-200">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
          <AlertDescription className="text-blue-800">
            Φόρτωση οικονομικών δεδομένων... Αυτό μπορεί να διαρκέσει έως 60 δευτερόλεπτα για μεγάλα κτίρια.
          </AlertDescription>
        </Alert>
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error.includes('timeout') 
            ? 'Η αίτηση χρειάστηκε περισσότερο χρόνο από τον αναμενόμενο. Δοκιμάστε ξανά ή επικοινωνήστε με τον διαχειριστή.'
            : error
          }
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Δεν βρέθηκαν οικονομικά στοιχεία</AlertDescription>
      </Alert>
    );
  }

  const currentMonthName = selectedMonth ? 
    new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' }) :
    new Date().toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });

  const previousMonthName = data?.monthly_invoice?.previous_month_expenses?.month_name || 'Προηγούμενος μήνας';

  // Alert type definition
  interface AlertItem {
    icon: React.ComponentType<any>;
    title: string;
    description: string;
  }

  // Alerts calculation
  const alerts: {
    critical: AlertItem[];
    warning: AlertItem[];
    info: AlertItem[];
  } = {
    critical: [],
    warning: [],
    info: []
  };

  // Critical alerts
  if ((data?.obligation_coverage?.total_obligations_coverage?.percentage || 0) < 30) {
    alerts.critical.push({
      icon: XCircle,
      title: 'Κρίσιμα χαμηλή κάλυψη οφειλών',
      description: `Μόνο ${(data?.obligation_coverage?.total_obligations_coverage?.percentage || 0).toFixed(1)}% των οφειλών έχει καλυφθεί`
    });
  }

  if ((data?.total_obligations?.grand_total || 0) > (data?.obligation_coverage?.total_obligations_coverage?.paid || 0) * 3) {
    alerts.critical.push({
      icon: AlertTriangle,
      title: 'Υψηλές ανεξόφλητες οφειλές',
      description: `Συνολικές οφειλές: ${formatCurrency(data?.total_obligations?.grand_total || 0)}`
    });
  }

  // Warning alerts
  if ((data?.obligation_coverage?.total_obligations_coverage?.percentage || 0) >= 30 && (data?.obligation_coverage?.total_obligations_coverage?.percentage || 0) < 70) {
    alerts.warning.push({
      icon: AlertTriangle,
      title: 'Μέτρια κάλυψη οφειλών',
      description: `${(data?.obligation_coverage?.total_obligations_coverage?.percentage || 0).toFixed(1)}% κάλυψη - χρειάζονται περισσότερες εισπράξεις`
    });
  }

  if ((data?.reserve_fund?.progress_percentage || 0) < 50) {
    alerts.warning.push({
      icon: PiggyBank,
      title: 'Χαμηλό αποθεματικό',
      description: `Μόνο ${(data?.reserve_fund?.progress_percentage || 0).toFixed(1)}% του στόχου αποθεματικού`
    });
  }

  // Info alerts
  if ((data?.obligation_coverage?.total_obligations_coverage?.percentage || 0) >= 100) {
    alerts.info.push({
      icon: CheckCircle,
      title: 'Εξαιρετική οικονομική κατάσταση',
      description: 'Όλες οι υποχρεώσεις καλύπτονται πλήρως'
    });
  }

  if (!data?.has_monthly_activity) {
    alerts.warning.push({
      icon: FileText,
      title: 'Δεν έχει γίνει διακανονισμός μήνα',
      description: 'Χρειάζεται έκδοση κοινοχρήστων για τον τρέχοντα μήνα'
    });
  }

  return (
    <div className="space-y-6">
      {/* Header with Alerts Summary */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">
              Οικονομική Διαχείριση - {currentMonthName}
            </h2>
          </div>
          
          {/* Alerts Summary */}
          <div className="flex items-center gap-2">
            {alerts.critical.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {alerts.critical.length} Κρίσιμα
              </Badge>
            )}
            {alerts.warning.length > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 text-yellow-800">
                <AlertTriangle className="h-3 w-3" />
                {alerts.warning.length} Προειδοποιήσεις
              </Badge>
            )}
            {alerts.info.length > 0 && (
              <Badge variant="outline" className="flex items-center gap-1 bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3" />
                {alerts.info.length} Ενημερώσεις
              </Badge>
            )}
          </div>
        </div>
        
        <Button 
          onClick={() => refetch()} 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Ανανέωση
        </Button>
      </div>

      {/* Alerts Section */}
      {(alerts.critical.length > 0 || alerts.warning.length > 0 || alerts.info.length > 0) && (
        <div className="space-y-3">
          {alerts.critical.map((alert, index) => (
            <Alert key={`critical-${index}`} variant="destructive">
              <alert.icon className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">{alert.title}</div>
                <div className="text-sm">{alert.description}</div>
              </AlertDescription>
            </Alert>
          ))}
          
          {alerts.warning.map((alert, index) => (
            <Alert key={`warning-${index}`} className="border-yellow-200 bg-yellow-50">
              <alert.icon className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <div className="font-medium text-yellow-800">{alert.title}</div>
                <div className="text-sm text-yellow-700">{alert.description}</div>
              </AlertDescription>
            </Alert>
          ))}
          
          {alerts.info.map((alert, index) => (
            <Alert key={`info-${index}`} className="border-green-200 bg-green-50">
              <alert.icon className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="font-medium text-green-800">{alert.title}</div>
                <div className="text-sm text-green-700">{alert.description}</div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Three Cards Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARD 1: ΠΡΟΗΓΟΥΜΕΝΟΣ ΜΗΝΑΣ */}
        <div className="space-y-6">
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Receipt className="h-5 w-5" />
                📋 ΕΞΟΔΑ {previousMonthName.toUpperCase()} - ΠΡΟΣ ΤΙΜΟΛΟΓΗΣΗ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Λειτουργικές δαπάνες */}
              <div className="bg-white p-4 rounded-lg border border-blue-100">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium text-gray-700">Λειτουργικές δαπάνες</span>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    Προς χρέωση
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-blue-900 mb-2">
                  {formatCurrency(data?.monthly_invoice?.previous_month_expenses?.operational_expenses || 0)}
                </div>
                <div className="text-sm text-gray-600">
                  Θα κατανεμηθούν ως κοινόχρηστα στον {currentMonthName}
                </div>
              </div>

              {/* Κατανομή ανά διαμέρισμα */}
              <div className="bg-white p-4 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-gray-700">Κατανομή ανά διαμέρισμα</span>
                </div>
                <div className="text-sm text-gray-600">
                  Βάσει participation mills - {data?.apartment_count || 0} διαμερίσματα
                </div>
                <div className="mt-2">
                  <div className="text-lg font-semibold text-blue-700">
                    Μέσος όρος: {formatCurrency((data?.monthly_invoice?.previous_month_expenses?.operational_expenses || 0) / (data?.apartment_count || 1))}
                  </div>
                </div>
              </div>

              {/* Modal Trigger Button */}
              <div className="pt-4 border-t border-blue-100">
                <Dialog open={isPreviousMonthModalOpen} onOpenChange={setIsPreviousMonthModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full flex items-center gap-2 text-blue-700 border-blue-200 hover:bg-blue-50">
                      <Eye className="h-4 w-4" />
                      Δες λεπτομέρειες δαπανών
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-blue-900">
                        <Receipt className="h-5 w-5" />
                        Λεπτομέρειες Δαπανών - {previousMonthName}
                      </DialogTitle>
                      <DialogDescription>
                        Αναλυτική κατανομή των εξόδων που θα χρεωθούν ως κοινόχρηστα στον {currentMonthName}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 mt-6">
                      {/* Συνολικά στοιχεία */}
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h3 className="font-semibold text-blue-900 mb-3">📊 Συνολικά Στοιχεία</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white p-3 rounded border">
                            <div className="text-sm text-gray-600">Συνολικές δαπάνες</div>
                            <div className="text-xl font-bold text-blue-700">
                              {formatCurrency(data?.monthly_invoice?.previous_month_expenses?.operational_expenses || 0)}
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <div className="text-sm text-gray-600">Διαμερίσματα</div>
                            <div className="text-xl font-bold text-blue-700">
                              {data?.apartment_count || 0}
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <div className="text-sm text-gray-600">Μέσος όρος ανά διαμέρισμα</div>
                            <div className="text-xl font-bold text-blue-700">
                              {formatCurrency((data?.monthly_invoice?.previous_month_expenses?.operational_expenses || 0) / (data?.apartment_count || 1))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Κατηγορίες δαπανών */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="font-semibold text-gray-900 mb-3">💰 Κατηγορίες Δαπανών</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="font-medium">Λειτουργικά έξοδα</span>
                            <span className="font-bold text-green-600">
                              {formatCurrency(data?.monthly_invoice?.previous_month_expenses?.operational_expenses || 0)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 px-3">
                            Περιλαμβάνει: καθαρισμός, φύλαξη, συντήρηση, διαχείριση κτλ.
                          </div>
                        </div>
                      </div>

                      {/* Μέθοδος κατανομής */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="font-semibold text-gray-900 mb-3">⚖️ Μέθοδος Κατανομής</h3>
                        <div className="space-y-3">
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <div className="font-medium text-yellow-800">Participation Mills</div>
                            <div className="text-sm text-yellow-700 mt-1">
                              Κάθε διαμέρισμα χρεώνεται βάσει των χιλιοστών συμμετοχής του στα κοινόχρηστα
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            Η ακριβής κατανομή ανά διαμέρισμα εξαρτάται από τα participation mills που έχουν οριστεί για κάθε μονάδα.
                          </div>
                        </div>
                      </div>

                      {/* Χρονοδιάγραμμα */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="font-semibold text-gray-900 mb-3">📅 Χρονοδιάγραμμα Χρέωσης</h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <div>
                              <div className="font-medium text-green-800">Δαπάνες {previousMonthName}</div>
                              <div className="text-sm text-green-700">Καταγράφηκαν και επεξεργάστηκαν</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded">
                            <Clock className="h-5 w-5 text-blue-600" />
                            <div>
                              <div className="font-medium text-blue-800">Χρέωση στον {currentMonthName}</div>
                              <div className="text-sm text-blue-700">Θα εμφανιστούν στα τιμολόγια κοινοχρήστων</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CARD 2: ΤΡΕΧΩΝ ΜΗΝΑΣ */}
        <div className="space-y-6">
          {/* Νέες δαπάνες */}
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <DollarSign className="h-5 w-5" />
                  💰 ΝΕΕΣ ΔΑΠΑΝΕΣ {currentMonthName.toUpperCase()}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-green-100">
                  <div className="text-sm text-gray-600 mb-1">Διαχειριστικά έξοδα</div>
                  <div className="text-xl font-bold text-green-700">
                    {formatCurrency(data?.monthly_invoice?.current_month_charges?.management_fees || 0)}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-green-100">
                  <div className="text-sm text-gray-600 mb-1">Εισφορά αποθεματικού</div>
                  <div className="text-xl font-bold text-green-700">
                    {formatCurrency(data?.monthly_invoice?.current_month_charges?.reserve_fund_contribution || 0)}
                  </div>
                </div>
              </CardContent>
            </Card>

          {/* Πρόοδος εισπράξεων */}
            <Card className="border-orange-200 bg-orange-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-900">
                  <BarChart3 className="h-5 w-5" />
                  📊 ΠΡΟΟΔΟΣ ΕΙΣΠΡΑΞΕΩΝ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-orange-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-700">Κάλυψη τιμολογίου</span>
                    <Badge variant={(data?.obligation_coverage?.current_invoice_coverage?.percentage || 0) >= 100 ? "default" : "secondary"}>
                      {(data?.obligation_coverage?.current_invoice_coverage?.percentage || 0).toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress 
                    value={Math.min(data?.obligation_coverage?.current_invoice_coverage?.percentage || 0, 100)} 
                    className="h-3 mb-2"
                  />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Εισπράχθηκαν: {formatCurrency(data?.obligation_coverage?.current_invoice_coverage?.paid || 0)}</span>
                    <span>Σύνολο: {formatCurrency(data?.obligation_coverage?.current_invoice_coverage?.total || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>

        {/* CARD 3: ΣΥΝΟΛΙΚΟ ΙΣΟΖΥΓΙΟ */}
        <div className="space-y-6">
          {/* Συνολικές οφειλές */}
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <Calculator className="h-5 w-5" />
                  🔴 ΣΥΝΟΛΙΚΕΣ ΟΦΕΙΛΕΣ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-red-100">
                  <div className="text-sm text-gray-600 mb-1">Τρέχον τιμολόγιο</div>
                  <div className="text-xl font-bold text-red-700">
                    {formatCurrency(data?.total_obligations?.current_invoice || 0)}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-red-100">
                  <div className="text-sm text-gray-600 mb-1">Προηγούμενα υπόλοιπα</div>
                  <div className="text-xl font-bold text-red-700">
                    {formatCurrency(data?.total_obligations?.previous_balances || 0)}
                  </div>
                </div>
                <div className="bg-red-600 text-white p-4 rounded-lg">
                  <div className="text-sm mb-1">ΣΥΝΟΛΟ ΟΦΕΙΛΩΝ</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(data?.total_obligations?.grand_total || 0)}
                  </div>
                </div>
              </CardContent>
            </Card>

          {/* Αποθεματικό & στόχοι */}
            <Card className="border-purple-200 bg-purple-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-900">
                  <Target className="h-5 w-5" />
                  🎯 ΑΠΟΘΕΜΑΤΙΚΟ & ΣΤΟΧΟΙ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-purple-100">
                  <div className="text-sm text-gray-600 mb-1">Τρέχον αποθεματικό</div>
                  <div className="text-xl font-bold text-purple-700">
                    {formatCurrency(data?.reserve_fund?.current_amount || 0)}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-purple-100">
                  <div className="text-sm text-gray-600 mb-1">Στόχος</div>
                  <div className="text-xl font-bold text-purple-700">
                    {formatCurrency(data?.reserve_fund?.target_amount || 0)}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-purple-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-700">Πρόοδος στόχου</span>
                    <Badge variant="outline" className="bg-purple-100 text-purple-800">
                      {(data?.reserve_fund?.progress_percentage || 0).toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress 
                    value={Math.min(data?.reserve_fund?.progress_percentage || 0, 100)} 
                    className="h-3"
                  />
                </div>
              </CardContent>
            </Card>

          {/* Συνολική κατάσταση */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Building className="h-5 w-5" />
                🏢 ΣΥΝΟΛΙΚΗ ΚΑΤΑΣΤΑΣΗ ΣΗΜΕΡΑ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border text-center">
                  <div className="text-sm text-gray-600 mb-1">Συνολικές εισπράξεις</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(data?.obligation_coverage?.total_obligations_coverage?.paid || 0)}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border text-center">
                  <div className="text-sm text-gray-600 mb-1">Καθαρό υπόλοιπο</div>
                  <div className={`text-xl font-bold ${
                    (data?.obligation_coverage?.total_obligations_coverage?.paid || 0) >= (data?.total_obligations?.grand_total || 0)
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency((data?.obligation_coverage?.total_obligations_coverage?.paid || 0) - (data?.total_obligations?.grand_total || 0))}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border text-center">
                  <div className="text-sm text-gray-600 mb-1">Κάλυψη συνολική</div>
                  <div className="text-xl font-bold text-blue-600">
                    {(data?.obligation_coverage?.total_obligations_coverage?.percentage || 0).toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modal Trigger Button for Current Month */}
          <div className="pt-4">
            <Dialog open={isCurrentMonthModalOpen} onOpenChange={setIsCurrentMonthModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full flex items-center gap-2 text-green-700 border-green-200 hover:bg-green-50">
                  <Eye className="h-4 w-4" />
                  Δες λεπτομέρειες εισπράξεων
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-green-900">
                    <BarChart3 className="h-5 w-5" />
                    Λεπτομέρειες Εισπράξεων - {currentMonthName}
                  </DialogTitle>
                  <DialogDescription>
                    Αναλυτική κατάσταση εισπράξεων και νέων δαπανών του τρέχοντος μήνα
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 mt-6">
                  {/* Κάλυψη τιμολογίου */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-900 mb-3">📊 Κάλυψη Τιμολογίου</h3>
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded border">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium">Πρόοδος εισπράξεων</span>
                          <Badge variant={(data?.obligation_coverage?.current_invoice_coverage?.percentage || 0) >= 100 ? "default" : "secondary"}>
                            {(data?.obligation_coverage?.current_invoice_coverage?.percentage || 0).toFixed(1)}%
                          </Badge>
                        </div>
                        <Progress 
                          value={Math.min(data?.obligation_coverage?.current_invoice_coverage?.percentage || 0, 100)} 
                          className="h-4 mb-3"
                        />
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Εισπράχθηκαν:</span>
                            <div className="font-bold text-green-600">
                              {formatCurrency(data?.obligation_coverage?.current_invoice_coverage?.paid || 0)}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Σύνολο τιμολογίου:</span>
                            <div className="font-bold text-blue-600">
                              {formatCurrency(data?.obligation_coverage?.current_invoice_coverage?.total || 0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Νέες δαπάνες */}
                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-semibold text-gray-900 mb-3">💰 Νέες Δαπάνες {currentMonthName}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                        <span className="font-medium">Διαχειριστικά έξοδα</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(data?.monthly_invoice?.current_month_charges?.management_fees || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                        <span className="font-medium">Εισφορά αποθεματικού</span>
                        <span className="font-bold text-purple-600">
                          {formatCurrency(data?.monthly_invoice?.current_month_charges?.reserve_fund_contribution || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded border-2 border-blue-200">
                        <span className="font-semibold">Σύνολο νέων δαπανών</span>
                        <span className="font-bold text-blue-700 text-lg">
                          {formatCurrency((data?.monthly_invoice?.current_month_charges?.management_fees || 0) + (data?.monthly_invoice?.current_month_charges?.reserve_fund_contribution || 0))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Κατάσταση εισπράξεων */}
                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-semibold text-gray-900 mb-3">💳 Κατάσταση Εισπράξεων</h3>
                    <div className="space-y-3">
                      {(data?.obligation_coverage?.current_invoice_coverage?.percentage || 0) >= 100 ? (
                        <div className="p-3 bg-green-50 border border-green-200 rounded flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <div className="font-medium text-green-800">Πλήρης κάλυψη τιμολογίου</div>
                            <div className="text-sm text-green-700">Όλες οι υποχρεώσεις του μήνα έχουν καλυφθεί</div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded flex items-center gap-3">
                          <Clock className="h-5 w-5 text-orange-600" />
                          <div>
                            <div className="font-medium text-orange-800">Εκκρεμείς εισπράξεις</div>
                            <div className="text-sm text-orange-700">
                              Απομένουν: {formatCurrency((data?.obligation_coverage?.current_invoice_coverage?.total || 0) - (data?.obligation_coverage?.current_invoice_coverage?.paid || 0))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Modal Trigger Button for Total Balance */}
          <div className="pt-4">
            <Dialog open={isTotalBalanceModalOpen} onOpenChange={setIsTotalBalanceModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full flex items-center gap-2 text-gray-700 border-gray-200 hover:bg-gray-50">
                  <Eye className="h-4 w-4" />
                  Δες αναλυτικό ισοζύγιο
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-gray-900">
                    <Building className="h-5 w-5" />
                    Αναλυτικό Οικονομικό Ισοζύγιο
                  </DialogTitle>
                  <DialogDescription>
                    Πλήρης ανάλυση της οικονομικής κατάστασης του κτιρίου
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 mt-6">
                  {/* Συνολική εικόνα */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">🏢 Συνολική Εικόνα</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded border text-center">
                        <div className="text-sm text-gray-600 mb-1">Συνολικές οφειλές</div>
                        <div className="text-2xl font-bold text-red-600">
                          {formatCurrency(data?.total_obligations?.grand_total || 0)}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded border text-center">
                        <div className="text-sm text-gray-600 mb-1">Συνολικές εισπράξεις</div>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(data?.obligation_coverage?.total_obligations_coverage?.paid || 0)}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded border text-center">
                        <div className="text-sm text-gray-600 mb-1">Καθαρό υπόλοιπο</div>
                        <div className={`text-2xl font-bold ${
                          (data?.obligation_coverage?.total_obligations_coverage?.paid || 0) >= (data?.total_obligations?.grand_total || 0)
                            ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency((data?.obligation_coverage?.total_obligations_coverage?.paid || 0) - (data?.total_obligations?.grand_total || 0))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ανάλυση οφειλών */}
                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-semibold text-gray-900 mb-3">📋 Ανάλυση Οφειλών</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                        <span className="font-medium">Τρέχον τιμολόγιο</span>
                        <span className="font-bold text-blue-600">
                          {formatCurrency(data?.total_obligations?.current_invoice || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                        <span className="font-medium">Προηγούμενα υπόλοιπα</span>
                        <span className="font-bold text-red-600">
                          {formatCurrency(data?.total_obligations?.previous_balances || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Αποθεματικό */}
                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-semibold text-gray-900 mb-3">🎯 Αποθεματικό Ταμείο</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-purple-50 rounded">
                          <div className="text-sm text-gray-600">Τρέχον ποσό</div>
                          <div className="text-xl font-bold text-purple-600">
                            {formatCurrency(data?.reserve_fund?.current_amount || 0)}
                          </div>
                        </div>
                        <div className="p-3 bg-purple-50 rounded">
                          <div className="text-sm text-gray-600">Στόχος</div>
                          <div className="text-xl font-bold text-purple-600">
                            {formatCurrency(data?.reserve_fund?.target_amount || 0)}
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-purple-50 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Πρόοδος στόχου</span>
                          <span className="font-bold text-purple-600">
                            {(data?.reserve_fund?.progress_percentage || 0).toFixed(1)}%
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(data?.reserve_fund?.progress_percentage || 0, 100)} 
                          className="h-3"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Κάλυψη υποχρεώσεων */}
                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-semibold text-gray-900 mb-3">📊 Κάλυψη Υποχρεώσεων</h3>
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Συνολική κάλυψη</span>
                          <Badge variant={(data?.obligation_coverage?.total_obligations_coverage?.percentage || 0) >= 100 ? "default" : "secondary"}>
                            {(data?.obligation_coverage?.total_obligations_coverage?.percentage || 0).toFixed(1)}%
                          </Badge>
                        </div>
                        <Progress 
                          value={Math.min(data?.obligation_coverage?.total_obligations_coverage?.percentage || 0, 100)} 
                          className="h-4"
                        />
                      </div>
                      
                      {(data?.obligation_coverage?.total_obligations_coverage?.percentage || 0) >= 100 ? (
                        <div className="p-3 bg-green-50 border border-green-200 rounded flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <div className="font-medium text-green-800">Εξαιρετική οικονομική κατάσταση</div>
                            <div className="text-sm text-green-700">Όλες οι υποχρεώσεις καλύπτονται πλήρως</div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                          <div>
                            <div className="font-medium text-orange-800">Εκκρεμείς υποχρεώσεις</div>
                            <div className="text-sm text-orange-700">
                              Απομένουν: {formatCurrency((data?.total_obligations?.grand_total || 0) - (data?.obligation_coverage?.total_obligations_coverage?.paid || 0))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
