'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, extractResults } from '@/lib/api';
import { BackButton } from '@/components/ui/BackButton';
import { Plus, Users, Phone, Mail, Wrench } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { useActiveBuildingId } from '@/hooks/useActiveBuildingId';

type Contractor = {
  id: number;
  name: string;
  service_type: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  status?: string;
  is_active?: boolean;
};

export default function ContractorsPage() {
  const router = useRouter();
  const buildingId = useActiveBuildingId();

  const contractorsQ = useQuery({
    queryKey: ['contractors', { building: buildingId }],
    queryFn: async () => {
      const response = await api.get('/maintenance/contractors/');
      return response.data;
    },
  });

  const contractors = extractResults<Contractor>(contractorsQ.data ?? []);

  return (
    <AuthGate>
      <SubscriptionGate>
        <div className="space-y-6 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Συνεργεία</h1>
            <div className="flex items-center gap-2">
              <Button asChild>
                <Link href="/maintenance/contractors/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Νέο Συνεργείο
                </Link>
              </Button>
              <BackButton href="/maintenance" />
            </div>
          </div>

          {contractorsQ.isLoading ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              </CardContent>
            </Card>
          ) : contractors.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">Δεν υπάρχουν συνεργεία.</p>
                  <Button asChild>
                    <Link href="/maintenance/contractors/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Προσθήκη πρώτου συνεργείου
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {contractors.map((contractor) => (
                <Card key={contractor.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{contractor.name}</CardTitle>
                        <Badge variant="outline" className="mt-2">
                          {contractor.service_type}
                        </Badge>
                      </div>
                      {contractor.is_active ? (
                        <Badge variant="default" className="bg-green-500">Ενεργό</Badge>
                      ) : (
                        <Badge variant="secondary">Ανενεργό</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {contractor.contact_person && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{contractor.contact_person}</span>
                        </div>
                      )}
                      {contractor.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <a href={`tel:${contractor.phone}`} className="hover:text-blue-600">
                            {contractor.phone}
                          </a>
                        </div>
                      )}
                      {contractor.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${contractor.email}`} className="hover:text-blue-600">
                            {contractor.email}
                          </a>
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
