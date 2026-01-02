'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, Building, ArrowRight, Mail } from 'lucide-react';
import BuildingRevealBackground from '@/components/BuildingRevealBackground';

interface PaymentStatus {
  status: 'loading' | 'success' | 'error' | 'pending' | 'awaiting_email';
  message: string;
  tenantUrl?: string | null;
  error?: string;
}

export default function VerifyPaymentPage() {
  const params = useParams();
  const sessionId = params.session_id as string;

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    status: 'loading',
    message: 'Επαληθεύουμε την πληρωμή σας...'
  });

  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!sessionId) {
      setPaymentStatus({
        status: 'error',
        message: 'Μη έγκυρο session ID',
        error: 'Δεν παρέχεται session ID'
      });
      return;
    }

    // Verify payment status and wait for tenant creation
    const verifyPayment = async () => {
      try {
        setPaymentStatus({
          status: 'loading',
          message: 'Επαληθεύουμε την πληρωμή σας...'
        });

        // Poll for payment verification status
        const pollStatus = async (): Promise<void> => {
          const maxAttempts = 30; // 30 attempts = ~2.5 minutes max
          let attempts = 0;

          while (attempts < maxAttempts) {
            try {
              const response = await fetch(`/api/verify-payment-status?session_id=${sessionId}`);
              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.error || 'Failed to verify payment');
              }

              const { status, message, tenantUrl, emailSent, tenantSubdomain } = data;

              if (status === 'ready') {
                // Tenant ready and email verified
                setPaymentStatus({
                  status: 'success',
                  message: message || 'Το workspace σας είναι έτοιμο!',
                  tenantUrl: tenantUrl || null
                });
                return;
              } else if (status === 'awaiting_email') {
                // Tenant is ready but waiting for email verification - stop polling
                setPaymentStatus({
                  status: 'awaiting_email',
                  message: message || 'Η πληρωμή σας επιβεβαιώθηκε! Έχουμε στείλει email επιβεβαίωσης. Παρακαλώ ελέγξτε το inbox σας.'
                });
                return;
              } else if (status === 'processing') {
                // Still processing - update message and continue polling
        setPaymentStatus({
          status: 'loading',
                  message: message || 'Προετοιμάζουμε το workspace σας...'
                });
              } else if (status === 'error') {
                setPaymentStatus({
                  status: 'error',
                  message: message || 'Προέκυψε σφάλμα κατά την επεξεργασία',
                  error: message
                });
                return;
              }

              // Wait before next poll (5 seconds)
              await new Promise(resolve => setTimeout(resolve, 5000));
              attempts++;
            } catch (error) {
              console.error('Error polling payment status:', error);
              // If it's a network error or API error, check if we should stop polling
              const errorMessage = error instanceof Error ? error.message : String(error);
              // If error indicates a permanent failure, stop polling
              if (errorMessage.includes('Failed to verify payment') || errorMessage.includes('Session not found')) {
                setPaymentStatus({
                  status: 'error',
                  message: 'Προέκυψε σφάλμα κατά την επαλήθευση της πληρωμής. Παρακαλώ επικοινωνήστε με την υποστήριξη.',
                  error: errorMessage
                });
                return;
              }
              // Continue polling on temporary errors
              await new Promise(resolve => setTimeout(resolve, 5000));
              attempts++;
            }
          }

          // Max attempts reached - show pending email verification
        setPaymentStatus({
            status: 'pending',
            message: 'Η πληρωμή σας επιβεβαιώθηκε! Έχουμε στείλει email επιβεβαίωσης. Παρακαλώ ελέγξτε το inbox σας.'
        });
        };

        await pollStatus();

      } catch (error) {
        console.error('Payment verification error:', error);
        setPaymentStatus({
          status: 'error',
          message: 'Προέκυψε σφάλμα κατά την επαλήθευση της πληρωμής',
          error: error instanceof Error ? error.message : 'Άγνωστο σφάλμα'
        });
      }
    };

    verifyPayment();
  }, [sessionId]);

  const renderStatusIcon = () => {
    switch (paymentStatus.status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 text-accent-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-emerald-600" />;
      case 'error':
        return <XCircle className="h-16 w-16 text-rose-600" />;
      case 'awaiting_email':
      case 'pending':
        return <Mail className="h-16 w-16 text-accent-primary" />;
      default:
        return <Loader2 className="h-16 w-16 text-accent-primary animate-spin" />;
    }
  };

  const handleCheckAgain = () => {
    // Reload the page to check status again
    window.location.reload();
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);

    try {
      const response = await fetch('/api/resend-verification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429 && data.remainingSeconds) {
          setResendCooldown(data.remainingSeconds);
          alert(`Παρακαλώ περιμένετε ${data.remainingSeconds} δευτερόλεπτα πριν ξαναστείλετε email.`);
        } else {
          alert(data.message || 'Αποτυχία αποστολής email. Παρακαλώ δοκιμάστε ξανά αργότερα.');
        }
      } else {
        // Success - set 60 second cooldown
        setResendCooldown(60);
        alert('Το email επιβεβαίωσης στάλθηκε επιτυχώς! Παρακαλώ ελέγξτε το inbox σας.');
      }
    } catch (error) {
      console.error('Error resending email:', error);
      alert('Προέκυψε σφάλμα κατά την αποστολή του email. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setIsResending(false);
    }
  };

  const renderStatusMessage = () => {
    return (
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
          {paymentStatus.status === 'success' ? 'Καλώς ήρθατε στο New Concierge!' :
           paymentStatus.status === 'error' ? 'Η Επαλήθευση Πληρωμής Απέτυχε' :
           paymentStatus.status === 'awaiting_email' ? 'Ελέγξτε το Email σας' :
           paymentStatus.status === 'pending' ? 'Ελέγξτε το Email σας' :
           'Επεξεργασία Πληρωμής'}
        </h1>
        <p className="text-lg text-text-secondary mb-8">
          {paymentStatus.message}
        </p>

        {paymentStatus.status === 'success' && paymentStatus.tenantUrl && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-center mb-4">
              <Building className="h-8 w-8 text-emerald-600 mr-2" />
              <span className="text-lg font-semibold text-emerald-800">
                Πίνακας Ελέγχου Κτιρίου
              </span>
            </div>
            <p className="text-emerald-700 mb-4">
              Το κτίριό σας είναι πλέον προσβάσιμο στο:
            </p>
            <div className="bg-white border border-emerald-300 rounded-lg p-4 mb-4">
              <code className="text-emerald-800 font-mono">
                https://{paymentStatus.tenantUrl}
              </code>
            </div>
            <Link
              href={`https://${paymentStatus.tenantUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
            >
              Πρόσβαση στον Πίνακα Ελέγχου
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        )}

        {(paymentStatus.status === 'pending' || paymentStatus.status === 'awaiting_email') && (
          <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-accent-primary mr-2" />
              <span className="text-lg font-semibold text-accent-primary">
                Ελέγξτε το Email σας
              </span>
            </div>
            <p className="text-text-secondary mb-4">
              Έχουμε στείλει email επιβεβαίωσης. Παρακαλώ:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-text-secondary mb-4">
              <li>Ελέγξτε το inbox σας (και spam folder)</li>
              <li>Κάντε click στο link επιβεβαίωσης</li>
              <li>Μετά την επιβεβαίωση, θα λάβετε email με τα στοιχεία login</li>
            </ol>
            <p className="text-sm text-text-secondary mb-6">
              Αν δεν λάβατε email εντός 5 λεπτών, ελέγξτε το spam folder ή επικοινωνήστε μαζί μας.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleCheckAgain}
                className="bg-accent-primary text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-colors inline-flex items-center justify-center shadow-lg shadow-accent-primary/20"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Επιβεβαίωσα το Email - Ελέγξτε Ξανά
              </button>
              <button
                onClick={handleResendEmail}
                disabled={resendCooldown > 0 || isResending}
                className="bg-white text-accent-primary border-2 border-accent-primary/40 px-6 py-3 rounded-lg font-semibold hover:bg-accent-primary/10 transition-colors inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="h-5 w-5 mr-2" />
                {isResending ? 'Αποστολή...' :
                 resendCooldown > 0 ? `Περιμένετε ${resendCooldown}s` :
                 'Επαναποστολή Email'}
              </button>
            </div>
          </div>
        )}

        {paymentStatus.status === 'error' && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 mb-8">
            <p className="text-rose-700 mb-4">
              {paymentStatus.error || 'Προέκυψε απρόσμενο σφάλμα.'}
            </p>
            <div className="space-y-3">
              <Link
                href="/signup"
                className="inline-block bg-rose-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20"
              >
                Δοκιμάστε Ξανά
              </Link>
              <Link
                href="/"
                className="inline-block ml-4 border border-rose-300 text-rose-700 px-6 py-3 rounded-lg font-semibold hover:bg-rose-50 transition-colors"
              >
                Επιστροφή στην Αρχική
              </Link>
            </div>
          </div>
        )}

        {paymentStatus.status === 'loading' && (
          <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-lg p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="animate-pulse bg-accent-primary/30 h-2 w-32 rounded"></div>
              </div>
              <p className="text-text-secondary text-sm">
                Αυτό μπορεί να πάρει λίγα λεπτά. Παρακαλώ μην κλείσετε αυτή τη σελίδα.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-bg-app-main text-text-primary relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_10%,rgba(30,78,140,0.12),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(46,124,144,0.12),transparent_50%)]" />
      <BuildingRevealBackground />
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary shadow-lg shadow-accent-primary/25">
                <Building className="h-5 w-5 text-white" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-xs uppercase tracking-widest text-text-secondary">Ψηφιακός Θυρωρός</span>
                <span className="text-lg font-bold text-accent-primary">newconcierge.app</span>
              </span>
            </Link>
            <Link href="/login" className="text-sm font-medium text-accent-primary hover:opacity-80 transition-opacity">
              Σύνδεση
            </Link>
          </div>
        </div>
      </header>

      <main className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-card-soft p-12">
            <div className="flex flex-col items-center">
              {renderStatusIcon()}
              <div className="mt-8 w-full">
                {renderStatusMessage()}
              </div>
            </div>
          </div>

          {/* Additional Information */}
          {paymentStatus.status === 'success' && (
            <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-card-soft p-8">
              <h2 className="text-xl font-bold text-text-primary mb-4">Τι Ακολουθεί;</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="bg-accent-primary/10 w-8 h-8 rounded-full flex items-center justify-center mr-4 mt-1">
                    <span className="text-accent-primary font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">Επιβεβαιώστε το Email σας</h3>
                    <p className="text-text-secondary">Ελέγξτε το inbox σας και κάντε click στο link επιβεβαίωσης.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-accent-secondary/15 w-8 h-8 rounded-full flex items-center justify-center mr-4 mt-1">
                    <span className="text-accent-secondary font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">Πρόσβαση στον Πίνακα Ελέγχου</h3>
                    <p className="text-text-secondary">Μετά την επιβεβαίωση, θα λάβετε email με τα στοιχεία login.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-emerald-100 w-8 h-8 rounded-full flex items-center justify-center mr-4 mt-1">
                    <span className="text-emerald-700 font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">Ξεκινήστε τη Διαχείριση</h3>
                    <p className="text-text-secondary">Προσθέστε διαμερίσματα, κατοίκους και ρυθμίστε το κτίριό σας.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
