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
import { Plus, X } from 'lucide-react';

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
  const [choices, setChoices] = useState<string[]>(['Ναι', 'Όχι', 'Λευκό']);
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(buildingId || null);
  const [submitting, setSubmitting] = useState(false);
  const { buildings } = useBuilding();
  
  // Χρησιμοποιούμε external isSubmitting αν υπάρχει, αλλιώς local state
  const isSubmittingState = externalIsSubmitting !== undefined ? externalIsSubmitting : submitting;

  const handleChoiceChange = (index: number, value: string) => {
    const newChoices = [...choices];
    newChoices[index] = value;
    setChoices(newChoices);
  };

  const addChoice = () => {
    setChoices([...choices, '']);
  };

  const removeChoice = (index: number) => {
    if (choices.length <= 1) {
      toast.error('Πρέπει να υπάρχει τουλάχιστον μία επιλογή');
      return;
    }
    setChoices(choices.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Προστασία από double submission
    if (isSubmittingState) {
      return;
    }
    
    if (externalIsSubmitting === undefined) {
      setSubmitting(true);
    }

    const trimmedChoices = choices.map(c => c.trim()).filter(Boolean);

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

    if (trimmedChoices.length < 2) {
      toast.error('Πρέπει να υπάρχουν τουλάχιστον δύο επιλογές');
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
      choices: trimmedChoices,
      building: selectedBuildingId || 0,
    };

    try {
      // Περιμένουμε να ολοκληρωθεί το onSubmit πριν reset το submitting
      await Promise.resolve(onSubmit(payload));
      // Αν το onSubmit ολοκληρώθηκε επιτυχώς, το parent component θα χειριστεί το reset
    } catch (err) {
      console.error('Vote submission failed:', err);
      toast.error('Αποτυχία υποβολής');
      if (externalIsSubmitting === undefined) {
        setSubmitting(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Τίτλος Ψηφοφορίας</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Περιγραφή</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 h-24"
          required
        />
      </div>

      {/* Building Selection */}
      <div>
        <Label htmlFor="building">Κτίριο</Label>
        <Select
          value={selectedBuildingId?.toString() || '0'}
          onValueChange={(value) => setSelectedBuildingId(value === '0' ? null : Number(value))}
        >
          <SelectTrigger id="building" className="mt-1">
            <SelectValue placeholder="Επιλέξτε κτίριο" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Όλα τα κτίρια (Καθολική ψηφοφορία)</SelectItem>
            {buildings.map((building) => (
              <SelectItem key={building.id} value={building.id.toString()}>
                {building.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-gray-500">
          Επιλέξτε συγκεκριμένο κτίριο ή αφήστε "Όλα τα κτίρια" για καθολική ψηφοφορία
        </p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Label htmlFor="vote-start-date">Έναρξη</Label>
          <Input
            id="vote-start-date"
            type="date"
            className="mt-1"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="vote-end-date">Λήξη (προαιρετικά)</Label>
          <Input
            id="vote-end-date"
            type="date"
            className="mt-1"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label className="mb-2 block">
          Επιλογές Ψηφοφορίας
        </Label>
        {choices.map((choice, index) => (
          <div key={`${choice}-${index}`} className="flex items-center gap-2 mb-2">
            <Input
              id={`vote-choice-${index}`}
              className="flex-1"
              value={choice}
              onChange={(e) => handleChoiceChange(index, e.target.value)}
              required
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => removeChoice(index)}
              className="text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addChoice}
          className="mt-1"
        >
          <Plus className="w-4 h-4 mr-1" />
          Προσθήκη Επιλογής
        </Button>
      </div>

      <Button
        type="submit"
        disabled={isSubmittingState}
        className="w-full"
      >
        {isSubmittingState ? 'Υποβολή…' : 'Δημιουργία Ψηφοφορίας'}
      </Button>
    </form>
  );
}

