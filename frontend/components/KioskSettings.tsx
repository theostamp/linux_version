'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Save, Monitor, Bell, BarChart, Wrench, Lightbulb, CalendarDays, Image as ImageIcon, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AdvertisingBanner {
  id: number;
  title: string;
  description: string;
  image_url: string;
  link: string;
  duration: number;
}

interface MultilingualMessage {
  id: number;
  language: string;
  title: string;
  content: string;
}

interface KioskSettingsProps {
  buildingId?: number;
}

export default function KioskSettings({ buildingId }: KioskSettingsProps) {
  const [banners, setBanners] = useState<AdvertisingBanner[]>([
    {
      id: 1,
      title: 'Καθαριστικές Υπηρεσίες',
      description: 'Εξειδικευμένες καθαριστικές υπηρεσίες για πολυκατοικίες',
      image_url: '/api/static/banners/cleaning.jpg',
      link: 'https://example.com/cleaning',
      duration: 5000,
    },
    {
      id: 2,
      title: 'Ασφάλεια & Συστήματα',
      description: 'Συστήματα ασφαλείας και παρακολούθησης',
      image_url: '/api/static/banners/security.jpg',
      link: 'https://example.com/security',
      duration: 5000,
    },
  ]);

  const [multilingualMessages, setMultilingualMessages] = useState<MultilingualMessage[]>([
    { id: 1, language: 'en', title: 'Welcome / Καλώς ήρθατε', content: '1. Quiet hours are from 23:00 to 07:00.\n2. Please dispose of garbage in the designated bins in the basement.\n3. Do not leave personal items in common areas.' },
    { id: 2, language: 'el', title: 'Κανόνες Κτιρίου', content: '1. Ώρες κοινής ησυχίας: 23:00 - 07:00.\n2. Παρακαλούμε, απορρίπτετε τα σκουπίδια στους ειδικούς κάδους στο υπόγειο.\n3. Μην αφήνετε προσωπικά αντικείμενα στους κοινόχρηστους χώρους.' },
  ]);

  const supportedLanguages = [
    { code: 'en', name: 'Αγγλικά' }, { code: 'fr', name: 'Γαλλικά' }, { code: 'de', name: 'Γερμανικά' }, { code: 'es', name: 'Ισπανικά' }, { code: 'it', name: 'Ιταλικά' }, { code: 'el', name: 'Ελληνικά' },
  ];

  const [settings, setSettings] = useState({
    autoRefresh: true,
    refreshInterval: 30,
    showWeather: true,
    showNewsTicker: true,
    slideDuration: 10,
    // New content modules
    showAnnouncements: true,
    showFinancialSummary: false,
    showMaintenanceSchedule: true,
    // New ambiance and engagement settings
    backgroundMode: 'static_color',
    showLocalEvents: false,
    showFunFacts: true,
  });

  const addBanner = () => {
    const newBanner: AdvertisingBanner = {
      id: Date.now(),
      title: '',
      description: '',
      image_url: '',
      link: '',
      duration: 5000,
    };
    setBanners([...banners, newBanner]);
  };

  const removeBanner = (id: number) => {
    setBanners(banners.filter(banner => banner.id !== id));
  };

  const updateBanner = (id: number, field: keyof AdvertisingBanner, value: string | number) => {
    setBanners(banners.map(banner => 
      banner.id === id ? { ...banner, [field]: value } : banner
    ));
  };

  const addMessage = () => {
    const newMessage: MultilingualMessage = {
      id: Date.now(),
      language: 'en',
      title: '',
      content: '',
    };
    setMultilingualMessages([...multilingualMessages, newMessage]);
  };

  const removeMessage = (id: number) => {
    setMultilingualMessages(multilingualMessages.filter(msg => msg.id !== id));
  };

  const updateMessage = (id: number, field: keyof MultilingualMessage, value: string) => {
    setMultilingualMessages(multilingualMessages.map(msg => 
      msg.id === id ? { ...msg, [field]: value } : msg
    ));
  };

  const saveSettings = () => {
    // Here you would typically save to the backend
    toast.success('Ρυθμίσεις αποθηκεύτηκαν επιτυχώς!');
  };

  const previewKiosk = () => {
    const url = buildingId 
      ? `/info-screen/${buildingId}`
      : '/kiosk';
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ρυθμίσεις Kiosk Mode</h2>
          <p className="text-gray-600">
            Διαχείριση της οθόνης προβολής στην είσοδο της πολυκατοικίας
          </p>
        </div>
        <Button onClick={previewKiosk} className="flex items-center space-x-2">
          <Monitor className="w-4 h-4" />
          <span>Προεπισκόπηση</span>
        </Button>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Γενικές Ρυθμίσεις</CardTitle>
          <CardDescription>
            Βασικές ρυθμίσεις για τη λειτουργία του kiosk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="autoRefresh">Αυτόματη ανανέωση</Label>
              <Switch
                id="autoRefresh"
                checked={settings.autoRefresh}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, autoRefresh: checked })
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="showWeather">Εμφάνιση καιρού</Label>
              <Switch
                id="showWeather"
                checked={settings.showWeather}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, showWeather: checked })
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="showNewsTicker">Εμφάνιση ειδήσεων</Label>
              <Switch
                id="showNewsTicker"
                checked={settings.showNewsTicker}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, showNewsTicker: checked })
                }
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="slideDuration">Διάρκεια slide (δευτερόλεπτα)</Label>
              <Input
                id="slideDuration"
                type="number"
                min="5"
                max="30"
                value={settings.slideDuration}
                onChange={(e) => 
                  setSettings({ ...settings, slideDuration: parseInt(e.target.value) })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Modules */}
      <Card>
        <CardHeader>
          <CardTitle>Ενότητες Περιεχομένου</CardTitle>
          <CardDescription>
            Επιλέξτε ποιες δυναμικές πληροφορίες θα εμφανίζονται στο kiosk.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-blue-500" />
                <Label htmlFor="showAnnouncements">Ανακοινώσεις Κτιρίου</Label>
              </div>
              <Switch
                id="showAnnouncements"
                checked={settings.showAnnouncements}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, showAnnouncements: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Wrench className="w-5 h-5 text-orange-500" />
                <Label htmlFor="showMaintenanceSchedule">Προγραμματισμένες Συντηρήσεις</Label>
              </div>
              <Switch
                id="showMaintenanceSchedule"
                checked={settings.showMaintenanceSchedule}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, showMaintenanceSchedule: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <BarChart className="w-5 h-5 text-green-500" />
                <Label htmlFor="showFinancialSummary">Οικονομική Επισκόπηση</Label>
              </div>
              <Switch
                id="showFinancialSummary"
                checked={settings.showFinancialSummary}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, showFinancialSummary: checked })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ambiance and Engagement Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Εμφάνιση & Ατμόσφαιρα</CardTitle>
          <CardDescription>
            Βελτιώστε την αισθητική και το ενδιαφέρον του kiosk με δυναμικά στοιχεία.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backgroundMode">Λειτουργία Φόντου</Label>
            <Select
              value={settings.backgroundMode}
              onValueChange={(value) => setSettings({ ...settings, backgroundMode: value as any })}
            >
              <SelectTrigger id="backgroundMode">
                <SelectValue placeholder="Επιλέξτε φόντο" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="static_color">Σταθερό Χρώμα</SelectItem>
                <SelectItem value="image_of_the_day">Εικόνα της Ημέρας</SelectItem>
                <SelectItem value="video_loop">Χαλαρωτικό Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CalendarDays className="w-5 h-5 text-purple-500" />
                <Label htmlFor="showLocalEvents">Τοπικές Εκδηλώσεις</Label>
              </div>
              <Switch
                id="showLocalEvents"
                checked={settings.showLocalEvents}
                onCheckedChange={(checked) => setSettings({ ...settings, showLocalEvents: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <Label htmlFor="showFunFacts">"Το Γνωρίζατε;"</Label>
              </div>
              <Switch
                id="showFunFacts"
                checked={settings.showFunFacts}
                onCheckedChange={(checked) => setSettings({ ...settings, showFunFacts: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Multilingual Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Πολύγλωσσα Μηνύματα & Κανόνες</CardTitle>
          <CardDescription>
            Εμφανίστε χρήσιμες οδηγίες και κανόνες σε διάφορες γλώσσες, ιδανικό για ενοίκους Airbnb ή ξενόγλωσσους.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {multilingualMessages.map((msg) => (
              <div key={msg.id} className="border rounded-lg p-4 space-y-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-gray-600" />
                    <Select
                      value={msg.language}
                      onValueChange={(value) => updateMessage(msg.id, 'language', value)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {supportedLanguages.map(lang => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeMessage(msg.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`msg-title-${msg.id}`}>Τίτλος Μηνύματος</Label>
                  <Input
                    id={`msg-title-${msg.id}`}
                    value={msg.title}
                    onChange={(e) => updateMessage(msg.id, 'title', e.target.value)}
                    placeholder="π.χ. Welcome / Κανόνες Κτιρίου"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`msg-content-${msg.id}`}>Περιεχόμενο (Κανόνες/Οδηγίες)</Label>
                  <Textarea
                    id={`msg-content-${msg.id}`}
                    value={msg.content}
                    onChange={(e) => updateMessage(msg.id, 'content', e.target.value)}
                    placeholder="π.χ. 1. Ώρες κοινής ησυχίας..."
                    rows={4}
                  />
                </div>
              </div>
            ))}
            
            <Button onClick={addMessage} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Προσθήκη Νέου Μηνύματος
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advertising Banners */}
      <Card>
        <CardHeader>
          <CardTitle>Διαφημιστικά Banners</CardTitle>
          <CardDescription>
            Διαχείριση διαφημιστικών banners που εμφανίζονται στο kiosk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {banners.map((banner) => (
              <div key={banner.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Banner #{banner.id}</h4>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeBanner(banner.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`title-${banner.id}`}>Τίτλος</Label>
                    <Input
                      id={`title-${banner.id}`}
                      value={banner.title}
                      onChange={(e) => updateBanner(banner.id, 'title', e.target.value)}
                      placeholder="Τίτλος banner"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`duration-${banner.id}`}>Διάρκεια (ms)</Label>
                    <Input
                      id={`duration-${banner.id}`}
                      type="number"
                      value={banner.duration}
                      onChange={(e) => updateBanner(banner.id, 'duration', parseInt(e.target.value))}
                      placeholder="5000"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`description-${banner.id}`}>Περιγραφή</Label>
                  <Textarea
                    id={`description-${banner.id}`}
                    value={banner.description}
                    onChange={(e) => updateBanner(banner.id, 'description', e.target.value)}
                    placeholder="Περιγραφή του banner"
                    rows={2}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`image-${banner.id}`}>URL Εικόνας</Label>
                    <Input
                      id={`image-${banner.id}`}
                      value={banner.image_url}
                      onChange={(e) => updateBanner(banner.id, 'image_url', e.target.value)}
                      placeholder="/path/to/image.jpg"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`link-${banner.id}`}>Σύνδεσμος</Label>
                    <Input
                      id={`link-${banner.id}`}
                      value={banner.link}
                      onChange={(e) => updateBanner(banner.id, 'link', e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <Button onClick={addBanner} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Προσθήκη Banner
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} className="flex items-center space-x-2">
          <Save className="w-4 h-4" />
          <span>Αποθήκευση Ρυθμίσεων</span>
        </Button>
      </div>
    </div>
  );
} 