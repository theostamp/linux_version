'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Mail,
  CreditCard,
  Shield,
  Database,
  Globe,
  Bell,
  Palette,
  Server,
  Key,
  Upload
} from 'lucide-react';
import { useSuperUserGuard } from '@/hooks/useSuperUserGuard';

interface SystemSettings {
  // General Settings
  site_name: string;
  site_description: string;
  site_url: string;
  default_language: string;
  timezone: string;
  currency: string;
  
  // Email Settings
  email_enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_use_tls: boolean;
  from_email: string;
  from_name: string;
  
  // Payment Settings
  stripe_enabled: boolean;
  stripe_public_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  paypal_enabled: boolean;
  paypal_client_id: string;
  paypal_client_secret: string;
  
  // Security Settings
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_numbers: boolean;
  password_require_symbols: boolean;
  session_timeout: number;
  max_login_attempts: number;
  two_factor_enabled: boolean;
  
  // Feature Flags
  registration_enabled: boolean;
  email_verification_required: boolean;
  maintenance_mode: boolean;
  debug_mode: boolean;
  analytics_enabled: boolean;
  
  // Storage Settings
  max_file_size: number;
  allowed_file_types: string[];
  storage_provider: string;
  s3_bucket_name: string;
  s3_region: string;
  s3_access_key: string;
  s3_secret_key: string;
}

interface SystemStatus {
  database_status: 'healthy' | 'warning' | 'error';
  email_status: 'healthy' | 'warning' | 'error';
  payment_status: 'healthy' | 'warning' | 'error';
  storage_status: 'healthy' | 'warning' | 'error';
  last_backup: string;
  system_uptime: string;
  memory_usage: number;
  disk_usage: number;
}

