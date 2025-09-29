'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Building2, 
  Monitor, 
  Users, 
  Settings,
  Eye,
  BarChart3,
  TrendingUp,
  Activity,
  ArrowLeft,
  Home
} from 'lucide-react';

export default function AdminDashboard() {
  const stats = [
    {
      name: 'Active Buildings',
      value: '12',
      change: '+2',
      changeType: 'positive',
      icon: Building2,
    },
    {
      name: 'Kiosk Displays',
      value: '8',
      change: '+1',
      changeType: 'positive',
      icon: Monitor,
    },
    {
      name: 'Total Users',
      value: '1,234',
      change: '+12%',
      changeType: 'positive',
      icon: Users,
    },
    {
      name: 'System Health',
      value: '99.9%',
      change: '+0.1%',
      changeType: 'positive',
      icon: Activity,
    },
  ];

  const quickActions = [
    {
      name: 'Kiosk Management',
      description: 'Manage kiosk widgets and configurations',
      href: '/admin/kiosk',
      icon: Monitor,
      color: 'bg-blue-500',
    },
    {
      name: 'Building Management',
      description: 'Manage buildings and apartments',
      href: '/admin/buildings',
      icon: Building2,
      color: 'bg-green-500',
    },
    {
      name: 'User Management',
      description: 'Manage users and permissions',
      href: '/admin/users',
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      name: 'System Settings',
      description: 'Configure system settings',
      href: '/admin/settings',
      icon: Settings,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center mb-4">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/dashboard'}
            className="flex items-center mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Επιστροφή στον Κεντρικό Πίνακα Ελέγχου
          </Button>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to the administrative control panel</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.name} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className={`text-sm ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  {stat.change}
                </p>
              </div>
              <stat.icon className="w-8 h-8 text-gray-400" />
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => (
            <Link key={action.name} href={action.href}>
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${action.color}`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{action.name}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Kiosk Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Building A - Kiosk Online</p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Widget Configuration Updated</p>
                <p className="text-xs text-gray-500">15 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Building B - Maintenance Mode</p>
                <p className="text-xs text-gray-500">1 hour ago</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">CPU Usage</span>
              <span className="text-sm font-medium text-gray-900">45%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '45%' }}></div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Memory Usage</span>
              <span className="text-sm font-medium text-gray-900">67%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '67%' }}></div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Disk Usage</span>
              <span className="text-sm font-medium text-gray-900">23%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '23%' }}></div>
            </div>
          </div>
        </Card>
      </div>

      {/* Preview Section */}
      <Card className="p-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Kiosk Preview</h3>
          <Button
            variant="outline"
            onClick={() => window.open('http://demo.localhost:3000/kiosk-display', '_blank')}
            className="flex items-center"
          >
            <Eye className="w-4 h-4 mr-2" />
            Open Preview
          </Button>
        </div>
        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <p className="text-gray-600">Click "Open Preview" to view the current kiosk display</p>
        </div>
      </Card>
    </div>
  );
}
