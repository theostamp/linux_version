'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Mail, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/contexts/AuthContext'

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
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  useEffect(() => {
    fetchPlans()
    checkEmailVerificationStatus()
  }, [searchParams, user])
  
  const checkEmailVerificationStatus = async () => {
    // Check if user just registered or if there's a pending email
    const email = searchParams.get('email') || (typeof window !== 'undefined' ? localStorage.getItem('pending_verification_email') : null)
    
    if (!email && searchParams.get('registered') !== 'true') {
      return
    }
    
    // If user is already authenticated and email is verified, clear the pending state
    if (user && user.email_verified) {
      console.log('[PLANS] User is already verified, clearing pending verification state')
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pending_verification_email')
      }
      setEmailVerified(true)
      setShowRegistrationSuccess(false)
      return
    }
    
    // If we have an email, check its verification status
    if (email) {
      setCheckingStatus(true)
      setPendingEmail(email)
      
      try {
        // Check if email is already verified by trying to get user info
        const response = await api.post('/api/users/check-email-status/', { email })
        
        if (response.data.email_verified) {
          console.log('[PLANS] Email is already verified, clearing pending state')
          setEmailVerified(true)
          setShowRegistrationSuccess(false)
          if (typeof window !== 'undefined') {
            localStorage.removeItem('pending_verification_email')
          }
          toast.info('Το email σας έχει ήδη επιβεβαιωθεί. Παρακαλώ συνδεθείτε.')
          setTimeout(() => {
            router.push('/login?verified=true')
          }, 2000)
        } else {
          // Email not verified yet, show the banner
          setShowRegistrationSuccess(true)
          if (searchParams.get('registered') === 'true') {
            toast.success('Εγγραφή επιτυχής! Παρακαλώ ελέγξτε το email σας για επιβεβαίωση.')
          }
        }
      } catch (error: any) {
        // If endpoint doesn't exist or user not found, assume email is not verified
        console.log('[PLANS] Could not check email status, assuming not verified')
        setShowRegistrationSuccess(true)
        if (searchParams.get('registered') === 'true') {
          toast.success('Εγγραφή επιτυχής! Παρακαλώ ελέγξτε το email σας για επιβεβαίωση.')
        }
      } finally {
        setCheckingStatus(false)
      }
    } else if (searchParams.get('registered') === 'true') {
      // No email but registered flag - check localStorage
      const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('pending_verification_email') : null
      if (storedEmail) {
        setPendingEmail(storedEmail)
        setShowRegistrationSuccess(true)
        toast.success('Εγγραφή επιτυχής! Παρακαλώ ελέγξτε το email σας για επιβεβαίωση.')
      }
    }
  }
  
  const handleResendVerificationEmail = async () => {
    const email = pendingEmail || searchParams.get('email') || (typeof window !== 'undefined' ? localStorage.getItem('pending_verification_email') : null)
    
    if (!email) {
      toast.error('Δεν βρέθηκε email για επαναποστολή.')
      return
    }
    
    setResendingEmail(true)
    
    try {
      await api.post('/api/users/resend-verification/', { email })
      toast.success('Το email επιβεβαίωσης στάλθηκε ξανά. Παρακαλώ ελέγξτε το inbox σας.')
    } catch (error: any) {
      console.error('Resend email error:', error)
      const errorMessage = error.response?.data?.error || 'Αποτυχία επαναποστολής email.'
      toast.error(errorMessage)
    } finally {
      setResendingEmail(false)
    }
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Registration Success Banner - Only show if email is NOT verified */}
      {showRegistrationSuccess && !emailVerified && (
        <div className="mb-8 max-w-4xl mx-auto">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-800 mb-2">Εγγραφή Επιτυχής!</h3>
                    <p className="text-blue-700 flex items-center gap-2 mb-3">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span>Παρακαλώ ελέγξτε το email σας <strong>{pendingEmail || 'σας'}</strong> για επιβεβαίωση του λογαριασμού σας.</span>
                    </p>
                    <p className="text-sm text-blue-600 mb-4">
                      Αν δεν έχετε λάβει το email, κάντε κλικ στο κουμπί "Επαναποστολή Email" παρακάτω.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRegistrationSuccess(false)}
                    className="text-blue-600 hover:text-blue-700 flex-shrink-0"
                  >
                    ✕
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleResendVerificationEmail}
                    disabled={resendingEmail}
                    className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <RefreshCw className={`w-4 h-4 ${resendingEmail ? 'animate-spin' : ''}`} />
                    {resendingEmail ? 'Αποστολή...' : 'Επαναποστολή Email'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => window.open(`mailto:${pendingEmail}`, '_blank')}
                    className="flex items-center gap-2 text-blue-700 hover:bg-blue-100"
                  >
                    <Mail className="w-4 h-4" />
                    Άνοιγμα Email App
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Επιλέξτε το Πακέτο σας</h1>
        <p className="text-xl text-gray-600">
          Ξεκινήστε με {plans[0]?.trial_days || 14} ημέρες δωρεάν δοκιμή!
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative">
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">€{plan.monthly_price}</span>
                <span className="text-gray-600">/μήνα</span>
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
                disabled={selectedPlan === plan.id}
                className="w-full"
              >
                {selectedPlan === plan.id ? 'Φόρτωση...' : 'Επιλογή Πακέτου'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
