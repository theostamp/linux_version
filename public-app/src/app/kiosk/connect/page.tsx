'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  Mail, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  Loader2, 
  Phone, 
  Home,
  Info,
  UserCheck,
  Sparkles,
  ExternalLink
} from 'lucide-react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Check if user is authenticated (has valid token)
function checkAuth(): { isAuthenticated: boolean; userEmail?: string } {
  if (typeof window === 'undefined') return { isAuthenticated: false };
  
  const token = localStorage.getItem('access_token') || localStorage.getItem('access');
  const userStr = localStorage.getItem('user');
  
  if (!token) return { isAuthenticated: false };
  
  try {
    if (userStr) {
      const user = JSON.parse(userStr);
      return { isAuthenticated: true, userEmail: user?.email };
    }
  } catch {
    // Invalid user data
  }
  
  return { isAuthenticated: !!token };
}

function KioskConnectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const buildingId = searchParams?.get('building') || searchParams?.get('building_id');
  const token = searchParams?.get('token');

  // User input states
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'existing_user_redirect'>('idle');
  const [message, setMessage] = useState('');
  const [buildingInfo, setBuildingInfo] = useState<{ name: string; address: string } | null>(null);
  
  // View mode: 'initial' for choice screen, 'register' for registration form
  const [viewMode, setViewMode] = useState<'initial' | 'register' | 'info'>('initial');
  
  // Auth state
  const [authState, setAuthState] = useState<{ isAuthenticated: boolean; userEmail?: string }>({ isAuthenticated: false });
  const [authChecked, setAuthChecked] = useState(false);

  // Check auth state on mount
  useEffect(() => {
    const state = checkAuth();
    setAuthState(state);
    setAuthChecked(true);
  }, []);

  // Fetch building info on mount
  useEffect(() => {
    if (buildingId) {
      fetchBuildingInfo(buildingId);
    }
  }, [buildingId]);

  const fetchBuildingInfo = async (id: string) => {
    try {
      // Use public-info endpoint which works without tenant context
      const response = await fetch(`/api/public-info/${id}/`);
      if (response.ok) {
        const data = await response.json();
        // Backend returns building_info object, not building
        const info = data.building_info || data.building || data;
        setBuildingInfo({
          name: info?.name || `Κτίριο #${id}`,
          address: info?.address || ''
        });
      } else {
        // Fallback to generic info
        setBuildingInfo({
          name: `Κτίριο #${id}`,
          address: ''
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

  // Handle authenticated user going to their apartment/dashboard
  const handleGoToMySpace = () => {
    // Store building context from QR scan
    if (buildingId) {
      localStorage.setItem('selectedBuildingId', buildingId);
      localStorage.setItem('activeBuildingId', buildingId);
      console.log(`[KioskConnect] Set active building from QR: ${buildingId}`);
    }
    
    // Get user role to determine destination
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        // Managers go to dashboard, residents go to my-apartment
        if (user.role === 'manager' || user.role === 'office_staff' || user.role === 'admin') {
          router.push('/dashboard');
          return;
        }
      }
    } catch {
      // If parsing fails, default to my-apartment
    }
    
    router.push('/my-apartment');
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
      
      // Debug logging
      console.log('[KioskConnect] API Response:', {
        status: response.status,
        dataStatus: data.status,
        hasAccessToken: !!data.access_token,
        hasTenantUrl: !!data.tenant_url,
        message: data.message,
        error: data.error
      });

      if (response.ok) {
        // Store building context from QR scan for all success cases
        if (buildingId) {
          localStorage.setItem('selectedBuildingId', buildingId);
          localStorage.setItem('activeBuildingId', buildingId);
          console.log(`[KioskConnect] Set active building from registration: ${buildingId}`);
        }
        
        // Check if this is an existing user with instant login token
        if (data.status === 'existing_user' && data.access_token) {
          // Instant login - store token and redirect immediately
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('access', data.access_token);
          
          // Store user data if provided
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
          }
          
          setStatus('existing_user_redirect');
          setMessage(data.message || 'Μεταφέρεστε στο διαμέρισμά σας...');
          
          // Clear form
          setEmail('');
          setPhone('');
          
          // Redirect to my-apartment after brief delay
          // Use tenant subdomain if available for cross-domain redirect
          setTimeout(() => {
            if (data.tenant_url) {
              // Cross-subdomain redirect with tokens - include building context
              const targetUrl = `https://${data.tenant_url}/auth/callback#access=${encodeURIComponent(data.access_token)}&refresh=&redirect=${encodeURIComponent('/my-apartment')}&building=${buildingId}`;
              window.location.href = targetUrl;
            } else {
              router.push('/my-apartment');
            }
          }, 1500);
        } else if (data.status === 'existing_user') {
          // Fallback: email was sent
          setStatus('existing_user_redirect');
          setMessage(data.message || 'Ελέγξτε το email σας για να μεταβείτε απευθείας στο διαμέρισμά σας!');
          setEmail('');
          setPhone('');
        } else {
          // New user - registration email sent
          setStatus('success');
          setMessage(data.message || 'Ελέγξτε το email σας για να συνεχίσετε!');
          setEmail('');
          setPhone('');
        }
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

  // Validation check - show error if no building/token
  if (!buildingId || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Μη έγκυρο QR Code</h2>
          <p className="text-red-200 mb-6">
            Παρακαλώ σαρώστε το QR code από την οθόνη του κτιρίου σας.
          </p>
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <span>Μάθετε περισσότερα για την εφαρμογή</span>
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  // Handle "not me" - switch to new user registration
  const handleNotMe = () => {
    // Clear existing auth tokens to start fresh registration
    localStorage.removeItem('access_token');
    localStorage.removeItem('access');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    console.log('[KioskConnect] Cleared existing tokens for new registration');
    
    // Clear auth state and show registration form
    setAuthState({ isAuthenticated: false });
    setViewMode('register');
  };

  // === AUTHENTICATED USER VIEW ===
  if (authState.isAuthenticated && viewMode === 'initial') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl mb-6 shadow-2xl">
              <UserCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              Καλώς ήρθατε!
            </h1>
            {authState.userEmail && (
              <p className="text-slate-300 text-sm mb-2">
                Συνδεδεμένος ως: <span className="text-emerald-400">{authState.userEmail}</span>
              </p>
            )}
            {buildingInfo && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 mt-4">
                <p className="text-lg font-semibold text-white">{buildingInfo.name}</p>
                {buildingInfo.address && (
                  <p className="text-sm text-slate-400 mt-1">{buildingInfo.address}</p>
                )}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-4">
            {/* Go to App */}
            <button
              onClick={handleGoToMySpace}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
            >
              <Home className="w-5 h-5" />
              <span>Συνέχεια στην εφαρμογή</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Learn More */}
            <Link
              href="/"
              className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3"
            >
              <Info className="w-5 h-5" />
              <span>Μάθε περισσότερα για την εφαρμογή</span>
            </Link>
          </div>

          {/* Not Me - Different User Registration */}
          <div className="text-center mt-6 pt-6 border-t border-white/10">
            <p className="text-slate-400 text-sm mb-3">
              Δεν είστε {authState.userEmail}?
            </p>
            <button
              onClick={handleNotMe}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors underline underline-offset-2"
            >
              Εγγραφή ως νέος χρήστης
            </button>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} New Concierge. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // === INITIAL CHOICE VIEW (Not authenticated) ===
  if (viewMode === 'initial') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header with Building Info */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mb-6 shadow-2xl">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              Καλώς ήρθατε
            </h1>
            {buildingInfo && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-4">
                <p className="text-lg font-semibold text-white">{buildingInfo.name}</p>
                {buildingInfo.address && (
                  <p className="text-sm text-slate-400 mt-1">{buildingInfo.address}</p>
                )}
              </div>
            )}
            <p className="text-slate-300 text-sm">
              Τι θα θέλατε να κάνετε;
            </p>
          </div>

          {/* Choice Cards */}
          <div className="space-y-4">
            {/* I'm a Resident */}
            <button
              onClick={() => setViewMode('register')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold py-5 px-6 rounded-2xl transition-all duration-200 flex items-start gap-4 shadow-lg hover:shadow-xl text-left group"
            >
              <div className="bg-white/20 rounded-xl p-3 group-hover:bg-white/30 transition-colors">
                <Home className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <span className="block text-lg font-bold">Είμαι ιδιοκτήτης / ένοικος</span>
                <span className="text-sm text-slate-300">
                  Σύνδεση ή εγγραφή στην εφαρμογή
                </span>
              </div>
              <ArrowRight className="w-5 h-5 mt-3 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>

            {/* Learn More About the App */}
            <button
              onClick={() => setViewMode('info')}
              className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium py-5 px-6 rounded-2xl transition-all duration-200 flex items-start gap-4 text-left group"
            >
              <div className="bg-white/10 rounded-xl p-3 group-hover:bg-white/20 transition-colors">
                <Sparkles className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <span className="block text-lg font-semibold">Θέλω να μάθω περισσότερα</span>
                <span className="text-sm text-slate-400">
                  Τι είναι η εφαρμογή New Concierge
                </span>
              </div>
              <ArrowRight className="w-5 h-5 mt-3 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} New Concierge. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // === INFO VIEW - About the App ===
  if (viewMode === 'info') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl mb-6 shadow-2xl">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              New Concierge
            </h1>
            <p className="text-slate-300 text-sm">
              Ο Ψηφιακός Θυρωρός της πολυκατοικίας
            </p>
          </div>

          {/* Building Context */}
          {buildingInfo && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6 text-center">
              <p className="text-xs text-emerald-300 uppercase tracking-wider mb-1">Αυτή η οθόνη ανήκει στο</p>
              <p className="text-lg font-semibold text-white">{buildingInfo.name}</p>
              {buildingInfo.address && (
                <p className="text-sm text-slate-400">{buildingInfo.address}</p>
              )}
            </div>
          )}

          {/* Info Card */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl mb-6">
            <h2 className="text-lg font-bold text-white mb-4">Τι είναι το New Concierge;</h2>
            
            <div className="space-y-4 text-slate-200">
              <p className="text-sm leading-relaxed">
                Μια σύγχρονη πλατφόρμα διαχείρισης πολυκατοικιών που φέρνει 
                <span className="text-emerald-400 font-medium"> διαφάνεια, οργάνωση και συνεργασία</span> στις κοινότητες.
              </p>
              
              <div className="border-t border-white/10 pt-4">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-lg">✨</span> Τι προσφέρει:
                </h3>
                <ul className="space-y-2.5 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>Ενημέρωση για ανακοινώσεις & εργασίες</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>Διαφανή οικονομικά & κοινόχρηστα</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>Ψηφοφορίες για αποφάσεις κοινότητας</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>Αιτήματα & επικοινωνία με τη διαχείριση</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>Info Point - Οθόνη ενημέρωσης στην είσοδο</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* CTA for visitors */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4 text-center">
            <p className="text-sm text-blue-200 mb-2">
              Θέλετε να ενεργοποιήσετε το New Concierge στη δική σας πολυκατοικία;
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
            >
              <span>Μάθετε περισσότερα</span>
              <ExternalLink className="w-5 h-5" />
            </Link>

            <button
              onClick={() => setViewMode('initial')}
              className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200"
            >
              ← Πίσω
            </button>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} New Concierge. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // === REGISTRATION FORM VIEW ===
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header with Building Info */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mb-6 shadow-2xl">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Σύνδεση / Εγγραφή
          </h1>
          {buildingInfo && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-2">
              <p className="text-lg font-semibold text-white">{buildingInfo.name}</p>
              {buildingInfo.address && (
                <p className="text-sm text-slate-400 mt-1">{buildingInfo.address}</p>
              )}
            </div>
          )}
        </div>

        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">

          {/* Success State - New User */}
          {status === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 border-2 border-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Επιτυχία!</h3>
              <p className="text-slate-200 leading-relaxed mb-4">{message}</p>
              
              {/* Info about next steps */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mt-4">
                <div className="flex items-center justify-center gap-2 text-blue-300 mb-2">
                  <Mail className="w-5 h-5" />
                  <span className="font-medium">Επόμενο βήμα</span>
                </div>
                <p className="text-sm text-slate-300">
                  Ελέγξτε το email σας και ακολουθήστε τον σύνδεσμο για να ολοκληρώσετε την εγγραφή.
                </p>
              </div>
              
              <button
                onClick={() => setViewMode('initial')}
                className="mt-6 text-slate-400 hover:text-white text-sm transition-colors"
              >
                ← Πίσω στην αρχή
              </button>
            </div>
          )}

          {/* Success State - Existing User (Instant Login) */}
          {status === 'existing_user_redirect' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCheck className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Καλώς ήρθατε! 🎉</h3>
              <p className="text-slate-200 leading-relaxed mb-4">{message}</p>
              
              {/* Loading indicator for redirect */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mt-4">
                <div className="flex items-center justify-center gap-3 text-emerald-300">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-medium">Μεταφορά στο διαμέρισμά σας...</span>
                </div>
              </div>
            </div>
          )}

          {/* Form State */}
          {status !== 'success' && status !== 'existing_user_redirect' && (
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Phone Input */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-200 mb-2">
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
                <p className="text-xs text-slate-500 mt-1">
                  Το τηλέφωνο που είναι καταχωρημένο στο κτίριο
                </p>
              </div>

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">
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
                    <span>Συνέχεια</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Info Text */}
              <div className="text-center">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Θα αναζητηθεί το τηλέφωνό σας στα στοιχεία του κτιρίου.
                  <br />
                  Αν βρεθεί, θα λάβετε email για σύνδεση ή ολοκλήρωση εγγραφής.
                </p>
              </div>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => setViewMode('initial')}
                className="w-full text-slate-400 hover:text-white text-sm transition-colors py-2"
              >
                ← Πίσω
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-slate-500">
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
        <p className="text-slate-300">Φόρτωση...</p>
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

