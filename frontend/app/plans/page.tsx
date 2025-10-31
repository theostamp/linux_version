'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/components/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Mail, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Plan {
  id: number
  name: string
  plan_type: string
  description: string
  monthly_price: string
  yearly_price: string
  max_buildings: number
  max_apartments: number
  max_users: number
  has_analytics: boolean
  has_priority_support: boolean
  trial_days: number
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null)
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [showResendInput, setShowResendInput] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthReady } = useAuth()

  useEffect(() => {
    fetchPlans()
    
    // Check if user just registered
    if (searchParams.get('registered') === 'true') {
      setShowRegistrationSuccess(true)
      // Get email from URL params if available
      const emailParam = searchParams.get('email')
      if (emailParam) {
        setResendEmail(emailParam)
      }
      toast.success('Εγγραφή επιτυχής! Παρακαλώ ελέγξτε το email σας για επιβεβαίωση.')
    }
  }, [searchParams])

  // Check email verification status when user is authenticated
  useEffect(() => {
    if (isAuthReady && user && user.email_verified !== true) {
      // User is logged in but email is not verified
      // Redirect to register page after showing warning
      toast.error('Παρακαλώ επιβεβαιώστε το email σας πριν επιλέξετε πακέτο.')
      setTimeout(() => {
        router.push('/register?unverified=true')
      }, 2000)
    }
  }, [user, isAuthReady, router])

  const fetchPlans = async () => {
    try {
      const response = await api.get('/billing/plans/')
      console.log('[PLANS] API response:', response.data)
      console.log('[PLANS] Loaded successfully - deployment active')
      
      // Handle different response formats
      if (Array.isArray(response.data)) {
        // Direct array
        setPlans(response.data)
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        // Django REST Framework pagination format
        setPlans(response.data.results)
      } else if (response.data?.plans && Array.isArray(response.data.plans)) {
        // Nested plans array
        setPlans(response.data.plans)
      } else {
        console.error('Invalid plans data format:', response.data)
        toast.error('Μη έγκυρη μορφή δεδομένων πακέτων')
        setPlans([])
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error)
      toast.error('Αποτυχία φόρτωσης πακέτων')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlan = async (planId: number) => {
    // Check if user is authenticated and email is verified
    if (isAuthReady && user) {
      if (user.email_verified !== true) {
        toast.error('Παρακαλώ επιβεβαιώστε το email σας πριν επιλέξετε πακέτο.')
        router.push('/register?unverified=true')
        return
      }
    } else if (isAuthReady && !user) {
      // User is not authenticated, redirect to register
      toast.info('Παρακαλώ εγγραφείτε ή συνδεθείτε για να επιλέξετε πακέτο.')
      router.push('/register')
      return
    }

    setSelectedPlan(planId)
    
    try {
      // Create checkout session
      const response = await api.post('/billing/create-checkout-session/', {
        plan_id: planId,
        building_name: '' // Optional
      })

      // Redirect to Stripe Checkout
      window.location.href = response.data.checkout_url
      
    } catch (error: any) {
      console.error('Checkout error:', error)
      
      if (error.response?.data?.error) {
        toast.error(error.response.data.error)
      } else {
        toast.error('Αποτυχία δημιουργίας checkout session')
      }
      
      setSelectedPlan(null)
    }
  }

  const handleResendVerification = async () => {
    if (!resendEmail) {
      toast.error('Παρακαλώ εισάγετε το email σας')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(resendEmail)) {
      toast.error('Παρακαλώ εισάγετε έγκυρο email')
      return
    }

    setResending(true)
    try {
      const response = await api.post('/api/users/resend-verification/', {
        email: resendEmail
      })

      toast.success('Email επιβεβαίωσης στάλθηκε ξανά! Παρακαλώ ελέγξτε το inbox σας.')
      setShowResendInput(false)
    } catch (error: any) {
      console.error('Resend verification error:', error)
      
      const errorMessage = error.response?.data?.error || 'Αποτυχία επαναποστολής email'
      toast.error(errorMessage)
    } finally {
      setResending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Registration Success Banner */}
      {showRegistrationSuccess && (
        <div className="mb-8 max-w-4xl mx-auto">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-800">Εγγραφή Επιτυχής!</h3>
                    <p className="text-green-700 flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4" />
                      Παρακαλώ ελέγξτε το email σας για επιβεβαίωση του λογαριασμού σας.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRegistrationSuccess(false)}
                    className="text-green-600 hover:text-green-700"
                  >
                    ✕
                  </Button>
                </div>
                
                {/* Resend Email Section */}
                {!showResendInput ? (
                  <div className="pt-2 border-t border-green-200">
                    <p className="text-sm text-green-700 mb-2">
                      Δεν λάβατε το email;
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowResendInput(true)}
                      className="text-green-700 border-green-300 hover:bg-green-100"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Επαναποστολή Email Επιβεβαίωσης
                    </Button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-green-200 space-y-3">
                    <div>
                      <Label htmlFor="resend-email" className="text-green-800 text-sm font-medium">
                        Email για επαναποστολή
                      </Label>
                      <Input
                        id="resend-email"
                        type="email"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="mt-1 border-green-300"
                        disabled={resending}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleResendVerification}
                        disabled={resending || !resendEmail}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {resending ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Αποστολή...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            Στείλε Email
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowResendInput(false)
                          setResendEmail('')
                        }}
                        disabled={resending}
                        className="text-green-700 hover:text-green-800"
                      >
                        Ακύρωση
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Επιλέξτε το Πακέτο σας</h1>
        <p className="text-xl text-gray-600 mb-4">
          Ξεκινήστε με 14 ημέρες δωρεάν δοκιμή!
        </p>

        {/* Warning for unverified users */}
        {isAuthReady && user && user.email_verified !== true && (
          <div className="max-w-3xl mx-auto mb-8">
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-orange-900 mb-2">Επιβεβαιώστε το Email σας</h3>
                    <p className="text-sm text-orange-800 mb-3">
                      Για να επιλέξετε πακέτο, πρέπει πρώτα να επιβεβαιώσετε το email σας. 
                      Παρακαλώ ελέγξτε το inbox σας και κάντε κλικ στο link επιβεβαίωσης.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/register?unverified=true')}
                        className="text-orange-700 border-orange-300 hover:bg-orange-100"
                      >
                        Μετάβαση στην Εγγραφή
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowResendInput(true)
                          setResendEmail(user.email || '')
                        }}
                        className="text-orange-700 border-orange-300 hover:bg-orange-100"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Επαναποστολή Email
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Important Notice */}
        <div className="max-w-3xl mx-auto mb-8">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-lg">ℹ️</span>
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-blue-900 mb-2">Σημαντικές Πληροφορίες - Δωρεάν Trial</h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                      <span><strong>14 ημέρες δωρεάν trial:</strong> Όταν ολοκληρώσετε την εγγραφή, θα έχετε <strong>πλήρη πρόσβαση για 14 ημέρες</strong> <strong className="text-green-700">χωρίς χρέωση</strong>. <strong>Δεν πληρώνετε τίποτα</strong> κατά τη διάρκεια του trial.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                      <span><strong>Αυτόματη χρέωση μετά το trial:</strong> Μετά το τέλος των 14 ημερών, η συνδρομή θα ανανεώνεται <strong>αυτόματα</strong> κάθε μήνα με χρέωση <strong>€{plans[0]?.monthly_price || '29'}/μήνα</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                      <span><strong>Ακύρωση ανά πάσα στιγμή:</strong> Μπορείτε να ακυρώσετε τη συνδρομή σας <strong>οποιαδήποτε στιγμή</strong>, ακόμα και πριν το τέλος του trial, χωρίς πρόσθετη χρέωση.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative">
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="mb-4">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold">€{plan.monthly_price}</span>
                  <span className="text-gray-600">/μήνα</span>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
                  <div className="text-sm text-green-700 font-semibold mb-1">
                    ✓ 14 ημέρες δωρεάν trial
                  </div>
                  <div className="text-xs text-green-600">
                    Δεν πληρώνετε τίποτα για 14 ημέρες
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Μετά το trial: €{plan.monthly_price}/μήνα (αυτόματη χρέωση)
                </div>
              </div>

              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>
                    {plan.max_buildings === 999999 ? 'Απεριόριστα' : plan.max_buildings} κτίρια
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>
                    {plan.max_apartments === 999999 ? 'Απεριόριστα' : plan.max_apartments} διαμερίσματα
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>
                    {plan.max_users === 999999 ? 'Απεριόριστοι' : plan.max_users} χρήστες
                  </span>
                </li>
                {plan.has_analytics && (
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Αναλυτικά στατιστικά</span>
                  </li>
                )}
                {plan.has_priority_support && (
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Προτεραιότητα υποστήριξης</span>
                  </li>
                )}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={
                  selectedPlan === plan.id || 
                  Boolean(isAuthReady && user && user.email_verified !== true)
                }
                className="w-full"
              >
                {selectedPlan === plan.id 
                  ? 'Φόρτωση...' 
                  : (isAuthReady && user && user.email_verified !== true)
                  ? 'Απαιτείται Επιβεβαίωση Email'
                  : 'Επιλογή Πακέτου'
                }
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
