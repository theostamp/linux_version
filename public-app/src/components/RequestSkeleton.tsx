'use client';

export default function RequestSkeleton() {
  return (
    <div className="animate-pulse border rounded-lg p-4 bg-white shadow-sm space-y-2">
      <div className="h-4 bg-gray-300 rounded w-1/3" />
      <div className="h-3 bg-gray-200 rounded w-2/3" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
  );
}
