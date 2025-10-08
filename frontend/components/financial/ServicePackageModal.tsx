'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Package, Euro, Users, Clock, Plus, Calculator, Info } from 'lucide-react';
import { fetchServicePackages, applyServicePackageToBuilding, createServicePackage, type ServicePackage } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Checkbox } from '@/components/ui/checkbox';

interface ServicePackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildingId: number;
  apartmentsCount: number;
  currentFee?: number;
  onPackageApplied?: (packageData: any) => void;
}

export const ServicePackageModal: React.FC<ServicePackageModalProps> = ({
  isOpen,
  onClose,
  buildingId,
  apartmentsCount,
  currentFee = 0,
  onPackageApplied
}) => {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<number | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingPackage, setCreatingPackage] = useState(false);
  const [customPackageForm, setCustomPackageForm] = useState({
    name: '',
    description: '',
    fee_per_apartment: '',
    services_included: ''
  });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [calculateBasedOnServices, setCalculateBasedOnServices] = useState(false);

  // Πραγματικές υπηρεσίες διαχείρισης (χωρίς hardcoded τιμές)
  const realBuildingServices: Array<{
    id: string;
    name: string;
    cost: number;
    category: string;
    essential: boolean;
    description: string;
  }> = [];

  // Default πακέτα που προσφέρονται για δημιουργία
  const defaultPackageTemplates = [
    {
      name: "Βασικό Πακέτο",
      description: "Βασική διαχείριση κτιρίου με τις απαραίτητες υπηρεσίες",
      fee_per_apartment: 8.00,
      services_included: [
        "Διαχείριση κοινόχρηστων",
        "Τήρηση λογαριασμών",
        "Εξόφληση κοινόχρηστων",
        "Συντήρηση κοινών χώρων"
      ],
      is_active: true,
    },
    {
      name: "Πρότυπο Πακέτο",
      description: "Πλήρη διαχείριση με επιπλέον υπηρεσίες",
      fee_per_apartment: 12.00,
      services_included: [
        "Διαχείριση κοινόχρηστων",
        "Τήρηση λογαριασμών",
        "Εξόφληση κοινόχρηστων",
        "Συντήρηση κοινών χώρων",
        "Επίβλεψη εργασιών",
        "Νομικές συμβουλές",
        "24/7 τηλεφωνική υποστήριξη"
      ],
      is_active: true,
    },
    {
      name: "Premium Πακέτο",
      description: "Πλήρη διαχείριση με premium υπηρεσίες",
      fee_per_apartment: 18.00,
      services_included: [
        "Διαχείριση κοινόχρηστων",
        "Τήρηση λογαριασμών", 
        "Εξόφληση κοινόχρηστων",
        "Συντήρηση κοινών χώρων",
        "Επίβλεψη εργασιών",
        "Νομικές συμβουλές",
        "24/7 τηλεφωνική υποστήριξη",
        "Διαχείριση ασφαλειών",
        "Προγραμματισμός συντηρήσεων",
        "Ψηφιακό αρχείο εγγράφων"
      ],
      is_active: true,
    }
  ];

  // Fetch service packages
  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen, buildingId]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const data = await fetchServicePackages(buildingId);
      
      // Βεβαιώνουμε ότι το data είναι array
      if (Array.isArray(data)) {
        setPackages(data);
      } else {
        console.warn('Service packages data is not an array:', data);
        setPackages([]);
      }
    } catch (error: any) {
      console.error('Error fetching service packages:', error);
      
      // Πάντα θέτουμε κενό array σε περίπτωση σφάλματος
      setPackages([]);
      
      // Πιο φιλικό error message ανάλογα με τον τύπο σφάλματος
      if (error?.response?.status === 404) {
        // Δεν εμφανίζουμε error toast για 404, απλά δείχνουμε κενή λίστα
      } else if (error?.response?.status === 401 || error?.response?.status === 403) {
        toast.error('Δεν έχετε δικαίωμα πρόσβασης σε αυτή τη λειτουργία');
      } else {
        toast.error('Αποτυχία φόρτωσης πακέτων υπηρεσιών');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPackage = async (packageId: number) => {
    try {
      setApplying(packageId);
      const result = await applyServicePackageToBuilding(packageId, buildingId);
      
      // Enhanced success message with more details
      const newFee = result.new_fee || result.fee_per_apartment;
      const totalCost = newFee * apartmentsCount;
      const startDate = result.start_date ? new Date(result.start_date).toLocaleDateString('el-GR') : 'Σήμερα';
      
      toast.success(
        `🎉 Πακέτο εφαρμόστηκε επιτυχώς!\n💰 Αμοιβή: ${newFee}€/διαμέρισμα/μήνα\n🏢 Συνολικό μηνιαίο: ${totalCost.toFixed(2)}€/μήνα\n📅 Έναρξη: ${startDate}`,
        { duration: 4000 }
      );
      
      // Call callback if provided
      if (onPackageApplied) {
        onPackageApplied({
          ...result,
          new_fee: newFee,
          total_cost: totalCost,
          apartments_count: apartmentsCount
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Error applying service package:', error);
      toast.error('Αποτυχία εφαρμογής πακέτου');
    } finally {
      setApplying(null);
    }
  };

  const handleCreatePackage = async (packageTemplate: any) => {
    try {
      setCreatingPackage(true);
      const newPackage = await createServicePackage({
        ...packageTemplate,
        // Προσθέτουμε υπολογιστικά πεδία
        total_cost_for_building: packageTemplate.fee_per_apartment * apartmentsCount
      });
      
      // Προσθέτουμε το νέο πακέτο στη λίστα
      setPackages(prev => [...prev, newPackage]);
      toast.success(`Το πακέτο "${newPackage.name}" δημιουργήθηκε επιτυχώς`);
      setShowCreateModal(false);
      
    } catch (error: any) {
      console.error('Error creating service package:', error);
      if (error?.response?.status === 403) {
        toast.error('Δεν έχετε δικαίωμα να δημιουργήσετε πακέτα υπηρεσιών');
      } else {
        toast.error('Αποτυχία δημιουργίας πακέτου');
      }
    } finally {
      setCreatingPackage(false);
    }
  };

  const handleCreateCustomPackage = async () => {
    try {
      // Enhanced validation
      const name = customPackageForm.name.trim();
      const description = customPackageForm.description.trim();
      const fee = customPackageForm.fee_per_apartment;

      if (!name) {
        toast.error('Παρακαλώ συμπληρώστε το όνομα του πακέτου');
        return;
      }

      if (name.length < 2) {
        toast.error('Το όνομα του πακέτου πρέπει να έχει τουλάχιστον 2 χαρακτήρες');
        return;
      }

      // Check for valid characters (Greek and English letters, numbers, spaces, and common punctuation)
      const validNameRegex = /^[α-ωΑ-Ωa-zA-Z0-9\s\-_.,()]+$/;
      if (!validNameRegex.test(name)) {
        toast.error('Το όνομα του πακέτου περιέχει μη έγκυρους χαρακτήρες. Χρησιμοποιήστε μόνο γράμματα, αριθμούς και κοινά σύμβολα.');
        return;
      }

      if (!description) {
        toast.error('Παρακαλώ συμπληρώστε την περιγραφή του πακέτου');
        return;
      }

      if (!fee || parseFloat(fee) < 0) {
        toast.error('Παρακαλώ συμπληρώστε μια έγκυρη τιμή για την αμοιβή ανά διαμέρισμα (0 ή μεγαλύτερη)');
        return;
      }

      // Χρησιμοποίηση επιλεγμένων υπηρεσιών αν είναι ενεργό το auto-calculate
      const servicesArray = calculateBasedOnServices 
        ? selectedServices.map(id => realBuildingServices.find(s => s.id === id)?.name || '').filter(Boolean)
        : customPackageForm.services_included.split('\n').map(s => s.trim()).filter(s => s.length > 0);

      if (servicesArray.length === 0) {
        toast.error('Παρακαλώ επιλέξτε τουλάχιστον μία υπηρεσία ή συμπληρώστε τις υπηρεσίες που περιλαμβάνονται');
        return;
      }

      setCreatingPackage(true);
      
      // Debug logging
      console.log('Creating service package with data:', {
        name: name,
        description: description,
        fee_per_apartment: parseFloat(fee),
        services_included: servicesArray,
        is_active: true
      });
      
      const newPackage = await createServicePackage({
        name: name,
        description: description,
        fee_per_apartment: parseFloat(fee),
        services_included: servicesArray,
        is_active: true
      });
      
      setPackages(prev => [...prev, newPackage]);
      toast.success(`Το πακέτο "${newPackage.name}" δημιουργήθηκε επιτυχώς`);
      setShowCreateModal(false);
      
      // Reset form
      setCustomPackageForm({
        name: '',
        description: '',
        fee_per_apartment: '',
        services_included: ''
      });
      setSelectedServices([]);
      setCalculateBasedOnServices(false);
      
    } catch (error: any) {
      console.error('Error creating custom service package:', error);
      if (error?.response?.status === 403) {
        toast.error('Δεν έχετε δικαίωμα να δημιουργήσετε πακέτα υπηρεσιών');
      } else if (error?.response?.status === 400) {
        // Show more specific error message for validation errors
        const errorData = error.response?.data;
        if (errorData && typeof errorData === 'object') {
          const errorMessages = Object.values(errorData).flat();
          toast.error(`Σφάλμα επικύρωσης: ${errorMessages.join(', ')}`);
        } else {
          toast.error('Σφάλμα επικύρωσης δεδομένων');
        }
      } else {
        toast.error('Αποτυχία δημιουργίας πακέτου');
      }
    } finally {
      setCreatingPackage(false);
    }
  };

  // Υπολογισμός κόστους βάσει επιλεγμένων υπηρεσιών
  const calculateServiceBasedCost = () => {
    return selectedServices.reduce((total, serviceId) => {
      const service = realBuildingServices.find(s => s.id === serviceId);
      return total + (service ? service.cost : 0);
    }, 0);
  };

  // Auto-update της τιμής όταν αλλάζουν οι επιλεγμένες υπηρεσίες
  const handleServiceToggle = (serviceId: string, isSelected: boolean) => {
    const newSelectedServices = isSelected 
      ? [...selectedServices, serviceId]
      : selectedServices.filter(id => id !== serviceId);
    
    setSelectedServices(newSelectedServices);
    
    if (calculateBasedOnServices) {
      const newCost = newSelectedServices.reduce((total, id) => {
        const service = realBuildingServices.find(s => s.id === id);
        return total + (service ? service.cost : 0);
      }, 0);
      
      setCustomPackageForm(prev => ({
        ...prev,
        fee_per_apartment: newCost.toFixed(2),
        services_included: newSelectedServices.map(id => 
          realBuildingServices.find(s => s.id === id)?.name || ''
        ).join('\n')
      }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getPackageColor = (fee: number) => {
    if (fee <= 5) return 'bg-green-50 border-green-200 text-green-800';
    if (fee <= 10) return 'bg-blue-50 border-blue-200 text-blue-800';
    if (fee <= 15) return 'bg-orange-50 border-orange-200 text-orange-800';
    return 'bg-purple-50 border-purple-200 text-purple-800';
  };

  const getPackageIcon = (fee: number) => {
    if (fee <= 5) return '🟢';
    if (fee <= 10) return '🔵';
    if (fee <= 15) return '🟠';
    return '🟣';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Επιλογή Πακέτου Υπηρεσιών
            </DialogTitle>
            
            {/* Κουμπί για δημιουργία νέου πακέτου - εμφανίζεται μόνο αν υπάρχουν ήδη πακέτα */}
            {packages.length > 0 && (
              <Button
                onClick={() => setShowCreateModal(true)}
                disabled={creatingPackage}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Νέο Πακέτο
              </Button>
            )}
          </div>
          <DialogDescription>
            Επιλέξτε ή δημιουργήστε ένα πακέτο υπηρεσιών διαχείρισης για το κτίριό σας
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Τρέχουσα αμοιβή διαχείρισης:</p>
                  <p className="text-lg font-bold">{formatCurrency(currentFee)}/διαμέρισμα/μήνα</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Συνολικό μηνιαίο κόστος:</p>
                  <p className="text-lg font-bold">{formatCurrency(currentFee * apartmentsCount)}/μήνα</p>
                  <p className="text-xs text-gray-500">{apartmentsCount} διαμερίσματα</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  💡 <strong>Νέο σύστημα:</strong> Το πακέτο θα ισχύει από την ημερομηνία εφαρμογής μέχρι να αλλάξει με νέο πακέτο
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Service Packages */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Φόρτωση πακέτων...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Existing Packages Section */}
              {Array.isArray(packages) && packages.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Υπάρχοντα Πακέτα
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {packages.map((pkg) => (
                      <Card 
                        key={pkg.id} 
                        className={`cursor-pointer transition-all hover:shadow-lg ${
                          selectedPackage?.id === pkg.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => setSelectedPackage(pkg)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <span>{getPackageIcon(pkg.fee_per_apartment)}</span>
                              {pkg.name}
                            </CardTitle>
                            <Badge className={getPackageColor(pkg.fee_per_apartment)}>
                              {formatCurrency(pkg.fee_per_apartment)}/διαμέρισμα/μήνα
                            </Badge>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {/* Description */}
                          <p className="text-sm text-gray-600">{pkg.description}</p>
                          
                          {/* Services List */}
                          <div>
                            <p className="text-sm font-medium mb-2">Υπηρεσίες που περιλαμβάνονται:</p>
                            <div className="space-y-1">
                              {(Array.isArray(pkg.services_included) ? pkg.services_included : []).map((service, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                  <Check className="h-3 w-3 text-green-600" />
                                  <span>{service}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Cost Calculation */}
                          <div className="pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between text-sm">
                              <span>Συνολικό μηνιαίο κόστος:</span>
                              <span className="font-bold text-lg">
                                {formatCurrency(pkg.total_cost_for_building)}/μήνα
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 text-right">
                              {apartmentsCount} διαμερίσματα × {formatCurrency(pkg.fee_per_apartment)}/μήνα
                            </p>
                          </div>
                          
                          {/* Apply Button */}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyPackage(pkg.id);
                            }}
                            disabled={applying === pkg.id}
                            className="w-full"
                            variant={selectedPackage?.id === pkg.id ? "default" : "outline"}
                          >
                            {applying === pkg.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Εφαρμογή...
                              </>
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Εφαρμογή Πακέτου
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Default Package Templates Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Προτεινόμενα Πακέτα
                </h3>
                
                {!Array.isArray(packages) || packages.length === 0 ? (
                  <Card className="p-6 mb-4">
                <div className="text-center space-y-4">
                  <Package className="h-12 w-12 text-blue-500 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Δημιουργήστε τα πρώτα σας πακέτα</h3>
                    <p className="text-sm text-gray-600 mt-2">
                      Επιλέξτε ένα από τα παρακάτω προτεινόμενα πακέτα για να ξεκινήσετε:
                    </p>
                  </div>
                </div>
              </Card>
                ) : null}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {defaultPackageTemplates.map((template, index) => (
                  <Card 
                    key={index} 
                    className="cursor-pointer transition-all hover:shadow-lg hover:border-blue-300"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <span>{getPackageIcon(template.fee_per_apartment)}</span>
                          {template.name}
                        </CardTitle>
                        <Badge className={getPackageColor(template.fee_per_apartment)}>
                          {formatCurrency(template.fee_per_apartment)}/διαμέρισμα/μήνα
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-600">{template.description}</p>
                      
                      {/* Services Preview */}
                      <div>
                        <p className="text-sm font-medium mb-2">Υπηρεσίες:</p>
                        <div className="space-y-1">
                          {template.services_included.slice(0, 3).map((service, serviceIndex) => (
                            <div key={serviceIndex} className="flex items-center gap-2 text-xs">
                              <Check className="h-3 w-3 text-green-600" />
                              <span>{service}</span>
                            </div>
                          ))}
                          {template.services_included.length > 3 && (
                            <p className="text-xs text-gray-500">
                              +{template.services_included.length - 3} επιπλέον υπηρεσίες
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Cost */}
                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                          <span>Συνολικό μηνιαίο κόστος:</span>
                          <span className="font-bold">
                            {formatCurrency(template.fee_per_apartment * apartmentsCount)}/μήνα
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 text-right">
                          {apartmentsCount} διαμερίσματα × {formatCurrency(template.fee_per_apartment)}/μήνα
                        </p>
                      </div>
                      
                      {/* Create Button */}
                      <Button
                        onClick={() => handleCreatePackage(template)}
                        disabled={creatingPackage}
                        className="w-full"
                        variant="outline"
                      >
                        {creatingPackage ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                            Δημιουργία...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Δημιουργία Πακέτου
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Custom Package Option */}
                <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-purple-300 border-2 border-dashed border-gray-300">
                  <CardContent className="p-6 text-center space-y-4">
                    <Package className="h-12 w-12 text-purple-500 mx-auto" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Προσαρμοσμένο Πακέτο</h3>
                      <p className="text-sm text-gray-600 mt-2">
                        Δημιουργήστε ένα πακέτο με τις δικές σας υπηρεσίες και τιμές
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowCreateModal(true)}
                      disabled={creatingPackage}
                      className="w-full"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Δημιουργία Custom Πακέτου
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Custom Package Creation Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Δημιουργία Νέου Πακέτου</DialogTitle>
            <DialogDescription>
              Δημιουργήστε ένα προσαρμοσμένο πακέτο υπηρεσιών με τις δικές σας υπηρεσίες και τιμές
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="package-name">Όνομα Πακέτου *</Label>
                <Input
                  id="package-name"
                  value={customPackageForm.name}
                  onChange={(e) => setCustomPackageForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="π.χ. Βασικό Πακέτο"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="package-description">Περιγραφή</Label>
                <Textarea
                  id="package-description"
                  value={customPackageForm.description}
                  onChange={(e) => setCustomPackageForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Σύντομη περιγραφή του πακέτου..."
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="package-fee">Αμοιβή ανά Διαμέρισμα (€/μήνα) *</Label>
                <Input
                  id="package-fee"
                  type="number"
                  step="0.01"
                  min="0"
                  max="999999.99"
                  value={customPackageForm.fee_per_apartment ? Number(customPackageForm.fee_per_apartment).toFixed(2) : ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      // Limit to 2 decimal places
                      const roundedValue = Math.round(value * 100) / 100;
                      setCustomPackageForm(prev => ({ ...prev, fee_per_apartment: roundedValue.toString() }));
                    } else {
                      setCustomPackageForm(prev => ({ ...prev, fee_per_apartment: '' }));
                    }
                  }}
                  placeholder="0.00"
                  className="mt-1"
                  disabled={calculateBasedOnServices}
                />
                {calculateBasedOnServices && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    Η τιμή υπολογίζεται αυτόματα από τις επιλεγμένες υπηρεσίες
                  </p>
                )}
                {customPackageForm.fee_per_apartment && (
                  <p className="text-sm text-gray-600 mt-1">
                    Συνολικό μηνιαίο κόστος: {formatCurrency(parseFloat(customPackageForm.fee_per_apartment || '0') * apartmentsCount)}/μήνα
                  </p>
                )}
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Υπηρεσίες</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="auto-calculate"
                      checked={calculateBasedOnServices}
                      onCheckedChange={(checked) => setCalculateBasedOnServices(checked as boolean)}
                    />
                    <Label htmlFor="auto-calculate" className="text-sm text-green-700 flex items-center gap-1">
                      <Calculator className="h-4 w-4" />
                      Auto-υπολογισμός τιμής
                    </Label>
                  </div>
                </div>
                
                {calculateBasedOnServices ? (
                  // Service Selector Interface
                  <div className="border rounded-lg p-4 bg-gray-50 max-h-80 overflow-y-auto">
                    {['Βασικές', 'Επεκταμένες', 'Premium', 'Ειδικές'].map(category => {
                      const categoryServices = realBuildingServices.filter(s => s.category === category);
                      const categoryColor = {
                        'Βασικές': 'text-green-800 bg-green-100',
                        'Επεκταμένες': 'text-blue-800 bg-blue-100', 
                        'Premium': 'text-purple-800 bg-purple-100',
                        'Ειδικές': 'text-orange-800 bg-orange-100'
                      }[category];
                      
                      return (
                        <div key={category} className="mb-4">
                          <div className={`inline-block px-2 py-1 rounded text-xs font-medium mb-2 ${categoryColor}`}>
                            {category} Υπηρεσίες
                          </div>
                          <div className="space-y-2 ml-2">
                            {categoryServices.map(service => (
                              <div key={service.id} className="flex items-start gap-3 p-2 hover:bg-white rounded">
                                <Checkbox 
                                  id={service.id}
                                  checked={selectedServices.includes(service.id)}
                                  onCheckedChange={(checked) => handleServiceToggle(service.id, checked as boolean)}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor={service.id} className="text-sm font-medium cursor-pointer">
                                      {service.name}
                                      {service.essential && <span className="text-red-500 ml-1">*</span>}
                                    </Label>
                                    <Badge variant="outline" className="text-green-700 bg-green-50">
                                      {formatCurrency(service.cost)}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1">{service.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    
                    {selectedServices.length > 0 && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-800">
                            Σύνολο επιλεγμένων: {selectedServices.length} υπηρεσίες
                          </span>
                          <span className="text-lg font-bold text-green-800">
                            {formatCurrency(calculateServiceBasedCost())}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Τιμές βάσει ελληνικής αγοράς 2024</p>
                          <p>* Βασικές υπηρεσίες συνιστώνται για όλα τα κτίρια</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Manual Textarea
                  <div>
                    <Textarea
                      id="package-services"
                      value={customPackageForm.services_included}
                      onChange={(e) => setCustomPackageForm(prev => ({ ...prev, services_included: e.target.value }))}
                      placeholder="Διαχείριση κοινόχρηστων&#10;Τήρηση λογαριασμών&#10;Συντήρηση κοινών χώρων"
                      className="mt-1"
                      rows={6}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Γράψτε κάθε υπηρεσία σε ξεχωριστή γραμμή
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={handleCreateCustomPackage}
                disabled={
                  creatingPackage || 
                  !customPackageForm.name.trim() || 
                  !customPackageForm.fee_per_apartment ||
                  (calculateBasedOnServices && selectedServices.length === 0)
                }
                className="flex-1"
              >
                {creatingPackage ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Δημιουργία...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Δημιουργία Πακέτου
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setCustomPackageForm({
                    name: '',
                    description: '',
                    fee_per_apartment: '',
                    services_included: ''
                  });
                  setSelectedServices([]);
                  setCalculateBasedOnServices(false);
                }}
                disabled={creatingPackage}
              >
                Ακύρωση
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
