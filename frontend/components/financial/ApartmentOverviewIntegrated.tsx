'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  RefreshCw,
  Users,
  Euro,
  Calculator,
  CheckCircle,
  CreditCard
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface ApartmentBalance {
  apartment_id: number;
  apartment_number: string;
  owner_name: string;
  current_balance: number;
  previous_balance: number;
  expense_share: number;
  net_obligation: number;
  total_payments: number;
  status: string;
  participation_mills: number;
}

interface ApartmentSummary {
  apartments: ApartmentBalance[];
  summary: {
    total_obligations: number;
    total_payments: number;
    total_net_obligations: number;
    active_count: number;
    debt_count: number;
    critical_count: number;
    credit_count: number;
  };
}

interface ApartmentOverviewIntegratedProps {
  buildingId: number;
  selectedMonth?: string;
}

export const ApartmentOverviewIntegrated: React.FC<ApartmentOverviewIntegratedProps> = ({
  buildingId,
  selectedMonth,
}) => {
  const [data, setData] = useState<ApartmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        building_id: buildingId.toString()
      });
      if (selectedMonth) {
        params.append('month', selectedMonth);
      }
      
      const url = `/financial/dashboard/apartment_balances/?${params.toString()}`;
      const response = await api.get(url);
      
      setData(response.data);
    } catch (err: any) {
      console.error('Error loading apartment data:', err);
      setError('Σφάλμα κατά τη φόρτωση των στοιχείων διαμερισμάτων');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (buildingId) {
      loadData();
    }
  }, [buildingId, selectedMonth]);

  const getStatusBadge = (status: string, netObligation: number) => {
    if (netObligation > 100) {
      return <Badge variant="destructive" className="text-xs">Οφειλή</Badge>;
    } else if (netObligation > 0.30) {
      return <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">Οφειλή</Badge>;
    } else if (netObligation < -0.30) {
      return <Badge variant="outline" className="text-xs bg-green-100 text-green-800">Πιστωτικό</Badge>;
    } else {
      return <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">Ενήμερο</Badge>;
    }
  };

  const getStatusIcon = (netObligation: number) => {
    if (netObligation > 100) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    } else if (netObligation > 0.30) {
      return <TrendingDown className="h-4 w-4 text-orange-500" />;
    } else if (netObligation < -0.30) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else {
      return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Φόρτωση στοιχείων διαμερισμάτων...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
          <Button 
            onClick={loadData} 
            className="mt-2"
            variant="outline"
          >
            Δοκιμή ξανά
          </Button>
        </div>
      </div>
    );
  }

  const { apartments, summary } = data;
  const apartmentCount = apartments.length;

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{apartmentCount}</div>
          <div className="text-xs text-blue-600">διαμερίσματα</div>
        </div>

        <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(Math.max(0, summary.total_net_obligations))}
          </div>
          <div className="text-xs text-red-600">συνολικές οφειλές</div>
        </div>

        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.total_payments)}
          </div>
          <div className="text-xs text-green-600">σύνολο εισπράξεων</div>
        </div>

        <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-orange-600">
            {summary.debt_count}/{apartmentCount}
          </div>
          <div className="text-xs text-orange-600">με οφειλές</div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Κατανομή Κατάστασης</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-blue-500" />
                <span className="text-xs">Ενήμερα</span>
              </div>
              <span className="text-sm font-medium">
                {apartmentCount - summary.debt_count}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-3 w-3 text-orange-500" />
                <span className="text-xs">Με οφειλές</span>
              </div>
              <span className="text-sm font-medium">
                {summary.debt_count}
              </span>
            </div>
            
            {summary.critical_count > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  <span className="text-xs">Κρίσιμα</span>
                </div>
                <span className="text-sm font-medium">
                  {summary.critical_count}
                </span>
              </div>
            )}
            
            {summary.credit_count > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs">Πιστωτικά</span>
                </div>
                <span className="text-sm font-medium">
                  {summary.credit_count}
                </span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Μέσοι Όροι</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs">Μέση οφειλή ανά διαμ.</span>
              <span className="text-sm font-medium">
                {formatCurrency(summary.total_net_obligations / Math.max(1, apartmentCount))}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs">Μέση πληρωμή ανά διαμ.</span>
              <span className="text-sm font-medium">
                {formatCurrency(summary.total_payments / Math.max(1, apartmentCount))}
              </span>
            </div>
            
            {summary.debt_count > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs">Μέση οφειλή οφειλετών</span>
                <span className="text-sm font-medium">
                  {formatCurrency(summary.total_net_obligations / Math.max(1, summary.debt_count))}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Top Debtors (if any) */}
      {summary.debt_count > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium">Διαμερίσματα με Υψηλότερες Οφειλές</span>
          </div>
          
          <div className="space-y-2">
            {apartments
              .filter(apt => apt.net_obligation > 0)
              .sort((a, b) => b.net_obligation - a.net_obligation)
              .slice(0, 5)
              .map((apartment) => (
                <div key={apartment.apartment_id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(apartment.net_obligation)}
                    <span className="text-sm">
                      Διαμ. {apartment.apartment_number}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({apartment.owner_name})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(apartment.status, apartment.net_obligation)}
                    <span className="text-sm font-medium text-red-600">
                      {formatCurrency(apartment.net_obligation)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
          
          {apartments.filter(apt => apt.net_obligation > 0).length > 5 && (
            <div className="text-xs text-gray-500 text-center mt-2 pt-2 border-t">
              ... και {apartments.filter(apt => apt.net_obligation > 0).length - 5} ακόμη διαμερίσματα με οφειλές
            </div>
          )}
        </Card>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          Συνολικά {apartmentCount} διαμερίσματα • 
          {summary.debt_count > 0 ? ` ${summary.debt_count} με οφειλές` : ' Όλα ενήμερα'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadData}
          className="h-6 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Ανανέωση
        </Button>
      </div>
    </div>
  );
};