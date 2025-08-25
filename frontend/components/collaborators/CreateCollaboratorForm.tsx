'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';

interface CreateCollaboratorFormProps {
  onCollaboratorCreated: () => void;
}

const COLLABORATOR_TYPES = [
  { value: 'consultant', label: 'Σύμβουλος' },
  { value: 'contractor', label: 'Ανάδοχος' },
  { value: 'freelancer', label: 'Ελεύθερος Επαγγελματίας' },
  { value: 'agency', label: 'Γραφείο' },
  { value: 'specialist', label: 'Ειδικός' },
  { value: 'other', label: 'Άλλο' },
];

const AVAILABILITY_CHOICES = [
  { value: 'available', label: 'Διαθέσιμος' },
  { value: 'busy', label: 'Απασχολημένος' },
  { value: 'part_time', label: 'Μερικής Απασχόλησης' },
  { value: 'unavailable', label: 'Μη Διαθέσιμος' },
];

const STATUS_CHOICES = [
  { value: 'active', label: 'Ενεργός' },
  { value: 'inactive', label: 'Ανενεργός' },
  { value: 'suspended', label: 'Ανασταλμένος' },
];

export default function CreateCollaboratorForm({ onCollaboratorCreated }: CreateCollaboratorFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    collaborator_type: '',
    contact_person: '',
    phone: '',
    email: '',
    hourly_rate: 0,
    availability: 'available',
    status: 'active',
    expertise_areas: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/collaborators/collaborators/', {
        ...formData,
        expertise_areas: formData.expertise_areas.split(',').map(area => area.trim()).filter(area => area),
        hourly_rate: parseFloat(formData.hourly_rate.toString()),
      });
      
      setFormData({
        name: '',
        collaborator_type: '',
        contact_person: '',
        phone: '',
        email: '',
        hourly_rate: 0,
        availability: 'available',
        status: 'active',
        expertise_areas: '',
      });
      setOpen(false);
      onCollaboratorCreated();
    } catch (error) {
      console.error('Error creating collaborator:', error);
      alert('Σφάλμα κατά τη δημιουργία συνεργάτη');
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
          Νέος Συνεργάτης
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Δημιουργία Νέου Συνεργάτη</DialogTitle>
          <DialogDescription>
            Συμπληρώστε τα στοιχεία για τον νέο συνεργάτη.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Όνομα/Επωνυμία *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="π.χ. Τεχνικό Γραφείο ΑΒΓ"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="collaborator_type">Τύπος Συνεργάτη *</Label>
            <Select
              value={formData.collaborator_type}
              onValueChange={(value) => handleInputChange('collaborator_type', value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε τύπο συνεργάτη" />
              </SelectTrigger>
              <SelectContent>
                {COLLABORATOR_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_person">Επικοινωνία *</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => handleInputChange('contact_person', e.target.value)}
                placeholder="Όνομα επικοινωνίας"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Τηλέφωνο *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="2101234567"
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="example@email.com"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hourly_rate">Ωριαίος Ταρίφος (€)</Label>
              <Input
                id="hourly_rate"
                type="number"
                min="0"
                max="999999.99"
                step="0.01"
                value={formData.hourly_rate ? Number(formData.hourly_rate).toFixed(2) : ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    // Limit to 2 decimal places
                    const roundedValue = Math.round(value * 100) / 100;
                    handleInputChange('hourly_rate', roundedValue);
                  } else {
                    handleInputChange('hourly_rate', 0);
                  }
                }}
                placeholder="25.00"
              />
            </div>
            <div>
              <Label htmlFor="availability">Διαθεσιμότητα</Label>
              <Select
                value={formData.availability}
                onValueChange={(value) => handleInputChange('availability', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABILITY_CHOICES.map((availability) => (
                    <SelectItem key={availability.value} value={availability.value}>
                      {availability.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="expertise_areas">Πεδία Εξειδίκευσης</Label>
            <Textarea
              id="expertise_areas"
              value={formData.expertise_areas}
              onChange={(e) => handleInputChange('expertise_areas', e.target.value)}
              placeholder="π.χ. Ηλεκτρολογικά, Υδραυλικά, Κλιματισμός (διαχωρισμένα με κόμμα)"
              rows={2}
            />
          </div>
          
          <div>
            <Label htmlFor="status">Κατάσταση</Label>
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
              {loading ? 'Δημιουργία...' : 'Δημιουργία Συνεργάτη'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 