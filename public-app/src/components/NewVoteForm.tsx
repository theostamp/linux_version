'use client';

import { useState } from 'react';
import { CreateVotePayload } from '@/lib/api';
import { toast } from 'sonner';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info } from 'lucide-react';

type Props = Readonly<{
  onSubmit: (data: CreateVotePayload) => void | Promise<void>;
  buildingId?: number;
  isSubmitting?: boolean;
}>;

export default function NewVoteForm({ onSubmit, buildingId, isSubmitting: externalIsSubmitting }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(buildingId || null);
  const [submitting, setSubmitting] = useState(false);
  const { buildings } = useBuilding();

  // Χρησιμοποιούμε external isSubmitting αν υπάρχει, αλλιώς local state
  const isSubmittingState = externalIsSubmitting !== undefined ? externalIsSubmitting : submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Προστασία από double submission
    if (isSubmittingState) {
      return;
    }

    if (externalIsSubmitting === undefined) {
      setSubmitting(true);
    }

    if (!title.trim() || !description.trim()) {
      toast.error('Ο τίτλος και η περιγραφή είναι υποχρεωτικά');
      if (externalIsSubmitting === undefined) {
        setSubmitting(false);
      }
      return;
    }

    if (!startDate) {
      toast.error('Η ημερομηνία έναρξης είναι υποχρεωτική');
      if (externalIsSubmitting === undefined) {
        setSubmitting(false);
      }
      return;
    }

    const payload: CreateVotePayload = {
      title: title.trim(),
      description: description.trim(),
      start_date: startDate,
      end_date: endDate || undefined,
      building: selectedBuildingId || null,  // null για καθολικές ψηφοφορίες
    };

    try {
      await Promise.resolve(onSubmit(payload));
    } catch (err) {
      console.error('Vote submission failed:', err);
      toast.error('Αποτυχία υποβολής');
      if (externalIsSubmitting === undefined) {
        setSubmitting(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <div>
        <Label htmlFor="title">Τίτλος Ψηφοφορίας *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1"
          placeholder="π.χ. Ανανέωση ανελκυστήρα"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Περιγραφή *</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 h-24"
          placeholder="Περιγράψτε το θέμα της ψηφοφορίας..."
          required
        />
      </div>

      {/* Building Selection */}
      <div>
        <Label htmlFor="building">Κτίριο</Label>
        <Select
          value={selectedBuildingId?.toString() || 'all'}
          onValueChange={(value) => setSelectedBuildingId(value === 'all' ? null : Number(value))}
        >
          <SelectTrigger id="building" className="mt-1">
            <SelectValue placeholder="Επιλέξτε κτίριο" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">🌐 Όλα τα κτίρια (Καθολική ψηφοφορία)</SelectItem>
            {buildings.map((building) => (
              <SelectItem key={building.id} value={building.id.toString()}>
                🏢 {building.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-gray-500">
          Επιλέξτε συγκεκριμένο κτίριο ή αφήστε "Όλα τα κτίρια" για καθολική ψηφοφορία
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="vote-start-date">Ημερομηνία Έναρξης *</Label>
          <Input
            id="vote-start-date"
            type="date"
            className="mt-1"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="vote-end-date">Ημερομηνία Λήξης</Label>
          <Input
            id="vote-end-date"
            type="date"
            className="mt-1"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            min={startDate}
          />
          <p className="mt-1 text-xs text-gray-500">Προαιρετικό</p>
        </div>
      </div>

      {/* Info about voting options */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Επιλογές Ψηφοφορίας</p>
            <p className="text-sm text-blue-700 mt-1">
              Οι ένοικοι θα μπορούν να ψηφίσουν: <strong>ΝΑΙ</strong>, <strong>ΌΧΙ</strong> ή <strong>ΛΕΥΚΟ</strong>
            </p>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isSubmittingState}
        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
      >
        {isSubmittingState ? '⏳ Δημιουργία...' : '🗳️ Δημιουργία Ψηφοφορίας'}
      </Button>
    </form>
  );
}
