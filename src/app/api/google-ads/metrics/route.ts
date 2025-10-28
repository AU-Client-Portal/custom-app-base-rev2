import { NextRequest, NextResponse } from 'next/server';
import { GoogleAdsApi } from 'google-ads-api';
import { copilotApi } from 'copilot-node-sdk';

export const dynamic = 'force-dynamic';

// Map company IDs to their Google Ads Customer IDs and names
const CUSTOMER_MAPPING: Record<string, { customerId: string; name: string; hasGoogleAds: boolean }> = {
//  'default': { customerId: '7116961973', name: 'Straight Line', hasGoogleAds: true },
  'default': { customerId: '7116961973', name: 'Art Unlimited', hasGoogleAds: false },
  '7d52dc8e-c603-4c7e-ad27-60c15a86c12f': { customerId: '1196391424', name: 'Art Unlimited', hasGoogleAds: false },
  'fdb96a2c-a6ad-4238-9747-06b3ce7e8840': { customerId: '9499823115', name: 'Alans Roofing', hasGoogleAds: true },
  '61e7c938-fd52-4693-b79b-c2fb2349b61d': { customerId: '7116961973', name: 'Straight Line', hasGoogleAds: true },
};

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const startDate = request.nextUrl.searchParams.get('startDate') || '30daysAgo';
    const endDate = request.nextUrl.searchParams.get('endDate') || 'today';
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Check environment variables
    const requiredEnvVars = {
      clientId: process.env.GOOGLE_ADS_CLIENT_ID,
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      copilotApiKey: process.env.COPILOT_API_KEY,
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.error('Missing environment variables:', missingVars);
      return NextResponse.json(
        { error: 'Server configuration error', missing: missingVars },
        { status: 500 }
      );
    }

    // Initialize Copilot API
    console.log('Initializing Copilot API...');
    const copilot = copilotApi({
      apiKey: process.env.COPILOT_API_KEY ?? '',
      token: token,
    });

    let companyId = 'default';
    try {
      const session = await copilot.getTokenPayload?.();
      companyId = session?.companyId || 'default';
      console.log('Company ID:', companyId);
    } catch (copilotError) {
      console.error('Copilot API error:', copilotError);
      // Continue with default if Copilot fails
    }

    const customerConfig = CUSTOMER_MAPPING[companyId] || CUSTOMER_MAPPING['default'];
    console.log('Using customer config:', customerConfig);

    // Initialize Google Ads API client
    console.log('Initializing Google Ads API client...');
    let client;
    try {
      client = new GoogleAdsApi({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET ?? '',
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? '',
      });
      console.log('Google Ads API client initialized successfully');
    } catch (clientError: any) {
      console.error('Failed to initialize Google Ads API client:', clientError);
      return NextResponse.json(
        { error: 'Failed to initialize Google Ads client', details: clientError.message },
        { status: 500 }
      );
    }

    // Get customer instance
    console.log('Creating customer instance...');
    let customer;
    try {
      customer = client.Customer({
        customer_id: customerConfig.customerId,
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN ?? '',
        login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? undefined,
      });
      console.log('Customer instance created for ID:', customerConfig.customerId);
      console.log('Using login customer ID:', process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
    } catch (customerError: any) {
      console.error('Failed to create customer instance:', customerError);
      return NextResponse.json(
        { error: 'Failed to create customer instance', details: customerError.message },
        { status: 500 }
      );
    }

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
    console.log('Date range:', formattedStartDate, 'to', formattedEndDate);

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
        AND campaign.status != 'REMOVED'
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

    // Fetch data with detailed error handling
    console.log('Fetching Google Ads data...');
    let campaigns, overallMetrics;
    
    try {
      [campaigns, overallMetrics] = await Promise.all([
        customer.query(campaignQuery),
        customer.query(metricsQuery),
      ]);
      console.log('Data fetched successfully');
      console.log('Campaigns count:', campaigns?.length || 0);
      console.log('Overall metrics:', overallMetrics?.length || 0);
    } catch (queryError: any) {
      console.error('Query execution failed:', queryError);
      console.error('Error details:', {
        message: queryError.message,
        name: queryError.name,
        stack: queryError.stack,
      });
      
      // Return more specific error information
      return NextResponse.json(
        { 
          error: 'Failed to query Google Ads data',
          details: queryError.message,
          errorType: queryError.name,
          customerId: customerConfig.customerId,
          dateRange: { formattedStartDate, formattedEndDate }
        },
        { status: 500 }
      );
    }

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

    console.log('Successfully processed data, returning response');
    return NextResponse.json({
      companyId,
      companyName: customerConfig.name,
      customerId: customerConfig.customerId,
      dateRange: { startDate, endDate },
      metrics,
      campaigns: campaignData,
    });

  } catch (error: any) {
    console.error('Unexpected error in Google Ads API route:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Failed to fetch Google Ads data',
        details: error.message,
        errorType: error.name || 'Unknown',
      },
      { status: 500 }
    );
  }
}
