"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/components/contexts/AuthContext"
import { Google } from "lucide-react"

interface OAuthButtonsProps {
  mode: 'login' | 'register'
  onSuccess?: () => void
}

export default function OAuthButtons({ mode, onSuccess }: OAuthButtonsProps) {
  const [loading, setLoading] = useState<'google' | null>(null)
  const { login } = useAuth()
  const router = useRouter()

  const handleGoogleAuth = async () => {
    setLoading('google')
    try {
      // Redirect to backend OAuth endpoint
      const redirectUri = encodeURIComponent(`http://127.0.0.1:3000/auth/callback`)
      const state = encodeURIComponent(JSON.stringify({ 
        mode, 
        redirectTo: '/dashboard',
        provider: 'google'
      }))
      
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18000'}/api/users/auth/google/?redirect_uri=${redirectUri}&state=${state}`
    } catch (error) {
      console.error('Google OAuth error:', error)
      toast.error('Σφάλμα κατά την σύνδεση με Google')
      setLoading(null)
    }
  }


  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">ή συνέχισε με</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={loading !== null}
        className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading === 'google' ? (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        ) : (
          <Google className="w-5 h-5 text-red-500" />
        )}
        <span className="ml-2">Google</span>
      </button>
    </div>
  )
}
