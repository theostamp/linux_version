'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  DollarSign,
  Building,
  FileText,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale/el';
import { formatCurrency } from '@/lib/utils';

interface FinancialSearchProps {
  buildingId: number;
  onSearch: (filters: SearchFilters) => void;
  onClear: () => void;
}

interface SearchFilters {
  searchTerm: string;
  dateFrom: string;
  dateTo: string;
  category: string;
  type: string;
  amountMin: string;
  amountMax: string;
  apartmentId: string;
  status: string;
}

interface SearchResult {
  id: number;
  type: 'expense' | 'payment' | 'transaction';
  title: string;
  amount: number;
  date: string;
  category?: string;
  apartment_number?: string;
  status: string;
  description: string;
}

const CATEGORIES = [
  { value: 'all', label: 'Όλες οι κατηγορίες' },
  { value: 'electricity', label: 'Ηλεκτρικό Ρεύμα' },
  { value: 'water', label: 'Νερό' },
  { value: 'cleaning', label: 'Καθαρισμός' },
  { value: 'elevator', label: 'Ανελκυστήρας' },
  { value: 'heating', label: 'Θέρμανση' },
  { value: 'security', label: 'Ασφάλεια' },
  { value: 'administrative', label: 'Διοικητικά' },
  { value: 'repairs', label: 'Επισκευές' },
  { value: 'other', label: 'Άλλοι' }
];

const TYPES = [
  { value: 'all', label: 'Όλοι οι τύποι' },
  { value: 'expense', label: 'Δαπάνες' },
  { value: 'payment', label: 'Εισπράξεις' },
  { value: 'transaction', label: 'Κινήσεις' }
];

const STATUSES = [
  { value: 'all', label: 'Όλες οι καταστάσεις' },
  { value: 'completed', label: 'Ολοκληρωμένες' },
  { value: 'pending', label: 'Εκκρεμείς' },
  { value: 'cancelled', label: 'Ακυρωμένες' }
];

export default function FinancialSearch({ buildingId, onSearch, onClear }: FinancialSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    dateFrom: '',
    dateTo: '',
    category: 'all',
    type: 'all',
    amountMin: '',
    amountMax: '',
    apartmentId: 'all',
    status: 'all'
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apartments, setApartments] = useState<Array<{id: number, number: string}>>([]);

  useEffect(() => {
    loadApartments();
  }, [buildingId]);

  const loadApartments = async () => {
    try {
      // Αυτό θα πρέπει να αντικατασταθεί με το πραγματικό API call
      const mockApartments = [
        { id: 1, number: 'Αθηνών 12 - 201' },
        { id: 2, number: 'Αθηνών 12 - 202' },
        { id: 3, number: 'Πατησίων 45 - 203' },
        { id: 4, number: 'Πατησίων 45 - 204' }
      ];
      setApartments(mockApartments);
    } catch (error) {
      console.error('Error loading apartments:', error);
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      // Εδώ θα γίνει το πραγματικό API call
      const mockResults: SearchResult[] = [
        {
          id: 1,
          type: 'expense',
          title: 'ΔΕΗ Κοινοχρήστων - Αύγουστος 2024',
          amount: 1500.00,
          date: '2024-08-01',
          category: 'electricity',
          status: 'completed',
          description: 'Λογαριασμός ΔΕΗ για τον Αύγουστο 2024'
        },
        {
          id: 2,
          type: 'payment',
          title: 'Πληρωμή Κοινόχρηστων',
          amount: 150.00,
          date: '2024-08-05',
          apartment_number: 'Αθηνών 12 - 201',
          status: 'completed',
          description: 'Πληρωμή κοινόχρηστων για τον Αύγουστο 2024'
        }
      ];
      
      setResults(mockResults);
      onSearch(filters);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setFilters({
      searchTerm: '',
      dateFrom: '',
      dateTo: '',
      category: 'all',
      type: 'all',
      amountMin: '',
      amountMax: '',
      apartmentId: 'all',
      status: 'all'
    });
    setResults([]);
    onClear();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'expense': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'payment': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'transaction': return <DollarSign className="h-4 w-4 text-blue-600" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'expense': return 'Δαπάνη';
      case 'payment': return 'Είσπραξη';
      case 'transaction': return 'Κίνηση';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Αναζήτηση */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Αναζήτηση Οικονομικών Στοιχείων
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Βασική Αναζήτηση */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Αναζήτηση με τίτλο, περιγραφή, διαμέρισμα..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading}>
                <Search className="h-4 w-4 mr-2" />
                Αναζήτηση
              </Button>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                Φίλτρα
              </Button>
              <Button variant="outline" onClick={handleClear}>
                <X className="h-4 w-4 mr-2" />
                Καθαρισμός
              </Button>
            </div>

            {/* Εκτεταμένα Φίλτρα */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                {/* Ημερομηνίες */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Από Ημερομηνία</label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Έως Ημερομηνία</label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  />
                </div>

                {/* Κατηγορία */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Κατηγορία</label>
                  <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Τύπος */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Τύπος</label>
                  <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ποσά */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Ελάχιστο Ποσό</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={filters.amountMin}
                    onChange={(e) => setFilters({ ...filters, amountMin: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Μέγιστο Ποσό</label>
                  <Input
                    type="number"
                    placeholder="999999.99"
                    value={filters.amountMax}
                    onChange={(e) => setFilters({ ...filters, amountMax: e.target.value })}
                  />
                </div>

                {/* Διαμέρισμα */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Διαμέρισμα</label>
                  <Select value={filters.apartmentId} onValueChange={(value) => setFilters({ ...filters, apartmentId: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Όλα τα διαμερίσματα</SelectItem>
                      {apartments.map((apartment) => (
                        <SelectItem key={apartment.id} value={apartment.id.toString()}>
                          {apartment.number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Κατάσταση */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Κατάσταση</label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Αποτελέσματα */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Αποτελέσματα Αναζήτησης ({results.length})</span>
              <Badge variant="secondary">
                {isLoading ? 'Φόρτωση...' : `${results.length} αποτελέσματα`}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    {getTypeIcon(result.type)}
                    <div>
                      <h4 className="font-medium">{result.title}</h4>
                      <p className="text-sm text-gray-600">{result.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline">{getTypeLabel(result.type)}</Badge>
                        {result.apartment_number && (
                          <Badge variant="outline">
                            <Building className="h-3 w-3 mr-1" />
                            {result.apartment_number}
                          </Badge>
                        )}
                        <Badge className={getStatusColor(result.status)}>
                          {result.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      result.type === 'expense' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {result.type === 'expense' ? '-' : '+'}{formatCurrency(result.amount)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(result.date), 'dd/MM/yyyy', { locale: el })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Χωρίς Αποτελέσματα */}
      {!isLoading && results.length === 0 && filters.searchTerm && (
        <Card>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              Δεν βρέθηκαν αποτελέσματα για την αναζήτηση "{filters.searchTerm}"
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 