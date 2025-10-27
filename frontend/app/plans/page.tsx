'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Mail, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

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
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    fetchPlans()
    
    // Check if user just registered
    if (searchParams.get('registered') === 'true') {
      setShowRegistrationSuccess(true)
      toast.success('Εγγραφή επιτυχής! Παρακαλώ ελέγξτε το email σας για επιβεβαίωση.')
    }
  }, [searchParams])

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
      {/* Registration Success Banner */}
      {showRegistrationSuccess && (
        <div className="mb-8 max-w-4xl mx-auto">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800">Εγγραφή Επιτυχής!</h3>
                  <p className="text-green-700 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Παρακαλώ ελέγξτε το email σας για επιβεβαίωση του λογαριασμού σας.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRegistrationSuccess(false)}
                  className="ml-auto text-green-600 hover:text-green-700"
                >
                  ✕
                </Button>
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
