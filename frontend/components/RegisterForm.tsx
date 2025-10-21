"use client"

// components/RegisterForm.tsx
import { useForm } from "react-hook-form"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import OAuthButtons from "./OAuthButtons"

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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  
  const password = watch("password")

  const onSubmit = async (data: RegisterFormInputs) => {
    try {
      // Transform the data to match backend expectations
      const registrationData = {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        password: data.password,
        password_confirm: data.confirmPassword
      };
      
      await api.post("/api/users/register/", registrationData)
      router.push("/dashboard")
    } catch (err: any) {
      console.error("Registration error:", err);
      setError("Αποτυχία εγγραφής. Ίσως το email υπάρχει ήδη.");
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
        />
        {errors.email && <p className="text-red-500 text-sm">Το email είναι απαραίτητο</p>}

        <input
          {...register("first_name", { required: true })}
          type="text"
          placeholder="Όνομα"
          className="w-full border p-2 rounded"
        />
        {errors.first_name && <p className="text-red-500 text-sm">Το όνομα είναι απαραίτητο</p>}

        <input
          {...register("last_name", { required: true })}
          type="text"
          placeholder="Επώνυμο"
          className="w-full border p-2 rounded"
        />
        {errors.last_name && <p className="text-red-500 text-sm">Το επώνυμο είναι απαραίτητο</p>}

        <div className="relative">
          <input
            {...register("password", { required: true, minLength: 6 })}
            type={showPassword ? "text" : "password"}
            placeholder="Κωδικός (τουλάχιστον 6 χαρακτήρες)"
            className="w-full border p-2 pr-10 rounded"
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

        {error && <p className="text-red-500">{error}</p>}
        <button type="submit" className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700">
          Εγγραφή
        </button>
      </form>

      <OAuthButtons mode="register" />
      
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
