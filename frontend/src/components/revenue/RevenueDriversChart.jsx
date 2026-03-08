import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
    LabelList
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

/**
 * CustomTooltip
 * Renders a formatted tooltip for the drivers bar chart.
 */
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-[#151515] border border-[#2a2a2a] shadow-xl p-3 rounded-lg text-xs min-w-[150px] text-gray-200">
                <p className="font-bold text-white mb-1">{data.name}</p>
                <div className="flex justify-between items-center text-blue-600 font-medium">
                    <span>Contribution:</span>
                    <span>${data.value_usd_mn?.toFixed(1)}M</span>
                </div>
                <div className="flex justify-between items-center text-gray-300 mt-0.5">
                    <span>Share:</span>
                    <span className="font-semibold text-white">{data.share_pct?.toFixed(1)}%</span>
                </div>
            </div>
        );
    }
    return null;
};

/**
 * RevenueDriversChart
 * 
 * Visualizes the revenue contribution breakdown by channel.
 * Displays as a sorted horizontal bar chart for maximum readability.
 */
const RevenueDriversChart = ({ driverData, loading }) => {

    // Prepare and sort driver data
    const sortedData = useMemo(() => {
        if (!driverData?.drivers) return [];

        return [...driverData.drivers]
            .sort((a, b) => b.value_usd_mn - a.value_usd_mn)
            .map(item => ({
                ...item,
                // Shorten long names if necessary
                displayName: item.name.length > 20 ? item.name.substring(0, 17) + '...' : item.name
            }));
    }, [driverData]);

    // Thematic colors for different channels
    const COLORS = {
        'Hotels': '#2563eb',          // Blue
        'Travel Agencies': '#10b981', // Emerald
        'Shops': '#f59e0b',          // Amber
        'Banks': '#8b5cf6',          // Violet
        'Gem Corp': '#ec4899'        // Pink
    };

    if (loading) {
        return (
            <Card className="shadow-sm !bg-[#151515] !border-[#2a2a2a] h-[380px]">
                <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                <CardContent className="h-full flex flex-col justify-center space-y-4 px-6">
                    {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} className="h-8 w-full" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    const hasData = sortedData.length > 0;

    return (
        <Card className="shadow-sm !bg-[#151515] !border-[#2a2a2a] hover:shadow-md transition-all duration-300 h-full">
            <CardHeader className="pb-0">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-white">
                        Revenue Contributions
                    </CardTitle>
                    {driverData?.year && (
                        <span className="text-[10px] bg-[#1b1b1b] text-gray-300 border border-[#2a2a2a] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            {driverData.year} Drivers
                        </span>
                    )}
                </div>
            </CardHeader>

            <CardContent className="pt-6">
                <div className="h-[280px] w-full">
                    {!hasData ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                            <div className="text-3xl text-gray-400">Chart</div>
                            <p className="text-sm text-gray-300 font-medium">Revenue driver breakdown is available for forecast scenarios only.</p>
                            <p className="text-[10px] text-gray-500">Historical channel-level data is not processed.</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={sortedData}
                                layout="vertical"
                                margin={{ top: 5, right: 60, left: 40, bottom: 5 }}
                                barSize={32}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#2a2a2a" />

                                <XAxis
                                    type="number"
                                    hide
                                    domain={[0, 'dataMax + 100']}
                                />

                                <YAxis
                                    type="category"
                                    dataKey="displayName"
                                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={100}
                                />

                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1b1b1b' }} />

                                <Bar
                                    dataKey="value_usd_mn"
                                    radius={[0, 4, 4, 0]}
                                    animationDuration={1000}
                                >
                                    {sortedData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#94a3b8'} />
                                    ))}
                                    <LabelList
                                        dataKey="share_pct"
                                        position="right"
                                        formatter={(val) => `${val.toFixed(1)}%`}
                                        style={{ fontSize: '11px', fill: '#94a3b8', fontWeight: 600 }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default RevenueDriversChart;

