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
import { Plus, Users, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { fetchTeams, fetchTeamMembers, fetchTeamTasks, type Team, type TeamMember, type TeamTask } from '@/lib/api';
import CreateTeamForm from '@/components/teams/CreateTeamForm';
import EditTeamForm from '@/components/teams/EditTeamForm';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';

function TeamsPageContent() {
  const { selectedBuilding } = useBuilding();
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (selectedBuilding) {
      loadTeams();
      fetchMembers();
      fetchTasks();
    }
  }, [selectedBuilding]);

  const loadTeams = async () => {
    try {
      const data = await fetchTeams(selectedBuilding?.id);
      setTeams(data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const data = await fetchTeamMembers(selectedBuilding?.id);
      setMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const data = await fetchTeamTasks(selectedBuilding?.id);
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Διαχείριση Ομάδων</h1>
          <p className="text-muted-foreground">
            Διαχείριση ομάδων εργασίας και συνεργατών
          </p>
        </div>
        <CreateTeamForm onTeamCreated={() => {
          loadTeams();
          fetchMembers();
          fetchTasks();
        }} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Επισκόπηση</TabsTrigger>
          <TabsTrigger value="teams">Ομάδες</TabsTrigger>
          <TabsTrigger value="members">Μέλη</TabsTrigger>
          <TabsTrigger value="tasks">Εργασίες</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Συνολικές Ομάδες</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teams.length}</div>
                <p className="text-xs text-muted-foreground">
                  {teams.filter(t => t.status === 'active').length} ενεργές
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Συνολικά Μέλη</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{members.length}</div>
                <p className="text-xs text-muted-foreground">
                  {members.filter(m => m.status === 'active').length} ενεργά
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Εργασίες</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tasks.length}</div>
                <p className="text-xs text-muted-foreground">
                  {tasks.filter(t => t.status === 'completed').length} ολοκληρωμένες
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Πρόοδος</CardTitle>
                <Progress className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Συνολική πρόοδος
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Πρόσφατες Ομάδες</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teams.slice(0, 5).map((team) => (
                    <div key={team.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{team.name}</p>
                        <p className="text-sm text-muted-foreground">{team.team_type}</p>
                      </div>
                      <Badge className={getStatusColor(team.status)}>
                        {team.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Επείγουσες Εργασίες</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground">{task.assigned_to_name}</p>
                      </div>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ομάδες</CardTitle>
              <CardDescription>
                Λίστα όλων των ομάδων εργασίας
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Όνομα</TableHead>
                    <TableHead>Τύπος</TableHead>
                    <TableHead>Ηγέτης</TableHead>
                    <TableHead>Μέλη</TableHead>
                    <TableHead>Κατάσταση</TableHead>
                    <TableHead>Ενέργειες</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell>{team.team_type}</TableCell>
                      <TableCell>{team.leader_name}</TableCell>
                      <TableCell>
                        {team.member_count}/{team.max_members}
                        {team.is_full && <Badge className="ml-2 bg-red-100 text-red-800">Γεμάτη</Badge>}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(team.status)}>
                          {team.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <EditTeamForm 
                            team={team} 
                            onTeamUpdated={() => {
                              fetchTeams();
                              fetchMembers();
                              fetchTasks();
                            }} 
                          />
                          <Button variant="outline" size="sm">
                            Προβολή
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Μέλη Ομάδων</CardTitle>
              <CardDescription>
                Λίστα όλων των μελών των ομάδων
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Όνομα</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ρόλος</TableHead>
                    <TableHead>Κατάσταση</TableHead>
                    <TableHead>Ημερομηνία Ένταξης</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.user_name}</TableCell>
                      <TableCell>{member.user_email}</TableCell>
                      <TableCell>{member.role_name}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(member.status)}>
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(member.joined_at).toLocaleDateString('el-GR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Εργασίες Ομάδων</CardTitle>
              <CardDescription>
                Λίστα όλων των εργασιών των ομάδων
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Τίτλος</TableHead>
                    <TableHead>Ανατέθηκε σε</TableHead>
                    <TableHead>Προτεραιότητα</TableHead>
                    <TableHead>Κατάσταση</TableHead>
                    <TableHead>Ημερομηνία Λήξης</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>{task.assigned_to_name}</TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTaskStatusIcon(task.status)}
                          <span>{task.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.due_date ? new Date(task.due_date).toLocaleDateString('el-GR') : '-'}
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

export default function TeamsPage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <TeamsPageContent />
      </SubscriptionGate>
    </AuthGate>
  );
} 