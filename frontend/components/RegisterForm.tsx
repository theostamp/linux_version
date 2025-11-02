"use client"

// components/RegisterForm.tsx
import { useForm } from "react-hook-form"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Eye, EyeOff, AlertCircle, Loader2, Check, X } from "lucide-react"
import OAuthButtons from "./OAuthButtons"
import { toast } from "sonner"
import Link from "next/link"

type RegisterFormInputs = {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  first_name?: string;  // Optional for display name
  last_name?: string;   // Optional for display name
}

export default function RegisterForm() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormInputs>()
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  
  // Username availability state
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [usernameMessage, setUsernameMessage] = useState("")
  const [subdomainPreview, setSubdomainPreview] = useState("")
  
  const router = useRouter()

  const password = watch("password")
  const username = watch("username")

  // Check username availability with debounce
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null)
      setUsernameMessage("")
      setSubdomainPreview("")
      return
    }

    const checkUsername = async () => {
      setUsernameChecking(true)
      try {
        const { data } = await api.post('/api/users/check-username/', {
          username: username.toLowerCase().trim()
        })
        setUsernameAvailable(data.available)
        setUsernameMessage(data.message)
        setSubdomainPreview(data.subdomain_preview || `${username}.newconcierge.app`)
      } catch (error) {
        console.error('Error checking username:', error)
        setUsernameAvailable(null)
        setUsernameMessage('Σφάλμα ελέγχου διαθεσιμότητας')
      } finally {
        setUsernameChecking(false)
      }
    }

    // Debounce: Check after 500ms of no typing
    const timeoutId = setTimeout(checkUsername, 500)
    return () => clearTimeout(timeoutId)
  }, [username])

  const onSubmit = async (data: RegisterFormInputs) => {
    setError("");
    setEmailExists(false);
    
    // Validate username is available before submitting
    if (usernameAvailable === false) {
      setError("Το username που επιλέξατε δεν είναι διαθέσιμο. Παρακαλώ επιλέξτε άλλο.");
      return;
    }
    
    if (!usernameAvailable) {
      setError("Παρακαλώ περιμένετε την επιβεβαίωση διαθεσιμότητας του username.");
      return;
    }
    
    setIsLoading(true);

    try {
      // Transform the data to match backend expectations
      const registrationData = {
        email: data.email,
        username: data.username.toLowerCase().trim(),
        password: data.password,
        password_confirm: data.confirmPassword,
        // Optional fields for display name
        ...(data.first_name && { first_name: data.first_name }),
        ...(data.last_name && { last_name: data.last_name })
      };

      const response = await api.post("/api/users/register", registrationData);

      // Store email in localStorage for resend functionality
      if (typeof window !== 'undefined') {
        localStorage.setItem('pending_verification_email', data.email);
      }

      // Show success message
      toast.success("Επιτυχής εγγραφή! Παρακαλώ ελέγξτε το email σας για επιβεβαίωση.");

      // Redirect to plans page after registration
      setTimeout(() => {
        router.push(`/plans?registered=true&email=${encodeURIComponent(data.email)}`);
      }, 2000);

    } catch (err: any) {
      console.error("Registration error:", err);

      // Extract specific error messages from backend response
      const responseData = err.response?.data;
      let errorMessage = "Αποτυχία εγγραφής. Παρακαλώ προσπαθήστε ξανά.";

      if (responseData) {
        // Check for specific field errors
        if (responseData.username) {
          errorMessage = Array.isArray(responseData.username)
            ? responseData.username[0]
            : "Το username δεν είναι έγκυρο ή χρησιμοποιείται ήδη.";
          toast.error(errorMessage);
        } else if (responseData.email) {
          errorMessage = Array.isArray(responseData.email)
            ? responseData.email[0]
            : "Το email υπάρχει ήδη ή δεν είναι έγκυρο.";
          setEmailExists(true);
          toast.error("Το email υπάρχει ήδη στο σύστημα. Παρακαλώ συνδεθείτε.");
        } else if (responseData.password) {
          errorMessage = Array.isArray(responseData.password)
            ? responseData.password[0]
            : "Ο κωδικός δεν πληροί τις απαιτήσεις ασφαλείας.";
        } else if (responseData.error || responseData.detail) {
          errorMessage = responseData.error || responseData.detail;
        }
      }

      setError(errorMessage);
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-2xl shadow">
      <h2 className="text-2xl font-bold mb-4 text-center">Εγγραφή</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <input
            {...register("email", { required: true })}
            type="email"
            placeholder="Email"
            className="w-full border p-2 rounded"
            autoComplete="email"
          />
          {errors.email && <p className="text-red-500 text-sm">Το email είναι απαραίτητο</p>}
        </div>

        {/* Username Input with Real-time Validation */}
        <div>
          <div className="relative">
            <input
              {...register("username", { 
                required: "Το username είναι απαραίτητο",
                minLength: { value: 3, message: "Το username πρέπει να έχει τουλάχιστον 3 χαρακτήρες" },
                pattern: { value: /^[a-z0-9-]+$/, message: "Μόνο πεζά γράμματα, αριθμοί και παύλες (-)" }
              })}
              type="text"
              placeholder="Username (π.χ. theo-eth)"
              className={`w-full border p-2 pr-10 rounded lowercase ${
                usernameAvailable === true ? 'border-green-500' : 
                usernameAvailable === false ? 'border-red-500' : 
                ''
              }`}
              autoComplete="username"
              onChange={(e) => {
                // Force lowercase
                e.target.value = e.target.value.toLowerCase();
              }}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {usernameChecking && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
              {!usernameChecking && usernameAvailable === true && (
                <Check className="h-5 w-5 text-green-500" />
              )}
              {!usernameChecking && usernameAvailable === false && (
                <X className="h-5 w-5 text-red-500" />
              )}
            </div>
          </div>
          
          {errors.username && (
            <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
          )}
          
          {usernameMessage && (
            <p className={`text-sm mt-1 ${usernameAvailable ? 'text-green-600' : 'text-red-600'}`}>
              {usernameMessage}
            </p>
          )}
          
          {subdomainPreview && usernameAvailable && (
            <p className="text-sm text-gray-600 mt-1">
              🌐 Το workspace σας: <span className="font-semibold">{subdomainPreview}</span>
            </p>
          )}
          
          <p className="text-xs text-gray-500 mt-1">
            Μόνο πεζά γράμματα, αριθμοί και παύλες (-). Τουλάχιστον 3 χαρακτήρες.
          </p>
        </div>

        <div className="relative">
          <input
            {...register("password", { required: true, minLength: 6 })}
            type={showPassword ? "text" : "password"}
            placeholder="Κωδικός (τουλάχιστον 6 χαρακτήρες)"
            className="w-full border p-2 pr-10 rounded"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {errors.password && <p className="text-red-500 text-sm">Απαιτείται κωδικός τουλάχιστον 6 χαρακτήρων</p>}

        <div className="relative">
          <input
            {...register("confirmPassword", { 
              required: true, 
              validate: (value) => value === password || "Οι κωδικοί δεν ταιριάζουν"
            })}
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Επιβεβαίωση κωδικού"
            className="w-full border p-2 pr-10 rounded"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-xs text-red-600 hover:text-red-800 underline mt-1"
              >
                Απόκρυψη
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Εγγραφή...
            </>
          ) : (
            'Εγγραφή'
          )}
        </button>
      </form>

      <OAuthButtons mode="register" />

      {emailExists && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-blue-800 font-medium mb-2">
                Το email υπάρχει ήδη στο σύστημα
              </p>
              <p className="text-sm text-blue-700 mb-3">
                Αν έχετε ήδη λογαριασμό, παρακαλώ συνδεθείτε.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Σύνδεση
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Έχεις ήδη λογαριασμό;{' '}
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Σύνδεση
          </button>
        </p>
      </div>
    </div>
  )
}
