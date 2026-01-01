'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAnnouncement, CreateAnnouncementPayload } from '@/lib/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, Trash2, Clock, MapPin, Video } from 'lucide-react';

interface AssemblyTopic {
  id: string;
  title: string;
  description: string;
  dueDate: string;
}

type Props = {
  readonly buildingId?: number;
};

export default function AssemblyForm({ buildingId }: Props) {
  const [assemblyTitle, setAssemblyTitle] = useState('');
  const [assemblyDate, setAssemblyDate] = useState('');
  const [assemblyTime, setAssemblyTime] = useState('');
  const [assemblyLocation, setAssemblyLocation] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [topics, setTopics] = useState<AssemblyTopic[]>([
    { id: '1', title: '', description: '', dueDate: '' }
  ]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(buildingId || null);
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();
  const queryClient = useQueryClient();
  const { buildings } = useBuilding();

  const addTopic = () => {
    const newTopic: AssemblyTopic = {
      id: Date.now().toString(),
      title: '',
      description: '',
      dueDate: ''
    };
    setTopics([...topics, newTopic]);
  };

  const removeTopic = (id: string) => {
    if (topics.length > 1) {
      setTopics(topics.filter(topic => topic.id !== id));
    }
  };

  const updateTopic = (id: string, field: keyof AssemblyTopic, value: string) => {
    setTopics(topics.map(topic =>
      topic.id === id ? { ...topic, [field]: value } : topic
    ));
  };

  const generateAssemblyDescription = () => {
    const dateTime = assemblyDate && assemblyTime ? `${assemblyDate} στις ${assemblyTime}` : 'Θα ανακοινωθεί';
    const location = isOnline ? 'Zoom Meeting' : (assemblyLocation || 'Θα ανακοινωθεί');

    let description = `**Ημερομηνία και Ώρα Συνέλευσης:** ${dateTime}\n`;
    description += `**Τοποθεσία:** ${location}\n`;

    if (isOnline && meetingLink) {
      description += `**Σύνδεσμος:** ${meetingLink}\n`;
    }

    description += `\n**ΘΕΜΑΤΑ ΗΜΕΡΗΣΙΑΣ ΔΙΑΤΑΞΗΣ:**\n\n`;

    topics.forEach((topic) => {
      if (topic.title.trim()) {
        description += `### Θέμα: ${topic.title}\n`;
        if (topic.dueDate) {
          description += `Προθεσμία Ολοκλήρωσης: ${topic.dueDate}\n`;
        }
        if (topic.description.trim()) {
          description += `\nΠεριγραφή: ${topic.description}\n`;
        }
        description += '\n';
      }
    });

    description += `**Σημαντικό:** Η συμμετοχή σας είναι απαραίτητη για την λήψη αποφάσεων.\n`;

    return description;
  };

  const generateAssemblyTitle = () => {
    if (assemblyTitle.trim()) {
      return assemblyTitle;
    }

    const topicCount = topics.filter(t => t.title.trim()).length;
    return `Γενική Συνέλευση - ${topicCount} ${topicCount === 1 ? 'Θέμα' : 'Θέματα'}`;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    if (!assemblyDate || !assemblyTime) {
      toast.error('Η ημερομηνία και ώρα συνέλευσης είναι υποχρεωτικές');
      setSubmitting(false);
      return;
    }

    if (topics.filter(t => t.title.trim()).length === 0) {
      toast.error('Πρέπει να προσθέσετε τουλάχιστον ένα θέμα');
      setSubmitting(false);
      return;
    }

    try {
      const payload: CreateAnnouncementPayload = {
        title: generateAssemblyTitle(),
        description: generateAssemblyDescription(),
        start_date: assemblyDate,
        end_date: assemblyDate,
        file: undefined,
        is_active: true,
        building: selectedBuildingId || 0,
      };

      await createAnnouncement(payload);
      // ✅ Invalidate AND explicitly refetch for immediate UI update
      await queryClient.invalidateQueries({ queryKey: ['announcements'] });
      await queryClient.refetchQueries({ queryKey: ['announcements'] });

      toast.success('Η ανακοίνωση συνέλευσης δημιουργήθηκε με επιτυχία');
      router.push('/announcements');
    } catch (err) {
      const error = err as { message?: string };
      toast.error(error.message || 'Αποτυχία δημιουργίας ανακοίνωσης συνέλευσης');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Assembly Basic Info */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Στοιχεία Συνέλευσης
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="assemblyTitle" className="text-blue-800">
              Τίτλος Συνέλευσης (προαιρετικό)
            </Label>
            <Input
              id="assemblyTitle"
              value={assemblyTitle}
              onChange={(e) => setAssemblyTitle(e.target.value)}
              placeholder="Αυτόματα δημιουργείται αν αφεθεί κενό"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="assemblyDate" className="text-blue-800">
              Ημερομηνία Συνέλευσης *
            </Label>
            <Input
              id="assemblyDate"
              type="date"
              value={assemblyDate}
              onChange={(e) => setAssemblyDate(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="assemblyTime" className="text-blue-800">
              Ώρα Συνέλευσης *
            </Label>
            <Input
              id="assemblyTime"
              type="time"
              value={assemblyTime}
              onChange={(e) => setAssemblyTime(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label className="text-blue-800 mb-2 block">
              Τύπος Συνέλευσης
            </Label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="meetingType"
                  checked={!isOnline}
                  onChange={() => setIsOnline(false)}
                  className="mr-2"
                />
                <MapPin className="w-4 h-4 mr-1" />
                Προσωπική
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="meetingType"
                  checked={isOnline}
                  onChange={() => setIsOnline(true)}
                  className="mr-2"
                />
                <Video className="w-4 h-4 mr-1" />
                Διαδικτυακή
              </label>
            </div>
          </div>

          {!isOnline && (
            <div className="md:col-span-2">
              <Label htmlFor="assemblyLocation" className="text-blue-800">
                Τοποθεσία Συνέλευσης
              </Label>
              <Input
                id="assemblyLocation"
                value={assemblyLocation}
                onChange={(e) => setAssemblyLocation(e.target.value)}
                placeholder="π.χ. Αίθουσα συνεδριάσεων κτιρίου"
                className="mt-1"
              />
            </div>
          )}

          {isOnline && (
            <div className="md:col-span-2">
              <Label htmlFor="meetingLink" className="text-blue-800">
                Σύνδεσμος Zoom/Meeting
              </Label>
              <Input
                id="meetingLink"
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://zoom.us/j/..."
                className="mt-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Topics */}
      <div className="bg-green-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-green-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Θέματα Συνέλευσης
          </h3>
          <Button
            type="button"
            onClick={addTopic}
            variant="outline"
            size="sm"
            className="text-green-700 border-green-300 hover:bg-green-100"
          >
            <Plus className="w-4 h-4 mr-1" />
            Προσθήκη Θέματος
          </Button>
        </div>

        <div className="space-y-4">
          {topics.map((topic, index) => (
            <div key={topic.id} className="bg-white p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-green-800">Θέμα {index + 1}</h4>
                {topics.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeTopic(topic.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-green-800">
                    Τίτλος Θέματος *
                  </Label>
                  <Input
                    value={topic.title}
                    onChange={(e) => updateTopic(topic.id, 'title', e.target.value)}
                    placeholder="π.χ. Επισκευή Όψεων Κτιρίου"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label className="text-green-800">
                    Προθεσμία Ολοκλήρωσης
                  </Label>
                  <Input
                    type="date"
                    value={topic.dueDate}
                    onChange={(e) => updateTopic(topic.id, 'dueDate', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-green-800">
                    Περιγραφή
                  </Label>
                  <Textarea
                    value={topic.description}
                    onChange={(e) => updateTopic(topic.id, 'description', e.target.value)}
                    placeholder="Αναλυτική περιγραφή του θέματος..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Building Selection */}
      {buildings && buildings.length > 1 && (
        <div>
          <Label htmlFor="building">Κτίριο</Label>
          <Select
            value={selectedBuildingId?.toString() || '0'}
            onValueChange={(value) => setSelectedBuildingId(value === '0' ? null : parseInt(value))}
          >
            <SelectTrigger id="building" className="mt-1">
              <SelectValue placeholder="Επιλέξτε κτίριο" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Όλα τα κτίρια</SelectItem>
              {buildings.map((building) => (
                <SelectItem key={building.id} value={building.id.toString()}>
                  {building.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
        >
          {submitting ? 'Δημιουργία...' : 'Δημιουργία Συνέλευσης'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/announcements')}
          className="px-6 py-2"
        >
          Ακύρωση
        </Button>
      </div>
    </form>
  );
}
