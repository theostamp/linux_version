// Mock Stripe Checkout for testing without real Stripe keys
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { plan, userData, tenantSubdomain } = await req.json();

    if (!plan || !userData || !tenantSubdomain) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Simulate successful checkout
    const mockSessionId = `cs_test_${Date.now()}`;

    const resolvePlanId = async () => {
      const normalized = String(plan || '').toLowerCase();
      const planTypeMapping: Record<string, string> = {
        free: 'free',
        web: 'web',
        premium: 'premium',
        premium_iot: 'premium_iot',
        'premium + iot': 'premium_iot',
        'premium +iot': 'premium_iot',
      };

      const planType = planTypeMapping[normalized] || 'web';
      const coreApiUrl = process.env.CORE_API_URL || process.env.NEXT_PUBLIC_CORE_API_URL;
      if (!coreApiUrl) return 1;

      try {
        const plansResponse = await fetch(`${coreApiUrl}/api/billing/plans/`);
        if (!plansResponse.ok) return 1;
        const payload = await plansResponse.json();
        const plans = Array.isArray(payload) ? payload : payload?.results || payload?.plans || [];
        const match = plans.find((entry: any) => entry.plan_type === planType);
        return match?.id || 1;
      } catch {
        return 1;
      }
    };

    const planId = await resolvePlanId();

    // Simulate webhook call to create tenant
    setTimeout(async () => {
      try {
        const coreApiUrl = process.env.CORE_API_URL;
        const internalApiKey = process.env.INTERNAL_API_SECRET_KEY;

        if (coreApiUrl && internalApiKey) {
          const response = await fetch(coreApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-API-Key': internalApiKey,
              'Host': 'localhost'
            },
            body: JSON.stringify({
              schema_name: tenantSubdomain,
              user_data: {
                email: userData.email,
                first_name: userData.firstName,
                last_name: userData.lastName,
                password: userData.password
              },
              plan_id: planId,
              stripe_customer_id: `cus_mock_${Date.now()}`,
              stripe_subscription_id: `sub_mock_${Date.now()}`
            })
          });

          console.log('Mock tenant creation result:', response.status);
        }
      } catch (error) {
        console.error('Mock tenant creation error:', error);
      }
    }, 2000); // Simulate 2-second delay

    return NextResponse.json({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/verify-payment/${mockSessionId}`,
      sessionId: mockSessionId
    });

  } catch (error) {
    console.error('Mock checkout error:', error);
    return NextResponse.json({ error: 'Failed to create mock checkout' }, { status: 500 });
  }
}








