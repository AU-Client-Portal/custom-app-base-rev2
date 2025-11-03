'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MetricoolData {
  companyId: string;
  companyName: string;
  blogId: string;
  dateRange: { startDate: string; endDate: string };
  profile: any;
  stats: any;
  posts: any[];
}

interface MetricoolMetricsProps {
  dateRange: {
    start: string;
    end: string;
  };
}

export function MetricoolMetrics({ dateRange }: MetricoolMetricsProps) {
  const [data, setData] = useState<MetricoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    async function fetchMetricool() {
      setLoading(true);
      setError(null);
      
      try {
        const token = searchParams.get('token');
        const response = await fetch(
          `/api/metricool/metrics?token=${token}&startDate=${dateRange.start}&endDate=${dateRange.end}`
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch Metricool data');
        }
        
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMetricool();
  }, [searchParams, dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 text-lg">Loading Metricool data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-600 font-semibold text-lg">Error loading Metricool</div>
        <div className="text-red-500 text-sm mt-2">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-gray-600">No Metricool data available</div>
      </div>
    );
  }

  // Parse the data based on what Metricool returns
  // This will need adjustment based on actual API response
  const stats = data.stats || {};
  const posts = data.posts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Social Media Performance</h2>
        <p className="text-gray-500 text-sm mt-1">
          Powered by Metricool • Blog ID: {data.blogId}
        </p>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SocialMetricCard
          title="Total Followers"
          value={stats.totalFollowers?.toLocaleString() || '0'}
          color="blue"
        />
        <SocialMetricCard
          title="Posts"
          value={stats.totalPosts?.toLocaleString() || '0'}
          color="green"
        />
        <SocialMetricCard
          title="Engagement Rate"
          value={`${(stats.engagementRate || 0).toFixed(2)}%`}
          color="purple"
        />
        <SocialMetricCard
          title="Total Reach"
          value={stats.totalReach?.toLocaleString() || '0'}
          color="orange"
        />
      </div>

      {/* Debug: Show raw data temporarily */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-sm text-gray-700 mb-2">API Response Preview:</h3>
        <pre className="text-xs overflow-auto max-h-96 bg-white p-3 rounded border">
          {JSON.stringify(data, null, 2)}
        </pre>
        <p className="text-xs text-gray-500 mt-2">
          This preview helps us see the actual data structure. We'll remove this and add proper visualizations once we know what data Metricool returns.
        </p>
      </div>

      {/* Recent Posts (if available) */}
      {posts && posts.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-xl font-bold mb-4">Recent Posts</h3>
          <div className="space-y-4">
            {posts.slice(0, 5).map((post: any, index: number) => (
              <div key={index} className="border-b border-gray-100 pb-3 last:border-0">
                <div className="text-sm font-medium">{post.text || post.content || 'Post content'}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {post.date} • {post.network || 'Social Network'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SocialMetricCard({ title, value, color }: { title: string; value: string; color: string }) {
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
