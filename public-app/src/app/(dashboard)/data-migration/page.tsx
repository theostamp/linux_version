'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2, CheckCircle, AlertCircle, FileText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useBuilding } from '@/components/contexts/BuildingContext';
import {
  analyzeMigrationImages,
  importMigrationData,
  validateMigrationData,
  fetchBuilding,
} from '@/lib/api';
import type {
  MigrationAnalysisResult,
  MigrationBuildingInfo,
  MigrationValidationResult,
} from '@/types/dataMigration';

const emptyBuildingInfo: MigrationBuildingInfo = {
  name: '',
  address: '',
  city: '',
  postal_code: '',
  apartments_count: undefined,
  internal_manager_name: '',
  internal_manager_phone: '',
  internal_manager_apartment: '',
  internal_manager_collection_schedule: '',
  management_office_name: '',
  management_office_phone: '',
  management_office_address: '',
};

const normalizeBuildingInfo = (
  info: MigrationBuildingInfo | undefined,
  apartmentsCount: number
): MigrationBuildingInfo => ({
  name: info?.name || '',
  address: info?.address || '',
  city: info?.city || '',
  postal_code: info?.postal_code || '',
  apartments_count: (info?.apartments_count ?? apartmentsCount) || undefined,
  internal_manager_name: info?.internal_manager_name || '',
  internal_manager_phone: info?.internal_manager_phone || '',
  internal_manager_apartment: info?.internal_manager_apartment || '',
  internal_manager_collection_schedule: info?.internal_manager_collection_schedule || '',
  management_office_name: info?.management_office_name || '',
  management_office_phone: info?.management_office_phone || '',
  management_office_address: info?.management_office_address || '',
});

