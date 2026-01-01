'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Calendar,
  Building,
  Users,
  TrendingUp,
  Filter,
  Search
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';

interface ReportsManagerProps {
  buildingId: number;
}

interface ReportConfig {
  type: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  filters: string[];
}

export function ReportsManager({ buildingId }: ReportsManagerProps) {
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    period: 'month',
    apartmentId: '',
    transactionType: '',
  });
  const [exporting, setExporting] = useState(false);

  const availableReports: ReportConfig[] = [
    {
      type: 'transaction_history',
      title: 'Ιστορικό Κινήσεων',
      description: 'Λεπτομερές ιστορικό όλων των οικονομικών κινήσεων',
      icon: <FileText className="h-5 w-5" />,
      filters: ['startDate', 'endDate', 'transactionType', 'apartmentId'],
    },
    {
      type: 'apartment_balances',
      title: 'Κατάσταση Οφειλών',
      description: 'Τρέχουσα κατάσταση οφειλών ανά διαμέρισμα',
      icon: <Building className="h-5 w-5" />,
      filters: ['apartmentId'],
    },
    {
      type: 'financial_summary',
      title: 'Οικονομική Σύνοψη',
      description: 'Συνοπτική αναφορά οικονομικών στοιχείων',
      icon: <TrendingUp className="h-5 w-5" />,
      filters: ['period'],
    },
  ];

  const exportReport = async (format: 'excel' | 'pdf') => {
    if (!selectedReport) return;

    setExporting(true);
    try {
      const params = new URLSearchParams({
        building_id: buildingId.toString(),
        report_type: selectedReport,
      });

      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.set(key, value);
        }
      });

      const endpoint = format === 'excel' ? 'export_excel' : 'export_pdf';
      const apiUrl = new URL(getApiUrl(`/financial/reports/${endpoint}/`));
      params.forEach((value, key) => apiUrl.searchParams.set(key, value));

      const response = await fetch(apiUrl.toString(), { method: 'GET', credentials: 'include' });
      if (!response.ok) {
        throw new Error(`Failed to export report (${format}) with status ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${selectedReport}_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error(`Σφάλμα εξαγωγής ${format}:`, error);
    } finally {
      setExporting(false);
    }
  };

  const getSelectedReportConfig = () => {
    return availableReports.find(report => report.type === selectedReport);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Διαχείριση Αναφορών
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Επιλογή αναφοράς */}
        <div>
          <h3 className="text-lg font-medium mb-3">Επιλογή Αναφοράς</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availableReports.map((report) => (
              <div
                key={report.type}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedReport === report.type
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-slate-200'
                }`}
                onClick={() => setSelectedReport(report.type)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded ${
                    selectedReport === report.type ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    {report.icon}
                  </div>
                  <div>
                    <h4 className="font-medium">{report.title}</h4>
                    <p className="text-sm text-gray-600">{report.description}</p>
                  </div>
                </div>
                {selectedReport === report.type && (
                  <Badge className="bg-blue-100 text-blue-800">
                    Επιλεγμένη
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Φίλτρα αναφοράς */}
        {selectedReport && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Φίλτρα Αναφοράς
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getSelectedReportConfig()?.filters.includes('startDate') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Από Ημερομηνία</label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  />
                </div>
              )}

              {getSelectedReportConfig()?.filters.includes('endDate') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Έως Ημερομηνία</label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  />
                </div>
              )}

              {getSelectedReportConfig()?.filters.includes('period') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Περίοδος</label>
                  <Select
                    value={filters.period}
                    onValueChange={(value) => setFilters({ ...filters, period: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Τρέχων Μήνας</SelectItem>
                      <SelectItem value="quarter">Τρέχον Τρίμηνο</SelectItem>
                      <SelectItem value="year">Τρέχον Έτος</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {getSelectedReportConfig()?.filters.includes('transactionType') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Τύπος Κίνησης</label>
                  <Select
                    value={filters.transactionType}
                    onValueChange={(value) => setFilters({ ...filters, transactionType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Όλοι οι τύποι" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Όλοι οι τύποι</SelectItem>
                                      <SelectItem value="common_expense_payment">Είσπραξη Κοινοχρήστων</SelectItem>
                <SelectItem value="expense_payment">Είσπραξη Δαπάνης</SelectItem>
                      <SelectItem value="refund">Επιστροφή</SelectItem>
                      <SelectItem value="common_expense_charge">Χρέωση Κοινοχρήστων</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {getSelectedReportConfig()?.filters.includes('apartmentId') && (
                <div>
                  <label className="block text-sm font-medium mb-1">Διαμέρισμα</label>
                  <Input
                    placeholder="Αριθμός διαμερίσματος"
                    value={filters.apartmentId}
                    onChange={(e) => setFilters({ ...filters, apartmentId: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Εξαγωγή */}
        {selectedReport && (
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Εξαγωγή Αναφοράς
            </h3>

            <div className="flex gap-3">
              <Button
                onClick={() => exportReport('excel')}
                disabled={exporting}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Εξαγωγή σε Excel
              </Button>

              <Button
                onClick={() => exportReport('pdf')}
                disabled={exporting}
                variant="outline"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Εξαγωγή σε PDF
              </Button>
            </div>

            {exporting && (
              <div className="mt-3 text-sm text-gray-600 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Εξαγωγή σε εξέλιξη...
              </div>
            )}
          </div>
        )}

        {/* Πληροφορίες αναφοράς */}
        {selectedReport && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Πληροφορίες Αναφοράς</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Τύπος:</strong> {getSelectedReportConfig()?.title}</p>
              <p><strong>Περιγραφή:</strong> {getSelectedReportConfig()?.description}</p>
              <p><strong>Διαθέσιμες μορφές:</strong> Excel (.xlsx), PDF</p>
              <p><strong>Περιλαμβάνει:</strong> Φιλτραρισμένα δεδομένα βάσει των επιλεγμένων κριτηρίων</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
