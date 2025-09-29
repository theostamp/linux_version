import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface DataStatusIndicatorProps {
  isFetching: boolean;
  isError: boolean;
  lastUpdated?: string;
  className?: string;
}

export default function DataStatusIndicator({
  isFetching,
  isError,
  lastUpdated,
  className = ''
}: DataStatusIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500';
    if (isError) return 'text-yellow-500';
    if (isFetching) return 'text-blue-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    if (isError) return <AlertCircle className="w-4 h-4" />;
    if (isFetching) return <RefreshCw className="w-4 h-4 animate-spin" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Ασύνδετο';
    if (isError) return 'Σφάλμα';
    if (isFetching) return 'Ενημέρωση...';
    return 'Συνδεδεμένο';
  };

  return (
    <div className={`flex items-center space-x-2 text-xs ${className}`}>
      <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>
      
      {lastUpdated && !isFetching && !isError && (
        <span className="text-gray-400">
          Τελευταία ενημέρωση: {new Date(lastUpdated).toLocaleTimeString('el-GR')}
        </span>
      )}
    </div>
  );
} 