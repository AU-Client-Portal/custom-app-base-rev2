'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

const DATE_RANGES = [
  { label: 'Last 15 Minutes', value: { start: '15minutesAgo', end: 'today' } },
  { label: 'Last Hour', value: { start: '1hoursAgo', end: 'today' } },
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
  const [selectedRange, setSelectedRange] = useState(5); // Default to Last 30 Days
  const searchParams = useSearchParams();

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      setError(null);
      
      try {
        con
