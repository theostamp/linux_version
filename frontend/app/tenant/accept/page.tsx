'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function TenantAcceptPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')

  useEffect(() => {
    if (!token) {
      toast.error('Λείπει το token')
      router.push('/login')
      return
    }

    acceptInvite()
  }, [token])

  const acceptInvite = async () => {
    try {
      const response = await api.post('/api/tenants/accept-invite/', { token })
      
      // Store tokens
      if (response.data.tokens) {
        localStorage.setItem('access_token', response.data.tokens.access)
        localStorage.setItem('refresh_token', response.data.tokens.refresh)
      }
      
      setStatus('success')
      toast.success('Καλώς ήρθατε στο workspace σας!')
      
      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
      
    } catch (error: any) {
      console.error('Accept invite error:', error)
      setStatus('error')
      
      const errorMsg = error.response?.data?.error || 'Αποτυχία επεξεργασίας πρόσκλησης'
      toast.error(errorMsg)
      
      // Redirect to login after error
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'processing' && (
          <>
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-blue-500" />
            <h1 className="text-2xl font-bold mb-2">Επεξεργασία πρόσκλησης...</h1>
            <p className="text-gray-600">Παρακαλώ περιμένετε...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 text-green-500">✓</div>
            <h1 className="text-2xl font-bold mb-2">Επιτυχία!</h1>
            <p className="text-gray-600">Ανακατεύθυνση στο workspace σας...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">❌</div>
            <h1 className="text-2xl font-bold mb-2">Σφάλμα</h1>
            <p className="text-gray-600">Ανακατεύθυνση στο login...</p>
          </>
        )}
      </div>
    </div>
  )
}
