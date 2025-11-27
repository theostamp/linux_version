import React, { useState, useEffect } from 'react';
import { Supplier } from '@/types/financial';
import { useSuppliersByCategory } from '@/hooks/useSuppliers';

interface SupplierSelectorProps {
  buildingId: number;
  category?: string;
  value?: number;
  onChange: (supplierId: number | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const SupplierSelector: React.FC<SupplierSelectorProps> = ({
  buildingId,
  category,
  value,
  onChange,
  placeholder = "Επιλέξτε προμηθευτή",
  className = "",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  
  const { suppliers, loading, error } = useSuppliersByCategory(buildingId, category);

  // Βρίσκω τον επιλεγμένο προμηθευτή
  useEffect(() => {
    if (value && suppliers.length > 0) {
      const supplier = suppliers.find(s => s.id === value);
      setSelectedSupplier(supplier || null);
    } else {
      setSelectedSupplier(null);
    }
  }, [value, suppliers]);

  const handleSelect = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    onChange(supplier.id);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedSupplier(null);
    onChange(undefined);
  };

  const filteredSuppliers = category 
    ? suppliers.filter(s => s.category === category)
    : suppliers;

  return (
    <div className={`relative ${className}`}>
      {/* Κουμπί επιλογής */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left border border-slate-200 rounded-md 
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}
          ${selectedSupplier ? 'text-gray-900' : 'text-gray-500'}
        `}
      >
        {selectedSupplier ? (
          <div className="flex items-center justify-between">
            <span className="truncate">{selectedSupplier.name}</span>
            <span className="text-xs text-gray-500 ml-2">
              {selectedSupplier.category_display}
            </span>
          </div>
        ) : (
          <span>{placeholder}</span>
        )}
        <span className="absolute right-3 top-1/2 transform -translate-y-1/2">
          ▼
        </span>
      </button>

      {/* Κουμπί καθαρισμού */}
      {selectedSupplier && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      )}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-gray-500">Φόρτωση προμηθευτών...</div>
          ) : error ? (
            <div className="px-3 py-2 text-red-500">Σφάλμα: {error}</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="px-3 py-2 text-gray-500">
              {category ? 'Δεν βρέθηκαν προμηθευτές για αυτή την κατηγορία' : 'Δεν βρέθηκαν προμηθευτές'}
            </div>
          ) : (
            <div>
              {filteredSuppliers.map((supplier) => (
                <button
                  key={supplier.id}
                  type="button"
                  onClick={() => handleSelect(supplier)}
                  className={`
                    w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none
                    ${selectedSupplier?.id === supplier.id ? 'bg-blue-50 text-blue-900' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{supplier.name}</div>
                      <div className="text-sm text-gray-500">
                        {supplier.category_display}
                        {supplier.account_number && ` • ${supplier.account_number}`}
                      </div>
                    </div>
                    {supplier.phone && (
                      <div className="text-xs text-gray-400">
                        📞 {supplier.phone}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Overlay για κλείσιμο */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

// Component για προβολή λεπτομερειών προμηθευτή
interface SupplierDetailsProps {
  supplier: Supplier;
  className?: string;
}

export const SupplierDetails: React.FC<SupplierDetailsProps> = ({ supplier, className = "" }) => {
  return (
    <div className={`bg-gray-50 rounded-md p-3 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{supplier.name}</h4>
          <p className="text-sm text-gray-600">{supplier.category_display}</p>
          
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            {supplier.account_number && (
              <div>📋 Λογαριασμός: {supplier.account_number}</div>
            )}
            {supplier.phone && (
              <div>📞 Τηλέφωνο: {supplier.phone}</div>
            )}
            {supplier.email && (
              <div>✉️ Email: {supplier.email}</div>
            )}
            {supplier.address && (
              <div>📍 Διεύθυνση: {supplier.address}</div>
            )}
            {supplier.vat_number && (
              <div>🏢 ΑΦΜ: {supplier.vat_number}</div>
            )}
            {supplier.contract_number && (
              <div>📄 Συμβόλαιο: {supplier.contract_number}</div>
            )}
          </div>
          
          {supplier.notes && (
            <div className="mt-2 text-sm text-gray-600">
              <strong>Σημειώσεις:</strong> {supplier.notes}
            </div>
          )}
        </div>
        
        <div className="ml-3">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            supplier.is_active 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {supplier.is_active ? 'Ενεργός' : 'Ανενεργός'}
          </span>
        </div>
      </div>
    </div>
  );
}; 