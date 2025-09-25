import { NextRequest, NextResponse } from 'next/server';
import { WidgetConfig, DEFAULT_WIDGET_CONFIG } from '@/types/kiosk-widgets';

// Mock storage - in production, this would be stored in the database
const widgetConfigs = new Map<number, WidgetConfig>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('building_id');

    if (!buildingId) {
      return NextResponse.json(
        { error: 'Building ID is required' },
        { status: 400 }
      );
    }

    const buildingIdNum = parseInt(buildingId);
    const config = widgetConfigs.get(buildingIdNum) || DEFAULT_WIDGET_CONFIG;

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching widget config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { building_id, config } = body;

    if (!building_id || !config) {
      return NextResponse.json(
        { error: 'Building ID and config are required' },
        { status: 400 }
      );
    }

    // Validate config structure
    if (!config.widgets || !Array.isArray(config.widgets)) {
      return NextResponse.json(
        { error: 'Invalid config structure' },
        { status: 400 }
      );
    }

    // Store the config
    widgetConfigs.set(building_id, config as WidgetConfig);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving widget config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('building_id');

    if (!buildingId) {
      return NextResponse.json(
        { error: 'Building ID is required' },
        { status: 400 }
      );
    }

    const buildingIdNum = parseInt(buildingId);
    widgetConfigs.delete(buildingIdNum);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting widget config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
