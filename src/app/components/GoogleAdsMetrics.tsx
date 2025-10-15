'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface GoogleAdsData {
  companyId: string;
  companyName: string;
  customerId: string;
  dateRange: { startDate: string; endDate: string };
  metrics: {
    impressions: number;
    clicks: number;
    ctr: number;
    cost: number;
    conversions: number;
    conversionsValue: number;
    averageCpc: number;
  };
  campaigns: Array<{
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

interface Props {
  dateRange: { start: string; end: string };
}

export function GoogleAdsMetrics({ dateRange }: Props) {
  const [data, setData] = useState<GoogleAdsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      setError(null);
      
      try {
        const token = searchParams.get('token');
        const response = await fetch(
          `/api/google-ads/metrics?token=${token}&startDate=${dateRange.start}&endDate=${dateRange.end}`
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch Google Ads metrics');
        }
        
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [searchParams, dateRange]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="text-gray-500">Loading Google Ads data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-200">
        <div className="text-red-600 font-semibold">Error loading Google Ads</div>
        <div className="text-red-500 text-sm mt-1">{error}</div>
      </div>
    );
  }

  if (!data || !data.metrics) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <div className="text-gray-600">No Google Ads data available</div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Google Ads Performance</h2>
        <p className="text-gray-500 text-sm mt-1">Customer ID: {data.customerId}</p>
      </div>

      {/* Main Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Impressions"
          value={data.metrics.impressions.toLocaleString()}
          color="blue"
        />
        <MetricCard
          title="Clicks"
          value={data.metrics.clicks.toLocaleString()}
          color="green"
        />
        <MetricCard
          title="CTR"
          value={`${data.metrics.ctr.toFixed(2)}%`}
          color="purple"
        />
        <MetricCard
          title="Total Cost"
          value={formatCurrency(data.metrics.cost)}
          color="orange"
        />
        <MetricCard
          title="Conversions"
          value={data.metrics.conversions.toFixed(1)}
          color="indigo"
        />
        <MetricCard
          title="Conversion Value"
          value={formatCurrency(data.metrics.conversionsValue)}
          color="teal"
        />
        <MetricCard
          title="Avg CPC"
          value={formatCurrency(data.metrics.averageCpc)}
          color="red"
        />
        <MetricCard
          title="Cost/Conv"
          value={data.metrics.conversions > 0 
            ? formatCurrency(data.metrics.cost / data.metrics.conversions)
            : '$0.00'}
          color="pink"
        />
      </div>

      {/* Campaign Performance Chart */}
      {data.campaigns.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-xl font-bold mb-4">Top Campaigns by Impressions</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.campaigns}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="impressions" fill="#0088FE" name="Impressions" />
              <Bar dataKey="clicks" fill="#00C49F" name="Clicks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Campaigns Table */}
      {data.campaigns.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-xl font-bold mb-4">Campaign Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Campaign</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Impressions</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Clicks</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">CTR</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Cost</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Conv.</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Conv. Value</th>
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((campaign, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{campaign.name}</div>
                      <div className="text-xs text-gray-500">{campaign.status}</div>
                    </td>
                    <td className="py-3 px-4 text-right">{campaign.impressions.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{campaign.clicks.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{campaign.ctr.toFixed(2)}%</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(campaign.cost)}</td>
                    <td className="py-3 px-4 text-right">{campaign.conversions.toFixed(1)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(campaign.conversionsValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, color }: { title: string; value: string; color: string }) {
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
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <div className="text-gray-500 text-sm font-medium">{title}</div>
      <div className={`text-3xl font-bold mt-2 ${colorClasses[color]}`}>
        {value}
      </div>
    </div>
  );
}
