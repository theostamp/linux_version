"use client"

// components/RegisterForm.tsx
import { useForm } from "react-hook-form"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react"
import OAuthButtons from "./OAuthButtons"
import { toast } from "sonner"
import Link from "next/link"

type RegisterFormInputs = {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterForm() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormInputs>()
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const router = useRouter()

  const password = watch("password")

  const onSubmit = async (data: RegisterFormInputs) => {
    setError("");
    setEmailExists(false);
    setIsLoading(true);

    try {
      // Transform the data to match backend expectations
      const registrationData = {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        password: data.password,
        password_confirm: data.confirmPassword
      };

      const response = await api.post("/api/users/register", registrationData);

      // Show detailed success message with status
      toast.success("🎉 Εγγραφή επιτυχής!", {
        description: "Ο λογαριασμός σας δημιουργήθηκε επιτυχώς!",
        duration: 5000,
      });

      // Show email verification notification
      toast.info("📧 Επιβεβαίωση Email", {
        description: "Σας στάλθηκε email επιβεβαίωσης. Παρακαλώ ελέγξτε το inbox σας και κάντε κλικ στον σύνδεσμο για να ενεργοποιήσετε τον λογαριασμό σας.",
        duration: 8000,
      });

      // Show next steps
      toast.info("ℹ️ Επόμενα Βήματα", {
        description: "1. Ελέγξτε το email σας (και το spam folder) 2. Κάντε κλικ στον σύνδεσμο επιβεβαίωσης 3. Επιστρέψτε εδώ για να συνδεθείτε",
        duration: 10000,
      });

      // Redirect to login page after registration
      setTimeout(() => {
        router.push("/login?registered=true&email=" + encodeURIComponent(data.email));
      }, 3000);

    } catch (err: any) {
      console.error("Registration error:", err);

      // Extract specific error messages from backend response
      const responseData = err.response?.data;
      let errorMessage = "Αποτυχία εγγραφής. Παρακαλώ προσπαθήστε ξανά.";

      if (responseData) {
        // Check for specific field errors
        if (responseData.email) {
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
        <input
          {...register("email", { required: true })}
          type="email"
          placeholder="Email"
          className="w-full border p-2 rounded"
          autoComplete="email"
        />
        {errors.email && <p className="text-red-500 text-sm">Το email είναι απαραίτητο</p>}

        <input
          {...register("first_name", { required: true })}
          type="text"
          placeholder="Όνομα"
          className="w-full border p-2 rounded"
          autoComplete="given-name"
        />
        {errors.first_name && <p className="text-red-500 text-sm">Το όνομα είναι απαραίτητο</p>}

        <input
          {...register("last_name", { required: true })}
          type="text"
          placeholder="Επώνυμο"
          className="w-full border p-2 rounded"
          autoComplete="family-name"
        />
        {errors.last_name && <p className="text-red-500 text-sm">Το επώνυμο είναι απαραίτητο</p>}

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
