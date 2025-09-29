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

    // Fetch building data for management fee and reserve fund settings
    const buildingResponse = await makeRequestWithRetry(
      `/api/buildings/${buildingId}`
    );

    if (!buildingResponse.ok) {
      throw new Error('Failed to fetch building data');
    }

    const buildingData = await buildingResponse.json();

    // Fetch apartments with financial data for the specific building and month
    const apartmentsResponse = await makeRequestWithRetry(
      `/api/buildings/${buildingId}/apartments-with-financial-data?month=${month || ''}`
    );

    if (!apartmentsResponse.ok) {
      throw new Error('Failed to fetch apartment financial data');
    }

    const apartmentsData = await apartmentsResponse.json();

    // Calculate management fee
    const managementFeePerApartment = buildingData.management_fee_per_apartment || 0;
    const totalManagementFee = managementFeePerApartment * apartmentsData.length;

    // Calculate reserve fund
    const reserveFundGoal = buildingData.reserve_fund_goal || 0;
    const reserveFundDuration = buildingData.reserve_fund_duration_months || 0;
    const monthlyReserveAmount = reserveFundDuration > 0 ? reserveFundGoal / reserveFundDuration : 0;

    // Calculate total previous balance from all apartments
    const totalPreviousBalance = apartmentsData.reduce((sum: number, apt: any) => {
      const previousBalance = Math.abs(apt.previous_balance || 0);
      return sum + previousBalance;
    }, 0);

    // Calculate common expenses (operational expenses)
    const totalCommonExpenses = apartmentsData.reduce((sum: number, apt: any) => {
      const monthlyDue = apt.monthly_due || 0;
      return sum + monthlyDue;
    }, 0);

    // Calculate final total
    const finalTotal = totalCommonExpenses + totalManagementFee + monthlyReserveAmount + totalPreviousBalance;

    return NextResponse.json({
      success: true,
      data: {
        building: {
          id: buildingData.id,
          name: buildingData.name,
          address: buildingData.address,
          managementFeePerApartment: managementFeePerApartment,
          reserveFundGoal: reserveFundGoal,
          reserveFundDuration: reserveFundDuration
        },
        expenses: {
          commonExpenses: totalCommonExpenses,
          managementFee: totalManagementFee,
          reserveFund: monthlyReserveAmount,
          previousBalance: totalPreviousBalance,
          total: finalTotal
        },
        apartments: {
          count: apartmentsData.length,
          breakdown: apartmentsData.map((apt: any) => ({
            apartmentId: apt.id,
            apartmentNumber: apt.number,
            ownerName: apt.owner_name,
            previousBalance: apt.previous_balance || 0,
            currentBalance: apt.current_balance || 0,
            monthlyDue: apt.monthly_due || 0,
            participationMills: apt.participation_mills || 0
          }))
        },
        month: month || 'current'
      }
    });

  } catch (error) {
    console.error('Error fetching common expenses:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch common expenses data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}



