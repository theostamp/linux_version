import { NextRequest, NextResponse } from 'next/server';
import { makeRequestWithRetry } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('buildingId');
    const month = searchParams.get('month');

    if (!buildingId) {
      return NextResponse.json(
        { error: 'Building ID is required' },
        { status: 400 }
      );
    }

    // Fetch apartments with financial data for the specific building and month
    const response = await makeRequestWithRetry(
      `/api/buildings/${buildingId}/apartments-with-financial-data?month=${month || ''}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch apartment financial data');
    }

    const apartmentsData = await response.json();

    // Calculate total previous balance from all apartments
    const totalPreviousBalance = apartmentsData.reduce((sum: number, apt: any) => {
      const previousBalance = Math.abs(apt.previous_balance || 0);
      return sum + previousBalance;
    }, 0);

    // Calculate breakdown by apartment
    const apartmentsBreakdown = apartmentsData.map((apt: any) => ({
      apartmentId: apt.id,
      apartmentNumber: apt.number,
      ownerName: apt.owner_name,
      previousBalance: apt.previous_balance || 0,
      currentBalance: apt.current_balance || 0,
      monthlyDue: apt.monthly_due || 0,
      participationMills: apt.participation_mills || 0
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalPreviousBalance,
        apartmentsCount: apartmentsData.length,
        apartmentsBreakdown,
        month: month || 'current',
        buildingId: parseInt(buildingId)
      }
    });

  } catch (error) {
    console.error('Error fetching previous balance:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch previous balance data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}



