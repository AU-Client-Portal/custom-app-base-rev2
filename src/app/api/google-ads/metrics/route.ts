import { NextRequest, NextResponse } from 'next/server';
import { GoogleAdsApi, enums } from 'google-ads-api';
import { copilotApi } from 'copilot-node-sdk';

// Map company IDs to their Google Ads Customer IDs and names
const CUSTOMER_MAPPING: Record<string, { customerId: string; name: string }> = {
  'default': { customerId: '1196391424', name: 'Art Unlimited' },
  '7d52dc8e-c603-4c7e-ad27-60c15a86c12f': { customerId: '1196391424', name: 'Art Unlimited' },
  'fdb96a2c-a6ad-4238-9747-06b3ce7e8840': { customerId: '9499823115', name: 'Alans Roofing' },
  '61e7c938-fd52-4693-b79b-c2fb2349b61d': { customerId: '7116961973', name: 'Straight Line' },
};

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const startDate = request.nextUrl.searchParams.get('startDate') || '30daysAgo';
    const endDate = request.nextUrl.searchParams.get('endDate') || 'today';
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Initialize Copilot API
    const copilot = copilotApi({
      apiKey: process.env.COPILOT_API_KEY ?? '',
      token: token,
    });

    const session = await copilot.getTokenPayload?.();
    const companyId = session?.companyId || 'default';
    const customerConfig = CUSTOMER_MAPPING[companyId] || CUSTOMER_MAPPING['default'];

    // Parse service account credentials
    const credentials = JSON.parse(process.env.GA4_SERVICE_ACCOUNT || '{}');

    // Initialize Google Ads API client
    const client = new GoogleAdsApi({
      client_id: credentials.client_id,
      client_secret: credentials.private_key,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? '',
    });

    // Get customer
    const customer = client.Customer({
      customer_id: customerConfig.customerId,
      refresh_token: credentials.private_key,
    });

    // Convert date range to YYYY-MM-DD format
    const formatDate = (dateStr: string): string => {
      if (dateStr === 'today') {
        return new Date().toISOString().split('T')[0];
      } else if (dateStr === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
      } else if (dateStr.includes('daysAgo')) {
        const days = parseInt(dateStr.replace('daysAgo', ''));
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];
      }
      return dateStr;
    };

    const formattedStartDate = formatDate(startDate).replace(/-/g, '');
    const formattedEndDate = formatDate(endDate).replace(/-/g, '');

    // Query for campaign performance
    const campaignQuery = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date BETWEEN '${formattedStartDate}' AND '${formattedEndDate}'
      ORDER BY metrics.impressions DESC
      LIMIT 10
    `;

    // Query for overall metrics
    const metricsQuery = `
      SELECT
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.average_cpc
      FROM customer
      WHERE segments.date BETWEEN '${formattedStartDate}' AND '${formattedEndDate}'
    `;

    // Fetch data
    const [campaigns, overallMetrics] = await Promise.all([
      customer.query(campaignQuery),
      customer.query(metricsQuery),
    ]);

    // Parse overall metrics
    const metrics = overallMetrics[0] ? {
      impressions: Number(overallMetrics[0].metrics?.impressions || 0),
      clicks: Number(overallMetrics[0].metrics?.clicks || 0),
      ctr: Number(overallMetrics[0].metrics?.ctr || 0) * 100,
      cost: Number(overallMetrics[0].metrics?.cost_micros || 0) / 1000000,
      conversions: Number(overallMetrics[0].metrics?.conversions || 0),
      conversionsValue: Number(overallMetrics[0].metrics?.conversions_value || 0),
      averageCpc: Number(overallMetrics[0].metrics?.average_cpc || 0) / 1000000,
    } : null;

    // Parse campaign data
    const campaignData = campaigns.map((row: any) => ({
      id: row.campaign?.id,
      name: row.campaign?.name || 'Unknown Campaign',
      status: row.campaign?.status,
      impressions: Number(row.metrics?.impressions || 0),
      clicks: Number(row.metrics?.clicks || 0),
      ctr: Number(row.metrics?.ctr || 0) * 100,
      cost: Number(row.metrics?.cost_micros || 0) / 1000000,
      conversions: Number(row.metrics?.conversions || 0),
      conversionsValue: Number(row.metrics?.conversions_value || 0),
    }));

    return NextResponse.json({
      companyId,
      companyName: customerConfig.name,
      customerId: customerConfig.customerId,
      dateRange: { startDate, endDate },
      metrics,
      campaigns: campaignData,
    });

  } catch (error: any) {
    console.error('Google Ads API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Google Ads data', details: error.message },
      { status: 500 }
    );
  }
}
