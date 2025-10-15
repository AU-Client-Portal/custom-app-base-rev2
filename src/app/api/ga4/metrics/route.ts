import { NextRequest, NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { copilotApi } from 'copilot-node-sdk';

// Map company IDs to their GA4 property IDs, names, and Google Ads Customer IDs
const PROPERTY_MAPPING: Record<string, { propertyId: string; name: string; adsCustomerId: string }> = {
  'default': { propertyId: '270323387', name: 'Art Unlimited', adsCustomerId: '1196391424' },
  '7d52dc8e-c603-4c7e-ad27-60c15a86c12f': { propertyId: '270323387', name: 'Art Unlimited', adsCustomerId: '1196391424' },
  'fdb96a2c-a6ad-4238-9747-06b3ce7e8840': { propertyId: '266834246', name: 'Alans Roofing', adsCustomerId: '9499823115' },
  '61e7c938-fd52-4693-b79b-c2fb2349b61d': { propertyId: '260457321', name: 'Straight Line', adsCustomerId: '7116961973' },
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
    const companyConfig = PROPERTY_MAPPING[companyId] || PROPERTY_MAPPING['default'];

    // Initialize GA4 client
    const credentials = JSON.parse(process.env.GA4_SERVICE_ACCOUNT || '{}');
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials,
    });

    // Fetch main metrics
    const [metricsResponse] = await analyticsDataClient.runReport({
      property: `properties/${companyConfig.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'newUsers' },
        { name: 'engagementRate' },
      ],
    });

    // Fetch metrics over time (daily breakdown)
    const [timeSeriesResponse] = await analyticsDataClient.runReport({
      property: `properties/${companyConfig.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
    });

    // Fetch top pages
    const [pagesResponse] = await analyticsDataClient.runReport({
      property: `properties/${companyConfig.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10,
    });

    // Fetch traffic sources
    const [sourcesResponse] = await analyticsDataClient.runReport({
      property: `properties/${companyConfig.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    });

    // Fetch device breakdown
    const [devicesResponse] = await analyticsDataClient.runReport({
      property: `properties/${companyConfig.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }],
    });

    // Fetch top countries
    const [countriesResponse] = await analyticsDataClient.runReport({
      property: `properties/${companyConfig.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 10,
    });

    // Parse main metrics
    const mainRow = metricsResponse.rows?.[0];
    const mainMetrics = mainRow ? {
      activeUsers: parseInt(mainRow.metricValues?.[0]?.value || '0'),
      sessions: parseInt(mainRow.metricValues?.[1]?.value || '0'),
      pageViews: parseInt(mainRow.metricValues?.[2]?.value || '0'),
      avgSessionDuration: parseFloat(mainRow.metricValues?.[3]?.value || '0'),
      bounceRate: (parseFloat(mainRow.metricValues?.[4]?.value || '0') * 100).toFixed(2),
      newUsers: parseInt(mainRow.metricValues?.[5]?.value || '0'),
      engagementRate: (parseFloat(mainRow.metricValues?.[6]?.value || '0') * 100).toFixed(2),
    } : null;

    // Parse time series
    const timeSeries = timeSeriesResponse.rows?.map(row => ({
      date: row.dimensionValues?.[0]?.value || '',
      activeUsers: parseInt(row.metricValues?.[0]?.value || '0'),
      sessions: parseInt(row.metricValues?.[1]?.value || '0'),
      pageViews: parseInt(row.metricValues?.[2]?.value || '0'),
    })) || [];

    // Parse top pages
    const topPages = pagesResponse.rows?.map(row => ({
      title: row.dimensionValues?.[0]?.value || 'Unknown',
      path: row.dimensionValues?.[1]?.value || '/',
      views: parseInt(row.metricValues?.[0]?.value || '0'),
    })) || [];

    // Parse traffic sources
    const trafficSources = sourcesResponse.rows?.map(row => ({
      source: row.dimensionValues?.[0]?.value || 'Unknown',
      sessions: parseInt(row.metricValues?.[0]?.value || '0'),
    })) || [];

    // Parse devices
    const devices = devicesResponse.rows?.map(row => ({
      device: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || '0'),
    })) || [];

    // Parse countries
    const countries = countriesResponse.rows?.map(row => ({
      country: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || '0'),
    })) || [];

    return NextResponse.json({
      companyId,
      companyName: companyConfig.name,
      dateRange: { startDate, endDate },
      metrics: mainMetrics,
      timeSeries,
      topPages,
      trafficSources,
      devices,
      countries,
    });

  } catch (error: any) {
    console.error('GA4 API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data', details: error.message },
      { status: 500 }
    );
  }
}
