'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useCreateEvent } from '@/hooks/useEvents';
import { toast } from '@/hooks/use-toast';

interface EventFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const EVENT_TYPES = [
  { value: 'call', label: 'Τηλεφωνική κλήση', icon: '📞' },
  { value: 'notification', label: 'Ομαδική ειδοποίηση', icon: '📢' },
  { value: 'payment_delay', label: 'Καθυστέρηση πληρωμής', icon: '💳' },
  { value: 'maintenance', label: 'Συντήρηση', icon: '🔧' },
  { value: 'project', label: 'Έργο', icon: '🏗️' },
  { value: 'urgent', label: 'Επείγον', icon: '⚡' },
  { value: 'meeting', label: 'Συνάντηση', icon: '👥' },
  { value: 'inspection', label: 'Επιθεώρηση', icon: '🔍' },
  { value: 'reminder', label: 'Υπενθύμιση', icon: '⏰' }
];

const PRIORITIES = [
  { value: 'low', label: 'Χαμηλή', color: 'text-gray-600' },
  { value: 'medium', label: 'Μέση', color: 'text-yellow-600' },
  { value: 'high', label: 'Υψηλή', color: 'text-orange-600' },
  { value: 'urgent', label: 'Επείγουσα', color: 'text-red-600' }
];

export default function EventForm({ onSuccess, onCancel }: EventFormProps) {
  const { selectedBuilding } = useBuilding();
  const createEventMutation = useCreateEvent();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'reminder',
    priority: 'medium',
    scheduled_date: '',
    due_date: '',
    contact_phone: '',
    contact_email: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBuilding) {
      toast({
        title: 'Σφάλμα',
        description: 'Παρακαλώ επιλέξτε κτίριο',
        variant: 'destructive'
      });
      return;
    }

    try {
      const eventData = {
        ...formData,
        building_id: selectedBuilding.id,
        scheduled_date: formData.scheduled_date ? new Date(formData.scheduled_date).toISOString() : undefined,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined
      };

      await createEventMutation.mutateAsync(eventData);
      
      toast({
        title: 'Επιτυχία',
        description: 'Το συμβάν δημιουργήθηκε επιτυχώς'
      });
      
      onSuccess();
    } catch (error) {
      toast({
        title: 'Σφάλμα',
        description: 'Παρουσιάστηκε σφάλμα κατά τη δημιουργία του συμβάντος',
        variant: 'destructive'
      });
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Τίτλος *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="π.χ. Τηλεφωνική επικοινωνία με ενοικιαστή"
          />
        </div>

        {/* Event Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Τύπος Συμβάντος
          </label>
          <div className="grid grid-cols-3 gap-2">
            {EVENT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleChange('event_type', type.value)}
                className={`p-2 text-xs border rounded-md text-center transition-colors
                          ${formData.event_type === type.value
                            ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
              >
                <div className="text-lg mb-1">{type.icon}</div>
                <div>{type.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Προτεραιότητα
          </label>
          <div className="flex gap-2">
            {PRIORITIES.map((priority) => (
              <button
                key={priority.value}
                type="button"
                onClick={() => handleChange('priority', priority.value)}
                className={`px-3 py-2 text-sm border rounded-md transition-colors
                          ${formData.priority === priority.value
                            ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : `bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 ${priority.color} hover:bg-gray-50 dark:hover:bg-gray-700`
                          }`}
              >
                {priority.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Προγραμματισμένη Ημερομηνία
            </label>
            <input
              type="datetime-local"
              value={formData.scheduled_date}
              onChange={(e) => handleChange('scheduled_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ημερομηνία Λήξης
            </label>
            <input
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => handleChange('due_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Τηλέφωνο Επικοινωνίας
            </label>
            <input
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => handleChange('contact_phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="π.χ. 210 1234567"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Επικοινωνίας
            </label>
            <input
              type="email"
              value={formData.contact_email}
              onChange={(e) => handleChange('contact_email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="π.χ. tenant@example.com"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Περιγραφή
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Λεπτομέρειες του συμβάντος..."
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Σημειώσεις
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Εσωτερικές σημειώσεις..."
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={createEventMutation.isPending}
            className="flex-1"
          >
            {createEventMutation.isPending ? 'Δημιουργία...' : 'Δημιουργία'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={createEventMutation.isPending}
          >
            Ακύρωση
          </Button>
        </div>
      </div>
    </form>
  );
}