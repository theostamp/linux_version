'use client';

import { useState, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, rectSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Monitor, 
  Settings, 
  Save, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Grid3X3,
  Palette,
  Trash2,
  Move,
  Maximize2,
  Minimize2,
  Plus,
  Minus
} from 'lucide-react';
import { useKioskWidgets } from '@/hooks/useKioskWidgets';
import { KioskWidget, WidgetCategory, CanvasGridCell, DragItem } from '@/types/kiosk-widgets';
import { toast } from 'sonner';

// Widget icons mapping
const WIDGET_ICONS: Record<string, any> = {
  dashboard_overview: Monitor,
  building_statistics: Settings,
  emergency_contacts: Settings,
  announcements: Settings,
  votes: Settings,
  financial_overview: Settings,
  maintenance_overview: Settings,
  projects_overview: Settings,
  current_time: Settings,
  qr_code_connection: Settings,
  weather_widget_sidebar: Settings,
  weather_widget_topbar: Settings,
  internal_manager_info: Settings,
  community_message: Settings,
  advertising_banners_sidebar: Settings,
  advertising_banners_topbar: Settings,
  news_ticker: Settings,
};

// Category colors
const CATEGORY_COLORS: Record<WidgetCategory, string> = {
  main_slides: 'bg-blue-100 text-blue-800 border-blue-200',
  sidebar_widgets: 'bg-green-100 text-green-800 border-green-200',
  top_bar_widgets: 'bg-purple-100 text-purple-800 border-purple-200',
  special_widgets: 'bg-orange-100 text-orange-800 border-orange-200',
};

// Category labels
const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  main_slides: 'Κύρια Slides',
  sidebar_widgets: 'Sidebar Widgets',
  top_bar_widgets: 'Top Bar Widgets',
  special_widgets: 'Ειδικά Widgets',
};

// Grid configuration
const GRID_SIZE = {
  rows: 8,
  cols: 12,
};

const CELL_SIZE = 60; // pixels

interface DraggableWidgetProps {
  widget: KioskWidget;
  isInPalette?: boolean;
  onRemove?: (widgetId: string) => void;
}

function DraggableWidget({ widget, isInPalette = false, onRemove }: DraggableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = WIDGET_ICONS[widget.id] || Settings;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow ${
        isInPalette ? 'cursor-grab' : 'cursor-move'
      } ${isDragging ? 'z-50' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center space-x-2">
        <IconComponent className="w-4 h-4 text-gray-600" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {widget.name}
          </h4>
          <p className="text-xs text-gray-600 truncate">
            {widget.description}
          </p>
        </div>
        {!isInPalette && onRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(widget.id);
            }}
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
      <Badge 
        variant="outline" 
        className={`text-xs mt-2 ${CATEGORY_COLORS[widget.category]}`}
      >
        {CATEGORY_LABELS[widget.category]}
      </Badge>
    </div>
  );
}

interface DroppableCellProps {
  row: number;
  col: number;
  children: React.ReactNode;
  isOccupied: boolean;
}

