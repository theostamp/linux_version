'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useKioskScenes, KioskScene } from '@/hooks/useKioskScenes';
import { useKioskData } from '@/hooks/useKioskData';
import { WIDGET_COMPONENTS } from '@/lib/kiosk/widgets/registry';
import FinancialSceneCustom from '@/components/kiosk/scenes/FinancialSceneCustom';
import MorningOverviewSceneCustom from '@/components/kiosk/scenes/MorningOverviewSceneCustom';

interface KioskSceneRendererProps {
  selectedBuildingId?: number | null;
}

export default function KioskSceneRenderer({ 
  selectedBuildingId 
}: KioskSceneRendererProps) {
  
  const { scenes, isLoading, error } = useKioskScenes(selectedBuildingId ?? null);
  const { data: kioskData } = useKioskData(selectedBuildingId ?? null);
  
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isCreatingScene, setIsCreatingScene] = useState(false);

  // Get current active scene
  const currentScene = useMemo(() => {
    if (!scenes || scenes.length === 0) return null;
    return scenes[currentSceneIndex] || null;
  }, [scenes, currentSceneIndex]);

  // Auto-cycle through scenes
  useEffect(() => {
    if (!scenes || scenes.length === 0 || !currentScene) {
      return;
    }

    // Don't cycle if only one scene
    if (scenes.length === 1) {
      return;
    }

    const duration = (currentScene.durationSeconds || 30) * 1000;
    
    const timer = setTimeout(() => {
      setIsTransitioning(true);
      
      // Small delay for transition effect
      setTimeout(() => {
        setCurrentSceneIndex((prevIndex) => (prevIndex + 1) % scenes.length);
        setIsTransitioning(false);
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentSceneIndex, scenes, currentScene]);

  // Reset to first scene when scenes change
  useEffect(() => {
    if (scenes && scenes.length > 0) {
      setCurrentSceneIndex(0);
    }
  }, [scenes]);

  // Handle creating default scene
  const handleCreateDefaultScene = async () => {
    if (!selectedBuildingId || isCreatingScene) return;
    
    setIsCreatingScene(true);
    try {
      const response = await fetch('/api/kiosk/scenes/create_default_scene/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buildingId: selectedBuildingId,
        }),
      });
      
      if (response.ok) {
        // Refresh the page to load the new scene
        window.location.reload();
      } else {
        const errorData = await response.json();
        console.error('Failed to create default scene:', errorData);
        alert('Αποτυχία δημιουργίας σκηνής: ' + (errorData.error || 'Άγνωστο σφάλμα'));
      }
    } catch (error) {
      console.error('Error creating default scene:', error);
      alert('Αποτυχία δημιουργίας σκηνής: ' + (error as Error).message);
    } finally {
      setIsCreatingScene(false);
    }
  };

  // Render a widget based on its component name
  const renderWidget = useCallback((placement: any) => {
    const { widget } = placement;
    
    if (!widget || !widget.component) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>Widget component not specified</p>
        </div>
      );
    }

    // Get the widget component from registry
    const WidgetComponent = WIDGET_COMPONENTS[widget.component];
    
    if (!WidgetComponent) {
      console.warn(`[KioskSceneRenderer] Widget component not found: ${widget.component}`);
      return (
        <div className="flex items-center justify-center h-full bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-center p-4">
            <p className="text-gray-400 text-sm mb-2">Widget not available</p>
            <p className="text-gray-500 text-xs">{widget.component}</p>
          </div>
        </div>
      );
    }

    // Pass kiosk data and widget settings to the component
    return (
      <div className="h-full w-full">
        <WidgetComponent 
          data={kioskData} 
          settings={widget.settings || {}}
          buildingId={selectedBuildingId}
        />
      </div>
    );
  }, [kioskData, selectedBuildingId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-xl">Φόρτωση σκηνών...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900">
        <div className="text-center p-8 bg-gray-800/50 rounded-lg border border-red-500">
          <p className="text-red-400 text-xl mb-2">Σφάλμα φόρτωσης</p>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  // No scenes available
  if (!scenes || scenes.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="text-center p-8 bg-gray-800/50 rounded-lg border border-blue-500">
          <p className="text-blue-400 text-xl mb-2">Δεν υπάρχουν σκηνές</p>
          <p className="text-gray-400 mb-4">Δημιουργήστε σκηνές για να εμφανίσετε περιεχόμενο</p>
          <button
            onClick={handleCreateDefaultScene}
            disabled={isCreatingScene}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 mb-4"
          >
            {isCreatingScene ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Δημιουργία...
              </>
            ) : (
              'Δημιουργία Βασικής Σκηνής'
            )}
          </button>
          <p className="text-gray-500 text-sm">
            Ή χρησιμοποιήστε την εντολή: <code className="bg-gray-700 px-2 py-1 rounded">python manage.py migrate_to_scenes</code>
          </p>
        </div>
      </div>
    );
  }

  // Render current scene
  if (!currentScene) {
    return null;
  }

  // Check if this is the Morning Overview scene - use custom layout
  if (currentScene.name === 'Πρωινή Επισκόπηση') {
    return (
      <div 
        className={`transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <MorningOverviewSceneCustom data={kioskData} buildingId={selectedBuildingId} />
        
        {/* Scene indicator */}
        {scenes.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-50">
            {scenes.map((scene, index) => (
              <div
                key={scene.id}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSceneIndex 
                    ? 'w-8 bg-purple-400' 
                    : 'w-2 bg-gray-600'
                }`}
              />
            ))}
          </div>
        )}
        
        {/* Scene name overlay */}
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg z-50">
          <p className="text-white text-sm font-medium">{currentScene.name}</p>
        </div>
      </div>
    );
  }

  // Check if this is the Financial scene - use custom layout
  if (currentScene.name === 'Οικονομική Ενημέρωση') {
    return (
      <div 
        className={`transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <FinancialSceneCustom data={kioskData} buildingId={selectedBuildingId} />
        
        {/* Scene indicator */}
        {scenes.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-50">
            {scenes.map((scene, index) => (
              <div
                key={scene.id}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSceneIndex 
                    ? 'w-8 bg-blue-400' 
                    : 'w-2 bg-gray-600'
                }`}
              />
            ))}
          </div>
        )}
        
        {/* Scene name overlay */}
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg z-50">
          <p className="text-white text-sm font-medium">{currentScene.name}</p>
        </div>
      </div>
    );
  }

  // Calculate grid dimensions from placements
  const maxRow = Math.max(...currentScene.placements.map(p => p.gridRowEnd), 8);
  const maxCol = Math.max(...currentScene.placements.map(p => p.gridColEnd), 12);

  return (
    <div 
      className={`relative h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 transition-opacity duration-300 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Scene container with CSS Grid */}
      <div 
        className="h-full w-full p-4"
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${maxRow - 1}, minmax(0, 1fr))`,
          gridTemplateColumns: `repeat(${maxCol - 1}, minmax(0, 1fr))`,
          gap: '1rem',
        }}
      >
        {currentScene.placements.map((placement) => (
          <div
            key={placement.id}
            style={{
              gridRow: `${placement.gridRowStart} / ${placement.gridRowEnd}`,
              gridColumn: `${placement.gridColStart} / ${placement.gridColEnd}`,
              zIndex: placement.zIndex,
            }}
            className="relative"
          >
            {renderWidget(placement)}
          </div>
        ))}
      </div>

      {/* Scene indicator (optional - can be removed) */}
      {scenes.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {scenes.map((scene, index) => (
            <div
              key={scene.id}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSceneIndex 
                  ? 'w-8 bg-blue-400' 
                  : 'w-2 bg-gray-600'
              }`}
            />
          ))}
        </div>
      )}

      {/* Scene name overlay (fades in/out) */}
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg">
        <p className="text-white text-sm font-medium">{currentScene.name}</p>
      </div>
    </div>
  );
}

