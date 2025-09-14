'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CommonExpenseShare } from '@/types/financial';
import { formatCurrency } from '@/lib/utils';

interface SharePreviewProps {
  shares: CommonExpenseShare[];
  totalAmount: number;
  distributionType: string;
  isLoading?: boolean;
  showDetails?: boolean;
}

export const SharePreview: React.FC<SharePreviewProps> = ({
  shares,
  totalAmount,
  distributionType,
  isLoading = false,
  showDetails = true,
}) => {
  const getDistributionLabel = (type: string) => {
    const labels: Record<string, string> = {
      'EQUAL': 'Ισόποσα Κατανομή',
      'MILLS': 'Κατανομή ανά Χιλιοστά',
      'METERS': 'Κατανομή ανά Μετρητές',
    };
    return labels[type] || type;
  };

  const getShareColor = (share: CommonExpenseShare) => {
    if (share.amount > 0) return 'text-green-600';
    if (share.amount < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getShareBadge = (share: CommonExpenseShare) => {
    if (share.amount > 0.10) {
      return <Badge className="bg-green-100 text-green-800">Πιστωτικό</Badge>;
    }
    if (share.amount < -0.10) {
      return <Badge className="bg-red-100 text-red-800">Οφειλή</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800">Ουδέτερο</Badge>;
  };

  const totalShares = shares.reduce((sum, share) => sum + share.amount, 0);
  const maxShare = Math.max(...shares.map(share => Math.abs(share.amount)), 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Προεπισκόπηση Κατανομής</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {getDistributionLabel(distributionType)}
            </Badge>
            <Badge variant="secondary">
              {shares.length} διαμερίσματα
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <p className="text-sm text-gray-600">Συνολικό Ποσό</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalAmount)}
            </p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <p className="text-sm text-gray-600">Συνολικό Μέρισμα</p>
            <p className={`text-2xl font-bold ${totalShares >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalShares)}
            </p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <p className="text-sm text-gray-600">Μέγιστο Μέρισμα</p>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(maxShare)}
            </p>
          </div>
        </div>

        {/* Shares List */}
        {showDetails && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Μερίδια ανά Διαμέρισμα</h3>
            <div className="space-y-3">
              {shares.map((share) => (
                <div
                  key={share.apartment_id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">
                        Διαμέρισμα {share.apartment_number}
                      </h4>
                      {getShareBadge(share)}
                      {share.participation_mills > 0 && (
                        <Badge variant="outline">
                          {share.participation_mills} χιλιοστά
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${getShareColor(share)}`}>
                        {formatCurrency(share.amount)}
                      </p>
                      {share.percentage > 0 && (
                        <p className="text-sm text-gray-500">
                          {share.percentage.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {maxShare > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Μέρος του συνόλου</span>
                        <span>{((Math.abs(share.amount) / maxShare) * 100).toFixed(1)}%</span>
                      </div>
                      <Progress
                        value={(Math.abs(share.amount) / maxShare) * 100}
                        className="h-2"
                      />
                    </div>
                  )}

                  {/* Additional Details */}
                  {share.details && (
                    <div className="mt-2 text-sm text-gray-600">
                      <p><strong>Λεπτομέρειες:</strong> {share.details}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                  Διαμέρισμα
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                  Χιλιοστά
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">
                  Ποσό
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">
                  Ποσοστό
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {shares.map((share) => (
                <tr key={share.apartment_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">
                    {share.apartment_number}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {share.participation_mills || '-'}
                  </td>
                  <td className={`px-4 py-2 text-sm text-right font-medium ${getShareColor(share)}`}>
                    {formatCurrency(share.amount)}
                  </td>
                  <td className="px-4 py-2 text-sm text-right text-gray-500">
                    {share.percentage ? `${share.percentage.toFixed(1)}%` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-4 py-2 text-sm font-medium">Σύνολο</td>
                <td className="px-4 py-2 text-sm font-medium">
                  {shares.reduce((sum, share) => sum + (share.participation_mills || 0), 0)}
                </td>
                <td className={`px-4 py-2 text-sm font-bold text-right ${totalShares >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalShares)}
                </td>
                <td className="px-4 py-2 text-sm font-medium text-right">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Validation Message */}
        {Math.abs(totalShares - totalAmount) > 0.01 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Προσοχή: Το σύνολο των μεριδίων ({formatCurrency(totalShares)}) 
              διαφέρει από το συνολικό ποσό ({formatCurrency(totalAmount)}).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 