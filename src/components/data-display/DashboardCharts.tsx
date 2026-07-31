"use client";

import dynamic from 'next/dynamic';

export const DashboardCharts = dynamic(
    () => import('@/components/data-display/DashboardChartsClient').then((mod) => mod.DashboardChartsClient),
    {
        ssr: false,
        loading: () => (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 mb-6">
                <div className="rounded-xl bg-slate-100 dark:bg-slate-800 h-[380px] animate-pulse border border-slate-200 dark:border-slate-700" />
                <div className="rounded-xl bg-slate-100 dark:bg-slate-800 h-[380px] animate-pulse border border-slate-200 dark:border-slate-700" />
            </div>
        ),
    }
);