import { NextRequest, NextResponse } from 'next/server';
import { copilotApi } from 'copilot-node-sdk';

export const dynamic = 'force-dynamic';

// Map Assembly company IDs to Metricool blogIds
const BLOG_MAPPING: Record<string, { blogId: string; name: string }> = {
  'default': { blogId: '1920806', name: 'Straightline Roofing' },
  'fdb96a2c-a6ad-4238-9747-06b3ce7e8840': { blogId: '1920864', name: 'Alans Roofing' },
  '7d52dc8e-c603-4c7e-ad27-60c15a86c12f': { blogId: '1914400', name: 'Art Unlimited' },
  // Add more mappings as you get Assembly company IDs for each client
  'CRANDALL_COMPANY_ID': { blogId: '4374791', name: 'Crandall Roofing' },
  'MIDDLE_CREEK_COMPANY_ID': { blogId: '1929926', name: 'Middle Creek' },
  'NEPA_COMPANY_ID': { blogId: '1920835', name: 'NEPA Builders' },
  'QUANTUM_COMPANY_ID': { blogId: '1920899', name: 'Quantum Roofing' },
  'SRW_COMPANY_ID': { blogId: '4069038', name: 'SRW Products' },
  'STEVENS_COMPANY_ID': { blogId: '1920881', name: 'Stevens Roofing' },
  'STRAIGHTLINE_COMPANY_ID': { blogId: '1920806', name: 'Straightline Roofing' },
  'TITTLE_COMPANY_ID': { blogId: '3797430', name: 'Tittle Brothers' },
  'TRENT_COMPANY_ID': { blogId: '4947746', name: 'Trent Cotney' },
  'VANWEELDEN_COMPANY_ID': { blogId: '1920820', name: 'VanWeelden' },
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
      metricoolToken: process.env.METRICOOL_API_TOKEN,
      metricoolUserId: process.env.METRICOOL_USER_ID,
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
    }

    const blogConfig = BLOG_MAPPING[companyId] || BLOG_MAPPING['default'];
    console.log('Using blog config:', blogConfig);

    const metricoolUserId = process.env.METRICOOL_USER_ID;
    const metricoolToken = process.env.METRICOOL_API_TOKEN;
    const blogId = blogConfig.blogId;

    // Metricool API base URL
    const baseUrl = 'https://app.metricool.com/api';

    // Helper function to make Metricool API calls
    const callMetricoolApi = async (endpoint: string, additionalParams: Record<string, any> = {}) => {
      const params = new URLSearchParams({
        userId: metricoolUserId!,
        blogId: blogId,
        ...additionalParams,
      });

      const url = `${baseUrl}${endpoint}?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Mc-Auth': metricoolToken!,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Metricool API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    };

    console.log('Fetching Metricool data...');

    // Fetch various metrics in parallel
    const [
      profileData,
      statsData,
      postsData,
    ] = await Promise.all([
      // Get profile/account info
      callMetricoolApi('/admin/simpleProfiles').catch(e => {
        console.error('Profile fetch error:', e);
        return null;
      }),
      // Get statistics
      callMetricoolApi('/statistics/summary', {
        from: formatDateForMetricool(startDate),
        to: formatDateForMetricool(endDate),
      }).catch(e => {
        console.error('Stats fetch error:', e);
        return null;
      }),
      // Get recent posts
      callMetricoolApi('/posts/list', {
        limit: 10,
      }).catch(e => {
        console.error('Posts fetch error:', e);
        return null;
      }),
    ]);

    console.log('Successfully fetched Metricool data');

    return NextResponse.json({
      companyId,
      companyName: blogConfig.name,
      blogId: blogConfig.blogId,
      dateRange: { startDate, endDate },
      profile: profileData,
      stats: statsData,
      posts: postsData,
    });

  } catch (error: any) {
    console.error('Unexpected error in Metricool API route:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Failed to fetch Metricool data',
        details: error.message,
        errorType: error.name || 'Unknown',
      },
      { status: 500 }
    );
  }
}

// Helper function to convert date formats
function formatDateForMetricool(dateStr: string): string {
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
}
