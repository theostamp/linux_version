// frontend/components/CreateResidentForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';

interface Props {
  readonly submitText?: string;
}

export default function CreateResidentForm({ submitText = 'Καταχώριση Κατοίκου' }: Props) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/users/', {
        email,
        first_name: firstName,
        last_name: lastName,
        password,
        role: 'resident',
      });
      toast.success('Ο κάτοικος δημιουργήθηκε επιτυχώς');
      router.push('/users');
    } catch (error: any) {
      toast.error('Αποτυχία δημιουργίας κατοίκου');
      console.error('CreateResidentForm error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label htmlFor="email" className="block mb-1 font-semibold">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <div>
        <label htmlFor="firstName" className="block mb-1 font-semibold">Όνομα</label>
        <input
          id="firstName"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <div>
        <label htmlFor="lastName" className="block mb-1 font-semibold">Επώνυμο</label>
        <input
          id="lastName"
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <div>
        <label htmlFor="password" className="block mb-1 font-semibold">Κωδικός Πρόσβασης</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
      >
        {submitText}
      </button>
    </form>
  );
}
