'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit2, Trash2, Star, ShieldCheck, BadgeCheck,
  Phone, Mail, Globe, MapPin, Loader2, X, Save, ChevronDown,
  Store, Award, Tag, Eye, EyeOff, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import AuthGate from '@/components/AuthGate';
import { toast } from 'sonner';
import {
  useMarketplaceAdmin,
  SERVICE_TYPE_CHOICES,
  type MarketplaceProvider,
  type CreateProviderInput,
  type ServiceType,
} from '@/hooks/useMarketplaceAdmin';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Empty provider form state
const emptyProvider: CreateProviderInput = {
  name: '',
  service_type: 'repair',
  phone: '',
  email: '',
  website: '',
  address: '',
  is_active: true,
  show_in_marketplace: true,
  is_verified: false,
  is_featured: false,
  short_description: '',
  detailed_description: '',
  special_offers: '',
  coupon_code: '',
  coupon_description: '',
  portfolio_links: [],
  latitude: null,
  longitude: null,
  is_nationwide: false,
  service_radius_km: null,
  rating: '0.00',
};

function ProviderCard({
  provider,
  onEdit,
  onDelete
}: {
  provider: MarketplaceProvider;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ratingNum = parseFloat(provider.rating || '0');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "bg-white dark:bg-slate-800 rounded-2xl border overflow-hidden transition-all group hover:shadow-lg",
        provider.is_featured && "ring-2 ring-amber-400",
        !provider.is_active && "opacity-60 grayscale",
        !provider.show_in_marketplace && "border-dashed border-slate-300 dark:border-slate-600"
      )}
    >
      {/* Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {provider.name}
              </h3>
              {provider.is_verified && (
                <BadgeCheck className="w-5 h-5 text-blue-500 flex-shrink-0" />
              )}
              {provider.is_featured && (
                <Award className="w-5 h-5 text-amber-500 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                {provider.service_type_display || provider.service_type}
              </span>
              {!provider.is_active && (
                <span className="px-2 py-0.5 text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                  Ανενεργός
                </span>
              )}
              {!provider.show_in_marketplace && (
                <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full flex items-center gap-1">
                  <EyeOff className="w-3 h-3" />
                  Κρυφός
                </span>
              )}
            </div>
          </div>
          {/* Rating */}
          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1.5 rounded-xl">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
              {ratingNum.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {provider.short_description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
            {provider.short_description}
          </p>
        )}

        {/* Contact Info */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {provider.phone && (
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Phone className="w-3.5 h-3.5" />
              <span className="truncate">{provider.phone}</span>
            </div>
          )}
          {provider.email && (
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Mail className="w-3.5 h-3.5" />
              <span className="truncate">{provider.email}</span>
            </div>
          )}
          {provider.website && (
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Globe className="w-3.5 h-3.5" />
              <span className="truncate">{provider.website}</span>
            </div>
          )}
          {provider.address && (
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{provider.address}</span>
            </div>
          )}
        </div>

        {/* Coupon */}
        {provider.coupon_code && (
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Tag className="w-4 h-4" />
              <span className="font-mono font-bold text-sm">{provider.coupon_code}</span>
            </div>
            {provider.coupon_description && (
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                {provider.coupon_description}
              </p>
            )}
          </div>
        )}

        {/* Location */}
        {(provider.is_nationwide || provider.service_radius_km) && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="w-3.5 h-3.5" />
            {provider.is_nationwide ? (
              <span className="font-medium text-blue-600 dark:text-blue-400">Πανελλαδική Κάλυψη</span>
            ) : (
              <span>Ακτίνα: {provider.service_radius_km} km</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          <Edit2 className="w-4 h-4 mr-1.5" />
          Επεξεργασία
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          Διαγραφή
        </Button>
      </div>
    </motion.div>
  );
}

function ProviderFormDialog({
  isOpen,
  onClose,
  provider,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  provider: MarketplaceProvider | null;
  onSubmit: (data: CreateProviderInput) => void;
  isSubmitting: boolean;
}) {
  const isEditing = !!provider;
  const [formData, setFormData] = useState<CreateProviderInput>(
    provider
      ? {
          name: provider.name,
          service_type: provider.service_type,
          phone: provider.phone || '',
          email: provider.email || '',
          website: provider.website || '',
          address: provider.address || '',
          is_active: provider.is_active,
          show_in_marketplace: provider.show_in_marketplace,
          is_verified: provider.is_verified,
          is_featured: provider.is_featured,
          short_description: provider.short_description || '',
          detailed_description: provider.detailed_description || '',
          special_offers: provider.special_offers || '',
          coupon_code: provider.coupon_code || '',
          coupon_description: provider.coupon_description || '',
          portfolio_links: provider.portfolio_links || [],
          latitude: provider.latitude,
          longitude: provider.longitude,
          is_nationwide: provider.is_nationwide,
          service_radius_km: provider.service_radius_km,
          rating: provider.rating || '0.00',
        }
      : emptyProvider
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const updateField = <K extends keyof CreateProviderInput>(
    key: K,
    value: CreateProviderInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-600" />
            {isEditing ? 'Επεξεργασία Συνεργάτη' : 'Νέος Συνεργάτης Marketplace'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Ενημερώστε τα στοιχεία του συνεργάτη.'
              : 'Συμπληρώστε τα στοιχεία για να προσθέσετε νέο συνεργάτη στο Marketplace.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Βασικά Στοιχεία
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Επωνυμία *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="π.χ. Ηλεκτροτεχνική ΕΠΕ"
                  required
                />
              </div>
              <div>
                <Label htmlFor="service_type">Κατηγορία *</Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(value) => updateField('service_type', value as ServiceType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε κατηγορία" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPE_CHOICES.map((choice) => (
                      <SelectItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="rating">Αξιολόγηση (0-5)</Label>
                <Input
                  id="rating"
                  type="number"
                  step="0.01"
                  min="0"
                  max="5"
                  value={formData.rating}
                  onChange={(e) => updateField('rating', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Στοιχεία Επικοινωνίας
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Τηλέφωνο</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="210 1234567"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="info@example.com"
                />
              </div>
              <div>
                <Label htmlFor="website">Ιστοσελίδα</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <Label htmlFor="address">Διεύθυνση</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Λεωφ. Αλεξάνδρας 25, Αθήνα"
                />
              </div>
            </div>
          </div>

          {/* Descriptions */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Περιγραφές
            </h4>
            <div className="space-y-4">
              <div>
                <Label htmlFor="short_description">Σύντομη Περιγραφή</Label>
                <Input
                  id="short_description"
                  value={formData.short_description}
                  onChange={(e) => updateField('short_description', e.target.value)}
                  placeholder="Μια γραμμή που θα φαίνεται στο listing"
                  maxLength={255}
                />
              </div>
              <div>
                <Label htmlFor="detailed_description">Αναλυτική Περιγραφή</Label>
                <Textarea
                  id="detailed_description"
                  value={formData.detailed_description}
                  onChange={(e) => updateField('detailed_description', e.target.value)}
                  placeholder="Λεπτομέρειες για τις υπηρεσίες..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="special_offers">Ειδικές Προσφορές</Label>
                <Textarea
                  id="special_offers"
                  value={formData.special_offers}
                  onChange={(e) => updateField('special_offers', e.target.value)}
                  placeholder="Ειδικές τιμές για ενοίκους κτιρίων..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Coupon */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Κουπόνι Έκπτωσης
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="coupon_code">Κωδικός Κουπονιού</Label>
                <Input
                  id="coupon_code"
                  value={formData.coupon_code}
                  onChange={(e) => updateField('coupon_code', e.target.value.toUpperCase())}
                  placeholder="NEWCONCIERGE20"
                  className="font-mono uppercase"
                />
              </div>
              <div>
                <Label htmlFor="coupon_description">Περιγραφή Κουπονιού</Label>
                <Input
                  id="coupon_description"
                  value={formData.coupon_description}
                  onChange={(e) => updateField('coupon_description', e.target.value)}
                  placeholder="20% έκπτωση σε πρώτη εργασία"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Τοποθεσία & Κάλυψη
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="latitude">Γεωγρ. Πλάτος</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={formData.latitude || ''}
                  onChange={(e) => updateField('latitude', e.target.value || null)}
                  placeholder="37.983810"
                />
              </div>
              <div>
                <Label htmlFor="longitude">Γεωγρ. Μήκος</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={formData.longitude || ''}
                  onChange={(e) => updateField('longitude', e.target.value || null)}
                  placeholder="23.727539"
                />
              </div>
              <div>
                <Label htmlFor="service_radius_km">Ακτίνα (km)</Label>
                <Input
                  id="service_radius_km"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.service_radius_km || ''}
                  onChange={(e) => updateField('service_radius_km', e.target.value || null)}
                  placeholder="50"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="is_nationwide"
                checked={formData.is_nationwide}
                onCheckedChange={(checked) => updateField('is_nationwide', checked)}
              />
              <Label htmlFor="is_nationwide" className="cursor-pointer">
                Πανελλαδική Κάλυψη
              </Label>
            </div>
          </div>

          {/* Status Toggles */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Κατάσταση & Εμφάνιση
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => updateField('is_active', checked)}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  <span className="font-medium">Ενεργός</span>
                  <span className="block text-xs text-slate-500">Ο συνεργάτης είναι διαθέσιμος</span>
                </Label>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                <Switch
                  id="show_in_marketplace"
                  checked={formData.show_in_marketplace}
                  onCheckedChange={(checked) => updateField('show_in_marketplace', checked)}
                />
                <Label htmlFor="show_in_marketplace" className="cursor-pointer">
                  <span className="font-medium">Εμφάνιση Marketplace</span>
                  <span className="block text-xs text-slate-500">Φαίνεται στους χρήστες</span>
                </Label>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <Switch
                  id="is_verified"
                  checked={formData.is_verified}
                  onCheckedChange={(checked) => updateField('is_verified', checked)}
                />
                <Label htmlFor="is_verified" className="cursor-pointer">
                  <span className="font-medium flex items-center gap-1.5">
                    <BadgeCheck className="w-4 h-4 text-blue-500" />
                    Επαληθευμένος
                  </span>
                  <span className="block text-xs text-slate-500">Badge επαλήθευσης</span>
                </Label>
              </div>
              <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => updateField('is_featured', checked)}
                />
                <Label htmlFor="is_featured" className="cursor-pointer">
                  <span className="font-medium flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    Προβεβλημένος
                  </span>
                  <span className="block text-xs text-slate-500">Εμφανίζεται πρώτος</span>
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Ακύρωση
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Αποθήκευση...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditing ? 'Ενημέρωση' : 'Δημιουργία'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  isOpen,
  onClose,
  provider,
  onConfirm,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  provider: MarketplaceProvider | null;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  if (!provider) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Διαγραφή Συνεργάτη
          </DialogTitle>
          <DialogDescription>
            Είστε σίγουρος ότι θέλετε να διαγράψετε τον συνεργάτη{' '}
            <strong className="text-slate-900 dark:text-slate-100">{provider.name}</strong>;
          </DialogDescription>
        </DialogHeader>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-4 my-4">
          <p className="text-sm text-red-700 dark:text-red-400">
            Αυτή η ενέργεια είναι μη αναστρέψιμη. Ο συνεργάτης θα αφαιρεθεί οριστικά από το Marketplace.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Ακύρωση
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Διαγραφή...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Διαγραφή
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarketplaceAdminContent() {
  const [search, setSearch] = useState('');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<MarketplaceProvider | null>(null);
  const [deletingProvider, setDeletingProvider] = useState<MarketplaceProvider | null>(null);

  const {
    providers,
    isLoading,
    createProvider,
    isCreating,
    updateProvider,
    isUpdating,
    deleteProvider,
    isDeleting,
  } = useMarketplaceAdmin();

  // Filtered providers
  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          p.name.toLowerCase().includes(searchLower) ||
          p.email?.toLowerCase().includes(searchLower) ||
          p.phone?.includes(search) ||
          p.service_type.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Service type filter
      if (filterService !== 'all' && p.service_type !== filterService) {
        return false;
      }

      // Status filter
      if (filterStatus === 'active' && !p.is_active) return false;
      if (filterStatus === 'inactive' && p.is_active) return false;
      if (filterStatus === 'featured' && !p.is_featured) return false;
      if (filterStatus === 'verified' && !p.is_verified) return false;
      if (filterStatus === 'hidden' && p.show_in_marketplace) return false;

      return true;
    });
  }, [providers, search, filterService, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: providers.length,
      active: providers.filter((p) => p.is_active).length,
      featured: providers.filter((p) => p.is_featured).length,
      verified: providers.filter((p) => p.is_verified).length,
    };
  }, [providers]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingProvider(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (provider: MarketplaceProvider) => {
    setEditingProvider(provider);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProvider(null);
  };

  const handleSubmit = async (data: CreateProviderInput) => {
    try {
      if (editingProvider) {
        await updateProvider({ id: editingProvider.id, data });
        toast.success('Ο συνεργάτης ενημερώθηκε επιτυχώς!');
      } else {
        await createProvider(data);
        toast.success('Ο συνεργάτης δημιουργήθηκε επιτυχώς!');
      }
      handleCloseForm();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Σφάλμα κατά την αποθήκευση');
    }
  };

  const handleDelete = async () => {
    if (!deletingProvider) return;
    try {
      await deleteProvider(deletingProvider.id);
      toast.success('Ο συνεργάτης διαγράφηκε επιτυχώς!');
      setDeletingProvider(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Σφάλμα κατά τη διαγραφή');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-purple-500/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-indigo-100 text-sm font-bold mb-4">
            <Store className="w-4 h-4" />
            ULTRA ADMIN
          </div>
          <h1 className="page-title-lg page-title-on-dark mb-4">
            Διαχείριση Marketplace
          </h1>
          <p className="text-indigo-100 text-lg md:text-xl font-medium opacity-90 max-w-2xl">
            Προσθήκη, επεξεργασία και διαχείριση συνεργατών που εμφανίζονται στο Marketplace για όλους τους tenants.
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
              <p className="text-2xl font-black">{stats.total}</p>
              <p className="text-indigo-200 text-sm font-medium">Σύνολο</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
              <p className="text-2xl font-black">{stats.active}</p>
              <p className="text-indigo-200 text-sm font-medium">Ενεργοί</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
              <p className="text-2xl font-black">{stats.featured}</p>
              <p className="text-indigo-200 text-sm font-medium">Προβεβλημένοι</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
              <p className="text-2xl font-black">{stats.verified}</p>
              <p className="text-indigo-200 text-sm font-medium">Επαληθευμένοι</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col md:flex-row gap-3 flex-1 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Αναζήτηση συνεργάτη..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <Select value={filterService} onValueChange={setFilterService}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Κατηγορία" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλες οι κατηγορίες</SelectItem>
              {SERVICE_TYPE_CHOICES.map((choice) => (
                <SelectItem key={choice.value} value={choice.value}>
                  {choice.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Κατάσταση" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλοι</SelectItem>
              <SelectItem value="active">Ενεργοί</SelectItem>
              <SelectItem value="inactive">Ανενεργοί</SelectItem>
              <SelectItem value="featured">Προβεβλημένοι</SelectItem>
              <SelectItem value="verified">Επαληθευμένοι</SelectItem>
              <SelectItem value="hidden">Κρυφοί</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Add Button */}
        <Button onClick={handleOpenCreate} size="lg" className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-5 h-5 mr-2" />
          Νέος Συνεργάτης
        </Button>
      </div>

      {/* Providers Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <p className="text-slate-500 font-bold animate-pulse">Φόρτωση Συνεργατών...</p>
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] p-16 text-center">
          <Store className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {providers.length === 0 ? 'Δεν υπάρχουν συνεργάτες' : 'Δεν βρέθηκαν αποτελέσματα'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6">
            {providers.length === 0
              ? 'Προσθέστε τον πρώτο συνεργάτη στο Marketplace.'
              : 'Δοκιμάστε διαφορετικά φίλτρα αναζήτησης.'}
          </p>
          {providers.length === 0 && (
            <Button onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Προσθήκη Συνεργάτη
            </Button>
          )}
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredProviders.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                onEdit={() => handleOpenEdit(provider)}
                onDelete={() => setDeletingProvider(provider)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Dialogs */}
      <ProviderFormDialog
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        provider={editingProvider}
        onSubmit={handleSubmit}
        isSubmitting={isCreating || isUpdating}
      />

      <DeleteConfirmDialog
        isOpen={!!deletingProvider}
        onClose={() => setDeletingProvider(null)}
        provider={deletingProvider}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default function MarketplaceAdminPage() {
  return (
    <AuthGate requiresUltraAdmin>
      <MarketplaceAdminContent />
    </AuthGate>
  );
}
