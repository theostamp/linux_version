'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Euro, 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Banknote,
  Receipt,
  Building
} from 'lucide-react';
import Link from 'next/link';

interface FinancialStats {
  total_payments: number;
  pending_payments: number;
  overdue_payments: number;
  paid_payments: number;
  total_collected: number;
  total_due: number;
  collection_rate: number;
  building_accounts: number;
  active_accounts: number;
}

export default function FinancialDashboard() {
  const [stats, setStats] = useState<FinancialStats>({
    total_payments: 0,
    pending_payments: 0,
    overdue_payments: 0,
    paid_payments: 0,
    total_collected: 0,
    total_due: 0,
    collection_rate: 0,
    building_accounts: 0,
    active_accounts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch actual data from API
    // For now, using mock data
    setStats({
      total_payments: 156,
      pending_payments: 23,
      overdue_payments: 8,
      paid_payments: 125,
      total_collected: 45600.75,
      total_due: 8900.25,
      collection_rate: 83.7,
      building_accounts: 4,
      active_accounts: 3,
    });
    setLoading(false);
  }, []);

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon, 
    color = "default",
    href,
    trend 
  }: {
    title: string;
    value: string | number;
    description?: string;
    icon: React.ReactNode;
    color?: "default" | "success" | "warning" | "danger";
    href?: string;
    trend?: "up" | "down" | "neutral";
  }) => {
    const colorClasses = {
      default: "bg-blue-50 text-blue-600",
      success: "bg-green-50 text-green-600",
      warning: "bg-yellow-50 text-yellow-600",
      danger: "bg-red-50 text-red-600",
    };

    const trendIcons = {
      up: <TrendingUp className="w-4 h-4 text-green-600" />,
      down: <TrendingDown className="w-4 h-4 text-red-600" />,
      neutral: null,
    };

    const CardWrapper = href ? Link : 'div';
    const cardProps = href ? { href } : {};

    return (
      <CardWrapper {...cardProps} className={href ? "block hover:shadow-md transition-shadow" : ""}>
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
              {icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{value}</div>
              {trend && trendIcons[trend]}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </CardContent>
        </Card>
      </CardWrapper>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Οικονομικά</h1>
          <p className="text-muted-foreground">
            Διαχείριση πληρωμών, εισπράξεων και λογαριασμών κτιρίου
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/financial/payments/new">
              <CreditCard className="w-4 h-4 mr-2" />
              Νέα Πληρωμή
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/financial/receipts/new">
              <Receipt className="w-4 h-4 mr-2" />
              Απόδειξη Εισπράξεως
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Συνολικές Πληρωμές"
          value={stats.total_payments}
          description="Όλες οι πληρωμές"
          icon={<CreditCard className="w-4 h-4" />}
          color="default"
          href="/financial/payments"
        />
        <StatCard
          title="Εκκρεμείς Πληρωμές"
          value={stats.pending_payments}
          description="Περιμένουν πληρωμή"
          icon={<Clock className="w-4 h-4" />}
          color="warning"
          href="/financial/payments?status=pending"
        />
        <StatCard
          title="Ληξιπρόθεσμες"
          value={stats.overdue_payments}
          description="Απαιτούν άμεση προσοχή"
          icon={<AlertTriangle className="w-4 h-4" />}
          color="danger"
          href="/financial/payments?status=overdue"
        />
        <StatCard
          title="Πληρωμένες"
          value={stats.paid_payments}
          description="Ολοκληρωμένες πληρωμές"
          icon={<CheckCircle className="w-4 h-4" />}
          color="success"
          href="/financial/payments?status=paid"
        />
      </div>

      {/* Financial Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5" />
              Οικονομική Επισκόπηση
            </CardTitle>
            <CardDescription>
              Συνολικά έσοδα και εκκρεμότητες
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Συνολικά Εισπραχθέντα</span>
              <span className="text-lg font-bold text-green-600">
                €{stats.total_collected.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Εκκρεμότητες</span>
              <span className="text-lg font-bold text-red-600">
                €{stats.total_due.toLocaleString()}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Ποσοστό Εισπράξεως</span>
                <span>{stats.collection_rate}%</span>
              </div>
              <Progress value={stats.collection_rate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Λογαριασμοί Κτιρίου
            </CardTitle>
            <CardDescription>
              Κατάσταση λογαριασμών και διαθεσιμότητα
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Ενεργοί Λογαριασμοί</span>
              <span className="text-lg font-bold">
                {stats.active_accounts}/{stats.building_accounts}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">3</div>
                <div className="text-xs text-green-600">Λειτουργικοί</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">1</div>
                <div className="text-xs text-blue-600">Αποθεματικό</div>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/financial/accounts">
                Διαχείριση Λογαριασμών
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Γρήγορες Ενέργειες</CardTitle>
          <CardDescription>
            Συχνές λειτουργίες για γρήγορη πρόσβαση
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/financial/payments">
                <CreditCard className="w-6 h-6 mb-2" />
                <span>Διαχείριση Πληρωμών</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/financial/receipts">
                <Receipt className="w-6 h-6 mb-2" />
                <span>Αποδείξεις Εισπράξεων</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/financial/accounts">
                <Building className="w-6 h-6 mb-2" />
                <span>Λογαριασμοί Κτιρίου</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/financial/reports">
                <TrendingUp className="w-6 h-6 mb-2" />
                <span>Οικονομικά Reports</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Πρόσφατη Δραστηριότητα</CardTitle>
          <CardDescription>
            Τελευταίες πληρωμές και εισπράξεις
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Πληρώθηκε κοινοχρήστων διαμερίσματος Α1</p>
                <p className="text-xs text-muted-foreground">€150.00 - Πριν 1 ώρα</p>
              </div>
              <Badge variant="secondary">Πληρωμένο</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Εισπράχθηκε μερική πληρωμή διαμερίσματος Β3</p>
                <p className="text-xs text-muted-foreground">€75.00 από €150.00 - Πριν 3 ώρες</p>
              </div>
              <Badge variant="outline">Μερική</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Ληξιπρόθεσμη πληρωμή διαμερίσματος Γ2</p>
                <p className="text-xs text-muted-foreground">€200.00 - Λήξει πριν 2 ημέρες</p>
              </div>
              <Badge variant="destructive">Ληξιπρόθεσμη</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 