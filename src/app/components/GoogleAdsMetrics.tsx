'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface GoogleAdsData {
  companyId: string;
  companyName: string;
  customerId: string;
  hasGoogleAds?: boolean;
  message?: string;
  dateRange: { startDate: string; endDate: string };
  metrics?: {
    impressions: number;
    clicks: number;
    ctr: number;
    cost: number;
    conversions: number;
    conversionsValue: number;
    averageCpc: number;
  };
  campaigns?: Array<{
    id: string;
    name: string;
    status: string;
    impressions: number;
    clicks: number;
    ctr: number;
    cost: number;
    conversions: number;
    conversionsValue: number;
  }>;
}

interface GoogleAdsMetricsProps {
  dateRange: {
    start: string;
    end: string;
  };
}

export function GoogleAdsMetrics({ dateRange }: GoogleAdsMetricsProps) {
  const [data, setData] = useState<GoogleAdsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    async function fetchGoogleAds() {
      setLoading(true);
      setError(null);
      
      try {
        const token = searchParams.get('token');
        const response = await fetch(
          `/api/google-ads/metrics?token=${token}&startDate=${dateRange.start}&endDate=${dateRange.end}`
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch Google Ads data');
        }
        
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchGoogleAds();
  }, [searchParams, dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 text-lg">Loading Google Ads data...</div>
      </div>
    );
  }

  // Handle case where company doesn't have Google Ads
  if (data && data.hasGoogleAds === false) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-200 mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-700 mb-2">Google Ads Not Configured</h3>
        <p className="text-gray-500 text-lg mb-6">
          Google Ads are not set up for <span className="font-semibold">{data.companyName}</span>
        </p>
        <div className="inline-block px-6 py-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700 text-sm">
            To add Google Ads tracking, please contact your account manager.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-600 font-semibold text-lg">Error loading Google Ads</div>
        <div className="text-red-500 text-sm mt-2">{error}</div>
      </div>
    );
  }

  if (!data || !data.metrics) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-gray-600">No Google Ads data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Google Ads Performance</h2>
        <p className="text-gray-500 text-sm mt-1">
          Customer ID: {data.customerId}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdMetricCard
          title="Impressions"
          value={data.metrics.impressions.toLocaleString()}
          color="blue"
        />
        <AdMetricCard
          title="Clicks"
          value={data.metrics.clicks.toLocaleString()}
          color="green"
        />
        <AdMetricCard
          title="CTR"
          value={`${data.metrics.ctr.toFixed(2)}%`}
          color="purple"
        />
        <AdMetricCard
          title="Total Cost"
          value={`$${data.metrics.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          color="orange"
        />
        <AdMetricCard
          title="Conversions"
          value={data.metrics.conversions.toFixed(1)}
          color="indigo"
        />
        <AdMetricCard
          title="Conversion Value"
          value={`$${data.metrics.conversionsValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          color="teal"
        />
        <AdMetricCard
          title="Avg CPC"
          value={`$${data.metrics.averageCpc.toFixed(2)}`}
          color="red"
        />
        <AdMetricCard
          title="Cost/Conv"
          value={data.metrics.conversions > 0 ? `$${(data.metrics.cost / data.metrics.conversions).toFixed(2)}` : '$0.00'}
          color="pink"
        />
      </div>

      {/* Campaign Performance Chart */}
      {data.campaigns && data.campaigns.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-xl font-bold mb-4">Top Campaigns by Impressions</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.campaigns} margin={{ bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={120}
                interval={0}
                tick={{ fontSize: 16 }}
              />
              <YAxis />
              <Tooltip />
              <Legend 
                verticalAlign="bottom" 
                wrapperStyle={{ paddingTop: '20px', bottom: '0px' }}
              />
              <Bar dataKey="impressions" fill="#0088FE" name="Impressions" />
              <Bar dataKey="clicks" fill="#00C49F" name="Clicks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function AdMetricCard({ title, value, color }: { title: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
    indigo: 'text-indigo-600',
    teal: 'text-teal-600',
    pink: 'text-pink-600',
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
      <div className="text-gray-500 text-xs font-medium">{title}</div>
      <div className={`text-2xl font-bold mt-2 ${colorClasses[color]}`}>
        {value}
      </div>
    </div>
  );
}
