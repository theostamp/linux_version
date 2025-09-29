'use client';

import { useEffect, useCallback } from 'react';

interface KeyboardShortcutOptions {
  onBuildingSelector?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  onRefresh?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutOptions = {}) {
  const {
    onBuildingSelector,
    onSettings,
    onFullscreen,
    onRefresh
  } = options;

  // Helper function to toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.log(`Error attempting to exit fullscreen: ${err.message}`);
      });
    }
  }, []);

  // Helper function to refresh page
  const refreshPage = useCallback(() => {
    window.location.reload();
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Prevent shortcuts when user is typing in input fields
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target as HTMLElement)?.contentEditable === 'true'
    ) {
      return;
    }

    // Ctrl+Alt+B or Ctrl+Alt+Β (Greek B) - Building Selector
    if (event.ctrlKey && event.altKey) {
      if (event.key === 'b' || event.key === 'B' || event.key === 'β' || event.key === 'Β') {
        event.preventDefault();
        onBuildingSelector?.();
        return;
      }
    }

    // Ctrl+Alt+S - Settings
    if (event.ctrlKey && event.altKey && (event.key === 's' || event.key === 'S')) {
      event.preventDefault();
      onSettings?.();
      return;
    }

    // F11 - Fullscreen toggle
    if (event.key === 'F11') {
      event.preventDefault();
      if (onFullscreen) {
        onFullscreen();
      } else {
        toggleFullscreen();
      }
      return;
    }

    // Ctrl+R - Refresh (with confirmation)
    if (event.ctrlKey && event.key === 'r') {
      event.preventDefault();
      if (confirm('Are you sure you want to refresh the kiosk?')) {
        if (onRefresh) {
          onRefresh();
        } else {
          refreshPage();
        }
      }
      return;
    }

    // Escape - Close modals/settings
    if (event.key === 'Escape') {
      // This will be handled by individual components
      return;
    }

    // Arrow keys for navigation (if no other keys are pressed)
    if (!event.ctrlKey && !event.altKey && !event.shiftKey) {
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown':
          // Navigation will be handled by individual components
          return;
        case ' ':
        case 'Space':
          // Space for auto-slide toggle
          return;
      }
    }
  }, [onBuildingSelector, onSettings, onFullscreen, onRefresh, toggleFullscreen, refreshPage]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    toggleFullscreen,
    refreshPage
  };
}

// Keyboard shortcut constants for documentation
export const KEYBOARD_SHORTCUTS = {
  BUILDING_SELECTOR: 'Ctrl+Alt+B (or Β)',
  SETTINGS: 'Ctrl+Alt+S',
  FULLSCREEN: 'F11',
  REFRESH: 'Ctrl+R',
  NAVIGATION: 'Arrow Keys',
  AUTO_SLIDE_TOGGLE: 'Space',
  CLOSE_MODALS: 'Escape'
} as const;

// Display keyboard shortcuts for help
export function getKeyboardShortcutsHelp(): string[] {
  return [
    `${KEYBOARD_SHORTCUTS.BUILDING_SELECTOR} - Open Building Selector`,
    `${KEYBOARD_SHORTCUTS.SETTINGS} - Open Settings`,
    `${KEYBOARD_SHORTCUTS.FULLSCREEN} - Toggle Fullscreen`,
    `${KEYBOARD_SHORTCUTS.REFRESH} - Refresh Kiosk`,
    `${KEYBOARD_SHORTCUTS.NAVIGATION} - Navigate between slides`,
    `${KEYBOARD_SHORTCUTS.AUTO_SLIDE_TOGGLE} - Toggle auto-slide`,
    `${KEYBOARD_SHORTCUTS.CLOSE_MODALS} - Close modals/settings`
  ];
}
