'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Loader2, RefreshCw, AlertCircle } from 'lucide-react'

const MAX_RETRIES = 5
const INITIAL_RETRY_DELAY = 2000 // 2 seconds

export default function AcceptTenantPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const sessionId = searchParams.get('session_id') // Optional: for subscription status check
  const [status, setStatus] = useState<'loading' | 'checking' | 'success' | 'error' | 'retry'>('loading')
  const [message, setMessage] = useState('')
  const [tenantInfo, setTenantInfo] = useState<any>(null)
  const retryCountRef = useRef(0)
  const retryDelayRef = useRef(INITIAL_RETRY_DELAY)
  const isProcessingRef = useRef(false)

  const checkSubscriptionStatus = useCallback(async (): Promise<boolean> => {
    // If session_id is provided, check subscription status first
    if (sessionId) {
      try {
        const response = await api.get(`/api/billing/subscription-status/${sessionId}/`)
        const data = response.data
        
        if (data.status === 'completed') {
          return true
        } else if (data.status === 'processing' || data.status === 'pending') {
          setStatus('checking')
          setMessage('Η ρύθμιση δεν έχει ολοκληρωθεί ακόμα, περιμένετε...')
          return false
        } else if (data.status === 'failed') {
          setStatus('error')
          setMessage(data.message || 'Η ρύθμιση του χώρου εργασίας απέτυχε.')
          toast.error(data.message || 'Η ρύθμιση του χώρου εργασίας απέτυχε.')
          return false
        }
      } catch (error: any) {
        // If 404, subscription might not be ready yet, but we can still try to accept invite
        if (error.response?.status === 404) {
          console.log('Subscription status not found, proceeding with invite acceptance')
          return true
        }
        // Other errors: log but continue
        console.warn('Failed to check subscription status:', error)
        return true // Continue with invite acceptance
      }
    }
    
    return true
  }, [sessionId])

  const acceptTenantInvite = useCallback(async (attempt = 0): Promise<void> => {
    if (isProcessingRef.current && attempt === 0) {
      return // Prevent multiple simultaneous calls
    }

    try {
      if (attempt === 0) {
        isProcessingRef.current = true
      }

      // Check subscription status if session_id is provided
      if (sessionId && attempt === 0) {
        const isReady = await checkSubscriptionStatus()
        if (!isReady) {
          // Schedule retry
          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current += 1
            retryDelayRef.current = Math.min(retryDelayRef.current * 1.5, 10000) // Exponential backoff, max 10s
            setStatus('retry')
            
            setTimeout(() => {
              acceptTenantInvite(attempt + 1)
            }, retryDelayRef.current)
            return
          } else {
            setStatus('error')
            setMessage('Η ρύθμιση δεν έχει ολοκληρωθεί ακόμα, προσπάθησε ξανά σε λίγο.')
            isProcessingRef.current = false
            return
          }
        }
      }

      const response = await api.post('/api/tenants/accept-invite/', {
        token: token
      })

      setStatus('success')
      setMessage('Καλώς ήρθατε στο workspace σας!')
      setTenantInfo(response.data.tenant)
      
      // Store tokens with correct keys
      if (response.data.access) {
        localStorage.setItem('access', response.data.access)
      }
      if (response.data.refresh) {
        localStorage.setItem('refresh', response.data.refresh)
      }

      toast.success('Πρόσβαση στο workspace επιτυχής!')

      // Store tenant info for redirect
      if (response.data.tenant) {
        localStorage.setItem('pending_tenant_redirect', JSON.stringify({
          schema_name: response.data.tenant.schema_name,
          domain: response.data.tenant.domain,
          name: response.data.tenant.name
        }));
      }

      // Redirect to dashboard which will handle tenant domain redirect
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000)

      isProcessingRef.current = false

    } catch (error: any) {
      console.error('Tenant accept error:', error)
      
      // Handle 404 with retry logic
      if (error.response?.status === 404) {
        if (attempt < MAX_RETRIES) {
          setStatus('retry')
          setMessage(`Η ρύθμιση δεν έχει ολοκληρωθεί ακόμα, προσπάθησε ξανά σε λίγο... (${attempt + 1}/${MAX_RETRIES})`)
          toast.warning('Η ρύθμιση δεν έχει ολοκληρωθεί ακόμα, προσπάθησε ξανά σε λίγο')
          
          // Exponential backoff
          const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(1.5, attempt), 10000)
          
          setTimeout(() => {
            acceptTenantInvite(attempt + 1)
          }, delay)
          return
        } else {
          setStatus('error')
          setMessage('Η ρύθμιση δεν έχει ολοκληρωθεί ακόμα. Θα λάβετε email όταν είναι έτοιμο.')
          toast.error('Η ρύθμιση δεν έχει ολοκληρωθεί ακόμα. Θα λάβετε email όταν είναι έτοιμο.')
          isProcessingRef.current = false
          return
        }
      }
      
      const errorMessage = error.response?.data?.error || 'Αποτυχία πρόσβασης στο workspace.'
      setStatus('error')
      setMessage(errorMessage)
      toast.error(errorMessage)
      isProcessingRef.current = false
    }
  }, [token, sessionId, router, checkSubscriptionStatus])

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Λείπει το token πρόσβασης.')
      return
    }

    // Reset refs on token change
    retryCountRef.current = 0
    retryDelayRef.current = INITIAL_RETRY_DELAY
    isProcessingRef.current = false

    acceptTenantInvite()
  }, [token, acceptTenantInvite])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {status === 'loading' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Πρόσβαση στο Workspace</h1>
            <p className="text-gray-600">Παρακαλώ περιμένετε...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Επιτυχία!</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            {tenantInfo && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-gray-800 mb-2">Workspace Στοιχεία:</h3>
                <p className="text-sm text-gray-600">
                  <strong>Όνομα:</strong> {tenantInfo.name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Domain:</strong> {tenantInfo.domain}
                </p>
              </div>
            )}
            <p className="text-sm text-gray-500">Ανακατεύθυνση στο dashboard...</p>
          </div>
        )}

        {status === 'checking' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Επαλήθευση Ρύθμισης</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Παρακαλώ περιμένετε...</p>
          </div>
        )}

        {status === 'retry' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
              <AlertCircle className="h-8 w-8 text-yellow-600 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Αναμονή για Ολοκλήρωση</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <p className="text-sm text-blue-800">
                Η ρύθμιση δεν έχει ολοκληρωθεί ακόμα, προσπάθησε ξανά σε λίγο.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Προσπάθεια Ξανά
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Σφάλμα</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  retryCountRef.current = 0
                  retryDelayRef.current = INITIAL_RETRY_DELAY
                  isProcessingRef.current = false
                  setStatus('loading')
                  acceptTenantInvite()
                }}
                className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Προσπάθεια Ξανά
              </button>
              <button
                onClick={() => router.push('/login')}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Μετάβαση στη Σύνδεση
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Επιστροφή στην Αρχική
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}