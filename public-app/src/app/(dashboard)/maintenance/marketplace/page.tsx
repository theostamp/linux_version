'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, Star, ShieldCheck, Phone, Mail, 
  ChevronRight, ExternalLink, BadgeCheck, Search,
  Wrench, Droplets, Zap, Thermometer, Construction,
  Hammer, Paintbrush, Loader2
} from 'lucide-react';
import { useMarketplacePartners, type MarketplacePartner } from '@/hooks/useMarketplace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';

const serviceIcons: Record<string, any> = {
  repair: Hammer,
  cleaning: Droplets,
  electrical: Zap,
  plumbing: Droplets,
  heating: Thermometer,
  technical: Wrench,
  maintenance: Construction,
  painting: Paintbrush,
  other: Wrench,
};

function PartnerCard({ partner }: { partner: MarketplacePartner }) {
  const Icon = serviceIcons[partner.service_type] || Wrench;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "bg-white rounded-3xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all group",
        partner.is_featured && "ring-2 ring-indigo-500 shadow-indigo-100"
      )}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
            <Icon className="w-7 h-7 text-gray-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg text-amber-700">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span className="text-sm font-bold">{partner.rating}</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-900">{partner.contractor_name}</h3>
            {partner.is_verified && (
              <BadgeCheck className="w-5 h-5 text-indigo-500 fill-indigo-50" />
            )}
          </div>
          <p className="text-indigo-600 text-sm font-semibold">{partner.service_type}</p>
        </div>

        <p className="text-gray-600 text-sm mb-6 line-clamp-3 leading-relaxed">
          {partner.short_description || partner.detailed_description}
        </p>

        {partner.special_offers && (
          <div className="mb-6 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Προσφορά Ενοίκων
            </div>
            <p className="text-emerald-600 text-xs">{partner.special_offers}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="rounded-xl border-gray-200 text-gray-600" asChild>
            <a href={`tel:${partner.phone}`}>
              <Phone className="w-3.5 h-3.5 mr-2" />
              Κλήση
            </a>
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl border-gray-200 text-gray-600" asChild>
            <a href={`mailto:${partner.email}`}>
              <Mail className="w-3.5 h-3.5 mr-2" />
              Email
            </a>
          </Button>
        </div>
      </div>
      
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between group-hover:bg-indigo-50 transition-colors">
        <span className="text-xs font-bold text-gray-400 group-hover:text-indigo-400 uppercase tracking-widest">Λεπτομέρειες</span>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
      </div>
    </motion.div>
  );
}

function MarketplaceContent() {
  const [search, setSearch] = useState('');
  const { data: partners = [], isLoading } = useMarketplacePartners();

  const filteredPartners = partners.filter(p => 
    p.contractor_name.toLowerCase().includes(search.toLowerCase()) ||
    p.service_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-[2.5rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-indigo-100 text-sm font-bold mb-6">
            <ShieldCheck className="w-4 h-4" />
            ΑΞΙΟΛΟΓΗΜΕΝΟΙ ΣΥΝΕΡΓΑΤΕΣ
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] mb-6">
            Βρείτε τους καλύτερους τεχνικούς για το σπίτι σας.
          </h1>
          <p className="text-indigo-100 text-lg md:text-xl font-medium leading-relaxed opacity-90 mb-10">
            Το New Concierge Marketplace σας συνδέει με επαγγελματίες που εμπιστεύεται το Γραφείο Διαχείρισης, με ειδικές τιμές για τους ενοίκους μας.
          </p>
          
          <div className="relative max-w-md group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-indigo-300 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <Input 
              placeholder="Αναζήτηση υπηρεσίας (π.χ. υδραυλικός)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 bg-white/95 backdrop-blur-md border-0 rounded-2xl text-indigo-900 placeholder:text-indigo-300 font-medium focus-visible:ring-4 focus-visible:ring-white/20 shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-indigo-600" />
            Διαθέσιμοι Επαγγελματίες
          </h2>
          <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">{filteredPartners.length} ΑΠΟΤΕΛΕΣΜΑΤΑ</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            <p className="text-gray-500 font-bold animate-pulse">Φόρτωση Marketplace...</p>
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2rem] p-20 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900">Δεν βρέθηκαν συνεργάτες</h3>
            <p className="text-gray-500 mt-2">Δοκιμάστε μια διαφορετική αναζήτηση ή ελέγξτε ξανά αργότερα.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPartners.map((partner) => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <MarketplaceContent />
      </SubscriptionGate>
    </AuthGate>
  );
}





