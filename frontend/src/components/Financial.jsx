import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, PieChart, Calendar, Building, Users, FileText, Settings } from 'lucide-react';

const Financial = () => {
  const [financialData, setFinancialData] = useState({
    totalRevenue: 0,
    monthlyExpenses: 0,
    pendingPayments: 0,
    maintenanceCosts: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setFinancialData({
        totalRevenue: 12500,
        monthlyExpenses: 8500,
        pendingPayments: 2300,
        maintenanceCosts: 1200
      });
      setLoading(false);
    }, 1000);
  }, []);

  const financialCards = [
    {
      title: 'Συνολικά Έσοδα',
      value: `€${financialData.totalRevenue.toLocaleString()}`,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Μηνιαίες Δαπάνες',
      value: `€${financialData.monthlyExpenses.toLocaleString()}`,
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600'
    },
    {
      title: 'Εκκρεμείς Πληρωμές',
      value: `€${financialData.pendingPayments.toLocaleString()}`,
      icon: <Calendar className="w-6 h-6" />,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Κόστος Συντήρησης',
      value: `€${financialData.maintenanceCosts.toLocaleString()}`,
      icon: <Settings className="w-6 h-6" />,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    }
  ];

  const quickActions = [
    {
      title: 'Νέα Δαπάνη',
      description: 'Καταχώρηση νέας δαπάνης',
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-blue-500'
    },
    {
      title: 'Αναφορά Εσόδων',
      description: 'Προβολή αναφοράς εσόδων',
      icon: <PieChart className="w-6 h-6" />,
      color: 'bg-green-500'
    },
    {
      title: 'Διαχείριση Κτιρίων',
      description: 'Ρυθμίσεις κτιρίων',
      icon: <Building className="w-6 h-6" />,
      color: 'bg-purple-500'
    },
    {
      title: 'Κατοίκους',
      description: 'Διαχείριση κατοίκων',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-orange-500'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Φόρτωση οικονομικών δεδομένων...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">Οικονομικά</span>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Νέα Δαπάνη
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Οικονομική Διαχείριση
          </h1>
          <p className="text-gray-600">
            Διαχείριση οικονομικών και παρακολούθηση δαπανών του κτιρίου.
          </p>
        </div>

        {/* Financial Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {financialCards.map((card, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                  <div className={card.textColor}>
                    {card.icon}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Γρήγορες Ενέργειες
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition-shadow text-left group"
                  >
                    <div className="flex items-center mb-4">
                      <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mr-4 group-hover:scale-110 transition-transform`}>
                        <div className="text-white">
                          {action.icon}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {action.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Πρόσφατες Συναλλαγές
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Συντήρηση Ασανσέρ</p>
                    <p className="text-sm text-gray-500">15 Οκτωβρίου 2024</p>
                  </div>
                  <span className="text-red-600 font-semibold">-€450</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Κοινόχρηστα</p>
                    <p className="text-sm text-gray-500">10 Οκτωβρίου 2024</p>
                  </div>
                  <span className="text-green-600 font-semibold">+€2,300</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Ηλεκτρικό</p>
                    <p className="text-sm text-gray-500">5 Οκτωβρίου 2024</p>
                  </div>
                  <span className="text-red-600 font-semibold">-€180</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Financial;
