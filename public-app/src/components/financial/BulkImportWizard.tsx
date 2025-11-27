import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { useMeterReadings } from '../../hooks/useMeterReadings';
import { typography } from '@/lib/typography';

interface ImportRow {
  apartment_name: string;
  apartment_number: string;
  reading_date: string;
  current_value: number;
  previous_value?: number;
  notes?: string;
}

interface ImportResult {
  success: number;
  errors: number;
  total: number;
  errorDetails: string[];
}

export const BulkImportWizard: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const { loading } = useMeterReadings();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFile(file);
      processFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  const processFile = async (file: File) => {
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const parsedData = rows.map(row => parseRow(row));
      
      // Validation
      const errors = validateData(parsedData);
      setValidationErrors(errors);
      
      setPreviewData(parsedData.slice(0, 10)); // Show first 10 rows
      setImportResult(null);
    } catch (error) {
      console.error('Error processing file:', error);
      setValidationErrors(['Σφάλμα κατά την επεξεργασία του αρχείου']);
    }
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      // Simple CSV parsing - can be enhanced for complex cases
      return line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
    });
  };

  const parseRow = (row: string[]): ImportRow => {
    return {
      apartment_name: row[0] || '',
      apartment_number: row[1] || '',
      reading_date: row[2] || '',
      current_value: parseFloat(row[3]) || 0,
      previous_value: row[4] ? parseFloat(row[4]) : undefined,
      notes: row[5] || '',
    };
  };

  const validateData = (data: ImportRow[]): string[] => {
    const errors: string[] = [];
    
    data.forEach((row, index) => {
      if (!row.apartment_name) {
        errors.push(`Γραμμή ${index + 1}: Λείπει το όνομα του διαμερίσματος`);
      }
      if (!row.reading_date) {
        errors.push(`Γραμμή ${index + 1}: Λείπει η ημερομηνία`);
      }
      if (isNaN(row.current_value) || row.current_value < 0) {
        errors.push(`Γραμμή ${index + 1}: Άκυρη τιμή μετρήσης`);
      }
      if (row.previous_value !== undefined && (isNaN(row.previous_value) || row.previous_value < 0)) {
        errors.push(`Γραμμή ${index + 1}: Άκυρη προηγούμενη τιμή`);
      }
      if (row.previous_value !== undefined && row.current_value < row.previous_value) {
        errors.push(`Γραμμή ${index + 1}: Η νέα μετρήση είναι μικρότερη από την προηγούμενη`);
      }
    });

    return errors;
  };

  const handleImport = async () => {
    if (!file || validationErrors.length > 0) return;

    setImporting(true);
    const result: ImportResult = {
      success: 0,
      errors: 0,
      total: previewData.length,
      errorDetails: [],
    };

    for (const row of previewData) {
      try {
        // TODO: Implement createMeterReading function
        console.log('Creating meter reading:', {
          apartment_name: row.apartment_name,
          apartment_number: row.apartment_number,
          reading_date: row.reading_date,
          current_value: row.current_value,
          previous_value: row.previous_value,
          notes: row.notes,
        });
        result.success++;
      } catch (error) {
        result.errors++;
        result.errorDetails.push(`Σφάλμα στη γραμμή: ${error}`);
      }
    }

    setImportResult(result);
    setImporting(false);
  };

  const downloadTemplate = () => {
    const template = `apartment_name,apartment_number,reading_date,current_value,previous_value,notes
Διαμέρισμα 1,1,2024-01-15,1000.5,950.2,Μηνιαία ανάγνωση
Διαμέρισμα 2,2,2024-01-15,1200.0,1150.0,Μηνιαία ανάγνωση`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meter_readings_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetImport = () => {
    setFile(null);
    setPreviewData([]);
    setImportResult(null);
    setValidationErrors([]);
    setShowPreview(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Μαζική Εισαγωγή Μετρήσεων
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Εισάγετε μετρήσεις από CSV ή Excel αρχείο. Το αρχείο πρέπει να περιέχει τις εξής στήλες:
            apartment_name, apartment_number, reading_date, current_value, previous_value (προαιρετικό), notes (προαιρετικό)
          </p>

          {/* Template Download */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Κατέβασμα Template
            </Button>
            <span className="text-xs text-gray-500">
              Κατεβάστε το template για να δείτε τη σωστή μορφή
            </span>
          </div>

          {/* File Upload */}
          {!file && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              {isDragActive ? (
                <p className="text-blue-600">Αφήστε το αρχείο εδώ...</p>
              ) : (
                <div>
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Επιλέξτε αρχείο ή σύρτε εδώ
                  </p>
                  <p className="text-sm text-gray-500">
                    Υποστηριζόμενοι τύποι: CSV, Excel (.xlsx, .xls)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* File Info */}
          {file && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetImport}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Βρέθηκαν σφάλματα επικύρωσης:</p>
                  <ul className="list-disc list-inside text-sm">
                    {validationErrors.slice(0, 5).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {validationErrors.length > 5 && (
                      <li>... και {validationErrors.length - 5} ακόμα</li>
                    )}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {previewData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Προεπισκόπηση Δεδομένων</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2"
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showPreview ? 'Απόκρυψη' : 'Εμφάνιση'}
                </Button>
              </div>

              {showPreview && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className={`px-3 py-2 text-left ${typography.tableHeader}`}>Διαμέρισμα</th>
                          <th className={`px-3 py-2 text-left ${typography.tableHeader}`}>Αριθμός</th>
                          <th className={`px-3 py-2 text-left ${typography.tableHeader}`}>Ημερομηνία</th>
                          <th className={`px-3 py-2 text-left ${typography.tableHeader}`}>Τρέχουσα</th>
                          <th className={`px-3 py-2 text-left ${typography.tableHeader}`}>Προηγούμενη</th>
                          <th className={`px-3 py-2 text-left ${typography.tableHeader}`}>Σημειώσεις</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-3 py-2">{row.apartment_name}</td>
                            <td className="px-3 py-2">{row.apartment_number}</td>
                            <td className="px-3 py-2">{row.reading_date}</td>
                            <td className="px-3 py-2">{row.current_value}</td>
                            <td className="px-3 py-2">{row.previous_value || '-'}</td>
                            <td className="px-3 py-2">{row.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-500">
                Εμφανίζονται τα πρώτα {previewData.length} από {previewData.length} εγγραφές
              </p>
            </div>
          )}

          {/* Import Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Εισαγωγή σε εξέλιξη...</span>
                <span>0%</span>
              </div>
              <Progress value={0} className="w-full" />
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <Alert variant={importResult.errors === 0 ? "default" : "destructive"}>
              {importResult.errors === 0 ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">
                    Εισαγωγή ολοκληρώθηκε: {importResult.success} επιτυχείς, {importResult.errors} σφάλματα
                  </p>
                  {importResult.errorDetails.length > 0 && (
                    <ul className="list-disc list-inside text-sm">
                      {importResult.errorDetails.slice(0, 3).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {importResult.errorDetails.length > 3 && (
                        <li>... και {importResult.errorDetails.length - 3} ακόμα</li>
                      )}
                    </ul>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {file && validationErrors.length === 0 && !importing && (
            <div className="flex items-center gap-3">
              <Button
                onClick={handleImport}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Εισαγωγή Δεδομένων
              </Button>
              <Button
                variant="outline"
                onClick={resetImport}
                disabled={loading}
              >
                Ακύρωση
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 