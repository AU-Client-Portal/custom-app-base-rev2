'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { GoogleAdsMetrics } from './GoogleAdsMetrics';
import { MetricoolMetrics } from './MetricoolMetrics';

interface GA4Data {
  companyId: string;
  companyName: string;
  dateRange: { startDate: string; endDate: string };
  metrics: {
    activeUsers: number;
    sessions: number;
    pageViews: number;
    avgSessionDuration: number;
    bounceRate: string;
    newUsers: number;
    engagementRate: string;
  };
  timeSeries: Array<{
    date: string;
    activeUsers: number;
    sessions: number;
    pageViews: number;
  }>;
  topPages: Array<{
    title: string;
    path: string;
    views: number;
  }>;
  trafficSources: Array<{
    source: string;
    sessions: number;
  }>;
  devices: Array<{
    device: string;
    users: number;
  }>;
  countries: Array<{
    country: string;
    users: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff6b9d', '#c084fc', '#22d3ee', '#fb923c', '#a78bfa'];

const DATE_RANGES = [
  { label: 'Today', value: { start: 'today', end: 'today' } },
  { label: 'Yesterday', value: { start: 'yesterday', end: 'yesterday' } },
  { label: 'Last 7 Days', value: { start: '7daysAgo', end: 'today' } },
  { label: 'Last 30 Days', value: { start: '30daysAgo', end: 'today' } },
  { label: 'Last 90 Days', value: { start: '90daysAgo', end: 'today' } },
  { label: 'Last 6 Months', value: { start: '180daysAgo', end: 'today' } },
  { label: 'Last Year', value: { start: '365daysAgo', end: 'today' } },
];

export function GA4Dashboard() {
  const [data, setData] = useState<GA4Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState(3); // Default to Last 30 Days
  const searchParams = useSearchParams();

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      setError(null);
      
      try {
        const token = searchParams.get('token');
        const range = DATE_RANGES[selectedRange].value;
        const response = await fetch(
          `/api/ga4/metrics?token=${token}&startDate=${range.start}&endDate=${range.end}`
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch metrics');
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
  }, [searchParams, selectedRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500 text-lg">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-600 font-semibold text-lg">Error loading analytics</div>
        <div className="text-red-500 text-sm mt-2">{error}</div>
      </div>
    );
  }

  if (!data || !data.metrics) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-gray-600">No analytics data available</div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${month}/${day}`;
  };

  const timeSeriesFormatted = data.timeSeries.map(item => ({
    ...item,
    date: formatDate(item.date),
  }));

  return (
    <div className="space-y-6">
      {/* Header with Company Name and Date Selector */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold">{data.companyName}</h2>
          <p className="text-gray-500 text-sm mt-1">Google Analytics Dashboard</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Date Range:</label>
          <select 
            value={selectedRange}
            onChange={(e) => setSelectedRange(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DATE_RANGES.map((range, index) => (
              <option key={index} value={index}>{range.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Users"
          value={data.metrics.activeUsers.toLocaleString()}
          color="blue"
        />
        <MetricCard
          title="Sessions"
          value={data.metrics.sessions.toLocaleString()}
          color="green"
        />
        <MetricCard
          title="Page Views"
          value={data.metrics.pageViews.toLocaleString()}
          color="purple"
        />
        <MetricCard
          title="New Users"
          value={data.metrics.newUsers.toLocaleString()}
          color="indigo"
        />
        <MetricCard
          title="Avg Session Duration"
          value={`${Math.round(data.metrics.avgSessionDuration)}s`}
          color="orange"
        />
        <MetricCard
          title="Bounce Rate"
          value={`${data.metrics.bounceRate}%`}
          color="red"
        />
        <MetricCard
          title="Engagement Rate"
          value={`${data.metrics.engagementRate}%`}
          color="teal"
        />
      </div>

      {/* Traffic Over Time Chart */}
      {timeSeriesFormatted.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-xl font-bold mb-4">Traffic Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesFormatted}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="activeUsers" stroke="#0088FE" name="Active Users" />
              <Line type="monotone" dataKey="sessions" stroke="#00C49F" name="Sessions" />
              <Line type="monotone" dataKey="pageViews" stroke="#FFBB28" name="Page Views" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Traffic Sources and Devices Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        {data.trafficSources.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-xl font-bold mb-4">Traffic Sources</h3>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={data.trafficSources}
                  dataKey="sessions"
                  nameKey="source"
                  cx="40%"
                  cy="50%"
                  outerRadius={110}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, sessions }) => {
                    // Only show label if slice is bigger than 8%
                    if (percent <= 0.08) {
                      return null;
                    }
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);

                    return (
                      <text 
                        x={x} 
                        y={y} 
                        fill="white" 
                        textAnchor="middle" 
                        dominantBaseline="central"
                        style={{ fontWeight: 'bold', fontSize: '16px' }}
                      >
                        {sessions}
                      </text>
                    );
                  }}
                  labelLine={false}
                >
                  {data.trafficSources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend 
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  formatter={(value, entry: any) => {
                    return `${value}: ${entry.payload.sessions}`;
                  }}
                  wrapperStyle={{ paddingLeft: '20px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Devices */}
        {data.devices.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-xl font-bold mb-4">Devices</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.devices}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="device" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#8884D8" name="Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Google Ads Section - Full Width */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-lg shadow-lg border-2 border-blue-200">
        <GoogleAdsMetrics dateRange={{ start: DATE_RANGES[selectedRange].value.start, end: DATE_RANGES[selectedRange].value.end }} />
      </div>

      {/* Metricool Social Media Section - Full Width */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-8 rounded-lg shadow-lg border-2 border-purple-200">
        <MetricoolMetrics dateRange={{ start: DATE_RANGES[selectedRange].value.start, end: DATE_RANGES[selectedRange].value.end }} />
      </div>

      {/* Top Pages Table */}
      {data.topPages.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-xl font-bold mb-4">These Are The Top Pages</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Page Title</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Path</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Views</th>
                </tr>
              </thead>
              <tbody>
                {data.topPages.map((page, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{page.title}</td>
                    <td className="py-3 px-4 text-blue-600 font-mono text-sm">{page.path}</td>
                    <td className="py-3 px-4 text-right font-semibold">{page.views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Countries */}
      {data.countries.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-xl font-bold mb-4">The Top Countries</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {data.countries.map((country, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="text-gray-600 text-sm">{country.country}</div>
                <div className="text-2xl font-bold mt-1">{country.users.toLocaleString()}</div>
              </div>
            ))}
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
