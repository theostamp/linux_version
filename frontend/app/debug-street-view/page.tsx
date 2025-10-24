'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import StreetViewImage from '@/components/StreetViewImage';
import SimpleStreetViewTest from '@/components/SimpleStreetViewTest';
import StreetViewDebugger from '@/components/StreetViewDebugger';
import StreetViewImageTest from '@/components/StreetViewImageTest';

export default function DebugStreetViewPage() {
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | undefined>();
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [formData, setFormData] = useState<any>({});

  const handleAddressSelect = (addressData: {
    fullAddress: string;
    address: string;
    city: string;
    postalCode: string;
    postal_code: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  }, isConfirmed?: boolean) => {
    console.log('📍 Debug page: handleAddressSelect called with:', addressData);
    
    setFormData((prev: any) => ({
      ...prev,
      address: addressData.address,
      city: addressData.city,
      postal_code: addressData.postal_code
    }));
    
    if (addressData.coordinates) {
      console.log('📍 Debug page: Setting coordinates:', addressData.coordinates);
      setCoordinates(addressData.coordinates);
    } else {
      console.log('📍 Debug page: No coordinates in addressData');
    }
  };

  const handleStreetViewImageSelect = (imageUrl: string) => {
    console.log('📸 Debug page: Received street view image URL:', imageUrl);
    setSelectedImageUrl(imageUrl);
    setFormData((prev: any) => ({
      ...prev,
      street_view_image: imageUrl
    }));
  };

  const testFormSubmission = () => {
    console.log('📤 Debug page: Testing form submission');
    console.log('📤 Debug page: Form data:', formData);
    console.log('📤 Debug page: Selected image URL:', selectedImageUrl);
    
    const testPayload = {
      name: 'Test Building',
      address: formData.address || 'Test Address',
      city: formData.city || 'Test City',
      postal_code: formData.postal_code || '12345',
      apartments_count: 10,
      street_view_image: selectedImageUrl
    };
    
    console.log('📤 Debug page: Test payload:', testPayload);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">🐛 Street View Debug Page</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Form Components */}
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">📍 Address Selection</h2>
            <AddressAutocomplete
              onAddressSelect={handleAddressSelect}
              required={true}
            />
          </div>
          
          {coordinates && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">📸 Street View Image</h2>
              <StreetViewImage
                coordinates={coordinates}
                address={formData.address}
                onImageSelect={handleStreetViewImageSelect}
              />
            </div>
          )}
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">🧪 Simple Test</h2>
            <SimpleStreetViewTest />
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">🔧 Advanced Debugger</h2>
            <StreetViewDebugger
              coordinates={coordinates}
              address={formData.address}
              onImageSelect={(imageUrl) => {
                console.log('🔧 Debugger: Received image:', imageUrl);
                setSelectedImageUrl(imageUrl);
                setFormData((prev: any) => ({
                  ...prev,
                  street_view_image: imageUrl
                }));
              }}
            />
          </div>
          
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">📸 Direct Component Test</h2>
            <StreetViewImageTest />
          </div>
          
          {/* Connected Street View Test */}
          {coordinates && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-4">🔗 Connected Test</h2>
              <StreetViewImage
                coordinates={coordinates}
                address={formData.address}
                onImageSelect={(imageUrl) => {
                  console.log('🔗 Debug page: Connected test received image:', imageUrl);
                  setSelectedImageUrl(imageUrl);
                  setFormData((prev: any) => ({
                    ...prev,
                    street_view_image: imageUrl
                  }));
                }}
              />
            </div>
          )}
        </div>
        
        {/* Right Column - Debug Info */}
        <div className="space-y-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">🔍 Debug Information</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Coordinates:</h3>
                <p className="text-sm text-gray-600">
                  {coordinates ? `Lat: ${coordinates.lat}, Lng: ${coordinates.lng}` : 'None'}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium">Selected Image URL:</h3>
                <p className="text-sm text-gray-600 break-all">
                  {selectedImageUrl || 'None'}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium">Form Data:</h3>
                <pre className="text-xs text-gray-600 bg-white p-2 rounded border overflow-auto max-h-40">
                  {JSON.stringify(formData, null, 2)}
                </pre>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">🧪 Test Actions</h2>
            
            <div className="space-y-2">
              <Button onClick={testFormSubmission} className="w-full">
                Test Form Submission
              </Button>
              
              <Button 
                onClick={() => {
                  setCoordinates(undefined);
                  setSelectedImageUrl('');
                  setFormData({});
                }} 
                variant="outline" 
                className="w-full"
              >
                Reset All
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Console Instructions */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">📋 Instructions</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Άνοιγμα Developer Tools (F12)</li>
          <li>Πήγαινε στο Console tab</li>
          <li>Επιλέξτε μια διεύθυνση από το Google Maps</li>
          <li>Επιλέξτε μια εικόνα Street View</li>
          <li>Πατήστε "Test Form Submission"</li>
          <li>Ελέγξτε τα console logs για debugging info</li>
        </ol>
      </div>
    </div>
  );
} 