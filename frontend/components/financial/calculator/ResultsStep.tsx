import React, { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Send, 
  Download, 
  Printer, 
  ChevronDown, 
  ChevronUp,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calculator,
  Building,
  Euro,
  Eye,
  TrendingDown,
  Users,
  AlertTriangle,
  RefreshCw,
  X,
  Info
} from 'lucide-react';
import { CalculatorState } from './CalculatorWizard';
import { useCommonExpenses } from '@/hooks/useCommonExpenses';
import { toast } from 'sonner';
import { CommonExpenseModal } from './CommonExpenseModal';
import { useApartmentsWithFinancialData } from '@/hooks/useApartmentsWithFinancialData';
import { useMonthRefresh } from '@/hooks/useMonthRefresh';
import { api } from '@/lib/api';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePayments } from '@/hooks/usePayments';

interface ResultsStepProps {
  state: CalculatorState;
  updateState: (updates: Partial<CalculatorState>) => void;
  buildingId: number;
  onComplete?: (results: any) => void;
}

export const ResultsStep: React.FC<ResultsStepProps> = ({
  state,
  updateState,
  buildingId,
  onComplete
}) => {
  const [expandedBreakdown, setExpandedBreakdown] = useState<string | null>(null);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [showCommonExpenseModal, setShowCommonExpenseModal] = useState(false);
  const [isDetailedResultsOpen, setIsDetailedResultsOpen] = useState(false);
  const { issueCommonExpenses, calculateAdvancedShares, calculateShares } = useCommonExpenses();
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [calculationProgress, setCalculationProgress] = useState(0);
  const [calculationSuccess, setCalculationSuccess] = useState(false);

  // Dashboard summary (up to today)
  interface DashboardSummary {
    current_reserve: number;
    current_obligations: number;
    last_calculation_date?: string;
    apartments_count?: number;
  }
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // Extract month from state's customPeriod
  const selectedMonth = state.customPeriod?.startDate ? state.customPeriod.startDate.substring(0, 7) : undefined;
  // Load occupants (owner/tenant) info to show consistent names
  const { apartments: aptWithFinancial, building: buildingData, forceRefresh } = useApartmentsWithFinancialData(buildingId, selectedMonth);
  
  // Auto-refresh when selectedMonth changes
  useMonthRefresh(selectedMonth, forceRefresh, 'ResultsStep');
  const occupantsByApartmentId = useMemo(() => {
    const map: Record<number, { owner_name?: string; tenant_name?: string }> = {};
    aptWithFinancial.forEach((apt) => {
      map[apt.id] = { owner_name: apt.owner_name, tenant_name: apt.tenant_name };
    });
    return map;
  }, [aptWithFinancial]);

  // Payments for the selected month (YYYY-MM)
  const selectedMonthStr = useMemo(() => {
    const start = state.customPeriod?.startDate;
    return start ? start.substring(0, 7) : undefined;
  }, [state.customPeriod?.startDate]);
  const { payments } = usePayments(buildingId, selectedMonthStr);
  const paymentsCommonTotal = useMemo(() => {
    return (payments || []).reduce((sum: number, p: any) => sum + (p.payment_type === 'common_expense' ? (p.amount || 0) : 0), 0);
  }, [payments]);
  const { payments: allReservePayments } = usePayments(buildingId);
  const paymentsReserveTotal = useMemo(() => {
    return (allReservePayments || []).reduce((sum: number, p: any) => sum + (p.payment_type === 'reserve_fund' ? (p.amount || 0) : 0), 0);
  }, [allReservePayments]);
  const reserveMonthlyTarget = useMemo(() => Number(state.advancedShares?.reserve_contribution || 0), [state.advancedShares]);
  const reserveRemaining = useMemo(() => Math.max(0, reserveMonthlyTarget - paymentsReserveTotal), [reserveMonthlyTarget, paymentsReserveTotal]);

  const renderOccupants = (apartmentId: number, fallbackOwner?: string) => {
    const info = occupantsByApartmentId[apartmentId] || {};
    const owner = info.owner_name || fallbackOwner;
    const tenant = info.tenant_name;
    return (
      <div className="flex flex-col gap-0.5">
        {owner && (
          <div className="text-xs">
            <span className="inline-block px-1 mr-1 rounded bg-green-50 text-green-700 border border-green-200">Ιδιοκτήτης</span>
            <span className="text-gray-800">{owner}</span>
          </div>
        )}
        {tenant && (
          <div className="text-xs">
            <span className="inline-block px-1 mr-1 rounded bg-blue-50 text-blue-700 border border-blue-200">Ενοικιαστής</span>
            <span className="text-gray-800">{tenant}</span>
          </div>
        )}
        {!owner && !tenant && (
          <span className="text-xs text-gray-400 italic">Μη καταχωρημένοι</span>
        )}
      </div>
    );
  };

  // Fetch up-to-today summary once per building
  useEffect(() => {
    let mounted = true;
    const fetchSummary = async () => {
      try {
        setIsSummaryLoading(true);
        const params = new URLSearchParams();
        params.append('building_id', String(buildingId));
        const { data } = await api.get(`/financial/dashboard/summary/?${params.toString()}`);
        if (!mounted) return;
        setDashboardSummary({
          current_reserve: Number(data.current_reserve || 0),
          current_obligations: Number(data.current_obligations || 0),
          last_calculation_date: data.last_calculation_date,
          apartments_count: data.apartments_count
        });
      } catch (err) {
        // Silent fail; UI will fallback to 0
      } finally {
        if (mounted) setIsSummaryLoading(false);
      }
    };
    fetchSummary();
    return () => { mounted = false; };
  }, [buildingId]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('el-GR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
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

  const handleIssue = async () => {
    try {
      updateState({ isIssuing: true });
      
      // Transform shares to match backend expectations
      const transformedShares: Record<string, { total_amount: number; breakdown: Record<string, any> }> = {};
      const expenseIds: number[] = [];
      
      Object.entries(state.shares).forEach(([apartmentId, share]) => {
        transformedShares[apartmentId] = {
          total_amount: share.total_amount,
          breakdown: share.breakdown
            ? share.breakdown.reduce(
                (
                  acc: Record<
                    number,
                    {
                      expense_title: string;
                      expense_amount: number;
                      apartment_share: number;
                      distribution_type: string;
                      distribution_type_display: string;
                    }
                  >,
                  item: {
                    expense_id: number;
                    expense_title: string;
                    expense_amount: number;
                    apartment_share: number;
                    distribution_type: string;
                    distribution_type_display: string;
                  }
                ) => {
                  acc[item.expense_id] = {
                    expense_title: item.expense_title,
                    expense_amount: item.expense_amount,
                    apartment_share: item.apartment_share,
              distribution_type: item.distribution_type,
              distribution_type_display: item.distribution_type_display
            };
            // Collect expense IDs
            if (!expenseIds.includes(item.expense_id)) {
              expenseIds.push(item.expense_id);
            }
            return acc;
          }, {} as Record<string, any>) : {}
        };
      });
      
      const params = {
        building_id: buildingId,
        period_data: {
          name: state.customPeriod.periodName,
          start_date: state.customPeriod.startDate,
          end_date: state.customPeriod.endDate
        },
        shares: transformedShares,
        expense_ids: expenseIds
      };

      await issueCommonExpenses(params);
      
      toast.success('Τα κοινοχρήστα εκδόθηκαν επιτυχώς!');
      
      if (onComplete) {
        onComplete(params);
      }
      
    } catch (error: any) {
      toast.error('Σφάλμα κατά την έκδοση: ' + (error.message || 'Άγνωστο σφάλμα'));
    } finally {
      updateState({ isIssuing: false });
    }
  };



  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      if (format === 'pdf') {
        exportToPDF();
      } else if (format === 'excel') {
        exportToExcel();
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Σφάλμα κατά την εξαγωγή');
    }
  };

  const exportToPDF = async () => {
    // Ensure we're running on the client side
    if (typeof window === 'undefined') {
      toast.error('Η εξαγωγή PDF δεν είναι διαθέσιμη στον server');
      return;
    }

    try {
      // Use the same PDF generation logic as CommonExpenseModal
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      // Force recalculation of all derived values to ensure fresh data
      const currentState = state; // Get current state
      
      // Debug logging to check if values are updating
      console.log('PDF Export Debug (ResultsStep):', {
        stateShares: Object.keys(currentState.shares).length,
        totalExpenses: currentState.totalExpenses,
        period: getPeriodInfo(),
        timestamp: new Date().toISOString()
      });
      
      // Prepare data for rendering with fresh calculations
      const currentDate = new Date().toLocaleDateString('el-GR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const period = getPeriodInfo();
      const apartmentCount = Object.keys(currentState.shares).length;
      
      // Enhanced HTML content with better styling and structure (same as modal)
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="el">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Φύλλο Κοινοχρήστων - ${period}</title>
          <style>
            @page { 
              size: A4 landscape; 
              margin: 0.5in; 
            }
            
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              font-size: 11pt; 
              line-height: 1.4;
              color: #2d3748; 
              background: white;
            }
            
            /* Header Section */
            .header { 
              text-align: center; 
              margin-bottom: 25px; 
              padding-bottom: 20px;
              border-bottom: 3px solid #2563eb; 
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
              padding: 20px;
              border-radius: 8px;
            }
            
            .brand { 
              font-size: 22pt; 
              font-weight: 700; 
              color: #2563eb; 
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .subtitle { 
              font-size: 12pt; 
              color: #64748b; 
              font-style: italic;
              margin-bottom: 15px;
            }
            
            .main-title { 
              font-size: 24pt; 
              font-weight: 700; 
              color: #1e293b; 
              margin: 15px 0;
              text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
            }
            
            .period { 
              font-size: 16pt; 
              font-weight: 600; 
              color: #0f172a; 
              background: #e0e7ff;
              padding: 8px 16px;
              border-radius: 20px;
              display: inline-block;
            }
            
            .timestamp {
              margin-top: 12px;
              font-size: 11pt;
              color: #475569;
              font-style: italic;
              background: #f1f5f9;
              padding: 6px 12px;
              border-radius: 15px;
              display: inline-block;
              border: 1px solid #e2e8f0;
            }
            
            /* Information Table */
            .info-section {
              margin: 25px 0;
            }
            
            .info-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 15px 0;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              border-radius: 8px;
              overflow: hidden;
            }
            
            .info-table th, .info-table td { 
              border: 1px solid #e2e8f0; 
              padding: 12px 16px; 
              text-align: left; 
            }
            
            .info-table th { 
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              color: white; 
              font-weight: 600; 
              width: 30%;
              font-size: 10pt;
            }
            
            .info-table td {
              background: #ffffff;
              font-weight: 500;
            }
            
            /* Section Titles */
            .section-title { 
              font-size: 16pt; 
              font-weight: 700; 
              color: #1e293b; 
              margin: 30px 0 20px 0; 
              padding: 12px 0 8px 0;
              border-bottom: 2px solid #3b82f6; 
              background: linear-gradient(90deg, #f1f5f9 0%, transparent 100%);
              padding-left: 15px;
            }
            
            /* Analysis Table */
            .analysis-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0; 
              font-size: 7pt;
              background: white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .analysis-table th, .analysis-table td { 
              border: 1px solid #cbd5e1; 
              padding: 6px 4px; 
              text-align: center; 
            }
            
            .analysis-table th { 
              background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
              color: white; 
              font-weight: 600;
              font-size: 7pt;
            }
            
            .analysis-table tr:nth-child(even) {
              background: #f8fafc;
            }
            
            .analysis-table tr:hover {
              background: #e0e7ff;
            }
            
            .totals-row { 
              background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%) !important;
              font-weight: 700;
              border-top: 2px solid #3b82f6;
            }
            
            .totals-row td {
              font-weight: 600;
              color: #1e293b;
            }
            
            /* Footer */
            .footer { 
              margin-top: 30px; 
              padding-top: 20px; 
              border-top: 2px solid #e2e8f0;
              background: #f8fafc;
              border-radius: 8px;
              padding: 20px;
            }
            
            .footer .info-table th {
              background: linear-gradient(135deg, #64748b 0%, #475569 100%);
            }
            
            /* Utility Classes */
            .text-left { text-align: left !important; }
            .text-right { text-align: right !important; }
            .font-bold { font-weight: 700; }
            .text-primary { color: #2563eb; }
            
            /* Print Optimizations */
            @media print {
              body { font-size: 10pt; }
              .header { break-inside: avoid; }
              .section-title { break-after: avoid; }
              .analysis-table { font-size: 6pt; }
            }
          </style>
        </head>
        <body>
          <!-- Header Section -->
          <div class="header">
            <div class="brand">Digital Concierge App</div>
            <div class="subtitle">online έκδοση κοινοχρήστων</div>
            <div class="main-title">Φύλλο Κοινοχρήστων</div>
            <div class="period">${period}</div>
            <div class="timestamp">
              ⏰ Εκδόθηκε: ${new Date().toLocaleString('el-GR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
              })}
              </div>
          </div>
          
          <!-- Building Information -->
          <div class="info-section">
            <table class="info-table">
              <tr><th>🏢 ΠΟΛΥΚΑΤΟΙΚΙΑ</th><td>${buildingData?.name || 'Άγνωστο Κτίριο'}</td></tr>
              <tr><th>📅 ΜΗΝΑΣ</th><td>${period}</td></tr>
              <tr><th>👤 ΔΙΑΧΕΙΡΙΣΤΗΣ</th><td>Διαχειριστής Κτιρίου</td></tr>
              <tr><th>⏰ ΛΗΞΗ ΠΛΗΡΩΜΗΣ</th><td>${new Date().toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td></tr>
              </table>
          </div>
        
          <!-- Apartments Analysis -->
          <div class="section-title">🏠 ΑΝΑΛΥΣΗ ΚΑΤΑ ΔΙΑΜΕΡΙΣΜΑΤΑ <span style="font-size: 9pt; font-style: italic; color: #666;"> </span></div>
          
          <table class="analysis-table">
            <thead>
              <tr>
                <th rowspan="2">ΑΡΙΘΜΟΣ<br/>ΔΙΑΜΕΡΙΣΜΑΤΟΣ</th>
                <th rowspan="2">ΟΝΟΜΑΤΕΠΩΝΥΜΟ</th>
                <th rowspan="2">ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ</th>
                <th rowspan="2">ΠΛΗΡΩΤΕΟ<br/>ΠΟΣΟ</th>
                <th rowspan="2">A/A</th>
              </tr>
            </thead>
            <tbody>
              ${Object.values(currentState.shares).map((share: any, index: number) => {
                return `<tr>
                  <td class="font-bold text-primary">${share.identifier || share.apartment_number}</td>
                  <td class="text-left" style="padding-left: 8px;">${share.owner_name || 'Μη καταχωρημένος'}</td>
                  <td>${share.participation_mills || 0}</td>
                  <td class="font-bold text-primary">${formatAmount(share.total_due || 0)}</td>
                  <td>${index + 1}</td>
                </tr>`;
              }).join('')}
              
              <tr class="totals-row">
                <td class="font-bold">ΣΥΝΟΛΑ</td>
                <td></td>
                <td>${Object.values(currentState.shares).reduce((sum: number, s: any) => sum + (s.participation_mills || 0), 0)}</td>
                <td class="font-bold text-primary">${formatAmount(currentState.totalExpenses)}</td>
                <td></td>
                </tr>
            </tbody>
          </table>
          
          <!-- Footer Information -->
          <div class="footer">
            <!-- Παρατηρήσεις στην αρχή του footer -->
            <div style="background-color: #fef3c7; padding: 12px; margin-bottom: 16px; border-left: 4px solid #f59e0b; border-radius: 4px;">
              <div style="font-weight: bold; color: #92400e; margin-bottom: 4px;">📝 ΠΑΡΑΤΗΡΗΣΕΙΣ:</div>
              <div style="color: #92400e; font-style: italic;">ΕΙΣΠΡΑΞΗ ΚΟΙΝΟΧΡΗΣΤΩΝ: ΔΕΥΤΕΡΑ & ΤΕΤΑΡΤΗ ΑΠΟΓΕΥΜΑ</div>
            </div>
            
            <table class="info-table">
              <tr><th>📅 ΗΜΕΡΟΜΗΝΙΑ ΕΚΔΟΣΗΣ</th><td>${currentDate}</td></tr>
              <tr><th>🏠 ΣΥΝΟΛΟ ΔΙΑΜΕΡΙΣΜΑΤΩΝ</th><td>${apartmentCount}</td></tr>
              <tr><th>💰 ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ</th><td class="font-bold text-primary">${formatAmount(currentState.totalExpenses)}€</td></tr>
            </table>
          </div>
        </body>
        </html>
      `;
      
      // Create temporary element for rendering
      const element = document.createElement('div');
      element.innerHTML = htmlContent;
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '0';
      element.style.width = '297mm'; // A4 landscape width
      element.style.backgroundColor = 'white';
      document.body.appendChild(element);
      
      // Configure html2canvas options for better Greek text rendering
      const canvasOptions = {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: 1123, // A4 landscape width in pixels at 96 DPI
        height: element.scrollHeight
      };
      
      // Convert HTML to canvas
      const canvas = await html2canvas(element, canvasOptions);
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      // Create PDF in landscape format
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      // Calculate dimensions for landscape A4
      const imgWidth = 297; // A4 landscape width in mm
      const pageHeight = 210; // A4 landscape height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add image to PDF (handle multiple pages if needed)
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Save PDF with timestamp
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const safePeriod = period.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
      const fileName = `common_expenses_sheet_${safePeriod}_${dateStr}_${timeStr}.pdf`;
      pdf.save(fileName);
      
      // Cleanup
      document.body.removeChild(element);
      
      toast.success('✅ Το PDF εξήχθη επιτυχώς!', {
        description: `Αρχείο: ${fileName}`
      });
      
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast.error('❌ Σφάλμα κατά την εξαγωγή PDF', {
        description: 'Παρακαλώ δοκιμάστε ξανά ή επικοινωνήστε με την υποστήριξη.'
      });
    }
  };

  const exportToExcel = async () => {
    // Ensure we're running on the client side
    if (typeof window === 'undefined') {
      toast.error('Η εξαγωγή Excel δεν είναι διαθέσιμη στον server');
      return;
    }

    try {
      // Dynamic import of xlsx and file-saver to avoid SSR issues
      const XLSX = await import('xlsx');
      const fileSaver = await import('file-saver');
      const { saveAs } = fileSaver;
      
      // Προετοιμασία δεδομένων
      const workbook = XLSX.utils.book_new();
    
    // Κύριο φύλλο με τα δεδομένα (Τμήμα Κατανομής)
    const mainData = Object.values(state.shares).map((share: any, index: number) => {
      return {
        'A/A': index + 1,
        'ΔΙΑΜΕΡΙΣΜΑ': share.apartment_number,
        'ΙΔΙΟΚΤΗΤΗΣ': share.owner_name || 'Μη καταχωρημένος',
        'ΧΙΛΙΟΣΤΑ': share.participation_mills,
        'ΠΡΟΗΓΟΥΜΕΝΟ ΥΠΟΛΟΙΠΟ (€)': share.previous_balance,
        'ΜΕΡΙΔΙΟ ΔΑΠΑΝΩΝ (€)': share.total_amount,
        'ΣΥΝΟΛΙΚΟ ΟΦΕΙΛΟΜΕΝΟ (€)': share.total_due,
        'ΚΑΤΑΣΤΑΣΗ': share.total_due < 0 ? 'Οφειλόμενο' : 'Ενεργό'
      };
    });
    
    const mainWorksheet = XLSX.utils.json_to_sheet(mainData);
    
    // Ανάλυση Δαπανών
    const expenseBreakdownData: any[] = [];
    if (state.advancedShares) {
      // Προσθήκη γενικών πληροφοριών ανάλυσης
      if (state.advancedShares.heating_costs) {
        expenseBreakdownData.push({
          'ΚΑΤΗΓΟΡΙΑ': 'Θέρμανση - Συνολικά',
          'ΠΟΣΟ (€)': state.advancedShares.heating_costs.total || 0,
          'ΠΕΡΙΓΡΑΦΗ': 'Συνολικό κόστος θέρμανσης'
        });
        expenseBreakdownData.push({
          'ΚΑΤΗΓΟΡΙΑ': 'Θέρμανση - Πάγιο',
          'ΠΟΣΟ (€)': state.advancedShares.heating_costs.fixed || 0,
          'ΠΕΡΙΓΡΑΦΗ': 'Πάγιο κόστος θέρμανσης'
        });
        expenseBreakdownData.push({
          'ΚΑΤΗΓΟΡΙΑ': 'Θέρμανση - Μεταβλητό',
          'ΠΟΣΟ (€)': state.advancedShares.heating_costs.variable || 0,
          'ΠΕΡΙΓΡΑΦΗ': 'Μεταβλητό κόστος θέρμανσης'
        });
      }
      
      if (state.advancedShares.elevator_costs) {
        expenseBreakdownData.push({
          'ΚΑΤΗΓΟΡΙΑ': 'Ανελκυστήρας',
          'ΠΟΣΟ (€)': state.advancedShares.elevator_costs,
          'ΠΕΡΙΓΡΑΦΗ': 'Κόστος ανελκυστήρα'
        });
      }
      
      if (state.advancedShares.reserve_contribution) {
        expenseBreakdownData.push({
          'ΚΑΤΗΓΟΡΙΑ': 'Αποθεματικό Ταμείο',
          'ΠΟΣΟ (€)': state.advancedShares.reserve_contribution,
          'ΠΕΡΙΓΡΑΦΗ': 'Συνεισφορά αποθεματικού ταμείου'
        });
      }
      
      // Προσθήκη λεπτομερών ανάλυσης αν υπάρχουν
      if (Array.isArray(state.advancedShares.expense_breakdown)) {
        state.advancedShares.expense_breakdown.forEach((category: any) => {
          expenseBreakdownData.push({
            'ΚΑΤΗΓΟΡΙΑ': category.category,
            'ΠΟΣΟ (€)': category.total_amount,
            'ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ (€)': category.per_apartment,
            'ΜΕΘΟΔΟΣ ΚΑΤΑΝΟΜΗΣ': category.distribution_method
          });
        });
      }
    }
    
    const expenseBreakdownWorksheet = XLSX.utils.json_to_sheet(expenseBreakdownData);
    
    // Ειδικά Χιλιοστά Ανελκυστήρα
    let elevatorData: any[] = [];
    if (state.advancedShares && state.advancedShares.elevator_shares) {
      elevatorData = Object.values(state.advancedShares.elevator_shares).map((share: any) => ({
        'ΔΙΑΜΕΡΙΣΜΑ': share.apartment_number,
        'ΧΙΛΙΟΣΤΑ ΑΝΕΛΚΥΣΤΗΡΑ': share.elevator_mills,
        'ΜΕΡΙΔΙΟ ΑΝΕΛΚΥΣΤΗΡΑ (€)': share.elevator_share
      }));
    }
    
    const elevatorWorksheet = XLSX.utils.json_to_sheet(elevatorData);
    
    // Προσθήκη στατιστικών
    const statsData = [
      { 'ΣΤΑΤΙΣΤΙΚΑ': 'Συνολικές Δαπάνες', 'ΤΙΜΗ': `${formatAmount(stats.totalAmount)}€` },
      { 'ΣΤΑΤΙΣΤΙΚΑ': 'Αριθμός Διαμερισμάτων', 'ΤΙΜΗ': stats.totalApartments },
      { 'ΣΤΑΤΙΣΤΙΚΑ': 'Μέσος Όρος ανά Διαμέρισμα', 'ΤΙΜΗ': `${formatAmount(stats.averagePerApartment)}€` },
      { 'ΣΤΑΤΙΣΤΙΚΑ': 'Συνολικό Οφειλόμενο', 'ΤΙΜΗ': `${formatAmount(stats.totalDue)}€` },
      { 'ΣΤΑΤΙΣΤΙΚΑ': 'Περίοδος', 'ΤΙΜΗ': getPeriodInfo() },
      { 'ΣΤΑΤΙΣΤΙΚΑ': 'Ημερομηνία Έκδοσης', 'ΤΙΜΗ': new Date().toLocaleDateString('el-GR') },
    ];
    
    const statsWorksheet = XLSX.utils.json_to_sheet(statsData);
    
    // Προσθήκη φύλλων στο βιβλίο
    XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Τμήμα Κατανομής');
    XLSX.utils.book_append_sheet(workbook, expenseBreakdownWorksheet, 'Ανάλυση Δαπανών');
    if (elevatorData.length > 0) {
      XLSX.utils.book_append_sheet(workbook, elevatorWorksheet, 'Χιλιοστά Ανελκυστήρα');
    }
    XLSX.utils.book_append_sheet(workbook, statsWorksheet, 'Στατιστικά');
    
      // Αποθήκευση αρχείου
      const fileName = `φυλλο_κοινοχρηστων_${getPeriodInfo().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, fileName);
      
      toast.success('Εξαγωγή Excel ολοκληρώθηκε επιτυχώς!');
    } catch (error) {
      console.error('Excel Export Error:', error);
      toast.error('Σφάλμα κατά την εξαγωγή Excel');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper function to check if period is within reserve fund collection timeline
  const checkIfPeriodInReserveFundTimeline = (startDate: string, endDate: string) => {
    try {
      // Get reserve fund timeline from localStorage (same as BuildingOverviewSection)
      const getStorageKey = (key: string) => `reserve_fund_${buildingId}_${key}`;
      const getFromStorage = (key: string, defaultValue: any = null) => {
        try {
          const stored = localStorage.getItem(getStorageKey(key));
          return stored ? JSON.parse(stored) : defaultValue;
        } catch {
          return defaultValue;
        }
      };
      
      // Check if reserve fund goal is set and not zero
      const reserveFundGoal = getFromStorage('goal', 0);
      if (!reserveFundGoal || reserveFundGoal === 0) {
        console.log('🔄 Reserve fund goal is zero or not set, returning false');
        return false;
      }
      
      const reserveFundStartDate = getFromStorage('start_date', null);
      const reserveFundEndDate = getFromStorage('target_date', null);
      
      // If no dates are set, return false
      if (!reserveFundStartDate || !reserveFundEndDate) {
        console.log('🔄 Reserve fund dates not set, returning false');
        return false;
      }
      
      const periodStart = new Date(startDate);
      const periodEnd = new Date(endDate);
      const rfStart = new Date(reserveFundStartDate);
      const rfEnd = new Date(reserveFundEndDate);
      
      console.log('🔄 Reserve fund timeline check:', {
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        rfStart: rfStart.toISOString().split('T')[0],
        rfEnd: rfEnd.toISOString().split('T')[0],
        reserveFundGoal
      });
      
      // Check if the period overlaps with reserve fund timeline
      const isWithinTimeline = periodStart <= rfEnd && periodEnd >= rfStart;
      
      console.log('🔄 Reserve fund within timeline:', isWithinTimeline);
      return isWithinTimeline;
    } catch (error) {
      console.error('Error checking reserve fund timeline:', error);
      return false; // Safe fallback
    }
  };

  const getPeriodInfo = () => {
    console.log('🔄 ResultsStep: getPeriodInfo called with state:', {
      periodMode: state.periodMode,
      customPeriod: state.customPeriod,
      quickOptions: state.quickOptions
    });
    
    // Always use customPeriod.periodName if it exists (this includes selectedMonth overrides)
    if (state.customPeriod.periodName) {
      console.log('🔄 ResultsStep: Using customPeriod.periodName:', state.customPeriod.periodName);
      return state.customPeriod.periodName;
    }
    
    // Fallback to quick mode calculations only if no custom period name
    if (state.periodMode === 'quick') {
      if (state.quickOptions.currentMonth) {
        const now = new Date();
        const result = now.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
        console.log('🔄 ResultsStep: Using current month fallback:', result);
        return result;
      } else if (state.quickOptions.previousMonth) {
        const now = new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const result = prevMonth.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
        console.log('🔄 ResultsStep: Using previous month fallback:', result);
        return result;
      }
    }
    
    console.log('🔄 ResultsStep: Using default customPeriod.periodName:', state.customPeriod.periodName);
    return state.customPeriod.periodName;
  };

  const getSummaryStats = () => {
    const shares = Object.values(state.shares);
    const totalApartments = shares.length;

    // Reserve handling: if reserve is already included in shares, don't add again.
    const reserveIncludedInShares = shares.some((s: any) => Number((s.breakdown || {}).reserve_fund_contribution || 0) > 0);
    const advancedTotals = (state.advancedShares && state.advancedShares.expense_totals) || null;
    const hasOtherExpenses = advancedTotals
      ? (Number(advancedTotals.heating || 0) > 0 ||
         Number(advancedTotals.elevator || 0) > 0 ||
         Number(advancedTotals.equal_share || 0) > 0 ||
         Number(advancedTotals.individual || 0) > 0)
      : false;
    const reserveMonthlyCandidate = Number(state.advancedShares?.reserve_contribution || 0); // building-level monthly
    const reserveExtra = !reserveIncludedInShares && hasOtherExpenses ? reserveMonthlyCandidate : 0;

    const baseTotalAmount = Number(state.totalExpenses || 0);
    const totalAmount = baseTotalAmount + reserveExtra;
    const averagePerApartment = totalApartments > 0 ? totalAmount / totalApartments : 0;
    const totalDue = shares.reduce((sum: number, share: any) => sum + (share.total_due || 0), 0);
    const totalCredits = shares.reduce((sum: number, share: any) => sum + Math.max(0, share.total_due || 0), 0);

    return {
      totalApartments,
      totalAmount,
      averagePerApartment,
      totalDue,
      totalCredits
    };
  };

  const getPaymentAnalytics = () => {
    const shares = Object.values(state.shares);
    const totalApartments = shares.length;
    const graceDay = (buildingData?.grace_day_of_month as number) || 15;
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const selectedMonthStr = state.customPeriod?.startDate?.substring(0, 7) || currentMonthStr;
    const isCurrentMonth = selectedMonthStr === currentMonthStr;
    const isPastGracePeriod = isCurrentMonth ? now.getDate() > graceDay : true;

    // Helper: effective due for classification respecting grace period
    const getEffectiveTotalDue = (share: any): number => {
      const totalDue = share.total_due || 0; // negative means owes
      const previousBalance = share.previous_balance || 0; // negative means owes
      // Before/On grace day of current month: count only previous arrears
      if (!isPastGracePeriod) {
        return Math.min(0, previousBalance);
      }
      // After grace day or other months: count full due
      return Math.min(0, totalDue);
    };
    
    // Κατηγοριοποίηση διαμερισμάτων βάσει οφειλών
    const currentApartments = shares.filter((share: any) => getEffectiveTotalDue(share) >= 0).length;
    const behindApartments = shares.filter((share: any) => {
      const effectiveDue = getEffectiveTotalDue(share);
      return effectiveDue < 0 && Math.abs(effectiveDue) <= (share.total_amount || 0) * 2; // Έως 2 μήνες καθυστέρηση
    }).length;
    const criticalApartments = shares.filter((share: any) => {
      const effectiveDue = getEffectiveTotalDue(share);
      return effectiveDue < 0 && Math.abs(effectiveDue) > (share.total_amount || 0) * 2; // Πάνω από 2 μήνες καθυστέρηση
    }).length;
    
    // Υπολογισμός συνολικής κάλυψης
    const totalMonthlyObligations = shares.reduce((sum: number, share: any) => sum + (share.total_amount || 0), 0);
    const totalPendingAmount = shares.reduce((sum: number, share: any) => {
      const effectiveDue = getEffectiveTotalDue(share);
      return effectiveDue < 0 ? sum + Math.abs(effectiveDue) : sum;
    }, 0);

    // Include reserve in monthly obligations if not already in shares
    const reserveIncludedInShares = shares.some((s: any) => Number((s.breakdown || {}).reserve_fund_contribution || 0) > 0);
    const advancedTotals = (state.advancedShares && state.advancedShares.expense_totals) || null;
    const hasOtherExpenses = advancedTotals
      ? (Number(advancedTotals.heating || 0) > 0 ||
         Number(advancedTotals.elevator || 0) > 0 ||
         Number(advancedTotals.equal_share || 0) > 0 ||
         Number(advancedTotals.individual || 0) > 0)
      : false;
    const reserveMonthlyCandidate = Number(state.advancedShares?.reserve_contribution || 0);
    const reserveExtra = !reserveIncludedInShares && hasOtherExpenses ? reserveMonthlyCandidate : 0;

    const overallMonthlyObligationsWithReserve = totalMonthlyObligations + reserveExtra;

    const overallCoveragePercentage = overallMonthlyObligationsWithReserve > 0
      ? Math.min(100, Math.max(0, ((overallMonthlyObligationsWithReserve - totalPendingAmount) / overallMonthlyObligationsWithReserve) * 100))
      : 0;
    
    return {
      currentApartments,
      behindApartments,
      criticalApartments,
      totalPendingAmount,
      totalMonthlyObligations: overallMonthlyObligationsWithReserve,
      overallCoveragePercentage
    };
  };

  const stats = getSummaryStats();
  const analytics = getPaymentAnalytics();

  // Auto-calculate results when entering the Results step
  React.useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        setCalculationProgress(0);
        
        const startDate = state.customPeriod.startDate;
        const endDate = state.customPeriod.endDate;
        if (!startDate || !endDate) return;
        
        // Simulate realistic progress
        const progressSteps = [
          { progress: 10, message: 'Φόρτωση δεδομένων κτιρίου...' },
          { progress: 30, message: 'Ανάκτηση δαπανών...' },
          { progress: 60, message: 'Υπολογισμός μεριδίων...' },
          { progress: 90, message: 'Τελικοί υπολογισμοί...' },
          { progress: 100, message: 'Ολοκληρώθηκε!' }
        ];
        
        for (let i = 0; i < progressSteps.length - 1; i++) {
          await new Promise(resolve => setTimeout(resolve, 300));
          setCalculationProgress(progressSteps[i].progress);
        }
        
        const isAdvanced = state.advancedOptions.includeReserveFund ||
          state.advancedOptions.heatingFixedPercentage !== 30 ||
          state.advancedOptions.elevatorMills;

        if (isAdvanced) {
          // Check if selected period is within reserve fund collection timeline
          const shouldIncludeReserveFund = state.advancedOptions.includeReserveFund && 
            checkIfPeriodInReserveFundTimeline(startDate, endDate);
          
          console.log('🔄 ResultsStep: Reserve fund check:', {
            includeReserveFund: state.advancedOptions.includeReserveFund,
            shouldIncludeReserveFund,
            startDate,
            endDate,
            reserveFundAmount: state.advancedOptions.reserveFundMonthlyAmount
          });
          
          const result = await calculateAdvancedShares({
            building_id: buildingId,
            period_start_date: startDate,
            period_end_date: endDate,
            month_filter: startDate ? startDate.substring(0, 7) : undefined, // "2025-05" format
            reserve_fund_monthly_total: shouldIncludeReserveFund
              ? state.advancedOptions.reserveFundMonthlyAmount
              : 0,
          });
          const shares = result?.shares || {};
          const totalExpenses = Object.values(shares).reduce((sum: number, share: any) => sum + (share.total_amount || 0), 0);
          updateState({ shares, totalExpenses, advancedShares: result });
        } else {
          const result = await calculateShares({
            building_id: buildingId,
            month_filter: startDate ? startDate.substring(0, 7) : undefined, // "2025-05" format
          });
          updateState({ shares: result.shares || {}, totalExpenses: result.total_expenses || 0, advancedShares: null });
        }
        
        setCalculationProgress(100);
        // Show success message
        setCalculationSuccess(true);
      } catch (err: any) {
        setLoadError(err?.message || 'Σφάλμα κατά τον υπολογισμό');
        setCalculationSuccess(false);
      } finally {
        // Small delay to show completion
        setTimeout(() => {
        setIsLoading(false);
          setCalculationProgress(0);
        }, 500);
        
        // Hide success message after 4 seconds (total)
        setTimeout(() => setCalculationSuccess(false), 4000);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId, state.customPeriod.startDate, state.customPeriod.endDate, state.advancedOptions.includeReserveFund, state.advancedOptions.heatingFixedPercentage, state.advancedOptions.elevatorMills, state.advancedOptions.reserveFundMonthlyAmount]);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      {/* Loading Progress */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            Υπολογισμός σε εξέλιξη...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Πρόοδος</span>
              <span>{calculationProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${calculationProgress}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards Skeleton */}
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-3 sm:p-4 rounded-lg border animate-pulse">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded w-20"></div>
                </div>
                <div className="h-8 bg-gray-300 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons Skeleton */}
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-0">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-300 rounded w-full sm:w-48"></div>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table Skeleton */}
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/3"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="h-5 bg-gray-300 rounded w-12 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                    <div className="h-5 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j}>
                        <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                        <div className="h-4 bg-gray-300 rounded w-12"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Enhanced error handling
  const ErrorStateComponent = ({ error }: { error: string }) => {
    const [isRetrying, setIsRetrying] = useState(false);
    
    const handleRetry = async () => {
      setIsRetrying(true);
      try {
        // Wait a moment before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.location.reload();
      } catch (err) {
        console.error('Retry failed:', err);
      } finally {
        setIsRetrying(false);
      }
    };

    const getErrorDetails = (error: string) => {
      if (error.toLowerCase().includes('network') || error.toLowerCase().includes('fetch')) {
        return {
          title: 'Πρόβλημα Σύνδεσης',
          description: 'Δεν ήταν δυνατή η σύνδεση με τον διακομιστή. Ελέγξτε τη σύνδεσή σας στο internet.',
          suggestions: [
            'Ελέγξτε τη σύνδεση internet',
            'Δοκιμάστε να ανανεώσετε τη σελίδα',
            'Προσπαθήστε ξανά σε λίγα λεπτά'
          ]
        };
      } else if (error.toLowerCase().includes('unauthorized') || error.toLowerCase().includes('403')) {
        return {
          title: 'Μη Εξουσιοδοτημένη Πρόσβαση',
          description: 'Δεν έχετε δικαίωμα πρόσβασης σε αυτά τα δεδομένα.',
          suggestions: [
            'Συνδεθείτε ξανά στο λογαριασμό σας',
            'Επικοινωνήστε με τον διαχειριστή',
            'Ελέγξτε τα δικαιώματά σας'
          ]
        };
      } else if (error.toLowerCase().includes('timeout')) {
        return {
          title: 'Λήξη Χρονικού Ορίου',
          description: 'Η αίτηση χρειάστηκε περισσότερο χρόνο από τον αναμενόμενο.',
          suggestions: [
            'Δοκιμάστε ξανά με λιγότερα δεδομένα',
            'Ελέγξτε τη ταχύτητα της σύνδεσής σας',
            'Προσπαθήστε ξανά αργότερα'
          ]
        };
      } else {
        return {
          title: 'Σφάλμα Υπολογισμού',
          description: error || 'Προέκυψε απροσδόκητο σφάλμα κατά τον υπολογισμό.',
          suggestions: [
            'Ελέγξτε αν όλα τα απαιτούμενα δεδομένα είναι διαθέσιμα',
            'Δοκιμάστε με διαφορετική περίοδο',
            'Επικοινωνήστε με την υποστήριξη αν το πρόβλημα συνεχίζεται'
          ]
        };
      }
    };

    const errorDetails = getErrorDetails(error);

  return (
    <div className="space-y-6">
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              {errorDetails.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-700">{errorDetails.description}</p>
            
            <div className="bg-red-100 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">Προτεινόμενες Λύσεις:</h4>
              <ul className="list-disc list-inside space-y-1 text-red-700 text-sm">
                {errorDetails.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleRetry}
                disabled={isRetrying}
                variant="outline" 
                className="border-red-300 text-red-700 hover:bg-red-100 flex items-center gap-2"
              >
                {isRetrying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    Επανάληψη...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Επανάληψη
                  </>
                )}
              </Button>
              
              <Button 
                onClick={() => {
                  // Go back to previous step or refresh data
                  setLoadError(null);
                  setIsLoading(false);
                }}
                variant="ghost" 
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="h-4 w-4 mr-2" />
                Ακύρωση
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t border-red-200">
              <details className="text-xs text-red-600">
                <summary className="cursor-pointer font-medium">Τεχνικές Λεπτομέρειες</summary>
                <pre className="mt-2 p-2 bg-red-50 rounded border text-red-800 overflow-auto">
                  {error}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Show error state
  if (loadError) {
    return <ErrorStateComponent error={loadError} />;
  }

  // Show loading state
  if (isLoading || Object.keys(state.shares).length === 0) {
    return <LoadingSkeleton />;
  }

  // Success message component
  const SuccessMessage = () => (
    <Card className="border-green-200 bg-green-50/50 animate-in slide-in-from-top duration-500">
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h4 className="font-semibold text-green-800">Επιτυχής Υπολογισμός</h4>
            <p className="text-sm text-green-600">Τα δεδομένα ενημερώθηκαν επιτυχώς</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Success Message - shown after successful calculation */}
      {calculationSuccess && <SuccessMessage />}
      


      {/* Enhanced Action Menu */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg text-blue-800">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
              Ενέργειες Κοινοχρήστων
          </CardTitle>
            <div className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded-full">
              {Object.keys(state.shares).length} Διαμερίσματα
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Primary Action - Common Expense Sheet */}
          <div className="mb-6">
            <Button 
              onClick={() => setShowCommonExpenseModal(true)}
              className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-base font-semibold"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Eye className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div>Φύλλο Κοινοχρήστων</div>
                  <div className="text-xs text-blue-100 font-normal">
                    Λεπτομερή προβολή
                  </div>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>



      {/* Common Expense Modal */}
      <CommonExpenseModal
        key={`expense-modal-${JSON.stringify(state.shares).substring(0, 10)}-${state.totalExpenses}`}
        isOpen={showCommonExpenseModal}
        onClose={() => setShowCommonExpenseModal(false)}
        state={state}
        buildingId={buildingId}
        buildingName={buildingData?.name || "Κτίριο Διαχείρισης"}
        managementFeePerApartment={buildingData?.management_fee_per_apartment || 0}
        reserveContributionPerApartment={buildingData?.reserve_contribution_per_apartment || 0}
      />
    </div>
  );
};
