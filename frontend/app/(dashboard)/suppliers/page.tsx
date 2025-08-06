'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Plus, Building2, Phone, Mail, Star, AlertCircle, CheckCircle } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { fetchSuppliers, fetchContractors, type Supplier, type Contractor } from '@/lib/api';



export default function SuppliersPage() {
  const { selectedBuilding } = useBuilding();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (selectedBuilding) {
      loadSuppliers();
      loadContractors();
    }
  }, [selectedBuilding]);

  const loadSuppliers = async () => {
    try {
      const data = await fetchSuppliers(selectedBuilding?.id);
      setSuppliers(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const loadContractors = async () => {
    try {
      const data = await fetchContractors();
      setContractors(data);
    } catch (error) {
      console.error('Error fetching contractors:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'unavailable': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRatingStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
        />
      );
    }
    return stars;
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredContractors = contractors.filter(contractor =>
    contractor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractor.service_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractor.contact_person.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Διαχείριση Προμηθευτών</h1>
          <p className="text-muted-foreground">
            Διαχείριση προμηθευτών και συνεργείων
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Νέος Προμηθευτής
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Προσθήκη Νέου Προμηθευτή</DialogTitle>
                <DialogDescription>
                  Προσθέστε έναν νέο προμηθευτή στο σύστημα
                </DialogDescription>
              </DialogHeader>
              {/* Form will be added here */}
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Νέο Συνεργείο
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Προσθήκη Νέου Συνεργείου</DialogTitle>
                <DialogDescription>
                  Προσθέστε ένα νέο συνεργείο στο σύστημα
                </DialogDescription>
              </DialogHeader>
              {/* Form will be added here */}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Input
          placeholder="Αναζήτηση προμηθευτών..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Επισκόπηση</TabsTrigger>
          <TabsTrigger value="suppliers">Προμηθευτές</TabsTrigger>
          <TabsTrigger value="contractors">Συνεργεία</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Συνολικοί Προμηθευτές</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{suppliers.length}</div>
                <p className="text-xs text-muted-foreground">
                  {suppliers.filter(s => s.status === 'active').length} ενεργοί
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Συνεργεία</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contractors.length}</div>
                <p className="text-xs text-muted-foreground">
                  {contractors.filter(c => c.status === 'active').length} ενεργά
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Μέση Αξιολόγηση</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {suppliers.length > 0 
                    ? (suppliers.reduce((acc, s) => acc + s.rating, 0) / suppliers.length).toFixed(1)
                    : '0.0'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Από 5 αστέρια
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Επείγοντα</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {suppliers.filter(s => s.emergency_contact).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Με επείγουσα επικοινωνία
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Καλύτεροι Προμηθευτές</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {suppliers
                    .filter(s => s.rating >= 4)
                    .sort((a, b) => b.rating - a.rating)
                    .slice(0, 5)
                    .map((supplier) => (
                      <div key={supplier.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{supplier.name}</p>
                          <p className="text-sm text-muted-foreground">{supplier.category}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex">{getRatingStars(supplier.rating)}</div>
                          <Badge className={getStatusColor(supplier.status)}>
                            {supplier.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Διαθέσιμα Συνεργεία</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contractors
                    .filter(c => c.availability === 'available')
                    .slice(0, 5)
                    .map((contractor) => (
                      <div key={contractor.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{contractor.name}</p>
                          <p className="text-sm text-muted-foreground">{contractor.service_type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex">{getRatingStars(contractor.rating)}</div>
                          <Badge className={getAvailabilityColor(contractor.availability)}>
                            {contractor.availability}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Προμηθευτές</CardTitle>
              <CardDescription>
                Λίστα όλων των προμηθευτών
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Όνομα</TableHead>
                    <TableHead>Κατηγορία</TableHead>
                    <TableHead>Επικοινωνία</TableHead>
                    <TableHead>Αξιολόγηση</TableHead>
                    <TableHead>Κατάσταση</TableHead>
                    <TableHead>Ενέργειες</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.category}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{supplier.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span className="text-sm text-muted-foreground">{supplier.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex">{getRatingStars(supplier.rating)}</div>
                          <span className="text-sm">({supplier.rating})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(supplier.status)}>
                          {supplier.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Προβολή
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contractors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Συνεργεία</CardTitle>
              <CardDescription>
                Λίστα όλων των συνεργείων
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Όνομα</TableHead>
                    <TableHead>Τύπος Υπηρεσίας</TableHead>
                    <TableHead>Επικοινωνία</TableHead>
                    <TableHead>Αξιολόγηση</TableHead>
                    <TableHead>Διαθεσιμότητα</TableHead>
                    <TableHead>Ενέργειες</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContractors.map((contractor) => (
                    <TableRow key={contractor.id}>
                      <TableCell className="font-medium">{contractor.name}</TableCell>
                      <TableCell>{contractor.service_type}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{contractor.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span className="text-sm text-muted-foreground">{contractor.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex">{getRatingStars(contractor.rating)}</div>
                          <span className="text-sm">({contractor.rating})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getAvailabilityColor(contractor.availability)}>
                          {contractor.availability}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Προβολή
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 