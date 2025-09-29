'use client';

import React, { useMemo, useState } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TodoCategory } from '@/lib/todos';
import { useCreateTodoCategory, useDeleteTodoCategory, useTodoCategories, useUpdateTodoCategory } from '@/hooks/useTodos';

type FormValues = {
  name: string;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'gray';
  description?: string;
};

export default function TodoCategories() {
  const { selectedBuilding } = useBuilding();
  const buildingId = selectedBuilding?.id;
  const { data: categories = [], isLoading, refetch } = useTodoCategories(buildingId);
  const createCategory = useCreateTodoCategory();
  const updateCategory = useUpdateTodoCategory();
  const deleteCategory = useDeleteTodoCategory();

  const [editing, setEditing] = useState<TodoCategory | null>(null);
  const [form, setForm] = useState<FormValues>({ name: '', icon: 'check-square', color: 'blue' });

  const resetForm = () => {
    setEditing(null);
    setForm({ name: '', icon: 'check-square', color: 'blue' });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId) return;
    const payload = {
      name: form.name,
      icon: form.icon,
      color: form.color,
      description: form.description || '',
      building: buildingId,
      is_active: true,
    };
    if (editing) {
      await updateCategory.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createCategory.mutateAsync(payload);
    }
    resetForm();
    await refetch();
  };

  const startEdit = (cat: TodoCategory) => {
    setEditing(cat);
    setForm({ name: cat.name, icon: cat.icon, color: cat.color as any, description: cat.description });
  };

  const onDelete = async (id: number) => {
    await deleteCategory.mutateAsync({ id });
    await refetch();
  };

  const busy = isLoading || createCategory.isPending || updateCategory.isPending || deleteCategory.isPending;

  const colorOptions = useMemo(
    () => [
      { value: 'blue', label: 'Μπλε' },
      { value: 'green', label: 'Πράσινο' },
      { value: 'yellow', label: 'Κίτρινο' },
      { value: 'orange', label: 'Πορτοκαλί' },
      { value: 'red', label: 'Κόκκινο' },
      { value: 'purple', label: 'Μωβ' },
      { value: 'gray', label: 'Γκρι' },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Όνομα</label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Εικονίδιο</label>
            <Input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="π.χ. check-square" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Χρώμα</label>
            <Select value={form.color} onValueChange={(v) => setForm((f) => ({ ...f, color: v as any }))}>
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε" />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Περιγραφή</label>
            <Input value={form.description || ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          {editing && (
            <Button type="button" variant="secondary" onClick={resetForm} disabled={busy}>
              Ακύρωση
            </Button>
          )}
          <Button type="submit" disabled={busy}>{editing ? 'Αποθήκευση' : 'Προσθήκη'}</Button>
        </div>
      </form>

      <div className="border-t border-gray-200 dark:border-gray-800 pt-3">
        <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Κατηγορίες</h4>
        <ul className="space-y-2">
          {categories.map((cat) => (
            <li key={cat.id} className="flex items-center justify-between p-2 rounded border border-gray-200 dark:border-gray-800">
              <div className="text-sm">
                <span className="font-medium text-gray-800 dark:text-gray-100">{cat.name}</span>
                <span className="ml-2 text-gray-500 dark:text-gray-400">({cat.color})</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => startEdit(cat)} disabled={busy}>Επεξεργασία</Button>
                <Button size="sm" variant="destructive" onClick={() => onDelete(cat.id)} disabled={busy}>Διαγραφή</Button>
              </div>
            </li>
          ))}
          {categories.length === 0 && !isLoading && (
            <li className="text-xs text-gray-500">Δεν υπάρχουν κατηγορίες.</li>
          )}
        </ul>
      </div>
    </div>
  );
}


