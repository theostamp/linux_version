"use client"

// components/RegisterForm.tsx
import { useForm } from "react-hook-form"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { useState } from "react"

type RegisterFormInputs = {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
}

export default function RegisterForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormInputs>()
  const [error, setError] = useState("")
  const router = useRouter()

  const onSubmit = async (data: RegisterFormInputs) => {
    try {
      await api.post("/api/users/register/", data)
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

        <input
          {...register("password", { required: true, minLength: 6 })}
          type="password"
          placeholder="Κωδικός (τουλάχιστον 6 χαρακτήρες)"
          className="w-full border p-2 rounded"
        />
        {errors.password && <p className="text-red-500 text-sm">Απαιτείται κωδικός τουλάχιστον 6 χαρακτήρων</p>}

        {error && <p className="text-red-500">{error}</p>}
        <button type="submit" className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700">
          Εγγραφή
        </button>
      </form>
    </div>
  )
}
