'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function AcceptTenantPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [tenantInfo, setTenantInfo] = useState<any>(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Λείπει το token πρόσβασης.')
      return
    }

    const acceptTenantInvite = async () => {
      try {
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

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)

      } catch (error: any) {
        console.error('Tenant accept error:', error)
        
        const errorMessage = error.response?.data?.error || 'Αποτυχία πρόσβασης στο workspace.'
        setStatus('error')
        setMessage(errorMessage)
        toast.error(errorMessage)
      }
    }

    acceptTenantInvite()
  }, [token, router])

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

        {status === 'error' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Σφάλμα</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/login')}
                className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
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