export default function DataMigrationPage() {
  const router = useRouter();
  const { refreshBuildings, buildings, setSelectedBuilding } = useBuilding();
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<MigrationAnalysisResult | null>(null);
  const [buildingInfo, setBuildingInfo] = useState<MigrationBuildingInfo>(emptyBuildingInfo);
  const [validation, setValidation] = useState<MigrationValidationResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fileNames = useMemo(() => files.map((file) => file.name), [files]);
  const confidenceLabel = analysis?.confidence_score
    ? `${Math.round(analysis.confidence_score * 100)}%`
    : null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files ? Array.from(event.target.files) : [];
    setFiles(selected);
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      toast.error('Παρακαλώ επιλέξτε αρχεία για ανάλυση.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeMigrationImages(files);
      const normalizedInfo = normalizeBuildingInfo(
        result.building_info,
        result.apartments?.length ?? 0
      );

      setAnalysis(result);
      setBuildingInfo(normalizedInfo);

      const validationResult = await validateMigrationData({
        building_info: normalizedInfo,
        apartments: result.apartments ?? [],
        residents: result.residents ?? [],
      });
      setValidation(validationResult);
    } catch (error: any) {
      console.error('Migration analysis failed:', error);
      toast.error(error?.message || 'Σφάλμα κατά την ανάλυση.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRevalidate = async () => {
    if (!analysis) return;
    try {
      const validationResult = await validateMigrationData({
        building_info: buildingInfo,
        apartments: analysis.apartments ?? [],
        residents: analysis.residents ?? [],
      });
      setValidation(validationResult);
      toast.success('Ο έλεγχος ολοκληρώθηκε.');
    } catch (error: any) {
      console.error('Migration validation failed:', error);
      toast.error(error?.message || 'Σφάλμα κατά τον έλεγχο.');
    }
  };

  const handleImport = async () => {
    if (!analysis) return;
    if (validation && !validation.is_valid) {
      toast.error('Υπάρχουν σφάλματα. Διορθώστε τα πριν την εισαγωγή.');
      return;
    }

    setIsImporting(true);
    try {
      const response = await importMigrationData({
        building_info: buildingInfo,
        apartments: analysis.apartments ?? [],
        residents: analysis.residents ?? [],
        target_building_id: 'new',
      });
      toast.success(response.message || 'Η εισαγωγή ολοκληρώθηκε.');

      // Refresh buildings list first
      await refreshBuildings();

      // Fetch the newly created building directly from API and set it as selected
      // This ensures the building is available even if refreshBuildings hasn't updated the state yet
      try {
        const newBuilding = await fetchBuilding(response.building_id);
        setSelectedBuilding(newBuilding);
      } catch (err) {
        console.error('[DataMigration] Failed to fetch new building:', err);
        // Continue anyway - the EditBuildingPage will fetch it
      }

      router.push(`/buildings/${response.building_id}/edit`);
    } catch (error: any) {
      console.error('Migration import failed:', error);
      toast.error(error?.message || 'Σφάλμα κατά την εισαγωγή.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setAnalysis(null);
    setBuildingInfo(emptyBuildingInfo);
    setValidation(null);
  };

  return (
    <AuthGate role={['manager', 'staff', 'superuser']}>
      <SubscriptionGate requiredStatus="any">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Μετανάστευση Κοινοχρήστων</h1>
              <p className="text-muted-foreground mt-2">
                Ανέβασε φύλλα κοινοχρήστων από άλλες εφαρμογές για αυτόματη δημιουργία κτιρίου.
              </p>
            </div>
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Εκκαθάριση
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ανάλυση Φύλλου Κοινοχρήστων</CardTitle>
              <CardDescription>
                Υποστηριζόμενες μορφές: JPG, PNG, WebP. Μπορείς να ανεβάσεις πολλαπλές σελίδες.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                <input
                  id="migration-files"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="migration-files" className="cursor-pointer flex flex-col items-center gap-3">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm font-medium">Κλικ για επιλογή αρχείων</span>
                  <span className="text-xs text-muted-foreground">Έως 10 αρχεία</span>
                </label>
              </div>

              {fileNames.length > 0 && (
                <div className="space-y-2">
                  <Label>Επιλεγμένα αρχεία</Label>
                  <div className="flex flex-wrap gap-2">
                    {fileNames.map((name) => (
                      <Badge key={name} variant="secondary" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleAnalyze} disabled={isAnalyzing || files.length === 0}>
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ανάλυση...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Εκκίνηση Ανάλυσης
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {analysis && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Αποτέλεσμα Ανάλυσης</CardTitle>
                  <CardDescription>
                    {confidenceLabel ? `Εκτίμηση ακρίβειας: ${confidenceLabel}` : 'Η ανάλυση ολοκληρώθηκε.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysis.extraction_notes && analysis.extraction_notes.length > 0 && (
                    <Alert>
                      <AlertDescription className="space-y-1 text-sm">
                        {analysis.extraction_notes.map((note, index) => (
                          <div key={`${note}-${index}`}>• {note}</div>
                        ))}
                      </AlertDescription>
                    </Alert>
                  )}

                  {validation && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {validation.is_valid ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-medium text-emerald-700">Έτοιμο για εισαγωγή</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-medium text-red-700">Απαιτούνται διορθώσεις</span>
                          </>
                        )}
                      </div>

                      {validation.errors.length > 0 && (
                        <Alert variant="destructive">
                          <AlertDescription className="space-y-1 text-sm">
                            {validation.errors.map((error) => (
                              <div key={error}>• {error}</div>
                            ))}
                          </AlertDescription>
                        </Alert>
                      )}

                      {validation.warnings.length > 0 && (
                        <Alert>
                          <AlertDescription className="space-y-1 text-sm">
                            {validation.warnings.map((warning) => (
                              <div key={warning}>• {warning}</div>
                            ))}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Στοιχεία Κτιρίου</CardTitle>
                  <CardDescription>Έλεγξε και διόρθωσε τα δεδομένα πριν την εισαγωγή.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="building-name">Όνομα Κτιρίου</Label>
                    <Input
                      id="building-name"
                      value={buildingInfo.name || ''}
                      onChange={(event) => setBuildingInfo((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="building-address">Διεύθυνση</Label>
                    <Input
                      id="building-address"
                      value={buildingInfo.address || ''}
                      onChange={(event) => setBuildingInfo((prev) => ({ ...prev, address: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="building-city">Πόλη</Label>
                    <Input
                      id="building-city"
                      value={buildingInfo.city || ''}
                      onChange={(event) => setBuildingInfo((prev) => ({ ...prev, city: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="building-postal">Τ.Κ.</Label>
                    <Input
                      id="building-postal"
                      value={buildingInfo.postal_code || ''}
                      onChange={(event) => setBuildingInfo((prev) => ({ ...prev, postal_code: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="building-apartments">Σύνολο Διαμερισμάτων</Label>
                    <Input
                      id="building-apartments"
                      type="number"
                      value={buildingInfo.apartments_count ?? ''}
                      onChange={(event) =>
                        setBuildingInfo((prev) => ({
                          ...prev,
                          apartments_count: event.target.value ? Number(event.target.value) : undefined,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manager-name">Διαχειριστής Κτιρίου</Label>
                    <Input
                      id="manager-name"
                      value={buildingInfo.internal_manager_name || ''}
                      onChange={(event) => setBuildingInfo((prev) => ({ ...prev, internal_manager_name: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manager-phone">Τηλέφωνο Διαχειριστή</Label>
                    <Input
                      id="manager-phone"
                      value={buildingInfo.internal_manager_phone || ''}
                      onChange={(event) => setBuildingInfo((prev) => ({ ...prev, internal_manager_phone: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manager-apartment">Διαμέρισμα Διαχειριστή</Label>
                    <Input
                      id="manager-apartment"
                      value={buildingInfo.internal_manager_apartment || ''}
                      onChange={(event) => setBuildingInfo((prev) => ({ ...prev, internal_manager_apartment: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manager-schedule">Ωράριο Είσπραξης</Label>
                    <Input
                      id="manager-schedule"
                      value={buildingInfo.internal_manager_collection_schedule || ''}
                      onChange={(event) =>
                        setBuildingInfo((prev) => ({
                          ...prev,
                          internal_manager_collection_schedule: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="office-name">Γραφείο Διαχείρισης</Label>
                    <Input
                      id="office-name"
                      value={buildingInfo.management_office_name || ''}
                      onChange={(event) => setBuildingInfo((prev) => ({ ...prev, management_office_name: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="office-phone">Τηλέφωνο Γραφείου</Label>
                    <Input
                      id="office-phone"
                      value={buildingInfo.management_office_phone || ''}
                      onChange={(event) =>
                        setBuildingInfo((prev) => ({ ...prev, management_office_phone: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2 lg:col-span-2">
                    <Label htmlFor="office-address">Διεύθυνση Γραφείου</Label>
                    <Input
                      id="office-address"
                      value={buildingInfo.management_office_address || ''}
                      onChange={(event) =>
                        setBuildingInfo((prev) => ({ ...prev, management_office_address: event.target.value }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Διαμερίσματα</CardTitle>
                  <CardDescription>
                    Βρέθηκαν {analysis.apartments?.length ?? 0} διαμερίσματα και {analysis.residents?.length ?? 0} κάτοικοι.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analysis.apartments && analysis.apartments.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Διαμέρισμα</TableHead>
                            <TableHead>Ιδιοκτήτης</TableHead>
                            <TableHead>Ενοικιαστής</TableHead>
                            <TableHead>Χιλιοστά</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analysis.apartments.map((apt) => (
                            <TableRow key={apt.number}>
                              <TableCell className="font-medium">{apt.number}</TableCell>
                              <TableCell>{apt.owner_name || '—'}</TableCell>
                              <TableCell>{apt.tenant_name || '—'}</TableCell>
                              <TableCell>{apt.ownership_percentage ?? '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Δεν βρέθηκαν διαμερίσματα.</p>
                  )}
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleRevalidate}>
                  Επανέλεγχος
                </Button>
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Εισαγωγή...
                    </>
                  ) : (
                    'Δημιουργία Κτιρίου'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </SubscriptionGate>
    </AuthGate>
  );
}