export default function AdminSettingsPage() {
  const { isAccessAllowed, isLoading } = useSuperUserGuard();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'email' | 'payments' | 'security' | 'features' | 'storage'>('general');

  useEffect(() => {
    if (isAccessAllowed) {
      fetchSettings();
      fetchSystemStatus();
    }
  }, [isAccessAllowed]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/admin/system/status/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data);
      }
    } catch (error) {
      console.error('Error fetching system status:', error);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      const response = await fetch('/api/admin/settings/', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert('Settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'features', label: 'Features', icon: Settings },
    { id: 'storage', label: 'Storage', icon: Database },
  ];

  if (isLoading || loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Φόρτωση ρυθμίσεων...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAccessAllowed) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <Settings className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Πρόσβαση Αρνημένη</h2>
          <p>Δεν έχετε τα απαραίτητα δικαιώματα για πρόσβαση σε αυτή τη σελίδα.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-2">Διαχείριση ρυθμίσεων συστήματος</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button onClick={saveSettings} disabled={saving} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* System Status */}
      {systemStatus && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">System Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              {getStatusIcon(systemStatus.database_status)}
              <div>
                <p className="font-medium">Database</p>
                <p className="text-sm text-gray-500">{systemStatus.database_status}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusIcon(systemStatus.email_status)}
              <div>
                <p className="font-medium">Email Service</p>
                <p className="text-sm text-gray-500">{systemStatus.email_status}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusIcon(systemStatus.payment_status)}
              <div>
                <p className="font-medium">Payment Gateway</p>
                <p className="text-sm text-gray-500">{systemStatus.payment_status}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusIcon(systemStatus.storage_status)}
              <div>
                <p className="font-medium">File Storage</p>
                <p className="text-sm text-gray-500">{systemStatus.storage_status}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium">Last Backup</p>
                <p className="text-gray-500">{systemStatus.last_backup}</p>
              </div>
              <div>
                <p className="font-medium">System Uptime</p>
                <p className="text-gray-500">{systemStatus.system_uptime}</p>
              </div>
              <div>
                <p className="font-medium">Memory Usage</p>
                <p className="text-gray-500">{systemStatus.memory_usage}%</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Tabs */}
        <Card className="lg:col-span-1">
          <div className="p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </Card>

        {/* Settings Content */}
        <Card className="lg:col-span-3">
          <div className="p-6">
            {settings && (
              <>
                {/* General Settings */}
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">General Settings</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="site_name">Site Name</Label>
                        <Input
                          id="site_name"
                          value={settings.site_name}
                          onChange={(e) => updateSetting('site_name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="site_url">Site URL</Label>
                        <Input
                          id="site_url"
                          value={settings.site_url}
                          onChange={(e) => updateSetting('site_url', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="site_description">Site Description</Label>
                      <Textarea
                        id="site_description"
                        value={settings.site_description}
                        onChange={(e) => updateSetting('site_description', e.target.value)}
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <Label htmlFor="default_language">Default Language</Label>
                        <select
                          id="default_language"
                          value={settings.default_language}
                          onChange={(e) => updateSetting('default_language', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="el">Ελληνικά</option>
                          <option value="en">English</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <select
                          id="timezone"
                          value={settings.timezone}
                          onChange={(e) => updateSetting('timezone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Europe/Athens">Europe/Athens</option>
                          <option value="UTC">UTC</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <select
                          id="currency"
                          value={settings.currency}
                          onChange={(e) => updateSetting('currency', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="EUR">EUR (€)</option>
                          <option value="USD">USD ($)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Settings */}
                {activeTab === 'email' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Email Settings</h3>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email_enabled">Enable Email Service</Label>
                        <p className="text-sm text-gray-500">Enable or disable email functionality</p>
                      </div>
                      <Switch
                        id="email_enabled"
                        checked={settings.email_enabled}
                        onCheckedChange={(checked) => updateSetting('email_enabled', checked)}
                      />
                    </div>
                    
                    {settings.email_enabled && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label htmlFor="smtp_host">SMTP Host</Label>
                            <Input
                              id="smtp_host"
                              value={settings.smtp_host}
                              onChange={(e) => updateSetting('smtp_host', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="smtp_port">SMTP Port</Label>
                            <Input
                              id="smtp_port"
                              type="number"
                              value={settings.smtp_port}
                              onChange={(e) => updateSetting('smtp_port', parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label htmlFor="smtp_username">SMTP Username</Label>
                            <Input
                              id="smtp_username"
                              value={settings.smtp_username}
                              onChange={(e) => updateSetting('smtp_username', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="smtp_password">SMTP Password</Label>
                            <Input
                              id="smtp_password"
                              type="password"
                              value={settings.smtp_password}
                              onChange={(e) => updateSetting('smtp_password', e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label htmlFor="from_email">From Email</Label>
                            <Input
                              id="from_email"
                              type="email"
                              value={settings.from_email}
                              onChange={(e) => updateSetting('from_email', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="from_name">From Name</Label>
                            <Input
                              id="from_name"
                              value={settings.from_name}
                              onChange={(e) => updateSetting('from_name', e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="smtp_use_tls"
                            checked={settings.smtp_use_tls}
                            onCheckedChange={(checked) => updateSetting('smtp_use_tls', checked)}
                          />
                          <Label htmlFor="smtp_use_tls">Use TLS</Label>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Payment Settings */}
                {activeTab === 'payments' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Payment Settings</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="stripe_enabled">Enable Stripe</Label>
                          <p className="text-sm text-gray-500">Enable Stripe payment processing</p>
                        </div>
                        <Switch
                          id="stripe_enabled"
                          checked={settings.stripe_enabled}
                          onCheckedChange={(checked) => updateSetting('stripe_enabled', checked)}
                        />
                      </div>
                      
                      {settings.stripe_enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label htmlFor="stripe_public_key">Stripe Public Key</Label>
                            <Input
                              id="stripe_public_key"
                              value={settings.stripe_public_key}
                              onChange={(e) => updateSetting('stripe_public_key', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="stripe_secret_key">Stripe Secret Key</Label>
                            <Input
                              id="stripe_secret_key"
                              type="password"
                              value={settings.stripe_secret_key}
                              onChange={(e) => updateSetting('stripe_secret_key', e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="paypal_enabled">Enable PayPal</Label>
                          <p className="text-sm text-gray-500">Enable PayPal payment processing</p>
                        </div>
                        <Switch
                          id="paypal_enabled"
                          checked={settings.paypal_enabled}
                          onCheckedChange={(checked) => updateSetting('paypal_enabled', checked)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Settings */}
                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Security Settings</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="password_min_length">Minimum Password Length</Label>
                        <Input
                          id="password_min_length"
                          type="number"
                          value={settings.password_min_length}
                          onChange={(e) => updateSetting('password_min_length', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="session_timeout">Session Timeout (minutes)</Label>
                        <Input
                          id="session_timeout"
                          type="number"
                          value={settings.session_timeout}
                          onChange={(e) => updateSetting('session_timeout', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="password_require_uppercase"
                          checked={settings.password_require_uppercase}
                          onCheckedChange={(checked) => updateSetting('password_require_uppercase', checked)}
                        />
                        <Label htmlFor="password_require_uppercase">Require Uppercase Letters</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="password_require_numbers"
                          checked={settings.password_require_numbers}
                          onCheckedChange={(checked) => updateSetting('password_require_numbers', checked)}
                        />
                        <Label htmlFor="password_require_numbers">Require Numbers</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="password_require_symbols"
                          checked={settings.password_require_symbols}
                          onCheckedChange={(checked) => updateSetting('password_require_symbols', checked)}
                        />
                        <Label htmlFor="password_require_symbols">Require Symbols</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="two_factor_enabled"
                          checked={settings.two_factor_enabled}
                          onCheckedChange={(checked) => updateSetting('two_factor_enabled', checked)}
                        />
                        <Label htmlFor="two_factor_enabled">Enable Two-Factor Authentication</Label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Feature Flags */}
                {activeTab === 'features' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Feature Flags</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="registration_enabled">Enable User Registration</Label>
                          <p className="text-sm text-gray-500">Allow new users to register</p>
                        </div>
                        <Switch
                          id="registration_enabled"
                          checked={settings.registration_enabled}
                          onCheckedChange={(checked) => updateSetting('registration_enabled', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="email_verification_required">Require Email Verification</Label>
                          <p className="text-sm text-gray-500">Require email verification for new accounts</p>
                        </div>
                        <Switch
                          id="email_verification_required"
                          checked={settings.email_verification_required}
                          onCheckedChange={(checked) => updateSetting('email_verification_required', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="maintenance_mode">Maintenance Mode</Label>
                          <p className="text-sm text-gray-500">Put the system in maintenance mode</p>
                        </div>
                        <Switch
                          id="maintenance_mode"
                          checked={settings.maintenance_mode}
                          onCheckedChange={(checked) => updateSetting('maintenance_mode', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="debug_mode">Debug Mode</Label>
                          <p className="text-sm text-gray-500">Enable debug mode (development only)</p>
                        </div>
                        <Switch
                          id="debug_mode"
                          checked={settings.debug_mode}
                          onCheckedChange={(checked) => updateSetting('debug_mode', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="analytics_enabled">Enable Analytics</Label>
                          <p className="text-sm text-gray-500">Enable usage analytics and tracking</p>
                        </div>
                        <Switch
                          id="analytics_enabled"
                          checked={settings.analytics_enabled}
                          onCheckedChange={(checked) => updateSetting('analytics_enabled', checked)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Storage Settings */}
                {activeTab === 'storage' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Storage Settings</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="max_file_size">Max File Size (MB)</Label>
                        <Input
                          id="max_file_size"
                          type="number"
                          value={settings.max_file_size}
                          onChange={(e) => updateSetting('max_file_size', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="storage_provider">Storage Provider</Label>
                        <select
                          id="storage_provider"
                          value={settings.storage_provider}
                          onChange={(e) => updateSetting('storage_provider', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="local">Local Storage</option>
                          <option value="s3">Amazon S3</option>
                          <option value="gcs">Google Cloud Storage</option>
                        </select>
                      </div>
                    </div>
                    
                    {settings.storage_provider === 's3' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="s3_bucket_name">S3 Bucket Name</Label>
                          <Input
                            id="s3_bucket_name"
                            value={settings.s3_bucket_name}
                            onChange={(e) => updateSetting('s3_bucket_name', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="s3_region">S3 Region</Label>
                          <Input
                            id="s3_region"
                            value={settings.s3_region}
                            onChange={(e) => updateSetting('s3_region', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="s3_access_key">S3 Access Key</Label>
                          <Input
                            id="s3_access_key"
                            value={settings.s3_access_key}
                            onChange={(e) => updateSetting('s3_access_key', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="s3_secret_key">S3 Secret Key</Label>
                          <Input
                            id="s3_secret_key"
                            type="password"
                            value={settings.s3_secret_key}
                            onChange={(e) => updateSetting('s3_secret_key', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

