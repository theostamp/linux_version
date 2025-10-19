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
    <div className="w-full space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-heading font-bold tracking-tight text-foreground">
            Templates Ειδοποιήσεων
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Διαχείριση προκαθορισμένων templates για μαζικές ειδοποιήσεις
          </p>
        </div>

        <Button size="lg" disabled className="bg-gradient-secondary hover:shadow-lg transition-all duration-300">
          <Plus className="w-4 h-4 mr-2" />
          Νέο Template
          <Badge variant="outline" className="ml-2">
            Σύντομα
          </Badge>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 hover-lift bg-gradient-to-br from-card to-surface border-gray-200/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Σύνολο Templates</p>
              <p className="text-3xl font-heading font-bold text-foreground">{templates?.length || 0}</p>
            </div>
            <div className="p-3 rounded-full bg-primary/10">
              <FileText className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover-lift bg-gradient-to-br from-card to-surface border-gray-200/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Πληρωμές</p>
              <p className="text-3xl font-heading font-bold text-success">
                {templates?.filter((t) => t.category === 'payment').length || 0}
              </p>
            </div>
            <div className="p-3 rounded-full bg-success/10">
              <DollarSign className="w-6 h-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover-lift bg-gradient-to-br from-card to-surface border-gray-200/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Συντήρηση</p>
              <p className="text-3xl font-heading font-bold text-warning">
                {templates?.filter((t) => t.category === 'maintenance').length || 0}
              </p>
            </div>
            <div className="p-3 rounded-full bg-warning/10">
              <Wrench className="w-6 h-6 text-warning" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover-lift bg-gradient-to-br from-card to-surface border-gray-200/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Συναντήσεις</p>
              <p className="text-3xl font-heading font-bold text-accent">
                {templates?.filter((t) => t.category === 'meeting').length || 0}
              </p>
            </div>
            <div className="p-3 rounded-full bg-accent/10">
              <Users className="w-6 h-6 text-accent" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6 bg-gradient-to-br from-card to-surface border-gray-200/50">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Κατηγορία
            </label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-background/50 border-gray-200/50">
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
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => setCategoryFilter('all')}
                className="bg-background/50 border-gray-200/50 hover:bg-muted/50"
              >
                Καθαρισμός
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && (
          <Card className="p-12 col-span-full text-center bg-gradient-to-br from-card to-surface border-gray-200/50">
            <div className="animate-pulse">
              <div className="w-12 h-12 mx-auto mb-4 bg-muted rounded-full"></div>
              <p className="text-lg font-medium text-muted-foreground">Φόρτωση...</p>
            </div>
          </Card>
        )}

        {!isLoading && templates && templates.length === 0 && (
          <Card className="p-12 col-span-full text-center bg-gradient-to-br from-card to-surface border-gray-200/50">
            <div className="space-y-4">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto">
                <FileText className="w-12 h-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-heading font-semibold text-foreground">
                  Δεν βρέθηκαν templates
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Δημιουργήστε το πρώτο σας template
                </p>
              </div>
            </div>
          </Card>
        )}

        {Array.isArray(templates) && templates.map((template) => (
          <Card key={template.id} className="p-6 hover-lift bg-gradient-to-br from-card to-surface border-gray-200/50 transition-all duration-300 group">
            <div className="space-y-6">
              {/* Header */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${getCategoryColor(template.category)} border-0`}>
                    <span className="flex items-center gap-1">
                      {getCategoryIcon(template.category)}
                      {template.category_display}
                    </span>
                  </Badge>
                  {template.is_system && (
                    <Badge variant="outline" className="border-primary/20 text-primary">
                      Σύστημα
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-heading font-semibold text-foreground group-hover:text-primary transition-colors">
                    {template.name}
                  </h3>
                  {template.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {template.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Content Preview */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-3 border border-gray-200/30">
                <p className="text-sm font-semibold text-foreground line-clamp-1">
                  {template.subject}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {template.body_template.substring(0, 100)}...
                </p>
              </div>

              {/* Features */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {template.body_template && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary">
                    📧 Email
                  </span>
                )}
                {template.sms_template && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent/10 text-accent">
                    💬 SMS
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link href={`/notifications/send?template=${template.id}`} className="flex-1">
                  <Button variant="default" size="sm" className="w-full bg-gradient-primary hover:shadow-lg transition-all duration-300">
                    <FileText className="w-4 h-4 mr-2" />
                    Χρήση
                  </Button>
                </Link>
                <Button variant="outline" size="sm" disabled className="border-gray-200/50">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={template.is_system}
                  className="border-gray-200/50"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>

              {/* Metadata */}
              <div className="text-xs text-muted-foreground border-t border-gray-200/30 pt-3">
                <p className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></span>
                  Δημιουργήθηκε: {new Date(template.created_at).toLocaleDateString('el-GR')}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}