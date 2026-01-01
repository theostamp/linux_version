'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldX, Home, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/contexts/AuthContext';

export default function UnauthorizedPage() {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center shadow-lg"
        >
          <ShieldX className="w-12 h-12 text-red-500" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-gray-900 mb-4"
        >
          Δεν έχετε πρόσβαση
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 mb-8 leading-relaxed"
        >
          Λυπούμαστε, αλλά δεν έχετε τα απαραίτητα δικαιώματα για να δείτε αυτή τη σελίδα.
          {user && (
            <span className="block mt-2 text-sm text-gray-500">
              Συνδεδεμένος ως: <strong>{user.email}</strong>
            </span>
          )}
        </motion.p>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button asChild variant="default" className="gap-2">
            <Link href="/dashboard">
              <Home className="w-4 h-4" />
              Αρχική Σελίδα
            </Link>
          </Button>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4" />
            Επιστροφή
          </Button>

          {user && (
            <Button
              variant="ghost"
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
              Αποσύνδεση
            </Button>
          )}
        </motion.div>

        {/* Help text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-sm text-gray-500"
        >
          Αν πιστεύετε ότι πρέπει να έχετε πρόσβαση, επικοινωνήστε με τον διαχειριστή.
        </motion.p>
      </motion.div>
    </div>
  );
}
