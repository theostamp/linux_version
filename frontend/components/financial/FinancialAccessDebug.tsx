'use client';

import { useAuth } from '@/components/contexts/AuthContext';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Shield, 
  Key, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useState } from 'react';

interface FinancialAccessDebugProps {
  onRefresh?: () => void;
}

export function FinancialAccessDebug({ onRefresh }: FinancialAccessDebugProps) {
  const { user, isAuthReady } = useAuth();
  const { hasPermission, isManager, isAdmin, isSuperUser } = useFinancialPermissions();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    // Force re-render
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  if (!isAuthReady) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading authentication...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No user found. Please log in to access financial management.
        </AlertDescription>
      </Alert>
    );
  }

  const userInfo = {
    email: user.email,
    role: user.role,
    is_staff: user.is_staff,
    is_superuser: user.is_superuser,
    is_active: user.is_active,
    email_verified: user.email_verified,
  };

  const permissionChecks = [
    {
      name: 'Financial Read',
      permission: 'financial_read',
      required: true,
      description: 'Basic read access to financial data'
    },
    {
      name: 'Financial Write',
      permission: 'financial_write',
      required: true,
      description: 'Create and edit financial records'
    },
    {
      name: 'Expense Manage',
      permission: 'expense_manage',
      required: true,
      description: 'Manage expenses and common charges'
    },
    {
      name: 'Payment Manage',
      permission: 'payment_manage',
      required: true,
      description: 'Manage payments and collections'
    },
    {
      name: 'Report Access',
      permission: 'report_access',
      required: true,
      description: 'Access financial reports and analytics'
    }
  ];

  const roleChecks = [
    {
      name: 'Is Manager',
      check: isManager(),
      description: 'User has manager role or is staff'
    },
    {
      name: 'Is Admin',
      check: isAdmin(),
      description: 'User has admin role or is superuser'
    },
    {
      name: 'Is Super User',
      check: isSuperUser(),
      description: 'User has superuser privileges'
    }
  ];

  const hasFinancialAccess = permissionChecks.every(check => hasPermission(check.permission as any));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>User Information</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(userInfo).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="font-medium capitalize">{key.replace('_', ' ')}:</span>
                <Badge variant={value ? 'default' : 'destructive'}>
                  {String(value)}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Role Checks</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {roleChecks.map((check, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{check.name}</span>
                  <p className="text-sm text-gray-600">{check.description}</p>
                </div>
                {check.check ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>Financial Permissions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {permissionChecks.map((check, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{check.name}</span>
                  <p className="text-sm text-gray-600">{check.description}</p>
                </div>
                {hasPermission(check.permission as any) ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {hasFinancialAccess ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                ✅ You have access to Financial Management. If you're still seeing 
                "Unauthorized Access", try refreshing the page or logging out and back in.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                ❌ You don't have the required permissions for Financial Management. 
                Contact your administrator to assign the proper role.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>If you see "Unauthorized Access":</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Check that your role is 'manager', 'admin', or 'superuser'</li>
              <li>Ensure you're logged in with the correct account</li>
              <li>Try refreshing the page (Ctrl+F5 or Cmd+Shift+R)</li>
              <li>Clear browser cache and cookies</li>
              <li>Log out and log back in</li>
              <li>Contact support if the issue persists</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



