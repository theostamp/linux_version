'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { MeterReading, MeterType } from '../../types/financial';
import { useMeterReadings } from '../../hooks/useMeterReadings';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '../ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { 
  Edit, 
  Trash2, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  TrendingUp,
  Calendar,
  Thermometer,
  Droplets,
  Zap,
  FileSpreadsheet
} from 'lucide-react';
import { format } from 'date-fns';
// import { el } from 'date-fns/locale/el';
import { MeterReadingForm } from './MeterReadingForm';
import { MeterReadingDatasheet } from './MeterReadingDatasheet';
import { getCurrentMonthRange } from '@/lib/dateUtils';

interface MeterReadingListProps {
  buildingId: number;
  selectedMonth?: string; // Add selectedMonth prop
}

export const MeterReadingList: React.FC<MeterReadingListProps> = ({ buildingId, selectedMonth }) => {
  const [showForm, setShowForm] = useState(false);
  const [showDatasheet, setShowDatasheet] = useState(false);
  const [editingReading, setEditingReading] = useState<MeterReading | null>(null);
  const [filters, setFilters] = useState({
    meter_type: '',
    date_from: '',
    date_to: '',
    apartment_id: '',
  });
  const [meterTypes, setMeterTypes] = useState<Array<{value: string, label: string}>>([]);

  const {
    readings,
    loading,
    error,
    statistics,
    fetchReadings,
    deleteReading,
    fetchMeterTypes,
  } = useMeterReadings(buildingId);

  // Λήψη τύπων μετρητών
  useEffect(() => {
    const loadMeterTypes = async () => {
      const types = await fetchMeterTypes();
      setMeterTypes(types);
    };
    loadMeterTypes();
  }, [fetchMeterTypes]);

  // Εφαρμογή φίλτρων
  useEffect(() => {
    const applyFilters = async () => {
      const filterParams: any = {};
      if (filters.meter_type) filterParams.meter_type = filters.meter_type;
      if (filters.date_from) filterParams.date_from = filters.date_from;
      if (filters.date_to) filterParams.date_to = filters.date_to;
      if (filters.apartment_id) filterParams.apartment_id = parseInt(filters.apartment_id);

      await fetchReadings(filterParams);
    };

    applyFilters();
  }, [filters, fetchReadings]);

  const handleDelete = async (reading: MeterReading) => {
    if (window.confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή τη μετρήση;')) {
      const success = await deleteReading(reading.id);
      if (success) {
        toast.success('Η μετρήση διαγράφηκε επιτυχώς');
      }
    }
  };

  const handleEdit = (reading: MeterReading) => {
    setEditingReading(reading);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingReading(null);
    fetchReadings();
  };

  const handleDatasheetSuccess = () => {
    setShowDatasheet(false);
    fetchReadings();
  };

  const handleDatasheetCancel = () => {
    setShowDatasheet(false);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingReading(null);
  };

  const getMeterTypeIcon = (meterType: string) => {
    switch (meterType) {
      case MeterType.HEATING:
        return <Thermometer className="h-4 w-4" />;
      case MeterType.WATER:
        return <Droplets className="h-4 w-4" />;
      case MeterType.ELECTRICITY:
        return <Zap className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getMeterTypeColor = (meterType: string) => {
    switch (meterType) {
      case MeterType.HEATING:
        return 'bg-orange-100 text-orange-800';
      case MeterType.WATER:
        return 'bg-blue-100 text-blue-800';
      case MeterType.ELECTRICITY:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const clearFilters = () => {
    setFilters({
      meter_type: '',
      date_from: '',
      date_to: '',
      apartment_id: '',
    });
  };

  const setCurrentMonthFilter = () => {
    const range = getCurrentMonthRange();
    setFilters(prev => ({
      ...prev,
      date_from: range.from,
      date_to: range.to
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header με στατιστικά */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Συνολικές Μετρήσεις</p>
                  <p className="text-2xl font-bold">{statistics.total_readings}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Διαμερίσματα με Μετρήσεις</p>
                  <p className="text-2xl font-bold">{statistics.apartments_with_readings}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Thermometer className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Συνολική Κατανάλωση</p>
                  <p className="text-2xl font-bold">{statistics.total_consumption?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Plus className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Νέες Μετρήσεις</p>
                    <p className="text-xs text-gray-500">Επιλέξτε τρόπο εισαγωγής</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* Single Reading Form */}
                  <Dialog open={showForm} onOpenChange={setShowForm}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-3 w-3 mr-1" />
                        Μονή
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Νέα Μετρήση</DialogTitle>
                        <DialogDescription>
                          Εισαγωγή μετρήσης για ένα διαμέρισμα
                        </DialogDescription>
                      </DialogHeader>
                      <MeterReadingForm
                        buildingId={buildingId}
                        onSuccess={handleFormSuccess}
                        onCancel={handleFormCancel}
                      />
                    </DialogContent>
                  </Dialog>

                  {/* Datasheet Form */}
                  <Dialog open={showDatasheet} onOpenChange={setShowDatasheet}>
                    <DialogTrigger asChild>
                      <Button variant="default" size="sm">
                        <FileSpreadsheet className="h-3 w-3 mr-1" />
                        Φύλλο
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Φύλλο Μετρήσεων - Landscape View</DialogTitle>
                        <DialogDescription>
                          Εισαγωγή μετρήσεων για όλα τα διαμερίσματα σε μορφή πίνακα
                        </DialogDescription>
                      </DialogHeader>
                      <MeterReadingDatasheet
                        buildingId={buildingId}
                        onSuccess={handleDatasheetSuccess}
                        onCancel={handleDatasheetCancel}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Φίλτρα */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Φίλτρα Μετρήσεων</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Τύπος Μετρητή */}
            <div className="space-y-2">
              <Label>Τύπος Μετρητή</Label>
              <Select
                value={filters.meter_type}
                onValueChange={(value) => setFilters(prev => ({ ...prev, meter_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Όλοι οι τύποι" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Όλοι οι τύποι</SelectItem>
                  {meterTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ημερομηνία Από */}
            <div className="space-y-2">
              <Label>Ημερομηνία Από</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
              />
            </div>

            {/* Ημερομηνία Έως */}
            <div className="space-y-2">
              <Label>Ημερομηνία Έως</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
              />
            </div>

            {/* Κουμπιά */}
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="flex-1"
                  >
                    Καθαρισμός
                  </Button>
                  <Button
                    variant="outline"
                    onClick={setCurrentMonthFilter}
                    className="flex-1 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Τρέχον Μήνας
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => setShowForm(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Μονή Μετρήση
                  </Button>
                  <Button
                    onClick={() => setShowDatasheet(true)}
                    className="w-full"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Φύλλο Μετρήσεων
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Λίστα Μετρήσεων */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Λίστα Μετρήσεων
            {selectedMonth && (
              <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
                📅 {new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {selectedMonth ? 
              `${readings.length} μετρήσεις για τον μήνα ${new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}` :
              `${readings.length} μετρήσεις βρέθηκαν`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              {error}
            </div>
          ) : readings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Δεν βρέθηκαν μετρήσεις
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs leading-tight">
                      <div className="text-center">Διαμέρισμα</div>
                    </TableHead>
                    <TableHead className="text-xs leading-tight">
                      <div className="text-center">Τύπος<br/>Μετρητή</div>
                    </TableHead>
                    <TableHead className="text-xs leading-tight">
                      <div className="text-center">Ημερομηνία<br/>Μέτρησης</div>
                    </TableHead>
                    <TableHead className="text-xs leading-tight">
                      <div className="text-center">Νέα<br/>Μέτρηση</div>
                    </TableHead>
                    <TableHead className="text-xs leading-tight">
                      <div className="text-center">Προηγούμενη<br/>Μέτρηση</div>
                    </TableHead>
                    <TableHead className="text-xs leading-tight">
                      <div className="text-center">Κατανάλωση<br/>(Διαφορά)</div>
                    </TableHead>
                    <TableHead className="text-xs leading-tight">
                      <div className="text-center">Σημειώσεις</div>
                    </TableHead>
                    <TableHead className="text-xs leading-tight text-right">
                      <div className="text-center">Ενέργειες</div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readings.map((reading) => (
                    <TableRow key={reading.id}>
                      <TableCell className="font-medium text-center text-blue-700">
                        {reading.apartment_number}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getMeterTypeColor(reading.meter_type)}>
                          <span className="flex items-center space-x-1">
                            {getMeterTypeIcon(reading.meter_type)}
                            <span className="text-xs">{reading.meter_type_display}</span>
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {format(new Date(reading.reading_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="font-mono text-center font-semibold text-green-700">
                        {parseFloat(reading.value).toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-center text-muted-foreground bg-gray-50">
                        {reading.previous_value ? parseFloat(reading.previous_value).toFixed(2) : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-center">
                        {reading.consumption ? (
                          <span className={`font-medium px-2 py-1 rounded text-sm ${parseFloat(reading.consumption) > 0 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                            {parseFloat(reading.consumption) > 0 ? '+' : ''}{parseFloat(reading.consumption).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-center text-sm">
                        {reading.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(reading)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Επεξεργασία
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(reading)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Διαγραφή
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog για επεξεργασία */}
      {editingReading && (
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Επεξεργασία Μετρήσης</DialogTitle>
              <DialogDescription>
                Ενημέρωση υπάρχουσας μετρήσης
              </DialogDescription>
            </DialogHeader>
            <MeterReadingForm
              buildingId={buildingId}
              reading={editingReading}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}; 