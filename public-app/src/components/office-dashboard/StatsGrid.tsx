import { 
  Building2, 
  Home, 
  Wallet, 
  TrendingUp,
  AlertTriangle,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface StatsGridProps {
  stats: {
    total_buildings: number;
    total_apartments: number;
    total_debt: number;
    monthly_management_revenue: number;
    pending_requests: number;
  };
  financials?: {
    revenue: number;
    expenses: number;
    net_profit: number;
    currency: string;
  };
  isLoading: boolean;
}

export function StatsGrid({ stats, financials, isLoading }: StatsGridProps) {
  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 bg-gray-100 rounded-lg"></div>
      ))}
    </div>;
  }

  const items = [
    {
      label: 'Συνολικά Κτίρια',
      value: stats.total_buildings,
      icon: <Building2 className="w-6 h-6 text-blue-600" />,
      color: 'bg-blue-50 border-blue-100',
    },
    {
      label: 'Διαμερίσματα',
      value: stats.total_apartments,
      icon: <Home className="w-6 h-6 text-purple-600" />,
      color: 'bg-purple-50 border-purple-100',
    },
    {
      label: 'Συνολικές Οφειλές',
      value: `€${stats.total_debt.toFixed(2)}`,
      icon: <Wallet className="w-6 h-6 text-red-600" />,
      color: 'bg-red-50 border-red-100',
    },
    {
      label: 'Έσοδα (30ημ)',
      value: `€${stats.monthly_management_revenue.toFixed(2)}`,
      icon: <TrendingUp className="w-6 h-6 text-green-600" />,
      color: 'bg-green-50 border-green-100',
    },
  ];

  return (
    <div className="space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item, index) => (
            <div 
            key={index} 
            className={`p-6 rounded-xl border ${item.color} transition-all duration-200 hover:shadow-md`}
            >
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                {item.icon}
                </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
                {item.value}
            </div>
            <div className="text-sm font-medium text-gray-600">
                {item.label}
            </div>
            </div>
        ))}
        </div>

        {/* Office P&L Section */}
        {financials && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-gray-500" />
                    Οικονομικά Γραφείου (Τρέχων Μήνας)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                        <p className="text-sm text-green-700 font-medium mb-1">Έσοδα Διαχείρισης</p>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-green-900">
                                €{financials.revenue.toFixed(2)}
                            </span>
                            <ArrowUpRight className="w-4 h-4 text-green-600" />
                        </div>
                    </div>
                    
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                        <p className="text-sm text-orange-700 font-medium mb-1">Κόστος Πλατφόρμας</p>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-orange-900">
                                €{financials.expenses.toFixed(2)}
                            </span>
                            <ArrowDownRight className="w-4 h-4 text-orange-600" />
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-sm text-blue-700 font-medium mb-1">Καθαρό Κέρδος</p>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-blue-900">
                                €{financials.net_profit.toFixed(2)}
                            </span>
                            {financials.net_profit >= 0 ? (
                                <ArrowUpRight className="w-4 h-4 text-blue-600" />
                            ) : (
                                <ArrowDownRight className="w-4 h-4 text-red-600" />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
