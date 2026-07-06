"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export function DashboardChartsClient({ stats }: { stats: any }) {
  const pieData = [
    { name: 'Green', value: stats.byZone?.green || 0, color: '#10b981' },
    { name: 'Amber', value: stats.byZone?.amber || 0, color: '#f59e0b' },
    { name: 'Red', value: stats.byZone?.red || 0, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const formatDateLocal = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const recentTimestamps = stats.recentTimestamps || [];
  const submissionsMap = new Map<string, number>();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    submissionsMap.set(formatDateLocal(d), 0);
  }

  recentTimestamps.forEach((ts: string | Date) => {
    const localDateStr = formatDateLocal(new Date(ts));
    if (submissionsMap.has(localDateStr)) {
      submissionsMap.set(localDateStr, submissionsMap.get(localDateStr)! + 1);
    }
  });

  const lineData = Array.from(submissionsMap.entries()).map(([date, count]) => ({
    date,
    count
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 mb-6">
      {/* Submissions Over Time */}
      <div className="overflow-hidden rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-6">Submissions (Last 7 Days)</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="5 5" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => {
                if (!val) return '';
                const parts = val.split('-');
                return parts.length === 3 ? `${parts[1]}/${parts[2]}` : val;
              }} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Zone Distribution */}
      <div className="overflow-hidden rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-6">Zone Distribution</h3>
        <div className="h-72 w-full">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#0f172a' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '14px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-500">
              No zone data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
