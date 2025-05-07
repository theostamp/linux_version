import React, { useState } from 'react';

type NewVoteFormProps = {
  readonly onSubmit: (data: { title: string; description: string }) => void;
};

export default function NewVoteForm({ onSubmit }: NewVoteFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ title, description });
    setTitle('');
    setDescription('');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="vote-title" className="block font-medium mb-1">Τίτλος</label>
        <input
          id="vote-title"
          type="text"
          className="border rounded px-3 py-2 w-full"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="vote-description" className="block font-medium mb-1">Περιγραφή</label>
        <textarea
          id="vote-description"
          className="border rounded px-3 py-2 w-full"
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
      >
        Δημιουργία Ψηφοφορίας
      </button>
    </form>
  );
}
