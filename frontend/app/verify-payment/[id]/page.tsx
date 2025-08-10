'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Building, Home, User, Calendar, Euro, FileText, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';

interface PaymentVerification {
  payment_id: number;
  apartment_number: string;
  building_name: string;
  amount: number;
  date: string;
  method: string;
  payment_type: string;
  payer_name: string;
  payer_type: string;
  reference_number: string;
  notes: string;
  verified_at: string;
  status: string;
}

export default function VerifyPaymentPage() {
  const params = useParams();
  const paymentId = params.id as string;
  
  const [verification, setVerification] = useState<PaymentVerification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (paymentId) {
      verifyPayment();
    }
  }, [paymentId]);

  const verifyPayment = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get(`/financial/payments/${paymentId}/verify/`);
      
      if (response.data.success) {
        setVerification(response.data.data);
        toast.success('Η πληρωμή επαληθεύθηκε επιτυχώς!');
      } else {
        setError(response.data.error || 'Σφάλμα κατά την επαλήθευση');
        toast.error('Η επαλήθευση απέτυχε');
      }
    } catch (err: any) {
      console.error('Error verifying payment:', err);
      setError(err.response?.data?.error || 'Σφάλμα κατά την επαλήθευση της πληρωμής');
      toast.error('Η επαλήθευση απέτυχε');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('el-GR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Επαλήθευση Πληρωμής</h2>
            <p className="text-gray-600">Παρακαλώ περιμένετε...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-red-900">Επαλήθευση Απέτυχε</h2>
            <p className="text-red-700 mb-6">{error}</p>
            <div className="space-y-3">
              <Button 
                onClick={verifyPayment}
                className="w-full"
              >
                Δοκιμάστε Ξανά
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.history.back()}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Επιστροφή
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!verification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-gray-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Δεν Βρέθηκε Πληρωμή</h2>
            <p className="text-gray-600 mb-6">Η πληρωμή με ID {paymentId} δεν βρέθηκε</p>
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Επιστροφή
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center pb-4">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-900">
            Επαλήθευση Επιτυχής!
          </CardTitle>
          <p className="text-green-700">
            Η πληρωμή επαληθεύθηκε στις {formatDate(verification.verified_at)}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Building & Apartment Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Building className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Κτίριο</h3>
              </div>
              <p className="text-blue-800">{verification.building_name}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Home className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-900">Διαμέρισμα</h3>
              </div>
              <p className="text-green-800">{verification.apartment_number}</p>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-lg text-center text-white">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Euro className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Ποσό Πληρωμής</h3>
            </div>
            <div className="text-3xl font-bold">{formatCurrency(verification.amount)}</div>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Στοιχεία Πληρωμής
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Ημερομηνία:</span>
                  <span className="font-medium">{formatDate(verification.date)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Μέθοδος:</span>
                  <Badge variant="secondary">{verification.method}</Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Τύπος:</span>
                  <Badge variant="outline">{verification.payment_type}</Badge>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Πληρωτής:</span>
                  <span className="font-medium">{verification.payer_name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Ιδιότητα:</span>
                  <Badge variant="secondary">{verification.payer_type}</Badge>
                </div>
                
                {verification.reference_number !== 'Μη διαθέσιμος' && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Αρ. Αναφοράς:</span>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {verification.reference_number}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {verification.notes !== 'Δεν υπάρχουν σημειώσεις' && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">Σημειώσεις</h4>
              <p className="text-yellow-800">{verification.notes}</p>
            </div>
          )}

          {/* Verification Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ID Πληρωμής:</p>
                <p className="font-mono text-sm font-medium">{verification.payment_id}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Επαληθεύθηκε:</p>
                <p className="text-sm font-medium">{formatDate(verification.verified_at)}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={() => window.history.back()}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Επιστροφή
            </Button>
            <Button 
              onClick={() => window.print()}
              className="flex-1"
            >
              🖨️ Εκτύπωση
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
