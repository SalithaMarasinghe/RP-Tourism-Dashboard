import React, { useMemo } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

const AGE_KEYS = [
    'age_below_10',
    'age_10_19',
    'age_20_29',
    'age_30_39',
    'age_40_49',
    'age_50_59',
    'age_60_plus'
];

const AGE_LABELS = {
    age_below_10: 'Below 10',
    age_10_19: '10-19',
    age_20_29: '20-29',
    age_30_39: '30-39',
    age_40_49: '40-49',
    age_50_59: '50-59',
    age_60_plus: '60+'
};

const SERIES_COLORS = {
    age_below_10: '#93c5fd',
    age_10_19: '#60a5fa',
    age_20_29: '#3b82f6',
    age_30_39: '#2563eb',
    age_40_49: '#1d4ed8',
    age_50_59: '#1e40af',
    age_60_plus: '#172554'
};

const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const normalizeInput = (input) => {
    if (!Array.isArray(input)) return [];

    const byYear = new Map();

    input.forEach((row) => {
        if (!row) return;
        const year = toNumber(row.report_year ?? row.year ?? row.date);
        if (!Number.isFinite(year)) return;

        if (!byYear.has(year)) {
            byYear.set(year, { report_year: year });
        }

        const yearRow = byYear.get(year);

        const metricName = row.metric;
        if (typeof metricName === 'string' && AGE_KEYS.includes(metricName)) {
            yearRow[metricName] = toNumber(row.value);
            return;
        }

        AGE_KEYS.forEach((key) => {
            if (row[key] !== undefined) {
                yearRow[key] = toNumber(row[key]);
            }
        });
    });

    return Array.from(byYear.values())
        .sort((a, b) => a.report_year - b.report_year)
        .map((row) => {
            const values = AGE_KEYS.map((key) => row[key]).filter((v) => Number.isFinite(v) && v >= 0);
            const total = values.reduce((sum, value) => sum + value, 0);

            const shouldNormalize = values.some((v) => v > 100) || total > 105;

            const next = { report_year: row.report_year };
            AGE_KEYS.forEach((key) => {
                const raw = Number.isFinite(row[key]) && row[key] >= 0 ? row[key] : 0;
                if (shouldNormalize) {
                    next[key] = total > 0 ? (raw / total) * 100 : 0;
                } else {
                    next[key] = raw;
                }
            });

            return next;
        });
};

const formatPct = (value) => `${Number(value || 0).toFixed(1)}%`;

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const sorted = [...payload].sort((a, b) => (b?.value || 0) - (a?.value || 0));

    return (
        <div className="bg-[#151515] border border-[#2a2a2a] shadow-xl p-3 rounded-lg text-xs min-w-[170px]">
            <p className="font-semibold text-white mb-2">Year: {label}</p>
            <div className="space-y-1">
                {sorted.map((entry) => (
                    <div key={entry.dataKey} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-gray-300">{AGE_LABELS[entry.dataKey] || entry.dataKey}</span>
                        </div>
                        <span className="font-medium text-white">{formatPct(entry.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AgeCohortAreaChart = ({ data, loading }) => {
    const chartData = useMemo(() => normalizeInput(data), [data]);

    const hasData = chartData.length > 0;

    if (loading) {
        return (
            <Card className="shadow-sm !bg-[#151515] !border-[#2a2a2a] h-[420px]">
                <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[320px] w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm !bg-[#151515] !border-[#2a2a2a] hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-white">
                    Age Cohort Evolution (15 Years)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[340px] w-full">
                    {!hasData ? (
                        <div className="h-full w-full rounded-lg bg-[#1b1b1b] border border-[#2a2a2a] flex items-center justify-center text-sm text-gray-400">
                            No age cohort data available.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                                <XAxis
                                    dataKey="report_year"
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tickFormatter={(v) => `${v}%`}
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1b1b1b' }} />
                                <Legend
                                    verticalAlign="top"
                                    align="right"
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: '11px', paddingBottom: '8px', color: '#cbd5e1' }}
                                    formatter={(value) => AGE_LABELS[value] || value}
                                />

                                {AGE_KEYS.map((key) => (
                                    <Area
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        name={AGE_LABELS[key]}
                                        stackId="age-share"
                                        stroke={SERIES_COLORS[key]}
                                        fill={SERIES_COLORS[key]}
                                        fillOpacity={0.85}
                                        connectNulls
                                        isAnimationActive={false}
                                    />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default AgeCohortAreaChart;
