'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAnnouncement, CreateAnnouncementPayload } from '@/lib/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Props = {
  readonly buildingId?: number;
};

export default function NewAnnouncementForm({ buildingId }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(buildingId || null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { buildings } = useBuilding();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    if (!title.trim()) {
      toast.error('Ο τίτλος είναι υποχρεωτικός');
      setSubmitting(false);
      return;
    }

    try {
      const payload: CreateAnnouncementPayload = {
        title: title.trim(),
        description: content.trim(),
        start_date: startDate,
        end_date: endDate || '',
        file: fileUrl || undefined,
        is_active: isActive,
        building: selectedBuildingId || 0,
      };

      await createAnnouncement(payload);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });

      toast.success('Η ανακοίνωση δημιουργήθηκε με επιτυχία');
      router.push('/announcements');
    } catch (err) {
      const error = err as { message?: string };
      toast.error(error.message || 'Αποτυχία δημιουργίας ανακοίνωσης');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Τίτλος</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1"
          required
        />
      </div>

      <div>
        <Label htmlFor="content">Περιεχόμενο</Label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mt-1 w-full border rounded-lg px-3 py-2 h-32"
          required
        />
      </div>

      {/* Building Selection */}
      <div>
        <Label htmlFor="building">Κτίριο</Label>
        <Select
          value={selectedBuildingId?.toString() || ''}
          onValueChange={(value) => setSelectedBuildingId(value ? Number(value) : null)}
        >
          <SelectTrigger id="building" className="mt-1">
            <SelectValue placeholder="Επιλέξτε κτίριο" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Όλα τα κτίρια (Καθολική ανακοίνωση)</SelectItem>
            {buildings.map((building) => (
              <SelectItem key={building.id} value={building.id.toString()}>
                {building.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-gray-500">
          Επιλέξτε συγκεκριμένο κτίριο ή αφήστε "Όλα τα κτίρια" για καθολική ανακοίνωση
        </p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Label htmlFor="start">Έναρξη</Label>
          <Input
            id="start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1"
            required
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="end">Λήξη</Label>
          <Input
            id="end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="file">URL Αρχείου (προαιρετικό)</Label>
        <Input
          id="file"
          type="url"
          value={fileUrl ?? ''}
          onChange={(e) => setFileUrl(e.target.value || null)}
          className="mt-1"
        />
      </div>

      <div className="flex items-center">
        <input
          id="is_active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 text-green-600 border-gray-300 rounded"
        />
        <Label htmlFor="is_active" className="ml-2">
          Ενεργή ανακοίνωση (δημοσιευμένη)
        </Label>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full"
      >
        {submitting ? 'Υποβολή…' : 'Δημιουργία'}
      </Button>
    </form>
  );
}

