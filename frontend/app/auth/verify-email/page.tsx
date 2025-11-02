'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Loader2, RefreshCw, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState<string | null>(null)
  const [resendingEmail, setResendingEmail] = useState(false)

  useEffect(() => {
    // Get email from localStorage if available
    if (typeof window !== 'undefined') {
      const storedEmail = localStorage.getItem('pending_verification_email')
      if (storedEmail) {
        setEmail(storedEmail)
      }
    }
    
    if (!token) {
      setStatus('error')
      const hasEmail = email || (typeof window !== 'undefined' ? localStorage.getItem('pending_verification_email') : null)
      if (hasEmail) {
        setMessage('Λείπει το token επιβεβαίωσης. Μπορείτε να ζητήσετε επαναποστολή του email.')
      } else {
        setMessage('Λείπει το token επιβεβαίωσης.')
      }
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
        
        // Clear pending email from localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pending_verification_email')
        }

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
  
  const handleResendVerificationEmail = async () => {
    const emailToUse = email || (typeof window !== 'undefined' ? localStorage.getItem('pending_verification_email') : null)
    
    if (!emailToUse) {
      toast.error('Δεν βρέθηκε email για επαναποστολή. Παρακαλώ εγγραφείτε ξανά.')
      router.push('/register')
      return
    }
    
    setResendingEmail(true)
    
    try {
      await api.post('/api/users/resend-verification/', { email: emailToUse })
      toast.success('Το email επιβεβαίωσης στάλθηκε ξανά. Παρακαλώ ελέγξτε το inbox σας.')
    } catch (error: any) {
      console.error('Resend email error:', error)
      const errorMessage = error.response?.data?.error || 'Αποτυχία επαναποστολής email.'
      toast.error(errorMessage)
    } finally {
      setResendingEmail(false)
    }
  }

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
            <p className="text-gray-600 mb-4">{message}</p>
            {(email || (typeof window !== 'undefined' && localStorage.getItem('pending_verification_email'))) && (
              <p className="text-sm text-gray-500 mb-6">
                Email: <strong>{email || (typeof window !== 'undefined' ? localStorage.getItem('pending_verification_email') : '')}</strong>
              </p>
            )}
            <div className="space-y-3">
              {(email || (typeof window !== 'undefined' && localStorage.getItem('pending_verification_email'))) && (
                <Button
                  onClick={handleResendVerificationEmail}
                  disabled={resendingEmail}
                  className="w-full flex items-center justify-center gap-2"
                  variant="outline"
                >
                  <RefreshCw className={`w-4 h-4 ${resendingEmail ? 'animate-spin' : ''}`} />
                  {resendingEmail ? 'Αποστολή...' : 'Επαναποστολή Email'}
                </Button>
              )}
              <Button
                onClick={() => router.push('/login')}
                className="w-full"
              >
                Μετάβαση στη Σύνδεση
              </Button>
              <Button
                onClick={() => router.push('/register')}
                variant="outline"
                className="w-full"
              >
                Νέα Εγγραφή
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
