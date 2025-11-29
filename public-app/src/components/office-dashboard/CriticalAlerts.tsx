import { AlertTriangle, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Alert {
  id: number;
  name: string;
  issue: string;
  value: number;
}

interface CriticalAlertsProps {
  alerts: Alert[];
  isLoading: boolean;
}

export function CriticalAlerts({ alerts, isLoading }: CriticalAlertsProps) {
  if (isLoading) {
    return <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>;
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">Όλα βαίνουν καλώς!</h3>
        <p className="text-gray-500 mt-1">Δεν υπάρχουν κρίσιμα ζητήματα στα κτίρια.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-red-50/50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Κρίσιμες Ειδοποιήσεις
        </h3>
        <span className="bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
          {alerts.length}
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {alerts.map((alert, index) => (
          <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-gray-900">{alert.name}</h4>
                <p className="text-sm text-red-600 mt-1 font-medium">
                  {alert.issue === 'Negative Reserve' ? 'Αρνητικό Αποθεματικό' : 'Υψηλές Οφειλές'}
                </p>
              </div>
              <div className="text-right">
                <span className="block font-bold text-gray-900">
                  {alert.value < 0 ? '-' : ''}€{Math.abs(alert.value).toFixed(2)}
                </span>
                <Link 
                  href={`/buildings/${alert.id}/financial`}
                  className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 mt-2 font-medium"
                >
                  Προβολή <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

