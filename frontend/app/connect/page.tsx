'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle, Building, User, Mail, Phone, Home } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { fetchResidentsForQR, updateResidentEmail } from '@/lib/api';

interface Resident {
  id: string;
  apartment_id: number;
  apartment_number: string;
  name: string;
  phone: string;
  email: string;
  type: 'owner' | 'tenant';
  is_rented: boolean;
  has_email: boolean;
}

interface Building {
  id: number;
  name: string;
  address: string;
}

interface ResidentsResponse {
  building: Building;
  residents: Resident[];
  total_residents: number;
}

export default function ConnectPage() {
  const searchParams = useSearchParams();
  const buildingId = searchParams.get('building');
  
  const [building, setBuilding] = useState<Building | null>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (buildingId) {
      loadResidents();
    } else {
      setIsLoading(false);
    }
  }, [buildingId]);

  const loadResidents = async () => {
    try {
      setIsLoading(true);
      const data = await fetchResidentsForQR(parseInt(buildingId || '0'));
      setBuilding(data.building);
      setResidents(data.residents);
    } catch (error) {
      console.error('Error loading residents:', error);
      toast.error('Σφάλμα κατά τη φόρτωση των ενοικιαστών');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResidentSelect = (resident: Resident) => {
    setSelectedResident(resident);
    setEmail(resident.email || '');
  };

  const handleConnect = async () => {
    if (!selectedResident || !email.trim()) {
      toast.error('Παρακαλώ επιλέξτε ενοικιαστή και εισάγετε email');
      return;
    }

    try {
      setIsConnecting(true);
      
      // Ενημέρωση email
      await updateResidentEmail(selectedResident.apartment_id, selectedResident.type, email.trim());

      toast.success('Συνδέθηκετε επιτυχώς!');
      setIsConnected(true);
      
      // Ενημέρωση της λίστας
      setResidents(prev => prev.map(r => 
        r.id === selectedResident.id 
          ? { ...r, email: email.trim(), has_email: true }
          : r
      ));
      
    } catch (error) {
      console.error('Error connecting:', error);
      toast.error('Σφάλμα κατά τη σύνδεση');
    } finally {
      setIsConnecting(false);
    }
  };

  const getResidentTypeLabel = (type: string) => {
    return type === 'owner' ? 'Ιδιοκτήτης' : 'Ενοικιαστής';
  };

  const getResidentTypeColor = (type: string) => {
    return type === 'owner' ? 'bg-blue-500' : 'bg-green-500';
  };

  if (!buildingId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Μη έγκυρο QR Code</h2>
            <p className="text-gray-600">
              Το QR code δεν περιέχει έγκυρες πληροφορίες κτιρίου.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Φόρτωση ενοικιαστών...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Συνδέθηκετε Επιτυχώς!</h2>
            <p className="text-gray-600 mb-4">
              Καλώς ήρθατε στο σύστημα διαχείρισης του κτιρίου.
            </p>
            <div className="bg-green-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-green-700">
                <strong>{selectedResident?.name}</strong><br />
                Διαμέρισμα {selectedResident?.apartment_number}<br />
                Email: {email}
              </p>
            </div>
            <Button 
              onClick={() => window.close()} 
              className="w-full"
            >
              Κλείσιμο
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Building className="h-6 w-6" />
              Σύνδεση με το Κτίριο
            </CardTitle>
            {building && (
              <div className="text-gray-600">
                <p className="font-medium">{building.name}</p>
                <p className="text-sm">{building.address}</p>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Residents List */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Επιλέξτε το όνομά σας
            </CardTitle>
            <p className="text-sm text-gray-600">
              Βρείτε το όνομά σας στη λίστα και κάντε κλικ για να συνδεθείτε
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {residents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Δεν βρέθηκαν εγγεγραμμένοι ενοικιαστές</p>
                </div>
              ) : (
                residents.map((resident) => (
                  <div
                    key={resident.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedResident?.id === resident.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleResidentSelect(resident)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {resident.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{resident.name}</h3>
                          <Badge className={`text-xs ${getResidentTypeColor(resident.type)}`}>
                            {getResidentTypeLabel(resident.type)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Home className="h-3 w-3 mr-1" />
                            {resident.apartment_number}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          {resident.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {resident.phone}
                            </div>
                          )}
                          {resident.has_email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {resident.email}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {selectedResident?.id === resident.id && (
                        <CheckCircle className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email Form */}
        {selectedResident && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Ενημέρωση Email
              </CardTitle>
              <p className="text-sm text-gray-600">
                Εισάγετε ή ενημερώστε το email σας για να λάβετε ειδοποιήσεις
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full"
                  />
                </div>
                
                <Button
                  onClick={handleConnect}
                  disabled={!email.trim() || isConnecting}
                  className="w-full"
                >
                  {isConnecting ? 'Σύνδεση...' : 'Σύνδεση'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 