import React, { useState, useEffect } from 'react';
import { Building, Users, BarChart3, Settings, Bell, Search, Plus, TrendingUp, Calendar, FileText } from 'lucide-react';

const Dashboard = () => {
  const [user, setUser] = useState({
    name: 'John Building Manager',
    email: 'newuser@building.com',
    building: 'Central Plaza',
    plan: 'Professional',
    status: 'Active'
  });

  const [stats, setStats] = useState({
    apartments: 0,
    users: 0,
    maintenance: 0,
    documents: 0
  });

  const [recentActivity, setRecentActivity] = useState([
    {
      id: 1,
      type: 'account',
      message: 'Account created successfully',
      time: '2 minutes ago',
      icon: <Building className="w-4 h-4" />
    },
    {
      id: 2,
      type: 'payment',
      message: 'Professional Plan subscription activated',
      time: '2 minutes ago',
      icon: <TrendingUp className="w-4 h-4" />
    },
    {
      id: 3,
      type: 'email',
      message: 'Verification email sent',
      time: '2 minutes ago',
      icon: <Bell className="w-4 h-4" />
    }
  ]);

  const quickActions = [
    {
      title: 'Add Apartments',
      description: 'Set up your building structure',
      icon: <Building className="w-6 h-6" />,
      color: 'bg-blue-500',
      action: () => console.log('Add apartments')
    },
    {
      title: 'Invite Users',
      description: 'Add team members and residents',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-green-500',
      action: () => console.log('Invite users')
    },
    {
      title: 'View Analytics',
      description: 'Check building performance',
      icon: <BarChart3 className="w-6 h-6" />,
      color: 'bg-purple-500',
      action: () => console.log('View analytics')
    },
    {
      title: 'Upload Documents',
      description: 'Add building documents',
      icon: <FileText className="w-6 h-6" />,
      color: 'bg-orange-500',
      action: () => console.log('Upload documents')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Building className="w-8 h-8 text-primary-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">Digital Concierge</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Bell className="w-6 h-6" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.building}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name.split(' ')[0]}!
          </h1>
          <p className="text-gray-600">
            Here's what's happening with {user.building} today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Apartments</p>
                <p className="text-3xl font-bold text-gray-900">{stats.apartments}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              <span className="text-green-600">+0</span> this month
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats.users}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              <span className="text-green-600">+0</span> this month
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Maintenance</p>
                <p className="text-3xl font-bold text-gray-900">{stats.maintenance}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              <span className="text-green-600">+0</span> this month
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Documents</p>
                <p className="text-3xl font-bold text-gray-900">{stats.documents}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              <span className="text-green-600">+0</span> this month
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
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
                    <div className="flex items-center text-primary-600 font-semibold">
                      Get Started
                      <Plus className="w-4 h-4 ml-2" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Recent Activity
              </h2>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      {activity.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subscription Status */}
            <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Subscription Status
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-semibold text-gray-900">{user.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {user.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Next Billing</span>
                  <span className="font-semibold text-gray-900">Next month</span>
                </div>
                <div className="pt-3 border-t">
                  <button className="w-full text-primary-600 font-semibold hover:text-primary-700">
                    Manage Subscription
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

