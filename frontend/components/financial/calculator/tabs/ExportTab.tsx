
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Printer, Save, Thermometer, FileText } from 'lucide-react';

interface ExportTabProps {
  handleExport: (format: 'pdf' | 'excel') => void;
  handlePrint: () => void;
  handleSave: () => void;
  isSaving: boolean;
  setShowHeatingModal: (show: boolean) => void;
  buildingName: string;
  periodInfo: string;
  apartmentsCount: number;
  totalExpenses: number;
  formatAmount: (amount: number) => string;
}

export const ExportTab: React.FC<ExportTabProps> = ({
  handleExport,
  handlePrint,
  handleSave,
  isSaving,
  setShowHeatingModal,
  buildingName,
  periodInfo,
  apartmentsCount,
  totalExpenses,
  formatAmount
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Εξαγωγή και Εκτύπωση
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-blue-200 bg-blue-50/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="h-6 w-6 text-blue-600" />
                <h3 className="font-semibold text-blue-800">Εξαγωγή PDF</h3>
              </div>
              <p className="text-sm text-blue-700 mb-4">
                Δημιουργία PDF αρχείου με το φύλλο κοινοχρήστων
              </p>
              <Button
                onClick={() => handleExport('pdf')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Λήψη PDF
              </Button>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="h-6 w-6 text-green-600" />
                <h3 className="font-semibold text-green-800">Εξαγωγή Excel</h3>
              </div>
              <p className="text-sm text-green-700 mb-4">
                Δημιουργία Excel αρχείου για περαιτέρω επεξεργασία
              </p>
              <Button
                onClick={() => handleExport('excel')}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Λήψη Excel
              </Button>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Printer className="h-6 w-6 text-purple-600" />
                <h3 className="font-semibold text-purple-800">Εκτύπωση</h3>
              </div>
              <p className="text-sm text-purple-700 mb-4">
                Άμεση εκτύπωση του φύλλου κοινοχρήστων
              </p>
              <Button
                onClick={handlePrint}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Printer className="h-4 w-4 mr-2" />
                Εκτύπωση
              </Button>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Save className="h-6 w-6 text-orange-600" />
                <h3 className="font-semibold text-orange-800">Αποθήκευση</h3>
              </div>
              <p className="text-sm text-orange-700 mb-4">
                Αποθήκευση φύλλου στη βάση δεδομένων
              </p>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Thermometer className="h-6 w-6 text-red-600" />
                <h3 className="font-semibold text-red-800">Ανάλυση Θέρμανσης</h3>
              </div>
              <p className="text-sm text-red-700 mb-4">
                Προηγμένοι υπολογισμοί θέρμανσης με αυτονομία/κεντρική
              </p>
              <Button
                onClick={() => setShowHeatingModal(true)}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <Thermometer className="h-4 w-4 mr-2" />
                Ανάλυση Θέρμανσης
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-gray-200 bg-gray-50/30">
          <CardHeader>
            <CardTitle className="text-base">Περίληψη Εξαγωγής</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-600">Κτίριο</p>
                <p className="font-bold">{buildingName}</p>
              </div>
              <div>
                <p className="font-medium text-gray-600">Περίοδος</p>
                <p className="font-bold">{periodInfo}</p>
              </div>
              <div>
                <p className="font-medium text-gray-600">Διαμερίσματα</p>
                <p className="font-bold">{apartmentsCount}</p>
              </div>
              <div>
                <p className="font-medium text-gray-600">Σύνολο Δαπανών</p>
                <p className="font-bold text-blue-700">{formatAmount(totalExpenses)}€</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};
