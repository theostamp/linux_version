'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import CreateBuildingForm from '@/components/CreateBuildingForm';

export default function TestFormSubmissionPage() {
  const [submissionResult, setSubmissionResult] = useState<string>('');

  const handleFormSubmit = (formData: any) => {
    console.log('📤 Test page: Form submitted with data:', formData);
    setSubmissionResult(JSON.stringify(formData, null, 2));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">🧪 Test Form Submission</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div>
          <h2 className="text-xl font-semibold mb-4">📝 Create Building Form</h2>
          <CreateBuildingForm
            submitText="Test Submit"
            onSuccessPath="/test-form-submission"
          />
        </div>
        
        {/* Results */}
        <div>
          <h2 className="text-xl font-semibold mb-4">📊 Submission Results</h2>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            {submissionResult ? (
              <pre className="text-xs text-gray-700 overflow-auto max-h-96">
                {submissionResult}
              </pre>
            ) : (
              <p className="text-gray-500">No submission yet</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">📋 Instructions</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Επιλέξτε μια διεύθυνση από το Google Maps</li>
          <li>Επιλέξτε μια εικόνα Street View</li>
          <li>Συμπληρώστε τα υπόλοιπα πεδία</li>
          <li>Πατήστε "Test Submit"</li>
          <li>Ελέγξτε τα console logs και τα results</li>
        </ol>
      </div>
    </div>
  );
} 