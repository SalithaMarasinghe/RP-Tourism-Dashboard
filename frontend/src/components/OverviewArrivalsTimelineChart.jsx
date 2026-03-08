import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

const numberFormatter = new Intl.NumberFormat('en-US');

const parseMonth = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) return null;
    const [yearRaw, monthRaw] = value.split('-');
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
    return { year, month };
};

const formatMonthLabel = (yyyyMm) => {
    const parsed = parseMonth(yyyyMm);
    if (!parsed) return yyyyMm;
    const date = new Date(parsed.year, parsed.month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const formatTick = (yyyyMm) => {
    const parsed = parseMonth(yyyyMm);
    if (!parsed) return '';
    return parsed.month === 1 ? String(parsed.year) : '';
};

function TimelineTooltip({ active, payload, label }) {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0]?.payload;
    if (!row) return null;

    return (
        <div className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-md">
            <p className="text-xs text-gray-500">{formatMonthLabel(label)}</p>
            <p className="text-sm font-semibold text-gray-900">
                Arrivals: {numberFormatter.format(row.arrivals)}
            </p>
        </div>
    );
}

export default function OverviewArrivalsTimelineChart({ data, isLoading, error }) {
    const chartData = useMemo(() => {
        if (!Array.isArray(data)) return [];

        return data
            .map((row) => {
                const date = typeof row?.date === 'string' ? row.date.trim() : '';
                const parsed = parseMonth(date);
                const arrivalsNum = Number(row?.arrivals);
                const year = parsed?.year;

                if (!parsed || !Number.isFinite(arrivalsNum) || arrivalsNum < 0) return null;
                if (year < 2010 || year > 2025) return null;

                return {
                    date,
                    year: parsed.year,
                    month: parsed.month,
                    arrivals: Math.round(arrivalsNum),
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [data]);

    if (isLoading) {
        return (
            <div className="h-[280px] w-full rounded-lg bg-gray-50 flex items-center justify-center text-sm text-gray-500">
                Loading arrivals timeline...
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-[280px] w-full rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-sm text-red-700 px-4 text-center">
                {error}
            </div>
        );
    }

    if (chartData.length === 0) {
        return (
            <div className="h-[280px] w-full rounded-lg bg-gray-50 flex items-center justify-center text-sm text-gray-500">
                No arrivals timeline data available.
            </div>
        );
    }

    return (
        <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        dataKey="date"
                        tickFormatter={formatTick}
                        minTickGap={24}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                    />
                    <YAxis
                        tickFormatter={(value) => `${Math.round(value / 1000)}K`}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                    />
                    <Tooltip content={<TimelineTooltip />} />
                    <Legend
                        verticalAlign="top"
                        align="right"
                        wrapperStyle={{ fontSize: '12px' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="arrivals"
                        name="Arrivals (2010-2025)"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={false}
                        connectNulls
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
