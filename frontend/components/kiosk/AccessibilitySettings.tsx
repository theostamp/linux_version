'use client';

import { useState, useEffect } from 'react';
import { 
  Accessibility, 
  Eye, 
  Type, 
  Volume2, 
  Keyboard,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  accessibilityUtils,
  AccessibilityConfig,
  getUserAccessibilityPreferences
} from '@/lib/accessibility';

interface AccessibilitySettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChange?: (config: AccessibilityConfig) => void;
}

export default function AccessibilitySettings({ 
  isOpen, 
  onClose, 
  onConfigChange 
}: AccessibilitySettingsProps) {
  const [config, setConfig] = useState<AccessibilityConfig>(
    getUserAccessibilityPreferences()
  );

  const [testResults, setTestResults] = useState<{
    score: number;
    issues: string[];
    recommendations: string[];
  } | null>(null);

  const [isRunningTests, setIsRunningTests] = useState(false);

  // Apply accessibility settings
  useEffect(() => {
    accessibilityUtils.applyHighContrastStyles(config.highContrast);
    accessibilityUtils.applyLargeTextStyles(config.largeText);
    accessibilityUtils.applyReducedMotionStyles(config.reducedMotion);

    if (onConfigChange) {
      onConfigChange(config);
    }
  }, [config, onConfigChange]);

  const updateConfig = (updates: Partial<AccessibilityConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const runAccessibilityTests = async () => {
    setIsRunningTests(true);
    try {
      const results = await accessibilityUtils.runAccessibilityTests();
      setTestResults(results);
    } catch (error) {
      console.error('Failed to run accessibility tests:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  const resetToDefaults = () => {
    setConfig(getUserAccessibilityPreferences());
    setTestResults(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Accessibility className="w-6 h-6" />
            <span>Accessibility Settings</span>
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Visual Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Eye className="w-5 h-5" />
              <span>Visual Settings</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="highContrast"
                  checked={config.highContrast}
                  onChange={(e) => updateConfig({ highContrast: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="highContrast" className="text-sm font-medium">
                  High Contrast Mode
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="largeText"
                  checked={config.largeText}
                  onChange={(e) => updateConfig({ largeText: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="largeText" className="text-sm font-medium">
                  Large Text
                </label>
              </div>
            </div>
          </div>

          {/* Motion Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Volume2 className="w-5 h-5" />
              <span>Motion Settings</span>
            </h3>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="reducedMotion"
                checked={config.reducedMotion}
                onChange={(e) => updateConfig({ reducedMotion: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="reducedMotion" className="text-sm font-medium">
                Reduce Motion
              </label>
            </div>
          </div>

          {/* Navigation Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Keyboard className="w-5 h-5" />
              <span>Navigation</span>
            </h3>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="keyboardNavigation"
                checked={config.keyboardNavigation}
                onChange={(e) => updateConfig({ keyboardNavigation: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="keyboardNavigation" className="text-sm font-medium">
                Enhanced Keyboard Navigation
              </label>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Keyboard Instructions:</h4>
              <ul className="text-sm space-y-1">
                {accessibilityUtils.getKeyboardInstructions().map((instruction, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-blue-600 dark:text-blue-400">•</span>
                    <span>{instruction}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Accessibility Testing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Check className="w-5 h-5" />
              <span>Accessibility Testing</span>
            </h3>

            <Button
              onClick={runAccessibilityTests}
              disabled={isRunningTests}
              className="w-full"
            >
              {isRunningTests ? 'Running Tests...' : 'Run Accessibility Tests'}
            </Button>

            {testResults && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Accessibility Score:</span>
                  <span className={`font-bold ${
                    testResults.score >= 90 ? 'text-green-600' :
                    testResults.score >= 70 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {testResults.score}%
                  </span>
                </div>

                {testResults.issues.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                      Issues Found ({testResults.issues.length}):
                    </h4>
                    <ul className="text-sm space-y-1">
                      {testResults.issues.map((issue, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span className="text-red-700 dark:text-red-300">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {testResults.recommendations.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                      Recommendations:
                    </h4>
                    <ul className="text-sm space-y-1">
                      {testResults.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span className="text-blue-700 dark:text-blue-300">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              onClick={resetToDefaults}
              variant="outline"
              className="flex-1"
            >
              Reset to Defaults
            </Button>
            <Button
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
