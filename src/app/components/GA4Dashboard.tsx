'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface GA4Metrics {
  activeUsers: number;
  sessions: number;
  pageViews: number;
  avgSessionDuration: number;
  bounceRate: string;
  companyId?: string;
}

export function GA4Dashboard() {
  const [metrics, setMetrics] = useState<GA4Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const token = searchParams.get('token');
        const response = await fetch(`/api/ga4/metrics?token=${token}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch metrics');
        }
        
        const data = await response.json();
        setMetrics(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-600 font-semibold">Error loading analytics</div>
        <div className="text-red-500 text-sm mt-1">{error}</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-gray-600">No analytics data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Google Analytics</h2>
        <span className="text-sm text-gray-500">Last 30 Days</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-gray-500 text-sm font-medium">Active Users</div>
          <div className="text-3xl font-bold mt-2 text-blue-600">
            {metrics.activeUsers.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-gray-500 text-sm font-medium">Sessions</div>
          <div className="text-3xl font-bold mt-2 text-green-600">
            {metrics.sessions.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-gray-500 text-sm font-medium">Page Views</div>
          <div className="text-3xl font-bold mt-2 text-purple-600">
            {metrics.pageViews.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-gray-500 text-sm font-medium">Avg Session Duration</div>
          <div className="text-3xl font-bold mt-2 text-orange-600">
            {Math.round(metrics.avgSessionDuration)}s
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="text-gray-500 text-sm font-medium">Bounce Rate</div>
          <div className="text-3xl font-bold mt-2 text-red-600">
            {metrics.bounceRate}%
          </div>
        </div>
      </div>

      {metrics.companyId && (
        <div className="text-xs text-gray-400">
          Company ID: {metrics.companyId}
        </div>
      )}
    </div>
  );
}
