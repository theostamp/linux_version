'use client';
import { useState } from 'react';
import { Label } from "@/components/ui/label";

interface BuildingFormData {
name: string;
address: string;
city: string;
postal_code: string;
floors: number;
}

export default function NewBuildingFormFull({ onCreated }: { readonly onCreated?: (b: any) => void }) {
const [loading] = useState(false);



return (
  <>
	<Label htmlFor="name">Όνομα Κτιρίου</Label>

	<Label htmlFor="address">Διεύθυνση</Label>

	Πόλη

	Τ.Κ.

	Όροφοι

	{loading ? 'Δημιουργία...' : 'Δημιουργία Κτιρίου'}
  </>
);
}