import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

// Components
import LandingPage from './components/LandingPage';
import RegistrationForm from './components/RegistrationForm';
import PaymentForm from './components/PaymentForm';
import SuccessPage from './components/SuccessPage';
import Dashboard from './components/Dashboard';
import AuthCallback from './components/AuthCallback';
import SubscriptionManagement from './components/SubscriptionManagement';
import Financial from './components/Financial';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<RegistrationForm />} />
            <Route path="/payment" element={<PaymentForm />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/financial" element={<Financial />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/my-subscription" element={<SubscriptionManagement />} />
          </Routes>
          
          {/* Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;

