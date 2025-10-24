'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BackButton } from '@/components/ui/BackButton';

export default function EditProjectPage() {
  const { id } = useParams() as { id: string };
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton size="sm" />
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Επεξεργασία Έργου #{id}</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Στοιχεία</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Τίτλος</Label>
            <Input id="title" placeholder="Τίτλος έργου" />
          </div>
          <div>
            <Label htmlFor="budget">Προϋπολογισμός (€)</Label>
            <Input id="budget" type="number" step="0.01" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button>Αποθήκευση</Button>
            <Button asChild variant="outline"><Link href={`/projects/${id}`}>Άκυρο</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}