// 📁 frontend/components/RequestForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createUserRequest } from '@/lib/api';
import { useBuilding } from '@/components/contexts/BuildingContext'; // ✅ προσθήκη

export default function RequestForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { currentBuilding } = useBuilding(); // ✅ χρήση του context

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Ο τίτλος είναι υποχρεωτικός');
      return;
    }

    if (!currentBuilding?.id) {
      toast.error('Δεν έχει επιλεγεί κτήριο.');
      return;
    }

    setLoading(true);
    try {
      await createUserRequest({
        title: title.trim(),
        description,
        building: currentBuilding.id, // ✅ κρίσιμο πεδίο
      });

      toast.success('Το αίτημα υποβλήθηκε με επιτυχία');
      router.push('/requests');
    } catch (err) {
      toast.error(
        (err as Error).message || 'Σφάλμα κατά την υποβολή του αιτήματος'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-xl mx-auto mt-6 shadow-xl">
      <CardContent className="space-y-4 p-6">
        <h2 className="text-xl font-semibold">Νέο Αίτημα</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Τίτλος *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Περιγραφή</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? 'Υποβολή…' : 'Υποβολή Αιτήματος'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
