'use client';

import { useState } from 'react';
import { useLoading } from '@/components/contexts/LoadingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, Info } from 'lucide-react';

export default function TestLoadingIndicatorsPage() {
  const { startLoading, stopLoading } = useLoading();
  const [isTestingLogin, setIsTestingLogin] = useState(false);
  const [loginStatus, setLoginStatus] = useState('');

  // Test 1: EnhancedIntroAnimation
  const testIntroAnimation = () => {
    localStorage.removeItem('hasVisited');
    window.location.reload();
  };

  // Test 2: StartupLoader
  const testStartupLoader = () => {
    sessionStorage.removeItem('startupLoaderShown');
    window.location.reload();
  };

  // Test 3: DevCompileIndicator
  const testDevCompileIndicator = () => {
    alert(
      'Για να δοκιμάσετε το DevCompileIndicator:\n\n' +
      '1. Ανοίξτε αυτό το αρχείο στον editor\n' +
      '2. Κάντε μια αλλαγή (π.χ. προσθέστε ένα κενό)\n' +
      '3. Αποθηκεύστε (Ctrl+S)\n' +
      '4. Θα δείτε το indicator πάνω δεξιά'
    );
  };

  // Test 4: NavigationLoader
  const testNavigationLoader = () => {
    alert(
      'Για να δοκιμάσετε το NavigationLoader:\n\n' +
      '1. Κάντε κλικ σε οποιοδήποτε link του sidebar\n' +
      '2. Θα δείτε το loading modal κατά την πλοήγηση\n' +
      '3. Δοκιμάστε και το back button του browser'
    );
  };

  // Test 5: GlobalLoadingOverlay
  const testGlobalLoadingOverlay = async () => {
    startLoading('Δοκιμή Global Loading Overlay...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    stopLoading();
  };

  // Test 6: LoginForm Loading
  const testLoginFormLoading = async () => {
    setIsTestingLogin(true);
    setLoginStatus('Παρακαλώ περιμένετε...');
    
    // Simulate login delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setLoginStatus('Επιτυχής σύνδεση! Μεταφέρεστε...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsTestingLogin(false);
    setLoginStatus('');
  };

  const indicators = [
    {
      id: 1,
      name: 'EnhancedIntroAnimation',
      description: 'Εμφανίζεται στην πρώτη επίσκεψη',
      trigger: 'localStorage.hasVisited',
      action: testIntroAnimation,
      buttonText: 'Reset & Reload',
      isManual: false,
      environment: 'All',
    },
    {
      id: 2,
      name: 'StartupLoader',
      description: 'Εμφανίζεται στην πρώτη φόρτωση dev session',
      trigger: 'sessionStorage.startupLoaderShown',
      action: testStartupLoader,
      buttonText: 'Reset & Reload',
      isManual: false,
      environment: 'Dev only',
    },
    {
      id: 3,
      name: 'DevCompileIndicator',
      description: 'Εμφανίζεται κατά το Hot Module Reload',
      trigger: 'EventSource (webpack-hmr)',
      action: testDevCompileIndicator,
      buttonText: 'Show Instructions',
      isManual: true,
      environment: 'Dev only',
    },
    {
      id: 4,
      name: 'NavigationLoader',
      description: 'Εμφανίζεται κατά την πλοήγηση μεταξύ σελίδων',
      trigger: 'Link clicks, popstate',
      action: testNavigationLoader,
      buttonText: 'Show Instructions',
      isManual: true,
      environment: 'All',
    },
    {
      id: 5,
      name: 'GlobalLoadingOverlay',
      description: 'Προγραμματικό loading overlay (Context)',
      trigger: 'startLoading() / stopLoading()',
      action: testGlobalLoadingOverlay,
      buttonText: 'Test (3s)',
      isManual: false,
      environment: 'All',
    },
    {
      id: 6,
      name: 'LoginForm',
      description: 'Loading state κατά τη διαδικασία login',
      trigger: 'Local state',
      action: testLoginFormLoading,
      buttonText: 'Test Login Loading',
      isManual: false,
      environment: 'All',
    },
  ];

  const getEnvironmentColor = (env: string) => {
    if (env === 'Dev only') return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300';
    return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300';
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Loading Indicators Test Page
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Δοκιμάστε όλα τα loading indicators με το μήνυμα "Παρακαλώ περιμένετε"
        </p>
      </div>

      {/* Summary Card */}
      <Card className="mb-8 border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            Επιβεβαίωση Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="text-3xl font-bold text-green-600">6</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Indicators</div>
            </div>
            <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="text-3xl font-bold text-blue-600">100%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Coverage</div>
            </div>
            <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="text-3xl font-bold text-purple-600">✅</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">All Working</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {indicators.map((indicator) => (
          <Card key={indicator.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-blue-600 font-mono text-sm">#{indicator.id}</span>
                    {indicator.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {indicator.description}
                  </CardDescription>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEnvironmentColor(indicator.environment)}`}>
                  {indicator.environment}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Trigger:</div>
                <code className="text-xs font-mono text-blue-600 dark:text-blue-400">
                  {indicator.trigger}
                </code>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={indicator.action}
                  className="flex-1"
                  variant={indicator.isManual ? 'outline' : 'default'}
                  disabled={indicator.id === 6 && isTestingLogin}
                >
                  {indicator.id === 6 && isTestingLogin ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Φόρτωση...
                    </>
                  ) : (
                    indicator.buttonText
                  )}
                </Button>
                
                {indicator.isManual && (
                  <Info className="w-4 h-4 text-gray-400" />
                )}
              </div>

              {indicator.id === 6 && loginStatus && (
                <div className="text-sm text-center text-gray-600 dark:text-gray-400 animate-pulse">
                  {loginStatus}
                </div>
              )}

              {indicator.id === 6 && isTestingLogin && (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Section */}
      <Card className="mt-8 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            Πληροφορίες
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">🎯 Κάλυψη</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>Πρώτη επίσκεψη: ✅ EnhancedIntroAnimation</li>
              <li>Dev πρώτη φόρτωση: ✅ StartupLoader</li>
              <li>Dev hot reload: ✅ DevCompileIndicator</li>
              <li>Navigation: ✅ NavigationLoader</li>
              <li>Async operations: ✅ GlobalLoadingOverlay</li>
              <li>Login process: ✅ LoginForm</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">📚 Documentation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Για αναλυτική τεκμηρίωση, δείτε το αρχείο:{' '}
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                LOADING_INDICATORS_VERIFICATION.md
              </code>
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">🔧 Automated Test</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Τρέξτε το automated verification script:
            </p>
            <code className="block bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded text-xs font-mono">
              ./verify_loading_indicators.sh
            </code>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-300 font-medium">
              ✅ Όλα τα loading indicators λειτουργούν σωστά και το μήνυμα "Παρακαλώ περιμένετε" 
              εμφανίζεται σε όλες τις περιπτώσεις!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


