'use client';

import React from 'react';
import Link from 'next/link';
import { Monitor, Settings, Eye, Plus, BarChart3 } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function KioskManagementPage() {
  return (
    <AuthGate role="admin" fallback={<div>Δεν έχετε πρόσβαση σε αυτή τη σελίδα. (Απαιτείται ρόλος: admin)</div>}>
      <KioskManagementContent />
    </AuthGate>
  );
}

function KioskManagementContent() {
  const { currentBuilding, selectedBuilding } = useBuilding();
  const building = selectedBuilding || currentBuilding;

  const stats = {
    activeKiosks: 3,
    totalWidgets: 17,
    totalBuildings: 5,
    lastUpdated: new Date(),
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              <Monitor className="w-8 h-8 mr-3" />
              Kiosk Management Dashboard
            </h1>
            <p className="text-purple-100">
              Διαχείριση και παραμετροποίηση του συστήματος kiosk για όλα τα κτίρια
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-purple-200">Τρέχον Κτίριο</p>
            <p className="text-lg font-semibold">{building ? building.name : 'Όλα τα κτίρια'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ενεργά Kiosks</p>
              <p className="text-3xl font-bold text-purple-600">{stats.activeKiosks}</p>
            </div>
            <Monitor className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Σύνολο Widgets</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalWidgets}</p>
            </div>
            <Settings className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Κτίρια</p>
              <p className="text-3xl font-bold text-green-600">{stats.totalBuildings}</p>
            </div>
              <BarChart3 className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Τελευταία Ενημέρωση</p>
              <p className="text-sm font-bold text-gray-700">
                {stats.lastUpdated.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/kiosk-management/widgets" className="group">
          <Card className="p-6 hover:shadow-md transition-all duration-200 group-hover:scale-105 border-2 border-transparent hover:border-purple-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                <Settings className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Διαχείριση Widgets</h3>
              <p className="text-sm text-gray-600">Προσθήκη, επεξεργασία και διαγραφή widgets</p>
            </div>
          </Card>
        </Link>
        <Link href="/kiosk-management/widgets/create" className="group">
          <Card className="p-6 hover:shadow-md transition-all duration-200 group-hover:scale-105 border-2 border-transparent hover:border-blue-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                <Plus className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Δημιουργία Widget</h3>
              <p className="text-sm text-gray-600">Δημιουργία νέου custom widget</p>
            </div>
          </Card>
        </Link>
        <Link href="/kiosk-management/preview" className="group">
          <Card className="p-6 hover:shadow-md transition-all duration-200 group-hover:scale-105 border-2 border-transparent hover:border-green-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Live Preview</h3>
              <p className="text-sm text-gray-600">Προεπισκόπηση του kiosk display</p>
            </div>
          </Card>
        </Link>
        <Link href="/kiosk-management/settings" className="group">
          <Card className="p-6 hover:shadow-md transition-all duration-200 group-hover:scale-105 border-2 border-transparent hover:border-orange-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-200 transition-colors">
                <Settings className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Ρυθμίσεις</h3>
              <p className="text-sm text-gray-600">Γενικές ρυθμίσεις kiosk</p>
            </div>
          </Card>
        </Link>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Πρόσφατη Δραστηριότητα</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm text-gray-700">Ενημερώθηκε το widget "Ανακοινώσεις" στο κτίριο Αλκμάνος 22</span>
            </div>
            <span className="text-xs text-gray-500">πριν 5 λεπτά</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-sm text-gray-700">Δημιουργήθηκε νέο custom widget "Ειδήσεις Συνοικίας"</span>
            </div>
            <span className="text-xs text-gray-500">πριν 1 ώρα</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span className="text-sm text-gray-700">Ενεργοποιήθηκε το kiosk στο κτίριο Πατησίων 150</span>
            </div>
            <span className="text-xs text-gray-500">πριν 2 ώρες</span>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Monitor className="w-6 h-6 mr-2 text-blue-600" />
          Πρόσβαση στο Public Kiosk
        </h2>
        <p className="text-gray-600 mb-4">
          Το public kiosk είναι διαθέσιμο σε όλους τους κατοίκους χωρίς ανάγκη σύνδεσης.
        </p>
        <div className="flex space-x-4">
          <Button asChild>
            <Link href="/kiosk" target="_blank">
              <Eye className="w-4 h-4 mr-2" />
              Άνοιγμα Public Kiosk
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/kiosk-management/preview">
              <Monitor className="w-4 h-4 mr-2" />
              Management Preview
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
