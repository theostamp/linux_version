'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Building2, Mail, ArrowRight, Check, AlertCircle, Loader2, Phone, Home } from 'lucide-react';
// Note: Home icon kept for success message section

// Force dynamic rendering
export const dynamic = 'force-dynamic';

function KioskConnectContent() {
  const searchParams = useSearchParams();
  const buildingId = searchParams?.get('building') || searchParams?.get('building_id');
  const token = searchParams?.get('token');

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [buildingInfo, setBuildingInfo] = useState<{ name: string; address: string } | null>(null);

  // Fetch building info on mount
  useEffect(() => {
    if (buildingId) {
      fetchBuildingInfo(buildingId);
    }
  }, [buildingId]);

  const fetchBuildingInfo = async (id: string) => {
    try {
      const response = await fetch(`/api/buildings/${id}/`);
      if (response.ok) {
        const data = await response.json();
        setBuildingInfo({
          name: data.name || `Κτίριο #${id}`,
          address: data.address || ''
        });
      }
    } catch (error) {
      console.error('Error fetching building info:', error);
      setBuildingInfo({
        name: `Κτίριο #${id}`,
        address: ''
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone) {
      setStatus('error');
      setMessage('Παρακαλώ συμπληρώστε το τηλέφωνό σας');
      return;
    }

    if (!email || !buildingId || !token) {
      setStatus('error');
      setMessage('Παρακαλώ συμπληρώστε το email σας');
      return;
    }

    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const response = await fetch('/api/kiosk/connect/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          building_id: buildingId,
          token,
          phone
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Ελέγξτε το email σας για να συνεχίσετε!');
        // Clear form
        setEmail('');
        setPhone('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Σφάλμα σύνδεσης. Παρακαλώ δοκιμάστε ξανά.');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Validation check
  if (!buildingId || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Μη έγκυρο QR Code</h2>
          <p className="text-red-200">
            Παρακαλώ σαρώστε το QR code από την οθόνη του κτιρίου σας.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header with Building Info */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mb-6 shadow-2xl">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Καλώς ήρθατε
          </h1>
          {buildingInfo && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-2">
              <p className="text-lg font-semibold text-white">{buildingInfo.name}</p>
              {buildingInfo.address && (
                <p className="text-sm text-white/60 mt-1">{buildingInfo.address}</p>
              )}
            </div>
          )}
          <p className="text-white/70 text-sm">
            Συνδεθείτε ή εγγραφείτε για πρόσβαση στην εφαρμογή
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 border-2 border-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Επιτυχία!</h3>
              <p className="text-white/80 leading-relaxed mb-4">{message}</p>
              
              {/* Info about next steps */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mt-4">
                <div className="flex items-center justify-center gap-2 text-blue-300 mb-2">
                  <Home className="w-5 h-5" />
                  <span className="font-medium">Επόμενο βήμα</span>
                </div>
                <p className="text-sm text-white/70">
                  Ελέγξτε το email σας και ακολουθήστε τον σύνδεσμο για να ολοκληρώσετε την εγγραφή.
                  Μετά θα μπορείτε να δείτε το διαμέρισμά σας!
                </p>
              </div>
            </div>
          )}

          {/* Form State */}
          {status !== 'success' && (
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Phone Input */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-white/80 mb-2">
                  Τηλέφωνο *
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="69xxxxxxxx"
                    required
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-white/40 mt-1">
                  Το τηλέφωνο που είναι καταχωρημένο στο κτίριο
                </p>
              </div>

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Error Message */}
              {status === 'error' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-200">{message}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !email || !phone}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-purple-600"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Αναζήτηση τηλεφώνου...</span>
                  </>
                ) : (
                  <>
                    <span>Εγγραφή</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Info Text */}
              <div className="text-center">
                <p className="text-xs text-white/50 leading-relaxed">
                  Θα αναζητηθεί το τηλέφωνό σας στα στοιχεία του κτιρίου.
                  <br />
                  Αν βρεθεί, θα λάβετε email για ολοκλήρωση εγγραφής.
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} New Concierge. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

// Loading fallback
function KioskConnectLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
        <p className="text-white/70">Φόρτωση...</p>
      </div>
    </div>
  );
}

// Main page component with Suspense
export default function KioskConnectPage() {
  return (
    <Suspense fallback={<KioskConnectLoading />}>
      <KioskConnectContent />
    </Suspense>
  );
}
