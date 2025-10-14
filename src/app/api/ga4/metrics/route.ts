import { NextRequest, NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { copilotApi } from 'copilot-node-sdk';

// Map company/client IDs to their GA4 property IDs
const PROPERTY_MAPPING: Record<string, string> = {
  // 'default': 'YOUR_GA4_PROPERTY_ID', // Replace with your actual GA4 Property ID
  'default': '270323387', // Replace with your actual GA4 Property ID In this case Art Unlimited
  '7d52dc8e-c603-4c7e-ad27-60c15a86c12f': '270323387', // Art Unlimited
  'fdb96a2c-a6ad-4238-9747-06b3ce7e8840': '266834246', // Alans Roofing
  '61e7c938-fd52-4693-b79b-c2fb2349b61d': '260457321', // Straight Line
  // Add more client mappings as you add more clients:
  // 'company-123': '987654321',
  // 'client-abc': '123456789',
};

export async function GET(request: NextRequest) {
  try {
    // Get token from query params (passed by Assembly)
    const token = request.nextUrl.searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Initialize Copilot API to get user/company info
    const copilot = copilotApi({
      apiKey: process.env.COPILOT_API_KEY ?? '',
      token: token,
    });

    // Get the session info to identify which client this is
    const session = await copilot.getTokenPayload?.();
    
    // Determine which GA4 property to use
    const companyId = session?.companyId || 'default';
    const propertyId = PROPERTY_MAPPING[companyId] || PROPERTY_MAPPING['default'];

    if (!propertyId || propertyId === 'YOUR_GA4_PROPERTY_ID') {
      return NextResponse.json({ 
        error: 'GA4 Property ID not configured for this client' 
      }, { status: 404 });
    }

    // Initialize GA4 client with service account
    const credentials = JSON.parse(process.env.GA4_SERVICE_ACCOUNT || '{}');
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials,
    });

    // Fetch basic metrics from GA4 for the last 30 days
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '30daysAgo',
          endDate: 'today',
        },
      ],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
      ],
    });

    const row = response.rows?.[0];
    
    if (!row) {
      return NextResponse.json({ 
        activeUsers: 0,
        sessions: 0,
        pageViews: 0,
        avgSessionDuration: 0,
        bounceRate: '0.00',
      });
    }

    return NextResponse.json({
      activeUsers: parseInt(row.metricValues?.[0]?.value || '0'),
      sessions: parseInt(row.metricValues?.[1]?.value || '0'),
      pageViews: parseInt(row.metricValues?.[2]?.value || '0'),
      avgSessionDuration: parseFloat(row.metricValues?.[3]?.value || '0'),
      bounceRate: (parseFloat(row.metricValues?.[4]?.value || '0') * 100).toFixed(2),
      companyId, // Return for debugging
    });

  } catch (error: any) {
    console.error('GA4 API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data', details: error.message },
      { status: 500 }
    );
  }
}
