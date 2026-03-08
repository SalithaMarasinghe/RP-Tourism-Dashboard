import React, { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';

const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const normalizeRowsFromPayload = (payload) => {
    const ageGroups = payload?.age_groups || payload?.age_bands || payload?.labels || [];
    const maleValues = payload?.male_values || payload?.male || payload?.male_counts || [];
    const femaleValues = payload?.female_values || payload?.female || payload?.female_counts || [];

    if (!Array.isArray(ageGroups) || ageGroups.length === 0) return [];

    return ageGroups.map((ageBand, idx) => {
        const male = Math.max(0, toNumber(maleValues[idx]) ?? 0);
        const female = Math.max(0, toNumber(femaleValues[idx]) ?? 0);
        return {
            ageBand: String(ageBand),
            male,
            female
        };
    });
};

const normalizeRowsFromArray = (rows) => {
    if (!Array.isArray(rows)) return [];

    return rows
        .map((row) => {
            if (!row) return null;

            const ageBand = row.ageBand || row.age_band || row.label || row.group;
            if (!ageBand) return null;

            const maleRaw = row.male ?? row.male_value ?? row.male_count ?? row.male_left ?? row.maleMirror;
            const femaleRaw = row.female ?? row.female_value ?? row.female_count ?? row.female_right;

            const male = Math.abs(toNumber(maleRaw) ?? 0);
            const female = Math.max(0, toNumber(femaleRaw) ?? 0);

            return {
                ageBand: String(ageBand),
                male,
                female
            };
        })
        .filter(Boolean);
};

const normalizeInput = (input) => {
    const payload = Array.isArray(input) ? null : (input?.pyramids?.[0] || input);

    const reportYear = payload?.report_year ?? payload?.year ?? null;
    const estimated = Boolean(
        payload?.is_estimated ??
        payload?.estimated ??
        payload?.pyramid_estimated
    );

    const estimationNote =
        payload?.estimation_note ||
        payload?.note ||
        (estimated ? 'Estimated from aggregate demographic ratios.' : '');

    let rows = [];

    if (payload) {
        rows = normalizeRowsFromPayload(payload);
    } else {
        rows = normalizeRowsFromArray(input);
    }

    if (!rows.length && Array.isArray(input)) {
        rows = normalizeRowsFromArray(input);
    }

    const chartRows = rows.map((row) => ({
        ...row,
        maleLeft: row.male * -1,
        femaleRight: row.female
    }));

    const maxValue = chartRows.reduce((acc, row) => {
        const candidate = Math.max(Math.abs(row.maleLeft), Math.abs(row.femaleRight));
        return candidate > acc ? candidate : acc;
    }, 0);

    return {
        reportYear,
        estimated,
        estimationNote,
        rows: chartRows,
        axisMax: maxValue > 0 ? Math.ceil(maxValue * 1.1) : 10
    };
};

const formatAxisTick = (value) => `${Math.abs(Number(value) || 0)}%`;

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const row = payload[0]?.payload;
    if (!row) return null;

    return (
        <div className="bg-white/95 backdrop-blur-sm border border-gray-100 shadow-xl p-3 rounded-lg text-xs min-w-[170px]">
            <p className="font-semibold text-gray-800 mb-2">{label}</p>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />
                        <span className="text-gray-600">Male</span>
                    </div>
                    <span className="font-medium text-gray-900">{formatAxisTick(row.maleLeft)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-pink-500" />
                        <span className="text-gray-600">Female</span>
                    </div>
                    <span className="font-medium text-gray-900">{formatAxisTick(row.femaleRight)}</span>
                </div>
            </div>
        </div>
    );
};

const DemographicPopulationPyramid = ({ data, loading }) => {
    const { reportYear, estimated, estimationNote, rows, axisMax } = useMemo(
        () => normalizeInput(data),
        [data]
    );

    if (loading) {
        return (
            <Card className="shadow-sm border-gray-100 h-[480px]">
                <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[360px] w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm border-gray-100 hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-lg font-bold text-gray-800">
                        Population Pyramid
                    </CardTitle>
                    {reportYear && (
                        <Badge variant="outline" className="text-[10px] px-2 py-0 h-5">
                            {reportYear}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {estimated && (
                    <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        {estimationNote || 'Estimated from aggregate demographic ratios.'}
                    </div>
                )}

                <div className="h-[360px] w-full">
                    {rows.length === 0 ? (
                        <div className="h-full w-full rounded-lg bg-gray-50 flex items-center justify-center text-sm text-gray-500">
                            No population pyramid data available.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={rows}
                                layout="vertical"
                                margin={{ top: 10, right: 16, left: 16, bottom: 8 }}
                                barCategoryGap={8}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                                <XAxis
                                    type="number"
                                    domain={[-axisMax, axisMax]}
                                    tickFormatter={formatAxisTick}
                                    tick={{ fontSize: 11, fill: '#6b7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="ageBand"
                                    width={78}
                                    tick={{ fontSize: 11, fill: '#6b7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="top"
                                    align="right"
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                                />
                                <ReferenceLine x={0} stroke="#94a3b8" />
                                <Bar dataKey="maleLeft" name="Male" fill="#2563eb" radius={[3, 0, 0, 3]} />
                                <Bar dataKey="femaleRight" name="Female" fill="#ec4899" radius={[0, 3, 3, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default DemographicPopulationPyramid;

