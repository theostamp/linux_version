'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCode, Copy, Download, Share2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import QRCode from 'qrcode';

interface QRCodeGeneratorProps {
  buildingId: number;
  buildingName: string;
  buildingAddress: string;
}

export default function QRCodeGenerator({ buildingId, buildingName, buildingAddress }: QRCodeGeneratorProps) {
  const [showQR, setShowQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateQRCode = async () => {
    const connectUrl = `${window.location.origin}/connect?building=${buildingId}`;
    setQrCodeUrl(connectUrl);
    
    try {
      const dataUrl = await QRCode.toDataURL(connectUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(dataUrl);
      setShowQR(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Σφάλμα κατά τη δημιουργία του QR code');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeUrl);
      toast.success('Το link αντιγράφηκε!');
    } catch (error) {
      toast.error('Δεν ήταν δυνατή η αντιγραφή');
    }
  };

  const downloadQR = () => {
    if (qrCodeDataUrl) {
      const link = document.createElement('a');
      link.download = `qr-code-${buildingName}-${buildingId}.png`;
      link.href = qrCodeDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Το QR code κατέβηκε!');
    } else {
      copyToClipboard();
    }
  };

  const shareQR = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Σύνδεση με ${buildingName}`,
          text: `Σκανάρετε το QR code για να συνδεθείτε με το κτίριο ${buildingName}`,
          url: qrCodeUrl,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Code Σύνδεσης
        </CardTitle>
        <p className="text-sm text-gray-600">
          Δημιουργήστε QR code για να επιτρέψετε στους ενοικιαστές να συνδεθούν
        </p>
      </CardHeader>
      <CardContent>
        {!showQR ? (
          <div className="text-center py-8">
            <QrCode className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Δημιουργήστε QR code για το κτίριο
            </p>
            <Button onClick={generateQRCode}>
              Δημιουργία QR Code
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* QR Code Display */}
            <div className="text-center">
              <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                {qrCodeDataUrl ? (
                  <img 
                    src={qrCodeDataUrl} 
                    alt={`QR Code for ${buildingName}`}
                    className="w-48 h-48"
                  />
                ) : (
                  <div className="w-48 h-48 bg-gray-100 rounded flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">QR Code</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {buildingName}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Building Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Πληροφορίες Κτιρίου</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <p><strong>Όνομα:</strong> {buildingName}</p>
                <p><strong>Διεύθυνση:</strong> {buildingAddress}</p>
                <p><strong>ID:</strong> {buildingId}</p>
              </div>
            </div>

            {/* Connection URL */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600 mb-2">Link Σύνδεσης:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-white px-2 py-1 rounded flex-1 overflow-x-auto">
                  {qrCodeUrl}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={downloadQR}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Κατέβασμα
              </Button>
              <Button
                variant="outline"
                onClick={shareQR}
                className="flex-1"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Κοινοποίηση
              </Button>
            </div>

            {/* Instructions */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Οδηγίες Χρήσης</h4>
              <ol className="text-sm text-green-800 space-y-1">
                <li>1. Εκτυπώστε το QR code και τοποθετήστε το στην είσοδο</li>
                <li>2. Οι ενοικιαστές σκανάρουν με το κινητό τους</li>
                <li>3. Επιλέγουν το όνομά τους από τη λίστα</li>
                <li>4. Εισάγουν το email τους για ειδοποιήσεις</li>
              </ol>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowQR(false)}
              className="w-full"
            >
              Νέα Δημιουργία
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 