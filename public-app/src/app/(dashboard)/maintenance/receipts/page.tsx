'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, extractResults } from '@/lib/api';
import { BackButton } from '@/components/ui/BackButton';
import { Plus, FileText, Calendar, DollarSign } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { useActiveBuildingId } from '@/hooks/useActiveBuildingId';

type ServiceReceipt = {
  id: number;
  contractor: number;
  contractor_name?: string;
  building: number;
  service_date: string;
  amount: number | string;
  description: string;
  invoice_number?: string;
  payment_status: 'pending' | 'paid' | 'overdue';
  payment_date?: string;
};

export default function ReceiptsPage() {
  const buildingId = useActiveBuildingId();

  const receiptsQ = useQuery({
    queryKey: ['receipts', { building: buildingId }],
    queryFn: async () => {
      const response = await api.get('/maintenance/receipts/', {
        params: { building: buildingId },
      });
      return response.data;
    },
  });

  const receipts = extractResults<ServiceReceipt>(receiptsQ.data ?? []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Πληρωμένο</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500">Καθυστέρηση</Badge>;
      default:
        return <Badge variant="outline">Εκκρεμές</Badge>;
    }
  };

  return (
    <AuthGate>
      <SubscriptionGate>
        <div className="space-y-6 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Αποδείξεις Συντήρησης</h1>
            <div className="flex items-center gap-2">
              <Button asChild>
                <Link href="/maintenance/receipts/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Νέα Απόδειξη
                </Link>
              </Button>
              <BackButton href="/maintenance" />
            </div>
          </div>

          {receiptsQ.isLoading ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              </CardContent>
            </Card>
          ) : receipts.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">Δεν υπάρχουν αποδείξεις.</p>
                  <Button asChild>
                    <Link href="/maintenance/receipts/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Προσθήκη πρώτης απόδειξης
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {receipts.map((receipt) => (
                <Card key={receipt.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{receipt.description}</CardTitle>
                        {receipt.contractor_name && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Συνεργείο: {receipt.contractor_name}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(receipt.payment_status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Ημερομηνία</p>
                          <p className="text-sm font-medium">
                            {new Date(receipt.service_date).toLocaleDateString('el-GR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Ποσό</p>
                          <p className="text-sm font-medium">
                            €{Number(receipt.amount).toLocaleString('el-GR')}
                          </p>
                        </div>
                      </div>
                      {receipt.invoice_number && (
                        <div>
                          <p className="text-xs text-muted-foreground">Αρ. Τιμολογίου</p>
                          <p className="text-sm font-medium">{receipt.invoice_number}</p>
                        </div>
                      )}
                      {receipt.payment_date && (
                        <div>
                          <p className="text-xs text-muted-foreground">Ημ. Πληρωμής</p>
                          <p className="text-sm font-medium">
                            {new Date(receipt.payment_date).toLocaleDateString('el-GR')}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SubscriptionGate>
    </AuthGate>
  );
}