function DroppableCell({ row, col, children, isOccupied }: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${row}-${col}`,
    data: { row, col },
  });

  return (
    <div
      ref={setNodeRef}
      className={`border border-gray-200 rounded text-xs flex items-center justify-center cursor-pointer transition-all relative ${
        isOccupied
          ? 'bg-blue-100 border-blue-300'
          : isOver
          ? 'bg-green-100 border-green-400 scale-105'
          : 'bg-white hover:bg-gray-100'
      }`}
      style={{ width: CELL_SIZE, height: CELL_SIZE }}
      data-row={row}
      data-col={col}
    >
      {children}
    </div>
  );
}

interface CanvasGridProps {
  grid: CanvasGridCell[][];
  widgets: KioskWidget[];
  onCellClick: (row: number, col: number) => void;
  onWidgetMove: (widgetId: string, row: number, col: number) => void;
}

function CanvasGrid({ grid, widgets, onCellClick, onWidgetMove }: CanvasGridProps) {
  const getWidgetAtPosition = (row: number, col: number) => {
    return widgets.find(widget => 
      widget.gridPosition &&
      widget.gridPosition.row <= row &&
      widget.gridPosition.row + widget.gridPosition.rowSpan > row &&
      widget.gridPosition.col <= col &&
      widget.gridPosition.col + widget.gridPosition.colSpan > col
    );
  };

  return (
    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4">
      {/* Column Headers */}
      <div className="flex mb-1">
        <div className="w-8"></div> {/* Space for row headers */}
        {Array.from({ length: GRID_SIZE.cols }, (_, col) => (
          <div
            key={`col-header-${col}`}
            className="text-xs font-semibold text-gray-600 text-center"
            style={{ width: CELL_SIZE }}
          >
            {col + 1}
          </div>
        ))}
      </div>

      <div className="flex">
        {/* Row Headers */}
        <div>
          {Array.from({ length: GRID_SIZE.rows }, (_, row) => (
            <div
              key={`row-header-${row}`}
              className="text-xs font-semibold text-gray-600 flex items-center justify-center mr-1"
              style={{ height: CELL_SIZE }}
            >
              {row + 1}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid gap-1" style={{
          gridTemplateColumns: `repeat(${GRID_SIZE.cols}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${GRID_SIZE.rows}, ${CELL_SIZE}px)`,
        }}>
          {Array.from({ length: GRID_SIZE.rows }, (_, row) =>
            Array.from({ length: GRID_SIZE.cols }, (_, col) => {
              const widget = getWidgetAtPosition(row, col);
              const isOccupied = !!widget;
              const isFirstCell = widget &&
                widget.gridPosition?.row === row &&
                widget.gridPosition?.col === col;

              return (
                <DroppableCell
                  key={`${row}-${col}`}
                  row={row}
                  col={col}
                  isOccupied={isOccupied}
                >
                  {/* Cell Position Indicator */}
                  {!isOccupied && (
                    <div className="absolute top-0.5 left-0.5 text-[9px] text-gray-400">
                      {row+1},{col+1}
                    </div>
                  )}

                  {isFirstCell && widget && (
                    <div className="text-center">
                      <div className="font-medium text-blue-800 truncate px-1">
                        {widget.name}
                      </div>
                      <div className="text-xs text-blue-600">
                        {widget.gridPosition?.rowSpan}x{widget.gridPosition?.colSpan}
                      </div>
                    </div>
                  )}
                </DroppableCell>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

interface KioskCanvasEditorProps {
  buildingId?: number;
}

export default function KioskCanvasEditor({ buildingId }: KioskCanvasEditorProps) {
  const {
    config,
    isLoading,
    error,
    toggleWidget,
    updateWidgetSettings,
    updateGlobalSettings,
    resetToDefault,
    getEnabledWidgets,
    saveConfig,
  } = useKioskWidgets(buildingId);

  const [selectedWidget, setSelectedWidget] = useState<KioskWidget | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [gridSize, setGridSize] = useState(GRID_SIZE);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Create grid representation
  const grid = useMemo(() => {
    const gridCells: CanvasGridCell[][] = Array.from({ length: gridSize.rows }, (_, row) =>
      Array.from({ length: gridSize.cols }, (_, col) => ({
        row,
        col,
        occupied: false,
      }))
    );

    // Mark occupied cells
    config.widgets.forEach(widget => {
      if (widget.gridPosition) {
        for (let r = widget.gridPosition.row; r < widget.gridPosition.row + widget.gridPosition.rowSpan; r++) {
          for (let c = widget.gridPosition.col; c < widget.gridPosition.col + widget.gridPosition.colSpan; c++) {
            if (r < gridSize.rows && c < gridSize.cols) {
              gridCells[r][c].occupied = true;
              gridCells[r][c].widgetId = widget.id;
            }
          }
        }
      }
    });

    return gridCells;
  }, [config.widgets, gridSize]);

  // Get available widgets (not placed on canvas)
  const availableWidgets = useMemo(() => {
    return config.widgets.filter(widget => 
      widget.enabled && !widget.gridPosition
    );
  }, [config.widgets]);

  // Get placed widgets
  const placedWidgets = useMemo(() => {
    return config.widgets.filter(widget => 
      widget.enabled && widget.gridPosition
    );
  }, [config.widgets]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    console.log('🎯 Drag Start:', active.id);
    const widget = config.widgets.find(w => w.id === active.id);
    if (widget) {
      console.log('📦 Selected Widget:', widget);
      setSelectedWidget(widget);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('🎯 Drag End:', { activeId: active.id, overId: over?.id });
    setSelectedWidget(null);

    if (!over) {
      console.log('❌ No drop target');
      return;
    }

    const widgetId = active.id as string;
    const targetId = over.id as string;

    // If dropping on canvas cell
    if (targetId.startsWith('cell-')) {
      const [_, rowStr, colStr] = targetId.split('-');
      const row = parseInt(rowStr);
      const col = parseInt(colStr);
      console.log('📍 Dropping on cell:', { row, col });
      await handleWidgetPlacement(widgetId, row, col);
    }
    // If reordering in palette
    else if (targetId.startsWith('palette-')) {
      const newOrder = arrayMove(
        availableWidgets,
        availableWidgets.findIndex(w => w.id === widgetId),
        availableWidgets.findIndex(w => w.id === targetId)
      );
      // Update order
      for (let i = 0; i < newOrder.length; i++) {
        await updateWidgetSettings(newOrder[i].id, { order: i });
      }
    }
  };

  const handleWidgetPlacement = async (widgetId: string, row: number, col: number) => {
    console.log('🎨 Placing widget:', { widgetId, row, col });
    const widget = config.widgets.find(w => w.id === widgetId);
    if (!widget) {
      console.error('❌ Widget not found:', widgetId);
      return;
    }

    // Check if position is available
    const canPlace = checkPositionAvailability(row, col, widget);
    if (!canPlace) {
      console.log('❌ Position not available');
      toast.error('Η θέση δεν είναι διαθέσιμη');
      return;
    }

    // Set default size if not specified
    const rowSpan = widget.gridPosition?.rowSpan || 2;
    const colSpan = widget.gridPosition?.colSpan || 2;

    console.log('📐 Widget size:', { rowSpan, colSpan });

    // Update widget position
    try {
      await updateWidgetSettings(widgetId, {
        gridPosition: {
          row,
          col,
          rowSpan,
          colSpan,
        }
      });
      console.log('✅ Widget placed successfully');
      toast.success('Widget τοποθετήθηκε επιτυχώς');
    } catch (error) {
      console.error('❌ Error placing widget:', error);
      toast.error('Σφάλμα κατά την τοποθέτηση');
    }
  };

  const checkPositionAvailability = (row: number, col: number, widget: KioskWidget) => {
    const rowSpan = widget.gridPosition?.rowSpan || 2;
    const colSpan = widget.gridPosition?.colSpan || 2;

    // Check bounds
    if (row + rowSpan > gridSize.rows || col + colSpan > gridSize.cols) {
      return false;
    }

    // Check if cells are occupied
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        if (grid[r][c].occupied && grid[r][c].widgetId !== widget.id) {
          return false;
        }
      }
    }

    return true;
  };

  const handleCellClick = (row: number, col: number) => {
    if (selectedWidget) {
      handleWidgetPlacement(selectedWidget.id, row, col);
    }
  };

  const handleRemoveWidget = async (widgetId: string) => {
    await updateWidgetSettings(widgetId, {
      gridPosition: undefined
    });
    toast.success('Widget αφαιρέθηκε από το canvas');
  };

  const handleResizeWidget = async (widgetId: string, newRowSpan: number, newColSpan: number) => {
    const widget = config.widgets.find(w => w.id === widgetId);
    if (!widget || !widget.gridPosition) return;

    // Validate new size
    if (newRowSpan < 1 || newColSpan < 1) {
      toast.error('Το μέγεθος πρέπει να είναι τουλάχιστον 1x1');
      return;
    }

    // Check if new size fits in grid
    if (widget.gridPosition.row + newRowSpan > gridSize.rows ||
        widget.gridPosition.col + newColSpan > gridSize.cols) {
      toast.error('Το widget δεν χωράει στο grid με αυτό το μέγεθος');
      return;
    }

    // Check if new size overlaps with other widgets
    for (let r = widget.gridPosition.row; r < widget.gridPosition.row + newRowSpan; r++) {
      for (let c = widget.gridPosition.col; c < widget.gridPosition.col + newColSpan; c++) {
        if (grid[r] && grid[r][c] && grid[r][c].occupied && grid[r][c].widgetId !== widgetId) {
          toast.error('Το νέο μέγεθος επικαλύπτει άλλο widget');
          return;
        }
      }
    }

    // Update widget size
    await updateWidgetSettings(widgetId, {
      gridPosition: {
        ...widget.gridPosition,
        rowSpan: newRowSpan,
        colSpan: newColSpan,
      }
    });

    toast.success('Το μέγεθος του widget ενημερώθηκε');
  };

  const handleGridSizeChange = (newSize: { rows: number; cols: number }) => {
    setGridSize(newSize);
    // Remove widgets that are outside the new grid
    config.widgets.forEach(widget => {
      if (widget.gridPosition) {
        if (widget.gridPosition.row + widget.gridPosition.rowSpan > newSize.rows ||
            widget.gridPosition.col + widget.gridPosition.colSpan > newSize.cols) {
          updateWidgetSettings(widget.id, { gridPosition: undefined });
        }
      }
    });
  };

  const handleSaveLayout = async () => {
    console.log('💾 Starting save layout...');
    setIsSaving(true);

    const layoutData = {
      ...config,
      canvasLayout: {
        gridSize,
        widgetPositions: Object.fromEntries(
          config.widgets
            .filter(w => w.gridPosition)
            .map(w => [w.id, w.gridPosition!])
        ),
      }
    };

    console.log('📋 Layout data to save:', layoutData);

    try {
      const result = await saveConfig(layoutData);
      console.log('✅ Save successful:', result);
      toast.success('Layout αποθηκεύτηκε επιτυχώς');
    } catch (error) {
      console.error('❌ Save failed:', error);
      toast.error('Αποτυχία αποθήκευσης layout');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetLayout = async () => {
    if (confirm('Είστε σίγουροι ότι θέλετε να επαναφέρετε το layout;')) {
      // Remove all grid positions
      for (const widget of config.widgets) {
        if (widget.gridPosition) {
          await updateWidgetSettings(widget.id, { gridPosition: undefined });
        }
      }
      toast.success('Layout επαναφέρθηκε');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Φόρτωση canvas editor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kiosk Canvas Editor</h1>
          <p className="text-gray-600 mt-1">
            Σύρετε widgets από την παλέτα στο canvas για να δημιουργήσετε το layout του kiosk
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {previewMode ? 'Εξόδος Preview' : 'Preview'}
          </Button>
          <Button
            variant="outline"
            onClick={handleResetLayout}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Επαναφορά
          </Button>
          <Button
            onClick={handleSaveLayout}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση Layout'}
          </Button>
        </div>
      </div>

      {/* Grid Size Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Grid3X3 className="w-5 h-5 mr-2" />
            Μέγεθος Grid
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Σειρές:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGridSizeChange({ ...gridSize, rows: Math.max(4, gridSize.rows - 1) })}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="w-8 text-center">{gridSize.rows}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGridSizeChange({ ...gridSize, rows: Math.min(12, gridSize.rows + 1) })}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Στήλες:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGridSizeChange({ ...gridSize, cols: Math.max(6, gridSize.cols - 1) })}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="w-8 text-center">{gridSize.cols}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGridSizeChange({ ...gridSize, cols: Math.min(16, gridSize.cols + 1) })}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Single DndContext for all drag and drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Widget Palette */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="w-5 h-5 mr-2" />
                  Widget Palette
                </CardTitle>
                <CardDescription>
                  Σύρετε widgets στο canvas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SortableContext
                  items={availableWidgets.map(w => w.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availableWidgets.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Όλα τα widgets έχουν τοποθετηθεί
                      </p>
                    ) : (
                      availableWidgets.map((widget) => (
                        <DraggableWidget
                          key={widget.id}
                          widget={widget}
                          isInPalette={true}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
              </CardContent>
            </Card>
          </div>

          {/* Canvas */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Monitor className="w-5 h-5 mr-2" />
                  Kiosk Canvas
                </CardTitle>
                <CardDescription>
                  {selectedWidget ? (
                    <span className="text-blue-600">
                      Επιλέξτε θέση για: {selectedWidget.name}
                    </span>
                  ) : (
                    'Σύρετε widgets από την παλέτα στο canvas'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Canvas Grid */}
                  <CanvasGrid
                    grid={grid}
                    widgets={placedWidgets}
                    onCellClick={handleCellClick}
                    onWidgetMove={handleWidgetPlacement}
                  />

                  {/* Placed Widgets */}
                  {placedWidgets.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        Τοποθετημένα Widgets ({placedWidgets.length})
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {placedWidgets.map((widget) => (
                          <div
                            key={widget.id}
                            className="bg-white border rounded-lg p-3 shadow-sm"
                          >
                            <div className="flex flex-col space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900">
                                    {widget.name}
                                  </h4>
                                  <p className="text-xs text-gray-600">
                                    Pos: ({(widget.gridPosition?.row ?? 0) + 1}, {(widget.gridPosition?.col ?? 0) + 1})
                                    Size: {widget.gridPosition?.rowSpan ?? 2}x{widget.gridPosition?.colSpan ?? 2}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveWidget(widget.id)}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                              {/* Size Controls */}
                              <div className="flex items-center space-x-2 text-xs">
                                <span className="text-gray-600">Size:</span>
                                <div className="flex items-center space-x-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    onClick={() => handleResizeWidget(widget.id,
                                      (widget.gridPosition?.rowSpan ?? 2) - 1,
                                      widget.gridPosition?.colSpan ?? 2)}
                                    disabled={(widget.gridPosition?.rowSpan ?? 2) <= 1}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="w-4 text-center">{widget.gridPosition?.rowSpan ?? 2}</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    onClick={() => handleResizeWidget(widget.id,
                                      (widget.gridPosition?.rowSpan ?? 2) + 1,
                                      widget.gridPosition?.colSpan ?? 2)}
                                    disabled={(widget.gridPosition?.row ?? 0) + (widget.gridPosition?.rowSpan ?? 2) >= gridSize.rows}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                  <span className="text-gray-600 mx-1">x</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    onClick={() => handleResizeWidget(widget.id,
                                      widget.gridPosition?.rowSpan ?? 2,
                                      (widget.gridPosition?.colSpan ?? 2) - 1)}
                                    disabled={(widget.gridPosition?.colSpan ?? 2) <= 1}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="w-4 text-center">{widget.gridPosition?.colSpan ?? 2}</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    onClick={() => handleResizeWidget(widget.id,
                                      widget.gridPosition?.rowSpan ?? 2,
                                      (widget.gridPosition?.colSpan ?? 2) + 1)}
                                    disabled={(widget.gridPosition?.col ?? 0) + (widget.gridPosition?.colSpan ?? 2) >= gridSize.cols}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DndContext>

      {/* Preview Mode */}
      {previewMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="w-5 h-5 mr-2" />
              Preview - Kiosk Layout
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 rounded-lg p-4 text-white">
              <div className="text-center text-sm text-gray-400 mb-4">
                Preview του kiosk layout
              </div>
              <div className="grid gap-1" style={{
                gridTemplateColumns: `repeat(${gridSize.cols}, 40px)`,
                gridTemplateRows: `repeat(${gridSize.rows}, 40px)`,
              }}>
                {Array.from({ length: gridSize.rows }, (_, row) =>
                  Array.from({ length: gridSize.cols }, (_, col) => {
                    const widget = placedWidgets.find(w => 
                      w.gridPosition &&
                      w.gridPosition.row <= row &&
                      w.gridPosition.row + w.gridPosition.rowSpan > row &&
                      w.gridPosition.col <= col &&
                      w.gridPosition.col + w.gridPosition.colSpan > col
                    );

                    return (
                      <div
                        key={`${row}-${col}`}
                        className={`border border-gray-600 rounded text-xs flex items-center justify-center ${
                          widget ? 'bg-blue-600' : 'bg-gray-800'
                        }`}
                        style={{ width: 40, height: 40 }}
                      >
                        {widget && widget.gridPosition?.row === row && widget.gridPosition?.col === col && (
                          <div className="text-center">
                            <div className="text-xs font-bold truncate px-1">
                              {widget.name.split(' ')[0]}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
