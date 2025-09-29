'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { api } from '@/lib/api';
import { typography } from '@/lib/typography';

interface CreateTeamFormProps {
  onTeamCreated: () => void;
}

const TEAM_TYPES = [
  { value: 'maintenance', label: 'Συντήρηση' },
  { value: 'cleaning', label: 'Καθαρισμός' },
  { value: 'security', label: 'Ασφάλεια' },
  { value: 'management', label: 'Διαχείριση' },
  { value: 'technical', label: 'Τεχνική Υποστήριξη' },
  { value: 'other', label: 'Άλλο' },
];

const STATUS_CHOICES = [
  { value: 'active', label: 'Ενεργή' },
  { value: 'inactive', label: 'Ανενεργή' },
  { value: 'suspended', label: 'Ανασταλμένη' },
];

export default function CreateTeamForm({ onTeamCreated }: CreateTeamFormProps) {
  const { selectedBuilding } = useBuilding();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    team_type: '',
    description: '',
    max_members: 10,
    status: 'active',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuilding) {
      alert('Παρακαλώ επιλέξτε κτίριο');
      return;
    }

    setLoading(true);
    try {
      await api.post('/teams/teams/', {
        ...formData,
        building: selectedBuilding.id,
      });
      
      setFormData({
        name: '',
        team_type: '',
        description: '',
        max_members: 10,
        status: 'active',
      });
      setOpen(false);
      onTeamCreated();
    } catch (error) {
      console.error('Error creating team:', error);
      alert('Σφάλμα κατά τη δημιουργία ομάδας');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Νέα Ομάδα
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Δημιουργία Νέας Ομάδας</DialogTitle>
          <DialogDescription>
            Συμπληρώστε τα στοιχεία για τη νέα ομάδα.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className={typography.formLabel}>Όνομα Ομάδας *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="π.χ. Ομάδα Συντήρησης"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="team_type" className={typography.formLabel}>Τύπος Ομάδας *</Label>
            <Select
              value={formData.team_type}
              onValueChange={(value) => handleInputChange('team_type', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε τύπο ομάδας" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="description" className={typography.formLabel}>Περιγραφή</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Σύντομη περιγραφή της ομάδας..."
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="max_members" className={typography.formLabel}>Μέγιστος Αριθμός Μελών</Label>
            <Input
              id="max_members"
              type="number"
              min="1"
              max="50"
              value={formData.max_members}
              onChange={(e) => handleInputChange('max_members', parseInt(e.target.value))}
            />
          </div>
          
          <div>
            <Label htmlFor="status" className={typography.formLabel}>Κατάσταση</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_CHOICES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Ακύρωση
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Δημιουργία...' : 'Δημιουργία Ομάδας'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 