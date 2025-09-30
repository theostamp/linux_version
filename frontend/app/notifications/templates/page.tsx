'use client';

/**
 * Notification Templates Management Page
 * View and manage notification templates
 */
import { useState } from 'react';
import { useNotificationTemplates } from '@/hooks/useNotificationTemplates';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  Clock,
  DollarSign,
  Wrench,
  Users,
  AlertCircle,
  Bell,
} from 'lucide-react';
import Link from 'next/link';
import type { NotificationCategory } from '@/types/notifications';

export default function NotificationTemplatesPage() {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: templates, isLoading } = useNotificationTemplates({
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    is_active: true,
  });

  /**
   * Get category icon
   */
  const getCategoryIcon = (category: NotificationCategory) => {
    const icons: Record<NotificationCategory, React.ReactNode> = {
      announcement: <Bell className="w-4 h-4" />,
      payment: <DollarSign className="w-4 h-4" />,
      maintenance: <Wrench className="w-4 h-4" />,
      meeting: <Users className="w-4 h-4" />,
      emergency: <AlertCircle className="w-4 h-4" />,
      reminder: <Clock className="w-4 h-4" />,
    };
    return icons[category];
  };

  /**
   * Get category color
   */
  const getCategoryColor = (category: NotificationCategory) => {
    const colors: Record<NotificationCategory, string> = {
      announcement: 'bg-blue-100 text-blue-700',
      payment: 'bg-green-100 text-green-700',
      maintenance: 'bg-orange-100 text-orange-700',
      meeting: 'bg-purple-100 text-purple-700',
      emergency: 'bg-red-100 text-red-700',
      reminder: 'bg-yellow-100 text-yellow-700',
    };
    return colors[category];
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates Ειδοποιήσεων</h1>
          <p className="text-muted-foreground">
            Διαχείριση προκαθορισμένων templates για μαζικές ειδοποιήσεις
          </p>
        </div>

        <Button size="lg" disabled>
          <Plus className="w-4 h-4 mr-2" />
          Νέο Template
          <Badge variant="outline" className="ml-2">
            Σύντομα
          </Badge>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Σύνολο Templates</p>
              <p className="text-2xl font-bold">{templates?.length || 0}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Πληρωμές</p>
              <p className="text-2xl font-bold">
                {templates?.filter((t) => t.category === 'payment').length || 0}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Συντήρηση</p>
              <p className="text-2xl font-bold">
                {templates?.filter((t) => t.category === 'maintenance').length || 0}
              </p>
            </div>
            <Wrench className="w-8 h-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Συναντήσεις</p>
              <p className="text-2xl font-bold">
                {templates?.filter((t) => t.category === 'meeting').length || 0}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Όλες οι κατηγορίες" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Όλες</SelectItem>
                <SelectItem value="announcement">Ανακοινώσεις</SelectItem>
                <SelectItem value="payment">Πληρωμές</SelectItem>
                <SelectItem value="maintenance">Συντήρηση</SelectItem>
                <SelectItem value="meeting">Συναντήσεις</SelectItem>
                <SelectItem value="emergency">Έκτακτα</SelectItem>
                <SelectItem value="reminder">Υπενθυμίσεις</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {categoryFilter !== 'all' && (
            <Button variant="outline" onClick={() => setCategoryFilter('all')}>
              Καθαρισμός
            </Button>
          )}
        </div>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && (
          <Card className="p-8 col-span-full text-center text-muted-foreground">
            Φόρτωση...
          </Card>
        )}

        {!isLoading && templates && templates.length === 0 && (
          <Card className="p-8 col-span-full text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-semibold">Δεν βρέθηκαν templates</p>
            <p className="text-muted-foreground mb-4">
              Δημιουργήστε το πρώτο σας template
            </p>
          </Card>
        )}

        {templates?.map((template) => (
          <Card key={template.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getCategoryColor(template.category)}>
                      <span className="flex items-center gap-1">
                        {getCategoryIcon(template.category)}
                        {template.category_display}
                      </span>
                    </Badge>
                    {template.is_system && (
                      <Badge variant="outline">Σύστημα</Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Content Preview */}
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <p className="text-sm font-semibold line-clamp-1">
                  {template.subject}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {template.body_template.substring(0, 100)}...
                </p>
              </div>

              {/* Features */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {template.body_template && (
                  <span className="flex items-center gap-1">
                    📧 Email
                  </span>
                )}
                {template.sms_template && (
                  <span className="flex items-center gap-1">
                    💬 SMS
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link href={`/notifications/send?template=${template.id}`} className="flex-1">
                  <Button variant="default" size="sm" className="w-full">
                    <FileText className="w-4 h-4 mr-2" />
                    Χρήση
                  </Button>
                </Link>
                <Button variant="outline" size="sm" disabled>
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={template.is_system}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>

              {/* Metadata */}
              <div className="text-xs text-muted-foreground border-t pt-2">
                <p>
                  Δημιουργήθηκε:{' '}
                  {new Date(template.created_at).toLocaleDateString('el-GR')}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}