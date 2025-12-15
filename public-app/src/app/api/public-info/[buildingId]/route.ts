import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Build a fallback response that keeps the requested building id
const buildFallbackResponse = (buildingId: string) => ({
  building_info: {
    id: Number.parseInt(buildingId, 10) || 0,
    name: `Building #${buildingId}`,
    address: 'Unavailable',
    city: 'N/A',
    total_apartments: 0,
    occupied: 0,
  },
  announcements: [],
  votes: [],
  financial: {
    collection_rate: 0,
    reserve_fund: 0,
    recent_expenses: [],
  },
  maintenance: {
    pending_requests: 0,
    completed_this_month: 0,
  },
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ buildingId: string }> }
) {
  const { buildingId } = await params;

  if (!buildingId) {
    return NextResponse.json(
      { error: 'Building ID is required' },
      { status: 400 }
    );
  }

  const backendUrl =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_CORE_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_DJANGO_API_URL ||
    'https://linuxversion-production.up.railway.app';
  
  console.log('[PUBLIC-INFO API] ===== NEW CODE VERSION =====');
  console.log('[PUBLIC-INFO API] Using backend URL:', backendUrl);
  console.log('[PUBLIC-INFO API] Building ID:', buildingId);
  
  const normalizedBase = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
  const targetUrl = `${normalizedBase}/api/public-info/${buildingId}/`;

  console.log('[PUBLIC-INFO API] Fetching from:', targetUrl);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const forwardedHost = request.headers.get('x-forwarded-host');
    const referer = request.headers.get('referer');
    const origin = request.headers.get('origin');
    const requestHost = request.headers.get('host') ?? '';

    let publicHostname = request.headers.get('x-tenant-host') || requestHost;

    if (origin) {
      try {
        publicHostname = new URL(origin).host;
      } catch {
        // ignore invalid origin
      }
    }

    if (
      (publicHostname.includes('railway.app') || publicHostname.includes('vercel.app')) &&
      referer
    ) {
      try {
        publicHostname = new URL(referer).host;
      } catch {
        // ignore invalid referer
      }
    }

    if (
      forwardedHost &&
      !forwardedHost.includes('railway.app') &&
      !forwardedHost.includes('vercel.app')
    ) {
      publicHostname = forwardedHost;
    }

    const finalHost = publicHostname || 'demo.localhost';

    const headers = {
      'Content-Type': 'application/json',
      Host: finalHost,
      'X-Forwarded-Host': finalHost,
      'X-Tenant-Host': finalHost,
      'X-Forwarded-Proto': request.headers.get('x-forwarded-proto') ?? 'https',
    };

    console.log('[PUBLIC-INFO API] Request headers:', headers);

    const response = await fetch(targetUrl, {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('[API PROXY] Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API PROXY] Backend error response:', errorText);
      
      // Return fallback data instead of error
      console.warn('[API PROXY] Returning fallback public info due to backend error');
      return NextResponse.json(buildFallbackResponse(buildingId));
    }

    const data = await response.json();

    // Privacy: never expose per-apartment balances or names via the public kiosk endpoint.
    try {
      const financial = (data as any)?.financial;
      if (financial && typeof financial === 'object') {
        if (Array.isArray((financial as any).apartment_balances)) {
          (financial as any).apartment_balances = [];
        }
        if (Array.isArray((financial as any).top_debtors)) {
          (financial as any).top_debtors = [];
        }
      }
    } catch (e) {
      console.warn('[PUBLIC-INFO API] Sanitization error:', e);
    }

    // If backend public-info doesn't include upcoming assembly (or doesn't include stats yet),
    // enrich it here so kiosk widgets can still work reliably.
    const existingAssembly = (data as any)?.upcoming_assembly;
    const needsAssemblyEnrichment =
      !('upcoming_assembly' in data) ||
      (existingAssembly && typeof existingAssembly === 'object' && !('stats' in existingAssembly));

    if (needsAssemblyEnrichment) {
      try {
        const assemblyUrl = `${normalizedBase}/api/assemblies/upcoming/?building_id=${buildingId}`;
        console.log('[PUBLIC-INFO API] Enriching with assembly from:', assemblyUrl);

        const assemblyController = new AbortController();
        const assemblyTimeoutId = setTimeout(() => assemblyController.abort(), 3500);

        const assemblyResp = await fetch(assemblyUrl, {
          headers,
          signal: assemblyController.signal,
        });

        clearTimeout(assemblyTimeoutId);

        if (assemblyResp.ok) {
          const assemblyJson = await assemblyResp.json();
          const assembly = assemblyJson?.assembly ?? null;
          (data as any).upcoming_assembly = assembly;
          console.log('[PUBLIC-INFO API] Assembly enrichment:', assembly ? 'FOUND' : 'NONE');
        } else {
          const txt = await assemblyResp.text();
          console.warn('[PUBLIC-INFO API] Assembly enrichment failed:', assemblyResp.status, txt);
          // Don't override existing upcoming_assembly if backend already provided one
          if (!('upcoming_assembly' in data)) {
            (data as any).upcoming_assembly = null;
          }
        }
      } catch (e) {
        console.warn('[PUBLIC-INFO API] Assembly enrichment error:', e);
        if (!('upcoming_assembly' in data)) {
          (data as any).upcoming_assembly = null;
        }
      }
    }

    // Enrich votes with public results for kiosk banner (percentages, thresholds)
    try {
      const votes = Array.isArray((data as any).votes) ? (data as any).votes : [];
      const votesNeedingResults = votes.filter((v: any) => v && typeof v === 'object' && !('results' in v));

      if (votesNeedingResults.length > 0) {
        const toEnrich = votesNeedingResults.slice(0, 3); // keep latency bounded

        await Promise.all(
          toEnrich.map(async (v: any) => {
            const voteId = v?.id;
            if (!voteId) return;

            const voteUrl = `${normalizedBase}/api/votes/public/${voteId}/results/`;
            const voteController = new AbortController();
            const voteTimeoutId = setTimeout(() => voteController.abort(), 2500);

            try {
              const resp = await fetch(voteUrl, {
                headers,
                signal: voteController.signal,
              });
              clearTimeout(voteTimeoutId);

              if (!resp.ok) {
                const txt = await resp.text();
                console.warn('[PUBLIC-INFO API] Vote results enrichment failed:', resp.status, txt);
                return;
              }

              const json = await resp.json();
              // inject fields onto the vote object
              v.results = json?.results ?? null;
              v.min_participation = json?.min_participation ?? v.min_participation;
              v.total_votes = json?.total_votes ?? v.total_votes;
              v.participation_percentage = json?.participation_percentage ?? v.participation_percentage;
              v.is_valid = json?.is_valid ?? v.is_valid;
            } catch (e) {
              clearTimeout(voteTimeoutId);
              console.warn('[PUBLIC-INFO API] Vote results enrichment error:', e);
            }
          })
        );
      }
    } catch (e) {
      console.warn('[PUBLIC-INFO API] Vote enrichment wrapper error:', e);
    }

    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if it's a connection error
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed') || error instanceof Error && error.name === 'AbortError') {
      console.warn('[API PROXY] Backend unavailable (connection refused or timeout):', errorMessage);
      console.warn('[API PROXY] Returning fallback public info. Start Django backend to see actual data.');
      
      // Return fallback data instead of error
      return NextResponse.json(buildFallbackResponse(buildingId));
    }
    
    console.error('[API PROXY] Unexpected error fetching public info:', error);
    
    // Even for unexpected errors, return fallback to prevent app crash
    return NextResponse.json(buildFallbackResponse(buildingId));
  }
}
