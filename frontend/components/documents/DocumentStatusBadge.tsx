import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface DocumentStatusBadgeProps {
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export const DocumentStatusBadge = ({ status }: DocumentStatusBadgeProps) => {
  const statusConfig = {
    pending: {
      label: 'Εκκρεμεί',
      icon: <Loader2 className="mr-1 h-3 w-3 animate-spin" />,
      variant: 'secondary',
    },
    processing: {
      label: 'Επεξεργασία...',
      icon: <Loader2 className="mr-1 h-3 w-3 animate-spin" />,
      variant: 'default',
      className: 'bg-blue-500 text-white',
    },
    completed: {
      label: 'Ολοκληρώθηκε',
      icon: <CheckCircle className="mr-1 h-3 w-3" />,
      variant: 'default',
      className: 'bg-green-600 text-white',
    },
    failed: {
      label: 'Απέτυχε',
      icon: <XCircle className="mr-1 h-3 w-3" />,
      variant: 'destructive',
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge variant={config.variant as any} className={config.className}>
      {config.icon}
      {config.label}
    </Badge>
  );
};