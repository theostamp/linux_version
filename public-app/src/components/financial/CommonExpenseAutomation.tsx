import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Calculator, 
  FileText, 
  Zap,
  Calendar,
  Euro
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCommonExpenses } from '@/hooks/useCommonExpenses';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { showErrorFromException } from '@/lib/errorMessages';

interface CommonExpenseAutomationProps {}

interface PeriodTemplate {
  value: string;
  label: string;
  description: string;
}

interface AutomationStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'completed' | 'error' | 'in-progress';
  data?: any;
}

export const CommonExpenseAutomation: React.FC<CommonExpenseAutomationProps> = () => {
  // Use BuildingContext for building data
  const { selectedBuilding } = useBuilding();
  const buildingId = selectedBuilding?.id;
  
  const { toast } = useToast();
  const {
    createPeriodAutomatically,
    collectExpensesAutomatically,
    calculateAutomatically,
    issueAutomatically,
    autoProcessPeriod,
    getPeriodStatistics,
    getPeriodTemplates,
    isLoading,
    error
  } = useCommonExpenses();

  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'semester' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState<string>('');
  const [periodTemplates, setPeriodTemplates] = useState<PeriodTemplate[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<any>(null);
  const [automationSteps, setAutomationSteps] = useState<AutomationStep[]>([
    {
      id: 'create-period',
      title: 'Δημιουργία Περιόδου',
      description: 'Αυτόματη δημιουργία περιόδου κοινοχρήστων',
      icon: <Calendar className="h-4 w-4" />,
      status: 'pending'
    },
    {
      id: 'collect-expenses',
      title: 'Συλλογή Δαπανών',
      description: 'Αυτόματη συλλογή δαπανών για την περίοδο',
      icon: <FileText className="h-4 w-4" />,
      status: 'pending'
    },
    {
      id: 'calculate-shares',
      title: 'Υπολογισμός Μεριδίων',
      description: 'Αυτόματος υπολογισμός μεριδίων ανά διαμέρισμα',
      icon: <Calculator className="h-4 w-4" />,
      status: 'pending'
    },
    {
      id: 'issue-accounts',
      title: 'Έκδοση Λογαριασμών',
      description: 'Αυτόματη έκδοση λογαριασμών κοινοχρήστων',
      icon: <Euro className="h-4 w-4" />,
      status: 'pending'
    }
  ]);

  useEffect(() => {
    loadPeriodTemplates();
  }, []);

  const loadPeriodTemplates = async () => {
    try {
      const response = await getPeriodTemplates();
      if (response.success) {
        setPeriodTemplates(response.templates);
      }
    } catch (error) {
      console.error('Error loading period templates:', error);
    }
  };

  const updateStepStatus = (stepId: string, status: AutomationStep['status'], data?: any) => {
    setAutomationSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, data } 
        : step
    ));
  };

  const resetSteps = () => {
    setAutomationSteps(prev => prev.map(step => ({ ...step, status: 'pending', data: undefined })));
    setCurrentPeriod(null);
  };

  const handleCreatePeriod = async () => {
    try {
      updateStepStatus('create-period', 'in-progress');
      
      const result = await createPeriodAutomatically({
        building_id: buildingId,
        period_type: periodType,
        start_date: startDate || undefined
      });

      if (result.success) {
        setCurrentPeriod(result.period);
        updateStepStatus('create-period', 'completed', result.period);
        toast({
          title: "Επιτυχία!",
          description: result.message,
        });
      } else {
        updateStepStatus('create-period', 'error');
        toast({
          title: "Σφάλμα",
          description: result.message || "Σφάλμα κατά τη δημιουργία περιόδου",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      updateStepStatus('create-period', 'error');
      console.error('Error creating period:', error);
      showErrorFromException(error, 'Σφάλμα κατά τη δημιουργία περιόδου');
      toast({
        title: "Σφάλμα",
        description: error.message || "Σφάλμα κατά τη δημιουργία περιόδου",
        variant: "destructive",
      });
    }
  };

  const handleCollectExpenses = async () => {
    if (!currentPeriod) {
      toast({
        title: "Προειδοποίηση",
        description: "Πρώτα δημιουργήστε μια περίοδο",
        variant: "destructive",
      });
      return;
    }

    try {
      updateStepStatus('collect-expenses', 'in-progress');
      
      const result = await collectExpensesAutomatically({
        building_id: buildingId,
        period_id: currentPeriod.id
      });

      if (result.success) {
        updateStepStatus('collect-expenses', 'completed', result);
        toast({
          title: "Επιτυχία!",
          description: result.message,
        });
      } else {
        updateStepStatus('collect-expenses', 'error');
        toast({
          title: "Σφάλμα",
          description: result.message || "Σφάλμα κατά τη συλλογή δαπανών",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      updateStepStatus('collect-expenses', 'error');
      toast({
        title: "Σφάλμα",
        description: error.message || "Σφάλμα κατά τη συλλογή δαπανών",
        variant: "destructive",
      });
    }
  };

  const handleCalculateShares = async () => {
    if (!currentPeriod) {
      toast({
        title: "Προειδοποίηση",
        description: "Πρώτα δημιουργήστε μια περίοδο",
        variant: "destructive",
      });
      return;
    }

    try {
      updateStepStatus('calculate-shares', 'in-progress');
      
      const result = await calculateAutomatically({
        building_id: buildingId,
        period_id: currentPeriod.id
      });

      if (result.success) {
        updateStepStatus('calculate-shares', 'completed', result.calculation);
        toast({
          title: "Επιτυχία!",
          description: result.message,
        });
      } else {
        updateStepStatus('calculate-shares', 'error');
        toast({
          title: "Σφάλμα",
          description: result.message || "Σφάλμα κατά τον υπολογισμό",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      updateStepStatus('calculate-shares', 'error');
      toast({
        title: "Σφάλμα",
        description: error.message || "Σφάλμα κατά τον υπολογισμό",
        variant: "destructive",
      });
    }
  };

  const handleIssueAccounts = async () => {
    if (!currentPeriod) {
      toast({
        title: "Προειδοποίηση",
        description: "Πρώτα δημιουργήστε μια περίοδο",
        variant: "destructive",
      });
      return;
    }

    try {
      updateStepStatus('issue-accounts', 'in-progress');
      
      const result = await issueAutomatically({
        building_id: buildingId,
        period_id: currentPeriod.id
      });

      if (result.success) {
        updateStepStatus('issue-accounts', 'completed', result);
        toast({
          title: "Επιτυχία!",
          description: result.message,
        });
      } else {
        updateStepStatus('issue-accounts', 'error');
        toast({
          title: "Σφάλμα",
          description: result.message || "Σφάλμα κατά την έκδοση",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      updateStepStatus('issue-accounts', 'error');
      toast({
        title: "Σφάλμα",
        description: error.message || "Σφάλμα κατά την έκδοση",
        variant: "destructive",
      });
    }
  };

  const handleAutoProcess = async () => {
    try {
      // Reset steps
      resetSteps();
      
      // Set all steps to in-progress
      setAutomationSteps(prev => prev.map(step => ({ ...step, status: 'in-progress' })));
      
      const result = await autoProcessPeriod({
        building_id: buildingId,
        period_type: periodType,
        start_date: startDate || undefined
      });

      if (result.success) {
        setCurrentPeriod({
          id: result.period_id,
          name: result.period_name,
          start_date: result.start_date,
          end_date: result.end_date
        });
        
        // Set all steps to completed
        setAutomationSteps(prev => prev.map(step => ({ ...step, status: 'completed' })));
        
        toast({
          title: "Επιτυχία!",
          description: result.message,
        });
      } else {
        // Set all steps to error
        setAutomationSteps(prev => prev.map(step => ({ ...step, status: 'error' })));
        
        toast({
          title: "Σφάλμα",
          description: result.message || "Σφάλμα κατά την αυτοματοποιημένη επεξεργασία",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      // Set all steps to error
      setAutomationSteps(prev => prev.map(step => ({ ...step, status: 'error' })));
      
      toast({
        title: "Σφάλμα",
        description: error.message || "Σφάλμα κατά την αυτοματοποιημένη επεξεργασία",
        variant: "destructive",
      });
    }
  };

  const getStepIcon = (step: AutomationStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return step.icon;
    }
  };

  const getStepBadgeVariant = (status: AutomationStep['status']) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'error':
        return 'destructive';
      case 'in-progress':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Αυτοματισμοί Κοινοχρήστων
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period-type">Τύπος Περιόδου</Label>
              <Select value={periodType} onValueChange={(value: any) => setPeriodType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε τύπο περιόδου" />
                </SelectTrigger>
                <SelectContent>
                  {periodTemplates.map((template) => (
                    <SelectItem key={template.value} value={template.value}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="start-date">Ημερομηνία Έναρξης (Προαιρετικό)</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Αφήστε κενό για τρέχοντα μήνα"
              />
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={handleAutoProcess} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Επεξεργασία...' : 'Αυτόματη Επεξεργασία'}
              </Button>
            </div>
          </div>

          {currentPeriod && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Τρέχουσα περίοδος: <strong>{currentPeriod.name}</strong>
                {currentPeriod.start_date && currentPeriod.end_date && (
                  <span className="ml-2 text-muted-foreground">
                    ({format(new Date(currentPeriod.start_date), 'dd/MM/yyyy', { locale: el })} - {format(new Date(currentPeriod.end_date), 'dd/MM/yyyy', { locale: el })})
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Βήματα Αυτοματισμού</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {automationSteps.map((step) => (
              <div key={step.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStepIcon(step)}
                  <div>
                    <h4 className="font-medium">{step.title}</h4>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                    {step.data && step.status === 'completed' && (
                      <div className="mt-2 space-y-1">
                        {step.id === 'collect-expenses' && step.data.expenses && (
                          <div className="text-sm">
                            <Badge variant="outline" className="mr-2">
                              {step.data.expenses_count} δαπάνες
                            </Badge>
                            <Badge variant="outline">
                              {step.data.total_amount.toFixed(2)} €
                            </Badge>
                          </div>
                        )}
                        {step.id === 'calculate-shares' && step.data.shares && (
                          <div className="text-sm">
                            <Badge variant="outline" className="mr-2">
                              {step.data.apartments_count} διαμερίσματα
                            </Badge>
                            <Badge variant="outline">
                              {step.data.total_expenses.toFixed(2)} €
                            </Badge>
                          </div>
                        )}
                        {step.id === 'issue-accounts' && (
                          <div className="text-sm">
                            <Badge variant="outline" className="mr-2">
                              {step.data.apartments_count} λογαριασμοί
                            </Badge>
                            <Badge variant="outline">
                              {step.data.total_amount.toFixed(2)} €
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant={getStepBadgeVariant(step.status)}>
                  {step.status === 'completed' && 'Ολοκληρώθηκε'}
                  {step.status === 'error' && 'Σφάλμα'}
                  {step.status === 'in-progress' && 'Επεξεργασία'}
                  {step.status === 'pending' && 'Εκκρεμεί'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Χειροκίνητες Ενέργειες</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              onClick={handleCreatePeriod} 
              disabled={isLoading || automationSteps[0].status === 'completed'}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Calendar className="h-6 w-6" />
              <span>Δημιουργία Περιόδου</span>
            </Button>
            
            <Button 
              onClick={handleCollectExpenses} 
              disabled={isLoading || !currentPeriod || automationSteps[1].status === 'completed'}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <FileText className="h-6 w-6" />
              <span>Συλλογή Δαπανών</span>
            </Button>
            
            <Button 
              onClick={handleCalculateShares} 
              disabled={isLoading || !currentPeriod || automationSteps[2].status === 'completed'}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Calculator className="h-6 w-6" />
              <span>Υπολογισμός Μεριδίων</span>
            </Button>
            
            <Button 
              onClick={handleIssueAccounts} 
              disabled={isLoading || !currentPeriod || automationSteps[3].status === 'completed'}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Euro className="h-6 w-6" />
              <span>Έκδοση Λογαριασμών</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}; 