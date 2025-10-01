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

  // Context variables for template
  const [context, setContext] = useState<Record<string, string>>({
    building_name: 'Αλκμάνος 22',
    building_address: 'Αλκμάνος 22, Αθήνα 116 36',
    current_date: new Date().toLocaleDateString('el-GR'),
    manager_phone: '210 1234567',
    manager_email: 'manager@building.gr',
  });

  const { data: templates } = useNotificationTemplates({ is_active: true });
  const createMutation = useCreateNotification();
  const previewMutation = usePreviewTemplate();

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

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    const id = parseInt(templateId);
    setSelectedTemplateId(id);

    const template = templates?.find((t) => t.id === id);
    if (template) {
      setValue('subject', template.subject);
      setValue('body', template.body_template);
      setValue('sms_body', template.sms_template);
    }
  };

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
    const requestData = {
      template_id: useTemplate ? selectedTemplateId || undefined : undefined,
      subject: useTemplate ? undefined : data.subject,
      body: useTemplate ? undefined : data.body,
      sms_body: useTemplate ? undefined : data.sms_body,
      context: useTemplate ? context : undefined,
      notification_type: data.notification_type,
      priority: data.priority,
      send_to_all: data.send_to_all,
      apartment_ids: data.send_to_all ? undefined : data.apartment_ids,
      scheduled_at: data.scheduled_at || undefined,
    };

    try {
      const result = await createMutation.mutateAsync(requestData);
      router.push(`/notifications/${result.id}`);
    } catch (error) {
      console.error('Send error:', error);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/notifications">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Νέα Ειδοποίηση</h1>
          <p className="text-muted-foreground">
            Δημιουργία και αποστολή μαζικής ειδοποίησης
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Template Selection */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Επιλογή Περιεχομένου</h2>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={useTemplate}
                onCheckedChange={(checked) => setUseTemplate(checked as boolean)}
              />
              <Label>Χρήση Template</Label>
            </div>
          </div>

          {useTemplate ? (
            <div className="space-y-4">
              <div>
                <Label>Επιλογή Template</Label>
                <Select onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((template) => (
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
              {selectedTemplateId && (
                <div className="space-y-2">
                  <Label>Μεταβλητές Template</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(context).map(([key, value]) => (
                      <div key={key}>
                        <Label className="text-xs">{`{{${key}}}`}</Label>
                        <Input
                          value={value}
                          onChange={(e) =>
                            setContext((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          placeholder={key}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Tabs defaultValue="email">
              <TabsList className="mb-4">
                <TabsTrigger value="email">
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="sms">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  SMS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-4">
                <div>
                  <Label>Θέμα Email</Label>
                  <Input
                    {...register('subject')}
                    placeholder="π.χ. Υπενθύμιση Οφειλών"
                  />
                  {errors.subject && (
                    <p className="text-sm text-red-500 mt-1">{errors.subject.message}</p>
                  )}
                </div>

                <div>
                  <Label>Περιεχόμενο Email</Label>
                  <Textarea
                    {...register('body')}
                    rows={10}
                    placeholder="Γράψτε το περιεχόμενο της ειδοποίησης..."
                  />
                  {errors.body && (
                    <p className="text-sm text-red-500 mt-1">{errors.body.message}</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="sms" className="space-y-4">
                <div>
                  <Label>Κείμενο SMS</Label>
                  <Textarea
                    {...register('sms_body')}
                    rows={4}
                    maxLength={160}
                    placeholder="Γράψτε το SMS (μέχρι 160 χαρακτήρες)..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Χαρακτήρες: {watch('sms_body')?.length || 0} / 160
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </Card>

        {/* Notification Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Ρυθμίσεις Ειδοποίησης</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Τύπος Ειδοποίησης</Label>
              <RadioGroup
                defaultValue="email"
                onValueChange={(value) =>
                  setValue('notification_type', value as 'email' | 'sms' | 'both')
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email" className="flex items-center cursor-pointer">
                    <Mail className="w-4 h-4 mr-2" />
                    Μόνο Email
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sms" id="sms" />
                  <Label htmlFor="sms" className="flex items-center cursor-pointer">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Μόνο SMS
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="both" />
                  <Label htmlFor="both" className="flex items-center cursor-pointer">
                    <Mail className="w-4 h-4 mr-2" />
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Email & SMS
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Προτεραιότητα</Label>
              <Select
                defaultValue="normal"
                onValueChange={(value) =>
                  setValue('priority', value as 'low' | 'normal' | 'high' | 'urgent')
                }
              >
                <SelectTrigger>
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

        {/* Recipients Selection */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Παραλήπτες
          </h2>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={sendToAll}
                onCheckedChange={(checked) => setValue('send_to_all', checked as boolean)}
              />
              <Label>Αποστολή σε όλα τα διαμερίσματα</Label>
            </div>

            {!sendToAll && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Η επιλογή συγκεκριμένων διαμερισμάτων θα είναι διαθέσιμη σύντομα.
                  Προς το παρόν, μπορείτε να στείλετε σε όλους.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={!watch('subject') || !watch('body')}
          >
            <Eye className="w-4 h-4 mr-2" />
            Προεπισκόπηση
          </Button>

          <div className="flex gap-2">
            <Link href="/notifications">
              <Button type="button" variant="outline">
                Ακύρωση
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              size="lg"
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <Card
            className="max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Προεπισκόπηση</h2>
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Κλείσιμο
                </Button>
              </div>

              {notificationType !== 'sms' && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </h3>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="font-semibold">{previewContent.subject}</p>
                    <div className="whitespace-pre-wrap text-sm">{previewContent.body}</div>
                  </div>
                </div>
              )}

              {notificationType !== 'email' && previewContent.sms && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    SMS
                  </h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{previewContent.sms}</p>
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