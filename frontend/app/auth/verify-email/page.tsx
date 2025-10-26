'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Λείπει το token επιβεβαίωσης.')
      return
    }

    const verifyEmail = async () => {
      try {
        const response = await api.post('/api/users/verify-email/', {
          token: token
        })

        setStatus('success')
        setMessage('Το email σας επιβεβαιώθηκε επιτυχώς!')
        toast.success('Email επιβεβαιώθηκε!')

        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login?verified=true')
        }, 2000)

      } catch (error: any) {
        console.error('Email verification error:', error)
        
        const errorMessage = error.response?.data?.error || 'Αποτυχία επιβεβαίωσης email.'
        setStatus('error')
        setMessage(errorMessage)
        toast.error(errorMessage)
      }
    }

    verifyEmail()
  }, [token, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {status === 'loading' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Επιβεβαίωση Email</h1>
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
            <p className="text-sm text-gray-500">Ανακατεύθυνση στη σελίδα σύνδεσης...</p>
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
                onClick={() => router.push('/register')}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Νέα Εγγραφή
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
