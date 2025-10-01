'use client';

/**
 * Send Notification Page
 * Form to create and send new notifications with template support
 */
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useNotificationTemplates, usePreviewTemplate } from '@/hooks/useNotificationTemplates';
import { useCreateNotification } from '@/hooks/useNotifications';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Send, Eye, FileText, Mail, MessageSquare, Users } from 'lucide-react';
import Link from 'next/link';
import type { NotificationCategory } from '@/types/notifications';

// Form validation schema
const formSchema = z.object({
  use_template: z.boolean(),
  template_id: z.number().optional(),
  subject: z.string().min(1, 'Το θέμα είναι υποχρεωτικό'),
  body: z.string().min(1, 'Το περιεχόμενο είναι υποχρεωτικό'),
  sms_body: z.string().optional(),
  notification_type: z.enum(['email', 'sms', 'both']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  send_to_all: z.boolean(),
  apartment_ids: z.array(z.number()).optional(),
  scheduled_at: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function SendNotificationPage() {
  const router = useRouter();
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<{
    subject: string;
    body: string;
    sms: string;
  } | null>(null);

  // Building scope selection
  const [buildingScope, setBuildingScope] = useState<'current' | 'specific' | 'all'>('current');
  const [selectedBuildings, setSelectedBuildings] = useState<number[]>([]);

  // Context variables for template
  const [context, setContext] = useState<Record<string, string>>({
    building_name: 'Αλκμάνος 22',
    building_address: 'Αλκμάνος 22, Αθήνα 116 36',
    current_date: new Date().toLocaleDateString('el-GR'),
    manager_phone: '210 1234567',
    manager_email: 'manager@building.gr',
  });

  const { data: templates } = useNotificationTemplates({ is_active: true });
  const { buildings, currentBuilding } = useBuilding();
  const createMutation = useCreateNotification();
  const previewMutation = usePreviewTemplate();

  // Helper to check if field should be a dropdown
  const isDropdownField = (fieldName: string) => {
    return fieldName === 'building_name';
  };

  // Helper to get dropdown options for a field
  const getDropdownOptions = (fieldName: string) => {
    if (fieldName === 'building_name') {
      return buildings.map((b) => ({
        value: b.name || `${b.address || 'Διεύθυνση'}`,
        label: b.name || `${b.address || 'Διεύθυνση'}`,
        data: b,
      }));
    }
    return [];
  };

  // Handle building selection - auto-populate related fields
  const handleBuildingSelect = (buildingName: string) => {
    const building = buildings.find((b) =>
      (b.name || `${b.address || 'Διεύθυνση'}`) === buildingName
    );

    if (building) {
      setContext((prev) => ({
        ...prev,
        building_name: building.name || `${building.address || 'Διεύθυνση'}`,
        building_address: `${building.address || 'Διεύθυνση'}, ${building.city || 'Πόλη'} ${building.postal_code || ''}`,
        manager_phone: building.internal_manager_phone || '210 1234567',
        manager_email: building.internal_manager_name || 'manager@building.gr',
      }));
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      use_template: false,
      notification_type: 'email',
      priority: 'normal',
      send_to_all: true,
      apartment_ids: [],
    },
  });

  const notificationType = watch('notification_type');
  const sendToAll = watch('send_to_all');

  // Auto-populate context from building data
  const getSmartDefaultForVariable = (variable: string): string => {
    // Apartment-specific variables (empty for multi-building)
    const apartmentSpecificVars = [
      'apartment_number',
      'owner_name',
      'common_expense_amount',
      'previous_balance',
      'total_amount',
      'due_date',
      'period'
    ];

    // If sending to multiple buildings/apartments, leave apartment-specific fields empty
    if (buildingScope !== 'current' && apartmentSpecificVars.includes(variable)) {
      return '';
    }

    // Building-level data (auto-populate from currentBuilding)
    if (variable === 'building_name') {
      return currentBuilding?.name || currentBuilding?.address || '';
    }
    if (variable === 'building_address') {
      return currentBuilding?.address || '';
    }
    if (variable === 'manager_phone') {
      return currentBuilding?.internal_manager_phone || currentBuilding?.management_office_phone || '';
    }
    if (variable === 'manager_email') {
      return currentBuilding?.management_office_address || '';
    }
    if (variable === 'bank_account') {
      return currentBuilding?.bank_account || ''; // TODO: Add to building model
    }

    // Date/time variables
    if (variable === 'current_date') {
      return new Date().toLocaleDateString('el-GR');
    }
    if (variable === 'period') {
      const now = new Date();
      return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    }
    if (variable === 'due_date') {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 10); // 10 days from now
      return dueDate.toLocaleDateString('el-GR');
    }

    // Empty for unknown variables
    return '';
  };

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    const id = parseInt(templateId);
    setSelectedTemplateId(id);

    const template = templates?.find((t) => t.id === id);
    if (template) {
      setValue('subject', template.subject);
      setValue('body', template.body_template);
      setValue('sms_body', template.sms_template);

      // Initialize context with smart defaults
      const newContext: Record<string, string> = {};
      template.available_variables.forEach((variable) => {
        newContext[variable] = getSmartDefaultForVariable(variable);
      });
      setContext(newContext);
    }
  };

  // Re-populate context when building scope changes
  useEffect(() => {
    if (useTemplate && selectedTemplateId) {
      const template = templates?.find((t) => t.id === selectedTemplateId);
      if (template) {
        const newContext: Record<string, string> = {};
        template.available_variables.forEach((variable) => {
          newContext[variable] = getSmartDefaultForVariable(variable);
        });
        setContext(newContext);
      }
    }
  }, [buildingScope, useTemplate, selectedTemplateId, templates]);

  // Handle preview
  const handlePreview = async () => {
    if (useTemplate && selectedTemplateId) {
      // Preview with template
      try {
        const result = await previewMutation.mutateAsync({
          template_id: selectedTemplateId,
          context,
        });
        setPreviewContent(result);
        setShowPreview(true);
      } catch (error) {
        console.error('Preview error:', error);
      }
    } else {
      // Preview manual content
      setPreviewContent({
        subject: watch('subject'),
        body: watch('body'),
        sms: watch('sms_body') || '',
      });
      setShowPreview(true);
    }
  };

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    const requestData: any = {
      notification_type: data.notification_type,
      priority: data.priority,
      send_to_all: data.send_to_all,
    };

    // Add building scope
    if (buildingScope === 'current' && currentBuilding) {
      requestData.building_ids = [currentBuilding.id];
    } else if (buildingScope === 'specific') {
      if (selectedBuildings.length === 0) {
        alert('Παρακαλώ επιλέξτε τουλάχιστον ένα κτίριο');
        return;
      }
      requestData.building_ids = selectedBuildings;
    } else if (buildingScope === 'all') {
      requestData.building_ids = buildings.map((b) => b.id);
    }

    // Add template or manual content
    if (useTemplate && selectedTemplateId) {
      requestData.template_id = selectedTemplateId;
      requestData.context = context;
    } else {
      requestData.subject = data.subject;
      requestData.body = data.body;
      if (data.sms_body) {
        requestData.sms_body = data.sms_body;
      }
    }

    // Add apartment selection
    if (!data.send_to_all && data.apartment_ids && data.apartment_ids.length > 0) {
      requestData.apartment_ids = data.apartment_ids;
    }

    // Add scheduled time
    if (data.scheduled_at) {
      requestData.scheduled_at = data.scheduled_at;
    }

    try {
      const result = await createMutation.mutateAsync(requestData);
      router.push(`/notifications/${result.id}`);
    } catch (error) {
      console.error('Send error:', error);
    }
  };

  return (
    <div className="w-full space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-6">
        <Link href="/notifications">
          <Button variant="outline" size="icon" className="hover:bg-muted/50 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="space-y-2">
          <h1 className="text-4xl font-heading font-bold tracking-tight text-foreground">
            Νέα Ειδοποίηση
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Δημιουργία και αποστολή μαζικής ειδοποίησης
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Template Selection */}
        <Card className="p-8 bg-gradient-to-br from-card to-surface border-border/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-heading font-semibold text-foreground">Επιλογή Περιεχομένου</h2>
            <div className="flex items-center gap-3">
              <Checkbox
                checked={useTemplate}
                onCheckedChange={(checked) => setUseTemplate(checked as boolean)}
                className="border-border/50"
              />
              <Label className="text-sm font-medium text-foreground">Χρήση Template</Label>
            </div>
          </div>

          {useTemplate ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Επιλογή Template</Label>
                <Select onValueChange={handleTemplateChange}>
                  <SelectTrigger className="bg-background/50 border-border/50">
                    <SelectValue placeholder="Επιλέξτε Ειδοποίηση" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(templates) && templates.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span>{template.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({template.category_display})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template Context Variables */}
              {selectedTemplateId && Object.keys(context).length > 0 && (
                <div className="space-y-4 border-t border-border/30 pt-6">
                  <div className="space-y-1">
                    <Label className="text-lg font-heading font-semibold text-foreground">Παράμετροι Template</Label>
                    <p className="text-sm text-muted-foreground">
                      Συμπληρώστε τις τιμές για τις μεταβλητές του template
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(context).map(([key, value]) => {
                      // Check if this is an apartment-specific field
                      const apartmentSpecificVars = [
                        'apartment_number',
                        'owner_name',
                        'common_expense_amount',
                        'previous_balance',
                        'total_amount',
                      ];
                      const isApartmentSpecific = apartmentSpecificVars.includes(key);
                      const shouldHide = isApartmentSpecific && buildingScope !== 'current';

                      // Don't render apartment-specific fields for multi-building notifications
                      if (shouldHide) return null;

                      // Check if field is auto-populated (has value and not apartment-specific when multi-building)
                      const isAutoPopulated = value !== '' && !shouldHide;

                      return (
                        <div key={key} className="space-y-2">
                          <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                            <code className="bg-muted/50 px-2 py-1 rounded-md text-xs font-mono border border-border/30">
                              {`{{${key}}}`}
                            </code>
                            {isAutoPopulated && (
                              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                ✓ Αυτόματο
                              </span>
                            )}
                          </Label>
                          {isDropdownField(key) ? (
                            <Select
                              value={value}
                              onValueChange={(val) => {
                                if (key === 'building_name') {
                                  handleBuildingSelect(val);
                                } else {
                                  setContext((prev) => ({...prev, [key]: val}));
                                }
                              }}
                            >
                              <SelectTrigger className="bg-background/50 border-border/50">
                                <SelectValue placeholder={`Επιλέξτε ${key.replace(/_/g, ' ')}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {getDropdownOptions(key).map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={value}
                              onChange={(e) =>
                                setContext((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                              placeholder={isAutoPopulated ? value : `Εισάγετε ${key.replace(/_/g, ' ')}`}
                              className={`font-mono text-sm border-border/50 ${
                                isAutoPopulated
                                  ? 'bg-green-50/50 border-green-200'
                                  : 'bg-background/50'
                              }`}
                              disabled={isAutoPopulated && !isApartmentSpecific}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Tabs defaultValue="email" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="sms" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  SMS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Θέμα Email</Label>
                  <Input
                    {...register('subject')}
                    placeholder="π.χ. Υπενθύμιση Οφειλών"
                    className="bg-background/50 border-border/50"
                  />
                  {errors.subject && (
                    <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Περιεχόμενο Email</Label>
                  <Textarea
                    {...register('body')}
                    rows={10}
                    placeholder="Γράψτε το περιεχόμενο της ειδοποίησης..."
                    className="bg-background/50 border-border/50 resize-none"
                  />
                  {errors.body && (
                    <p className="text-sm text-destructive mt-1">{errors.body.message}</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="sms" className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Κείμενο SMS</Label>
                  <Textarea
                    {...register('sms_body')}
                    rows={4}
                    maxLength={160}
                    placeholder="Γράψτε το SMS (μέχρι 160 χαρακτήρες)..."
                    className="bg-background/50 border-border/50 resize-none"
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      Χαρακτήρες: {watch('sms_body')?.length || 0} / 160
                    </p>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${Math.min(((watch('sms_body')?.length || 0) / 160) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </Card>

        {/* Notification Settings */}
        <Card className="p-8 bg-gradient-to-br from-card to-surface border-border/50">
          <h2 className="text-2xl font-heading font-semibold text-foreground mb-6">Ρυθμίσεις Ειδοποίησης</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Label className="text-sm font-medium text-foreground">Τύπος Ειδοποίησης</Label>
              <RadioGroup
                defaultValue="email"
                onValueChange={(value) =>
                  setValue('notification_type', value as 'email' | 'sms' | 'both')
                }
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/30 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="email" id="email" className="border-border/50" />
                  <Label htmlFor="email" className="flex items-center cursor-pointer flex-1">
                    <Mail className="w-4 h-4 mr-2 text-primary" />
                    <span className="text-sm font-medium">Μόνο Email</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/30 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="sms" id="sms" className="border-border/50" />
                  <Label htmlFor="sms" className="flex items-center cursor-pointer flex-1">
                    <MessageSquare className="w-4 h-4 mr-2 text-accent" />
                    <span className="text-sm font-medium">Μόνο SMS</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/30 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="both" id="both" className="border-border/50" />
                  <Label htmlFor="both" className="flex items-center cursor-pointer flex-1">
                    <div className="flex items-center mr-2">
                      <Mail className="w-4 h-4 text-primary" />
                      <MessageSquare className="w-4 h-4 ml-1 text-accent" />
                    </div>
                    <span className="text-sm font-medium">Email & SMS</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-medium text-foreground">Προτεραιότητα</Label>
              <Select
                defaultValue="normal"
                onValueChange={(value) =>
                  setValue('priority', value as 'low' | 'normal' | 'high' | 'urgent')
                }
              >
                <SelectTrigger className="bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Χαμηλή</SelectItem>
                  <SelectItem value="normal">Κανονική</SelectItem>
                  <SelectItem value="high">Υψηλή</SelectItem>
                  <SelectItem value="urgent">Επείγουσα</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Building Scope Selection */}
        <Card className="p-8 bg-gradient-to-br from-card to-surface border-border/50">
          <h2 className="text-2xl font-heading font-semibold text-foreground mb-6 flex items-center">
            <Users className="w-6 h-6 mr-3 text-primary" />
            Επιλογή Κτιρίων
          </h2>

          <div className="space-y-6">
            <RadioGroup value={buildingScope} onValueChange={(value: any) => setBuildingScope(value)} className="space-y-4">
              <div className="flex items-start space-x-3 p-4 rounded-lg border border-border/30 hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="current" id="current" className="mt-1 border-border/50" />
                <Label htmlFor="current" className="cursor-pointer flex-1">
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-foreground">Τρέχον κτίριο μόνο</span>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Αποστολή μόνο στο επιλεγμένο κτίριο
                    </p>
                  </div>
                </Label>
              </div>
              <div className="flex items-start space-x-3 p-4 rounded-lg border border-border/30 hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="specific" id="specific" className="mt-1 border-border/50" />
                <Label htmlFor="specific" className="cursor-pointer flex-1">
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-foreground">Συγκεκριμένα κτίρια</span>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Επιλέξτε σε ποια κτίρια να σταλεί
                    </p>
                  </div>
                </Label>
              </div>
              <div className="flex items-start space-x-3 p-4 rounded-lg border border-border/30 hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="all" id="all" className="mt-1 border-border/50" />
                <Label htmlFor="all" className="cursor-pointer flex-1">
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-foreground">Όλα τα κτίρια</span>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Μαζική αποστολή σε όλες τις πολυκατοικίες
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {buildingScope === 'specific' && (
              <div className="mt-6 p-6 bg-muted/30 rounded-lg border border-border/30 space-y-4">
                <Label className="text-sm font-medium text-foreground">Επιλέξτε Κτίρια:</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {buildings.map((building) => (
                    <div key={building.id} className="flex items-center space-x-3 p-3 rounded-lg border border-border/20 hover:bg-background/50 transition-colors">
                      <Checkbox
                        id={`building-${building.id}`}
                        checked={selectedBuildings.includes(building.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedBuildings([...selectedBuildings, building.id]);
                          } else {
                            setSelectedBuildings(selectedBuildings.filter((id) => id !== building.id));
                          }
                        }}
                        className="border-border/50"
                      />
                      <Label htmlFor={`building-${building.id}`} className="cursor-pointer flex-1">
                        <div className="space-y-1">
                          <span className="text-sm font-medium text-foreground">
                            {building.name || `${building.address || 'Διεύθυνση'}`}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {building.city || 'Πόλη'}
                          </p>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {buildingScope === 'all' && (
              <div className="mt-6 p-6 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-warning/20">
                    <span className="text-warning text-lg">⚠️</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-warning mb-1">
                      Μαζική Αποστολή
                    </p>
                    <p className="text-sm text-warning/80 leading-relaxed">
                      Η ειδοποίηση θα σταλεί σε όλα τα διαμερίσματα όλων των κτιρίων ({buildings.length} κτίρια)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Recipients Selection */}
        <Card className="p-8 bg-gradient-to-br from-card to-surface border-border/50">
          <h2 className="text-2xl font-heading font-semibold text-foreground mb-6 flex items-center">
            <Users className="w-6 h-6 mr-3 text-primary" />
            Παραλήπτες
          </h2>

          <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 rounded-lg border border-border/30 hover:bg-muted/30 transition-colors">
              <Checkbox
                checked={sendToAll}
                onCheckedChange={(checked) => setValue('send_to_all', checked as boolean)}
                className="mt-1 border-border/50"
              />
              <Label className="cursor-pointer flex-1">
                <div className="space-y-1">
                  <span className="text-sm font-medium text-foreground">
                    Αποστολή σε όλα τα διαμερίσματα
                  </span>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Αποστολή σε όλα τα διαμερίσματα του/των επιλεγμένου/ων κτιρίου/ων
                  </p>
                </div>
              </Label>
            </div>

            {!sendToAll && (
              <div className="p-6 bg-muted/30 rounded-lg border border-border/30">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-info/20">
                    <span className="text-info text-lg">ℹ️</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-info mb-1">
                      Συνέχεια Σύντομα
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Η επιλογή συγκεκριμένων διαμερισμάτων θα είναι διαθέσιμη σύντομα.
                      Προς το παρόν, μπορείτε να στείλετε σε όλους.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-gradient-to-br from-card to-surface border border-border/50 rounded-lg">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={!watch('subject') || !watch('body')}
            className="bg-background/50 border-border/50 hover:bg-muted/50"
          >
            <Eye className="w-4 h-4 mr-2" />
            Προεπισκόπηση
          </Button>

          <div className="flex gap-3">
            <Link href="/notifications">
              <Button type="button" variant="outline" className="bg-background/50 border-border/50 hover:bg-muted/50">
                Ακύρωση
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              size="lg"
              className="bg-gradient-primary hover:shadow-lg transition-all duration-300"
            >
              <Send className="w-4 h-4 mr-2" />
              {createMutation.isPending ? 'Αποστολή...' : 'Αποστολή Ειδοποίησης'}
            </Button>
          </div>
        </div>
      </form>

      {/* Preview Modal */}
      {showPreview && previewContent && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setShowPreview(false)}
        >
          <Card
            className="max-w-3xl w-full max-h-[85vh] overflow-y-auto bg-gradient-to-br from-card to-surface border-border/50 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-heading font-bold text-foreground">Προεπισκόπηση</h2>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPreview(false)}
                  className="bg-background/50 border-border/50 hover:bg-muted/50"
                >
                  Κλείσιμο
                </Button>
              </div>

              {notificationType !== 'sms' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-heading font-semibold text-foreground flex items-center">
                    <Mail className="w-5 h-5 mr-3 text-primary" />
                    Email
                  </h3>
                  <div className="bg-muted/50 p-6 rounded-lg border border-border/30 space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Θέμα:</p>
                      <p className="text-lg font-semibold text-foreground">{previewContent.subject}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Περιεχόμενο:</p>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground bg-background/50 p-4 rounded-md border border-border/20">
                        {previewContent.body}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {notificationType !== 'email' && previewContent.sms && (
                <div className="space-y-4">
                  <h3 className="text-xl font-heading font-semibold text-foreground flex items-center">
                    <MessageSquare className="w-5 h-5 mr-3 text-accent" />
                    SMS
                  </h3>
                  <div className="bg-muted/50 p-6 rounded-lg border border-border/30">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Κείμενο:</p>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground bg-background/50 p-4 rounded-md border border-border/20">
                        {previewContent.sms}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Χαρακτήρες: {previewContent.sms.length} / 160
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}