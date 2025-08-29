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
import { Plus, Users, Calendar, CheckCircle, Clock, AlertCircle, Star, Euro } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { 
  fetchCollaborators, 
  fetchCollaborationProjects, 
  fetchCollaborationContracts, 
  fetchCollaborationInvoices,
  type Collaborator, 
  type CollaborationProject, 
  type CollaborationContract, 
  type CollaborationInvoice 
} from '@/lib/api';
import CreateCollaboratorForm from '@/components/collaborators/CreateCollaboratorForm';



export default function CollaboratorsPage() {
  const { selectedBuilding } = useBuilding();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [projects, setProjects] = useState<CollaborationProject[]>([]);
  const [contracts, setContracts] = useState<CollaborationContract[]>([]);
  const [invoices, setInvoices] = useState<CollaborationInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (selectedBuilding) {
      loadCollaborators();
      fetchProjects();
      fetchContracts();
      fetchInvoices();
    }
  }, [selectedBuilding]);

  const loadCollaborators = async () => {
    try {
      const data = await fetchCollaborators();
      setCollaborators(data);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await fetchCollaborationProjects(selectedBuilding?.id);
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchContracts = async () => {
    try {
      const data = await fetchCollaborationContracts(selectedBuilding?.id);
      setContracts(data);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const data = await fetchCollaborationInvoices();
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
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

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'planning': return 'bg-yellow-100 text-yellow-800';
      case 'on_hold': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredCollaborators = collaborators.filter(collaborator =>
    collaborator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    collaborator.collaborator_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    collaborator.contact_person.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.collaborator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.project_type.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold tracking-tight">Διαχείριση Συνεργατών</h1>
          <p className="text-muted-foreground">
            Διαχείριση εξωτερικών συνεργατών και έργων
          </p>
        </div>
        <CreateCollaboratorForm onCollaboratorCreated={() => {
          loadCollaborators();
          fetchProjects();
          fetchContracts();
          fetchInvoices();
        }} />
      </div>

      <div className="flex items-center space-x-2">
        <Input
          placeholder="Αναζήτηση συνεργατών..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Επισκόπηση</TabsTrigger>
          <TabsTrigger value="collaborators">Συνεργάτες</TabsTrigger>
          <TabsTrigger value="projects">Έργα</TabsTrigger>
          <TabsTrigger value="contracts">Συμβόλαια</TabsTrigger>
          <TabsTrigger value="invoices">Τιμολόγια</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Συνεργάτες</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{collaborators.length}</div>
                <p className="text-xs text-muted-foreground">
                  {collaborators.filter(c => c.status === 'active').length} ενεργοί
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ενεργά Έργα</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projects.filter(p => p.status === 'active').length}</div>
                <p className="text-xs text-muted-foreground">
                  {projects.length} συνολικά
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ενεργά Συμβόλαια</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contracts.filter(c => c.is_active).length}</div>
                <p className="text-xs text-muted-foreground">
                  {contracts.length} συνολικά
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Εκκρεμεί Τιμολόγια</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  €{invoices.filter(i => i.status === 'sent' || i.status === 'overdue')
                    .reduce((acc, inv) => acc + (inv.total_amount || 0), 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length} τιμολόγια
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ενεργά Έργα</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projects.filter(p => p.status === 'active').slice(0, 5).map((project) => (
                    <div key={project.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{project.title}</p>
                        <p className="text-sm text-muted-foreground">{project.collaborator_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={project.progress_percentage} className="w-20" />
                        <span className="text-sm">{project.progress_percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Καλύτεροι Συνεργάτες</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {collaborators
                    .filter(c => c.rating >= 4)
                    .sort((a, b) => b.rating - a.rating)
                    .slice(0, 5)
                    .map((collaborator) => (
                      <div key={collaborator.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{collaborator.name}</p>
                          <p className="text-sm text-muted-foreground">{collaborator.collaborator_type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex">{getRatingStars(collaborator.rating)}</div>
                          <Badge className={getAvailabilityColor(collaborator.availability)}>
                            {collaborator.availability}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="collaborators" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Συνεργάτες</CardTitle>
              <CardDescription>
                Λίστα όλων των εξωτερικών συνεργατών
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Όνομα</TableHead>
                    <TableHead>Τύπος</TableHead>
                    <TableHead>Επικοινωνία</TableHead>
                    <TableHead>Αξιολόγηση</TableHead>
                    <TableHead>Διαθεσιμότητα</TableHead>
                    <TableHead>Ωριαίος Ταρίφ</TableHead>
                    <TableHead>Ενέργειες</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCollaborators.map((collaborator) => (
                    <TableRow key={collaborator.id}>
                      <TableCell className="font-medium">{collaborator.name}</TableCell>
                      <TableCell>{collaborator.collaborator_type}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{collaborator.contact_person}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">{collaborator.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex">{getRatingStars(collaborator.rating)}</div>
                          <span className="text-sm">({collaborator.rating})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getAvailabilityColor(collaborator.availability)}>
                          {collaborator.availability}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {collaborator.hourly_rate ? `€${collaborator.hourly_rate}/ώρα` : '-'}
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

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Έργα Συνεργασίας</CardTitle>
              <CardDescription>
                Λίστα όλων των έργων συνεργασίας
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Τίτλος</TableHead>
                    <TableHead>Συνεργάτης</TableHead>
                    <TableHead>Τύπος</TableHead>
                    <TableHead>Πρόοδος</TableHead>
                    <TableHead>Προϋπολογισμός</TableHead>
                    <TableHead>Κατάσταση</TableHead>
                    <TableHead>Ενέργειες</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.title}</TableCell>
                      <TableCell>{project.collaborator_name}</TableCell>
                      <TableCell>{project.project_type}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={project.progress_percentage} className="w-20" />
                          <span className="text-sm">{project.progress_percentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {project.budget ? `€${project.budget.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getProjectStatusColor(project.status)}>
                          {project.status}
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

        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Συμβόλαια Συνεργασίας</CardTitle>
              <CardDescription>
                Λίστα όλων των συμβολαίων συνεργασίας
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Αριθμός</TableHead>
                    <TableHead>Τίτλος</TableHead>
                    <TableHead>Συνεργάτης</TableHead>
                    <TableHead>Τύπος</TableHead>
                    <TableHead>Αξία</TableHead>
                    <TableHead>Κατάσταση</TableHead>
                    <TableHead>Ενέργειες</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">{contract.contract_number}</TableCell>
                      <TableCell>{contract.title}</TableCell>
                      <TableCell>{contract.collaborator_name}</TableCell>
                      <TableCell>{contract.contract_type}</TableCell>
                      <TableCell>€{contract.total_value?.toLocaleString() || '0'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(contract.status)}>
                            {contract.status}
                          </Badge>
                          {contract.is_active && (
                            <Badge className="bg-green-100 text-green-800">
                              Ενεργό
                            </Badge>
                          )}
                        </div>
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

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Τιμολόγια Συνεργασίας</CardTitle>
              <CardDescription>
                Λίστα όλων των τιμολογίων συνεργασίας
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Αριθμός</TableHead>
                    <TableHead>Συνεργάτης</TableHead>
                    <TableHead>Συμβόλαιο</TableHead>
                    <TableHead>Ημερομηνία Έκδοσης</TableHead>
                    <TableHead>Ημερομηνία Λήξης</TableHead>
                    <TableHead>Ποσό</TableHead>
                    <TableHead>Κατάσταση</TableHead>
                    <TableHead>Ενέργειες</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.collaborator_name}</TableCell>
                      <TableCell>{invoice.contract_number}</TableCell>
                      <TableCell>{new Date(invoice.issue_date).toLocaleDateString('el-GR')}</TableCell>
                      <TableCell>{new Date(invoice.due_date).toLocaleDateString('el-GR')}</TableCell>
                      <TableCell>€{invoice.total_amount?.toLocaleString() || '0'}</TableCell>
                      <TableCell>
                        <Badge className={getInvoiceStatusColor(invoice.status)}>
                          {invoice.status}
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