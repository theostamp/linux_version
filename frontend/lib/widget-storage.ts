// Hybrid Widget Storage System - Database + localStorage

interface WidgetStorageConfig {
  useDatabase: boolean;
  useLocalStorage: boolean;
  syncInterval: number; // milliseconds
}

interface StoredWidget {
  id: string;
  name: string;
  greekName: string;
  description: string;
  greekDescription: string;
  category: string;
  icon: string;
  enabled: boolean;
  order: number;
  settings: any;
  component: string;
  dataSource?: string;
  isCustom: boolean;
  lastModified: string;
  userId?: string;
  buildingId?: number;
}

class WidgetStorageManager {
  private config: WidgetStorageConfig;
  private syncTimer?: NodeJS.Timeout;
  private pendingChanges: Set<string> = new Set();

  constructor(config: Partial<WidgetStorageConfig> = {}) {
    this.config = {
      useDatabase: true,
      useLocalStorage: true,
      syncInterval: 30000, // 30 seconds
      ...config
    };

    // Auto-sync if database is enabled
    if (this.config.useDatabase) {
      this.startAutoSync();
    }
  }

  // Save widget to both localStorage and database
  async saveWidget(widget: StoredWidget): Promise<void> {
    try {
      // Save to localStorage immediately (for instant UI update)
      if (this.config.useLocalStorage) {
        this.saveToLocalStorage(widget);
      }

      // Mark for database sync
      if (this.config.useDatabase) {
        this.pendingChanges.add(widget.id);
        // Trigger immediate sync for critical changes
        if (widget.isCustom) {
          await this.syncToDatabase();
        }
      }
    } catch (error) {
      console.error('Error saving widget:', error);
      throw error;
    }
  }

  // Load widgets from localStorage (fast) and database (accurate)
  async loadWidgets(): Promise<StoredWidget[]> {
    try {
      let widgets: StoredWidget[] = [];

      // Try localStorage first (fast)
      if (this.config.useLocalStorage) {
        widgets = this.loadFromLocalStorage();
      }

      // Sync from database if available (accurate)
      if (this.config.useDatabase && widgets.length > 0) {
        const dbWidgets = await this.loadFromDatabase();
        if (dbWidgets.length > 0) {
          widgets = this.mergeWidgets(widgets, dbWidgets);
          // Update localStorage with merged data
          if (this.config.useLocalStorage) {
            this.saveAllToLocalStorage(widgets);
          }
        }
      }

      return widgets;
    } catch (error) {
      console.error('Error loading widgets:', error);
      // Fallback to localStorage only
      return this.config.useLocalStorage ? this.loadFromLocalStorage() : [];
    }
  }

  // Delete widget from both storage systems
  async deleteWidget(widgetId: string): Promise<void> {
    try {
      if (this.config.useLocalStorage) {
        this.deleteFromLocalStorage(widgetId);
      }

      if (this.config.useDatabase) {
        this.pendingChanges.add(widgetId);
        await this.deleteFromDatabase(widgetId);
      }
    } catch (error) {
      console.error('Error deleting widget:', error);
      throw error;
    }
  }

  // Private methods for localStorage operations
  private saveToLocalStorage(widget: StoredWidget): void {
    if (typeof window === 'undefined') return;

    try {
      const widgets = this.loadFromLocalStorage();
      const index = widgets.findIndex(w => w.id === widget.id);
      
      if (index >= 0) {
        widgets[index] = { ...widget, lastModified: new Date().toISOString() };
      } else {
        widgets.push({ ...widget, lastModified: new Date().toISOString() });
      }

      localStorage.setItem('kiosk_widgets', JSON.stringify(widgets));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  private loadFromLocalStorage(): StoredWidget[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem('kiosk_widgets');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return [];
    }
  }

  private saveAllToLocalStorage(widgets: StoredWidget[]): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('kiosk_widgets', JSON.stringify(widgets));
    } catch (error) {
      console.error('Error saving all to localStorage:', error);
    }
  }

  private deleteFromLocalStorage(widgetId: string): void {
    if (typeof window === 'undefined') return;

    try {
      const widgets = this.loadFromLocalStorage();
      const filtered = widgets.filter(w => w.id !== widgetId);
      localStorage.setItem('kiosk_widgets', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting from localStorage:', error);
    }
  }

  // Private methods for database operations
  private async loadFromDatabase(): Promise<StoredWidget[]> {
    try {
      // This would be your API call to the backend
      const response = await fetch('/api/kiosk/widgets', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Database load failed: ${response.status}`);
      }

      const data = await response.json();
      return data.widgets || [];
    } catch (error) {
      console.error('Error loading from database:', error);
      return [];
    }
  }

  private async syncToDatabase(): Promise<void> {
    if (this.pendingChanges.size === 0) return;

    try {
      const widgets = this.loadFromLocalStorage();
      const widgetsToSync = widgets.filter(w => this.pendingChanges.has(w.id));

      const response = await fetch('/api/kiosk/widgets/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ widgets: widgetsToSync }),
      });

      if (!response.ok) {
        throw new Error(`Database sync failed: ${response.status}`);
      }

      // Clear pending changes after successful sync
      this.pendingChanges.clear();
    } catch (error) {
      console.error('Error syncing to database:', error);
      // Don't clear pending changes on error - will retry later
    }
  }

  private async deleteFromDatabase(widgetId: string): Promise<void> {
    try {
      const response = await fetch(`/api/kiosk/widgets/${widgetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Database delete failed: ${response.status}`);
      }

      this.pendingChanges.delete(widgetId);
    } catch (error) {
      console.error('Error deleting from database:', error);
    }
  }

  // Utility methods
  private mergeWidgets(local: StoredWidget[], remote: StoredWidget[]): StoredWidget[] {
    const merged = [...local];
    
    remote.forEach(remoteWidget => {
      const localIndex = merged.findIndex(w => w.id === remoteWidget.id);
      
      if (localIndex >= 0) {
        // Use the newer version (compare lastModified)
        const localWidget = merged[localIndex];
        const localTime = new Date(localWidget.lastModified || 0).getTime();
        const remoteTime = new Date(remoteWidget.lastModified || 0).getTime();
        
        if (remoteTime > localTime) {
          merged[localIndex] = remoteWidget;
        }
      } else {
        // Add new widget from remote
        merged.push(remoteWidget);
      }
    });

    return merged.sort((a, b) => a.order - b.order);
  }

  private startAutoSync(): void {
    this.syncTimer = setInterval(() => {
      this.syncToDatabase();
    }, this.config.syncInterval);
  }

  // Public methods for configuration
  setConfig(config: Partial<WidgetStorageConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.config.useDatabase && !this.syncTimer) {
      this.startAutoSync();
    } else if (!this.config.useDatabase && this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  async forceSync(): Promise<void> {
    await this.syncToDatabase();
  }

  getPendingChanges(): string[] {
    return Array.from(this.pendingChanges);
  }

  clearPendingChanges(): void {
    this.pendingChanges.clear();
  }

  // Cleanup
  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }
}

// Singleton instance
export const widgetStorage = new WidgetStorageManager();

// Export types and manager
export type { StoredWidget, WidgetStorageConfig };
export { WidgetStorageManager };
