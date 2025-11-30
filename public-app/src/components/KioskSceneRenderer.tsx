'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useKioskScenes, KioskScene, WidgetPlacement } from '@/hooks/useKioskScenes';
import { useKioskData } from '@/hooks/useKioskData';
import { WIDGET_COMPONENTS } from '@/lib/kiosk/widgets/registry';
import FinancialSceneCustom from '@/components/kiosk/scenes/FinancialSceneCustom';
import MorningOverviewSceneCustom from '@/components/kiosk/scenes/MorningOverviewSceneCustom';
import LifestyleSceneCustom from '@/components/kiosk/scenes/LifestyleSceneCustom';
import AmbientShowcaseScene from '@/components/kiosk/scenes/AmbientShowcaseScene';
import { extractAmbientBrandingFromSettings } from '@/components/kiosk/scenes/branding';
import { useBuilding } from '@/components/contexts/BuildingContext';

interface KioskSceneRendererProps {
  buildingIdOverride?: number | null;
  allowSceneCreation?: boolean;
}

// Fallback scene rotator component
function FallbackSceneRotator({ data, buildingId }: { data: any; buildingId: number | null }) {
  const [fallbackSceneIndex, setFallbackSceneIndex] = useState(0);
  const fallbackScenes = [
    { name: 'Πρωινή Επισκόπηση', Component: MorningOverviewSceneCustom },
    { name: 'Lifestyle & Community', Component: LifestyleSceneCustom },
    { name: 'Ambient Showcase', Component: AmbientShowcaseScene },
  ];

  // Auto-rotate fallback scenes every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setFallbackSceneIndex((prev) => (prev + 1) % fallbackScenes.length);
    }, 30000); // 30 seconds

    return () => clearInterval(timer);
  }, []);

  const CurrentFallbackScene = fallbackScenes[fallbackSceneIndex].Component;

  return (
    <div className="relative">
      <CurrentFallbackScene data={data} buildingId={buildingId} />

      {/* Scene indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-50">
        {fallbackScenes.map((scene, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === fallbackSceneIndex
                ? 'w-8 bg-gradient-to-r from-purple-400 to-pink-400'
                : 'w-2 bg-gray-600'
            }`}
          />
        ))}
      </div>

      {/* Scene name overlay */}
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg z-50">
        <p className="text-white text-sm font-medium">{fallbackScenes[fallbackSceneIndex].name}</p>
      </div>
    </div>
  );
}

export default function KioskSceneRenderer({ buildingIdOverride, allowSceneCreation = true }: KioskSceneRendererProps = {}) {
  // ✅ Get building from BuildingContext
  const { selectedBuilding } = useBuilding();
  const effectiveBuildingId = buildingIdOverride ?? selectedBuilding?.id ?? null;
  
  console.log('[KioskSceneRenderer] 🏗️ Building IDs:', {
    buildingIdOverride,
    selectedBuildingId: selectedBuilding?.id,
    selectedBuildingName: selectedBuilding?.name,
    effectiveBuildingId,
    finalBuildingIdForKioskData: effectiveBuildingId ?? 1
  });
  
  const { scenes, isLoading, error } = useKioskScenes(effectiveBuildingId);
  const { data: kioskData } = useKioskData(effectiveBuildingId ?? 1);
  
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isCreatingScene, setIsCreatingScene] = useState(false);

  // Get current active scene
  const currentScene = useMemo(() => {
    if (!scenes || scenes.length === 0) return null;
    return scenes[currentSceneIndex] || null;
  }, [scenes, currentSceneIndex]);
  const ambientBrandingFromScene = useMemo(() => {
    if (!currentScene?.settings) return null;
    return extractAmbientBrandingFromSettings(currentScene.settings);
  }, [currentScene?.settings]);

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
    if (!effectiveBuildingId || isCreatingScene || !allowSceneCreation) return;
    
    setIsCreatingScene(true);
    try {
      const response = await fetch('/api/kiosk/scenes/create_default_scene/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buildingId: effectiveBuildingId,
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
  const renderWidget = useCallback((placement: WidgetPlacement) => {
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
          buildingId={effectiveBuildingId}
        />
      </div>
    );
  }, [kioskData, effectiveBuildingId]);

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

  // No scenes available - Rotate between default scenes
  if (!scenes || scenes.length === 0) {
    return <FallbackSceneRotator data={kioskData} buildingId={effectiveBuildingId} />;
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
        <MorningOverviewSceneCustom data={kioskData} buildingId={effectiveBuildingId} />
        
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
        <FinancialSceneCustom data={kioskData} buildingId={effectiveBuildingId} />

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

  // Check if this is the Lifestyle & Community scene - use custom layout
  if (currentScene.name === 'Lifestyle & Community' || currentScene.name === 'Ζωή & Κοινότητα') {
  // Check if this is the Ambient Showcase scene - use ambient layout
  if (currentScene.name === 'Ambient Showcase' || currentScene.name === 'Ανάλαφρη Παρουσίαση') {
    return (
      <div
        className={`transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <AmbientShowcaseScene
          data={kioskData}
          buildingId={effectiveBuildingId}
          brandingConfig={ambientBrandingFromScene ?? undefined}
        />

        {scenes.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 transform">
            <div className="flex gap-2">
              {scenes.map((scene, index) => (
                <div
                  key={scene.id}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentSceneIndex ? 'w-10 bg-white' : 'w-2 bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
    return (
      <div
        className={`transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <LifestyleSceneCustom data={kioskData} buildingId={effectiveBuildingId} />

        {/* Scene indicator */}
        {scenes.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-50">
            {scenes.map((scene, index) => (
              <div
                key={scene.id}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSceneIndex
                    ? 'w-8 bg-pink-400'
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
