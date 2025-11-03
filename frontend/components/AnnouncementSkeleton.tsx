// components/AnnouncementSkeleton.tsx

export default function AnnouncementSkeleton() {
    return (
      <div className="p-4 rounded-2xl shadow-md bg-white mb-4 animate-pulse">
        <div className="h-6 bg-gray-300 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-5/6 mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2 mb-4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
      </div>
    );
  }
  