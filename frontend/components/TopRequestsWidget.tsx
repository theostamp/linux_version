'use client';

import { useEffect, useState } from 'react';
import { fetchTopRequests } from '../lib/api';
import { UserRequest } from '../types/userRequests';
import { useBuilding } from '../components/contexts/BuildingContext';
import RequestCard from './RequestCard';

export default function TopRequestsWidget() {
  const { currentBuilding } = useBuilding();
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBuilding?.id) return;

    setLoading(true);
    fetchTopRequests(currentBuilding.id)
      .then((data) => {
        // Ασφαλές assignment
        setRequests(data);
      })
      .catch((err) => {
        console.error('Failed to fetch top requests:', err);
        setRequests([]);
      })
      .finally(() => setLoading(false));
  }, [currentBuilding]);

  if (loading) return <p>Φόρτωση...</p>;
  if (!requests.length) return <p>Δεν υπάρχουν κορυφαία αιτήματα για αυτό το κτήριο.</p>;

  return (
    <div className="grid gap-4">
      {requests.map((req) => (
        <RequestCard key={req.id} request={req} />
      ))}
    </div>
  );
}
