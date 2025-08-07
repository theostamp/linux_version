'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'react-hot-toast';
import { 
  Upload, 
  FileText, 
  Image, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Eye,
  Download,
  Trash2,
  Plus,
  Building,
  Users,
  Home
} from 'lucide-react';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';
import { 
  analyzeFormImages, 
  validateMigrationData, 
  importMigrationData,
  ExtractedData,
  ValidationResult
} from '@/lib/migration-api';



interface MigrationStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  message?: string;
}

export default function DataMigrationPage() {
  const { user } = useAuth();
  const { selectedBuilding } = useBuilding();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [migrationSteps, setMigrationSteps] = useState<MigrationStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedBuildingForImport, setSelectedBuildingForImport] = useState<string>('new');

  const canManage = user?.is_superuser || user?.is_staff;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error('Παρακαλώ επιλέξτε μόνο αρχεία εικόνων');
      return;
    }

    setUploadedFiles(prev => [...prev, ...imageFiles]);
    toast.success(`Προστέθηκαν ${imageFiles.length} εικόνες`);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeImages = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Παρακαλώ ανεβάστε εικόνες πρώτα');
      return;
    }

    setIsProcessing(true);
    setActiveTab('analysis');

    const steps: MigrationStep[] = [
      { id: 'upload', name: 'Ανέβασμα αρχείων', status: 'completed', progress: 100 },
      { id: 'ocr', name: 'Ανάλυση κειμένου (OCR)', status: 'processing', progress: 0 },
      { id: 'extract', name: 'Εξαγωγή δεδομένων', status: 'pending', progress: 0 },
      { id: 'validate', name: 'Επικύρωση δεδομένων', status: 'pending', progress: 0 },
      { id: 'import', name: 'Εισαγωγή στη βάση', status: 'pending', progress: 0 }
    ];

    setMigrationSteps(steps);

    try {
      // Προσομοίωση OCR progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setMigrationSteps(prev => prev.map(step => 
          step.id === 'ocr' ? { ...step, progress: i } : step
        ));
      }

      setMigrationSteps(prev => prev.map(step => 
        step.id === 'ocr' ? { ...step, status: 'completed', progress: 100 } :
        step.id === 'extract' ? { ...step, status: 'processing', progress: 0 } : step
      ));

      // Πραγματική ανάλυση με AI
      const result = await analyzeFormImages(uploadedFiles);
      
      if (result.success) {
        setExtractedData(result.data);
        
        setMigrationSteps(prev => prev.map(step => 
          step.id === 'extract' ? { ...step, status: 'completed', progress: 100 } :
          step.id === 'validate' ? { ...step, status: 'processing', progress: 0 } : step
        ));

        // Επικύρωση δεδομένων
        const validation = await validateMigrationData(result.data);
        
        setMigrationSteps(prev => prev.map(step => 
          step.id === 'validate' ? { ...step, status: 'completed', progress: 100 } : step
        ));

        if (!validation.is_valid) {
          toast.error(`Βρέθηκαν σφάλματα: ${validation.errors.join(', ')}`);
        } else if (validation.warnings.length > 0) {
          toast.warning(`Προειδοποιήσεις: ${validation.warnings.join(', ')}`);
        }

        setIsProcessing(false);
        setActiveTab('preview');
        toast.success('Η ανάλυση ολοκληρώθηκε επιτυχώς!');
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error analyzing images:', error);
      setMigrationSteps(prev => prev.map(step => 
        step.status === 'processing' ? { ...step, status: 'error', message: error.message } : step
      ));
      setIsProcessing(false);
      toast.error(`Σφάλμα κατά την ανάλυση: ${error.message}`);
    }
  };

  const importData = async () => {
    if (!extractedData) return;

    setIsProcessing(true);
    setActiveTab('import');

    setMigrationSteps(prev => prev.map(step => 
      step.id === 'import' ? { ...step, status: 'processing', progress: 0 } : step
    ));

    try {
      const result = await importMigrationData(extractedData, selectedBuildingForImport);
      
      if (result.success) {
        setMigrationSteps(prev => prev.map(step => 
          step.id === 'import' ? { ...step, status: 'completed', progress: 100 } : step
        ));

        setIsProcessing(false);
        toast.success(`Η εισαγωγή ολοκληρώθηκε! Δημιουργήθηκαν ${result.apartments_created} διαμερίσματα και ${result.users_created} χρήστες.`);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error importing data:', error);
      setMigrationSteps(prev => prev.map(step => 
        step.status === 'processing' ? { ...step, status: 'error', message: error.message } : step
      ));
      setIsProcessing(false);
      toast.error(`Σφάλμα κατά την εισαγωγή: ${error.message}`);
    }
  };

  const downloadTemplate = () => {
    const template = `Αριθμός Διαμερίσματος,Όροφος,Όνομα Ιδιοκτήτη,Τηλέφωνο Ιδιοκτήτη,Email Ιδιοκτήτη,Όνομα Ενοίκου,Τηλέφωνο Ενοίκου,Email Ενοίκου,Τετραγωνικά Μέτρα,Υπνοδωμάτια,Ενοικιασμένο,Χιλιοστά Ιδιοκτησίας
1,1,Γεώργιος Παπαδόπουλος,2101234567,george@example.com,,,85,2,Όχι,100
2,1,Μαρία Κωνσταντίνου,2102345678,maria@example.com,Νίκος Δημητρίου,6971234567,nikos@example.com,75,2,Ναι,100`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_apartments.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!canManage) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔄 Μετανάστευση Δεδομένων</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            Δεν έχετε δικαίωμα πρόσβασης στη μετανάστευση δεδομένων.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">🔄 Μετανάστευση Δεδομένων</h1>
        <p className="text-gray-600">
          Μετατρέψτε φορμές κοινοχρήστων σε δεδομένα με τη βοήθεια AI
        </p>
      </div>

      <BuildingFilterIndicator className="mb-4" />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload" disabled={isProcessing}>
            <Upload className="w-4 h-4 mr-2" />
            Ανέβασμα
          </TabsTrigger>
          <TabsTrigger value="analysis" disabled={isProcessing}>
            <Image className="w-4 h-4 mr-2" />
            Ανάλυση
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={isProcessing}>
            <Eye className="w-4 h-4 mr-2" />
            Προεπισκόπηση
          </TabsTrigger>
          <TabsTrigger value="import" disabled={isProcessing}>
            <Database className="w-4 h-4 mr-2" />
            Εισαγωγή
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Ανέβασμα Φορμών Κοινοχρήστων
              </CardTitle>
              <CardDescription>
                Ανεβάστε φωτογραφίες ή σκανάρισμα φορμών κοινοχρήστων για αυτόματη ανάλυση
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Ανέβασμα Αρχείων</h3>
                <p className="text-gray-600 mb-4">
                  Επιλέξτε εικόνες φορμών κοινοχρήστων (JPG, PNG, PDF)
                </p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Επιλογή Αρχείων
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium">Ανεβασμένα Αρχεία ({uploadedFiles.length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="border rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-8 h-8 text-blue-500" />
                          <div>
                            <p className="font-medium text-sm">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternative Methods */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">CSV Template</CardTitle>
                    <CardDescription>
                      Κατεβάστε το πρότυπο CSV για χειροκίνητη συμπλήρωση
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={downloadTemplate} variant="outline" className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Κατέβασμα Προτύπου
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Άμεση Εισαγωγή</CardTitle>
                    <CardDescription>
                      Εισάγετε δεδομένα απευθείας από CSV αρχείο
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Εισαγωγή CSV
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="flex justify-end">
                  <Button onClick={analyzeImages} disabled={isProcessing}>
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Image className="w-4 h-4 mr-2" />
                    )}
                    Έναρξη Ανάλυσης
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Image className="w-5 h-5 mr-2" />
                Ανάλυση με AI
              </CardTitle>
              <CardDescription>
                Το AI αναλύει τις εικόνες και εξάγει τα δεδομένα
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {migrationSteps.map((step) => (
                <div key={step.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {step.status === 'completed' && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {step.status === 'processing' && (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      )}
                      {step.status === 'pending' && (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                      {step.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="font-medium">{step.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">{step.progress}%</span>
                  </div>
                  <Progress value={step.progress} className="w-full" />
                  {step.message && (
                    <p className="text-sm text-gray-600">{step.message}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {extractedData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="w-5 h-5 mr-2" />
                    Πληροφορίες Κτιρίου
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Όνομα</Label>
                      <p className="font-medium">{extractedData.building_info?.name}</p>
                    </div>
                    <div>
                      <Label>Διεύθυνση</Label>
                      <p className="font-medium">{extractedData.building_info?.address}</p>
                    </div>
                    <div>
                      <Label>Πόλη</Label>
                      <p className="font-medium">{extractedData.building_info?.city}</p>
                    </div>
                    <div>
                      <Label>Διαμερίσματα</Label>
                      <p className="font-medium">{extractedData.building_info?.apartments_count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Home className="w-5 h-5 mr-2" />
                    Διαμερίσματα ({extractedData.apartments?.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {extractedData.apartments?.map((apt, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Διαμέρισμα {apt.number}</h4>
                          <Badge variant={apt.is_rented ? "default" : "secondary"}>
                            {apt.is_rented ? "Ενοικιασμένο" : "Ιδιοκατοίκηση"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <Label className="text-xs">Ιδιοκτήτης</Label>
                            <p>{apt.owner_name}</p>
                          </div>
                          <div>
                            <Label className="text-xs">Τηλέφωνο</Label>
                            <p>{apt.owner_phone}</p>
                          </div>
                          {apt.is_rented && apt.tenant_name && (
                            <>
                              <div>
                                <Label className="text-xs">Ενοίκος</Label>
                                <p>{apt.tenant_name}</p>
                              </div>
                              <div>
                                <Label className="text-xs">Τηλέφωνο Ενοίκου</Label>
                                <p>{apt.tenant_phone}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Κάτοικοι ({extractedData.residents?.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {extractedData.residents?.map((resident, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{resident.name}</p>
                          <p className="text-sm text-gray-600">{resident.email}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{resident.role}</Badge>
                          <p className="text-sm text-gray-600">Διαμέρισμα {resident.apartment}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab('upload')}>
                  Επιστροφή
                </Button>
                <Button onClick={importData} disabled={isProcessing}>
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Database className="w-4 h-4 mr-2" />
                  )}
                  Εισαγωγή Δεδομένων
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2" />
                Εισαγωγή στη Βάση Δεδομένων
              </CardTitle>
              <CardDescription>
                Επιλέξτε πώς θέλετε να εισάγετε τα δεδομένα
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Επιλογή Κτιρίου</Label>
                <Select value={selectedBuildingForImport} onValueChange={setSelectedBuildingForImport}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε κτίριο" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Νέο Κτίριο</SelectItem>
                    {selectedBuilding && (
                      <SelectItem value={selectedBuilding.id.toString()}>
                        {selectedBuilding.name}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {migrationSteps.map((step) => (
                <div key={step.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {step.status === 'completed' && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {step.status === 'processing' && (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      )}
                      {step.status === 'pending' && (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                      <span className="font-medium">{step.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">{step.progress}%</span>
                  </div>
                  <Progress value={step.progress} className="w-full" />
                </div>
              ))}

              {migrationSteps.every(step => step.status === 'completed') && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <p className="text-green-800 font-medium">
                      Η μετανάστευση ολοκληρώθηκε επιτυχώς!
                    </p>
                  </div>
                  <p className="text-green-700 mt-2">
                    Τα δεδομένα έχουν εισαχθεί στη βάση δεδομένων και είναι διαθέσιμα για χρήση.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 