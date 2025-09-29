'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Calendar as CalendarIcon,
  Filter,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { toast } from 'sonner';
import api from '@/lib/api';
import ExportWithOpen from '@/components/financial/ExportWithOpen';

interface ReportConfig {
  type: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  filters: string[];
}

interface ReportsManagerEnhancedProps {
  buildingId: number;
}

export default function ReportsManagerEnhanced({ buildingId }: ReportsManagerEnhancedProps) {
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({
    period: '',
    start_date: '',
    end_date: ''
  });

  const availableReports: ReportConfig[] = [
    {
      type: 'financial_summary',
      title: 'Οικονομική Σύνοψη',
      description: 'Συνολική εικόνα των οικονομικών του κτηρίου',
      icon: <FileText className="h-5 w-5" />,
      filters: ['period'],
    },
    {
      type: 'transaction_history',
      title: 'Ιστορικό Συναλλαγών',
      description: 'Λεπτομερές ιστορικό όλων των συναλλαγών',
      icon: <FileSpreadsheet className="h-5 w-5" />,
      filters: ['period', 'start_date', 'end_date'],
    },
    {
      type: 'payment_analysis',
      title: 'Ανάλυση Εισπράξεων',
      description: 'Στατιστικά και ανάλυση πληρωμών',
      icon: <FileText className="h-5 w-5" />,
      filters: ['period'],
    },
  ];

  // Βελτιωμένη εξαγωγή με επιλογές "Άνοιγμα με"
  const exportReport = async (format: 'pdf' | 'excel'): Promise<Blob> => {
    if (!selectedReport) {
      throw new Error('Παρακαλώ επιλέξτε μια αναφορά');
    }

    const params = new URLSearchParams({
      building_id: buildingId.toString(),
      report_type: selectedReport,
      ...filters,
    });

    const endpoint = format === 'excel' ? 'export_excel' : 'export_pdf';
    const response = await api.get(`/financial/reports/${endpoint}/?${params}`, {
      responseType: 'blob'
    });
    
    return response.data;
  };

  const getSelectedReportConfig = () => {
    return availableReports.find(report => report.type === selectedReport);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      period: '',
      start_date: '',
      end_date: ''
    });
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value !== '').length;
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
        {/* Επιλογή Αναφοράς */}
        <div className="space-y-2">
          <Label htmlFor="report-select">Επιλογή Αναφοράς</Label>
          <Select value={selectedReport} onValueChange={setSelectedReport}>
            <SelectTrigger>
              <SelectValue placeholder="Επιλέξτε μια αναφορά..." />
            </SelectTrigger>
            <SelectContent>
              {availableReports.map((report) => (
                <SelectItem key={report.type} value={report.type}>
                  <div className="flex items-center gap-2">
                    {report.icon}
                    <div>
                      <div className="font-medium">{report.title}</div>
                      <div className="text-sm text-gray-500">{report.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Φίλτρα */}
        {selectedReport && (
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Φίλτρα
                {getActiveFiltersCount() > 0 && (
                  <Badge variant="secondary">{getActiveFiltersCount()}</Badge>
                )}
              </h3>
              {getActiveFiltersCount() > 0 && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Επαναφορά
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Περίοδος */}
              <div className="space-y-2">
                <Label htmlFor="period">Περίοδος</Label>
                <Select value={filters.period} onValueChange={(value) => handleFilterChange('period', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε περίοδο..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_month">Τρέχον Μήνα</SelectItem>
                    <SelectItem value="last_month">Προηγούμενος Μήνας</SelectItem>
                    <SelectItem value="current_quarter">Τρέχον Τρίμηνο</SelectItem>
                    <SelectItem value="current_year">Τρέχον Έτος</SelectItem>
                    <SelectItem value="custom">Προσαρμοσμένη Περίοδος</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ημερομηνία Έναρξης */}
              {filters.period === 'custom' && (
                <div className="space-y-2">
                  <Label>Ημερομηνία Έναρξης</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.start_date ? format(new Date(filters.start_date), 'dd/MM/yyyy', { locale: el }) : 'Επιλέξτε ημερομηνία...'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.start_date ? new Date(filters.start_date) : undefined}
                        onSelect={(date) => handleFilterChange('start_date', date ? date.toISOString().split('T')[0] : '')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Ημερομηνία Λήξης */}
              {filters.period === 'custom' && (
                <div className="space-y-2">
                  <Label>Ημερομηνία Λήξης</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.end_date ? format(new Date(filters.end_date), 'dd/MM/yyyy', { locale: el }) : 'Επιλέξτε ημερομηνία...'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={filters.end_date ? new Date(filters.end_date) : undefined}
                        onSelect={(date) => handleFilterChange('end_date', date ? date.toISOString().split('T')[0] : '')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Εξαγωγή με Επιλογές */}
        {selectedReport && (
          <div className="space-y-4">
            <h3 className="font-medium">Εξαγωγή Αναφοράς</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PDF Εξαγωγή */}
              <Card className="border-blue-200 bg-blue-50/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="h-6 w-6 text-blue-600" />
                    <h3 className="font-semibold text-blue-800">PDF Αναφορά</h3>
                  </div>
                  <p className="text-sm text-blue-700 mb-4">
                    Εξαγωγή αναφοράς σε PDF για εκτύπωση ή αρχειοθέτηση
                  </p>
                  
                  <ExportWithOpen
                    fileName={`${getSelectedReportConfig()?.title}_${new Date().toISOString().split('T')[0]}.pdf`}
                    exportFunction={() => exportReport('pdf')}
                    fileType="pdf"
                    variant="default"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    showPreview={true}
                  />
                </CardContent>
              </Card>

              {/* Excel Εξαγωγή */}
              <Card className="border-green-200 bg-green-50/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <FileSpreadsheet className="h-6 w-6 text-green-600" />
                    <h3 className="font-semibold text-green-800">Excel Αναφορά</h3>
                  </div>
                  <p className="text-sm text-green-700 mb-4">
                    Εξαγωγή αναφοράς σε Excel για περαιτέρω ανάλυση
                  </p>
                  
                  <ExportWithOpen
                    fileName={`${getSelectedReportConfig()?.title}_${new Date().toISOString().split('T')[0]}.xlsx`}
                    exportFunction={() => exportReport('excel')}
                    fileType="excel"
                    variant="default"
                    className="w-full bg-green-600 hover:bg-green-700"
                    showPreview={false}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Πληροφορίες Επιλεγμένης Αναφοράς */}
        {selectedReport && (
          <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="font-medium mb-2">Πληροφορίες Αναφοράς</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Τύπος:</strong> {getSelectedReportConfig()?.title}</p>
              <p><strong>Περιγραφή:</strong> {getSelectedReportConfig()?.description}</p>
              <p><strong>Διαθέσιμες Μορφές:</strong> PDF, Excel</p>
              <p><strong>Εφαρμοσμένα Φίλτρα:</strong> {getActiveFiltersCount() > 0 ? getActiveFiltersCount() : 'Κανένα'}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
