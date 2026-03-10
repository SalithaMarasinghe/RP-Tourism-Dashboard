import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ReferenceLine,
    Scatter,
    Label,
    Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

/**
 * CustomTooltip
 * Renders a rich formatted tooltip for the dual-axis chart.
 */
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const isForecast = data.is_forecast;

        return (
            <div className="bg-[#151515] border border-[#2a2a2a] shadow-xl p-4 rounded-lg text-xs min-w-[200px] z-50 text-gray-200">
                <div className="flex justify-between items-center border-b border-[#2a2a2a] pb-2 mb-2">
                    <span className="font-bold text-white">{new Date(data.ds).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    {isForecast ? (
                        <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter">Forecast</span>
                    ) : (
                        <span className="bg-[#1b1b1b] text-gray-300 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter border border-[#2a2a2a]">Historical</span>
                    )}
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-[#10b981] mr-2" />
                            <span className="text-gray-300">Arrivals:</span>
                        </div>
                        <span className="font-semibold text-white">{new Intl.NumberFormat().format(data.arrivals)}</span>
                    </div>

                    {data.arr_f_api && (
                        <div className="flex justify-between items-center">
                            <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full bg-[#06b6d4] mr-2" />
                                <span className="text-gray-300">Arrivals (Forecast API):</span>
                            </div>
                            <span className="font-semibold text-white">{new Intl.NumberFormat().format(data.arr_f_api)}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center text-blue-600 font-medium">
                        <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-[#2563eb] mr-2" />
                            <span className="text-gray-300">Revenue:</span>
                        </div>
                        <span>${data.revenue_usd_mn?.toFixed(1) || 0}M</span>
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-[#f59e0b] mr-2" />
                            <span className="text-gray-300">Avg Spend:</span>
                        </div>
                        <span className="font-semibold text-white">${data.avg_rpt_usd?.toFixed(0) || 0}</span>
                    </div>

                    <div className="flex justify-between items-center pt-1 mt-1 border-t border-[#2a2a2a]">
                        <span className="text-gray-300 ml-4">Spend/Day:</span>
                        <span className="font-semibold text-white">${data.avg_rptd_usd?.toFixed(2) || 0}</span>
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-[#8b5cf6] mr-2" />
                            <span className="text-gray-300">Length of Stay:</span>
                        </div>
                        <span className="font-semibold text-white">{data.avg_los?.toFixed(1) || 0} Days</span>
                    </div>
                </div>

                {data.hasAnomaly && (
                    <div className="mt-2 pt-2 border-t border-red-900 text-red-400 italic text-[10px] flex items-start">
                        <span className="mr-1">!</span>
                        <span>{data.anomalyInfo?.anomaly_reason || data.anomalyInfo?.label}</span>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

/**
 * RevenueDualAxisChart
 * 
 * A dual-axis time-series visualization for tourism revenue intelligence.
 * - Left Axis: Revenue (USD Mn) & Avg Spend per Tourist (USD)
 * - Right Axis: Arrivals & Avg Length of Stay (Days)
 * - Styling: Solid (Historical) vs Dashed (Forecast)
 * 
 * Now includes:
 * - Forecast arrivals sourced from dedicated forecast API (2026-2030)
 * - Comparison view of forecast arrivals vs. revenue forecasts
 */
const RevenueDualAxisChart = ({ monthlyData, anomalies, events, arrivalsTimeline, loading }) => {

    const processedData = useMemo(() => {
        if (!monthlyData) return [];

        const anomaliesMap = new Map();
        anomalies?.forEach(a => anomaliesMap.set(a.ds, a));
        events?.forEach(e => anomaliesMap.set(e.ds, e));

        // Build a map of forecast arrivals from the dedicated API
        // Format: "YYYY-MM" -> arrivals count
        const forecastArrivalsMap = new Map();
        if (arrivalsTimeline && Array.isArray(arrivalsTimeline)) {
            arrivalsTimeline.forEach(row => {
                if (row.type === 'predicted' && row.date && row.arrivals) {
                    forecastArrivalsMap.set(row.date, row.arrivals);
                }
            });
        }

        return monthlyData.map((row, idx) => {
            const isFC = row.is_forecast;
            const nextIsFC = monthlyData[idx + 1]?.is_forecast;
            const isPivot = !isFC && nextIsFC;

            // Extract the forecast arrivals from the dedicated API if available
            const dateKey = row.ds ? row.ds.substring(0, 7) : null; // YYYY-MM format
            const forecastArrivalsFromApi = dateKey ? forecastArrivalsMap.get(dateKey) : null;

            return {
                ...row,
                // Historical Series (populated if current or pivot)
                rev_h: !isFC || isPivot ? row.revenue_usd_mn : null,
                arr_h: !isFC || isPivot ? row.arrivals : null,
                rpt_h: !isFC || isPivot ? row.avg_rpt_usd : null,
                los_h: !isFC || isPivot ? row.avg_los : null,

                // Forecast Series (populated if forecast or pivot)
                rev_f: isFC || isPivot ? row.revenue_usd_mn : null,
                arr_f: isFC || isPivot ? row.arrivals : null,
                rpt_f: isFC || isPivot ? row.avg_rpt_usd : null,
                los_f: isFC || isPivot ? row.avg_los : null,

                // Forecast Arrivals from dedicated API (distinct series for 2026-2030)
                arr_f_api: isFC ? forecastArrivalsFromApi : null,

                hasAnomaly: anomaliesMap.has(row.ds),
                anomalyInfo: anomaliesMap.get(row.ds),
                anomalyPoint: (anomaliesMap.has(row.ds) && anomaliesMap.get(row.ds).type !== 'event') ? row.revenue_usd_mn : null
            };
        });
    }, [monthlyData, anomalies, events, arrivalsTimeline]);

    // Consolidate noisy event-series into discrete markers so the chart remains readable.
    const eventMarkers = useMemo(() => {
        if (!events?.length) return [];

        const byLabel = new Map();

        events.forEach((event) => {
            if (!event?.ds) return;

            const label = (event.label || 'Event').trim();
            const eventDate = new Date(event.ds);
            if (Number.isNaN(eventDate.getTime())) return;

            const existing = byLabel.get(label);
            if (!existing || eventDate < existing.eventDate) {
                byLabel.set(label, { ...event, label, eventDate });
            }
        });

        const markers = Array.from(byLabel.values()).sort((a, b) => a.eventDate - b.eventDate);

        // Hard cap marker count to avoid dense stripe artifacts on long timelines.
        const maxMarkers = 8;
        if (markers.length <= maxMarkers) return markers;

        const stride = Math.ceil(markers.length / maxMarkers);
        return markers.filter((_, index) => index % stride === 0).slice(0, maxMarkers);
    }, [events]);

    const formatEventLabel = (label) => {
        if (!label) return 'Event';
        return label.length > 24 ? `${label.slice(0, 24)}...` : label;
    };

    if (loading) {
        return (
            <Card className="shadow-sm !bg-[#151515] !border-[#2a2a2a] h-[480px]">
                <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                <CardContent className="flex items-center justify-center h-full">
                    <Skeleton className="h-[350px] w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm !bg-[#151515] !border-[#2a2a2a] hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-white">
                        Revenue & Volume Performance
                    </CardTitle>
                    <div className="flex items-center space-x-3 text-[10px] uppercase font-bold tracking-widest text-gray-400">
                        <div className="flex items-center space-x-1 border border-[#2a2a2a] px-1.5 py-0.5 rounded bg-[#1b1b1b]">
                            <span className="w-2 h-0.5 bg-gray-400"></span>
                            <span>Hist</span>
                        </div>
                        <div className="flex items-center space-x-1 border border-[#2a2a2a] px-1.5 py-0.5 rounded bg-[#1b1b1b]">
                            <span className="w-2 h-0.5 border-t border-dashed border-gray-400"></span>
                            <span>Forecast</span>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={processedData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2a2a" />

                            <XAxis
                                dataKey="ds"
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={40}
                                tickFormatter={(str) => {
                                    const date = new Date(str);
                                    return date.getFullYear();
                                }}
                            />

                            {/* Left Axis: Monetary Value */}
                            <YAxis
                                yAxisId="left"
                                orientation="left"
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(val) => `$${val >= 1000 ? (val / 1000).toFixed(1) + 'K' : val}`}
                            />

                            {/* Right Axis: Volume & Duration */}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}
                            />

                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1b1b1b' }} />

                            <Legend
                                verticalAlign="top"
                                align="right"
                                height={40}
                                iconType="circle"
                                wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }}
                            />

                            {/* Event Annotations */}
                            {eventMarkers.map((event, index) => (
                                <ReferenceLine
                                    key={`evt-${event.label}-${event.ds}-${index}`}
                                    x={event.ds}
                                    yAxisId="left"
                                    stroke="#475569"
                                    strokeOpacity={0.65}
                                    strokeDasharray="4 4"
                                >
                                    {eventMarkers.length <= 5 && (
                                        <Label
                                            value={formatEventLabel(event.label)}
                                            position="top"
                                            fill="#94a3b8"
                                            fontSize={8}
                                            fontWeight={600}
                                            offset={8}
                                        />
                                    )}
                                </ReferenceLine>
                            ))}

                            {/* Primary: Revenue (Blue, Left) */}
                            <Line yAxisId="left" type="monotone" dataKey="rev_h" name="Revenue" stroke="#2563eb" strokeWidth={3} dot={false} connectNulls={false} activeDot={{ r: 4 }} />
                            <Line yAxisId="left" type="monotone" dataKey="rev_f" name="Revenue (F)" stroke="#2563eb" strokeWidth={3} strokeDasharray="5 5" dot={false} connectNulls={false} legendType="none" />

                            {/* Primary: Arrivals (Emerald, Right) */}
                            <Line yAxisId="right" type="monotone" dataKey="arr_h" name="Arrivals" stroke="#10b981" strokeWidth={3} dot={false} connectNulls={false} strokeOpacity={0.8} />
                            <Line yAxisId="right" type="monotone" dataKey="arr_f" name="Arrivals (F)" stroke="#10b981" strokeWidth={3} strokeDasharray="5 5" dot={false} connectNulls={false} strokeOpacity={0.8} legendType="none" />
                            
                            {/* Forecast Arrivals from Dedicated API (2026-2030) - Cyan, Right Axis */}
                            <Line yAxisId="right" type="monotone" dataKey="arr_f_api" name="Arrivals Forecast (API)" stroke="#06b6d4" strokeWidth={2.5} strokeDasharray="3 3" dot={false} connectNulls={false} strokeOpacity={0.9} />

                            {/* Secondary: Per-Tourist Spend (Amber, Left) */}
                            <Line yAxisId="left" type="monotone" dataKey="rpt_h" name="Avg Spend" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeOpacity={0.4} />
                            <Line yAxisId="left" type="monotone" dataKey="rpt_f" name="Avg Spend (F)" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 3" dot={false} strokeOpacity={0.4} legendType="none" />

                            {/* Secondary: Duration of Stay (Purple, Right) */}
                            <Line yAxisId="right" type="monotone" dataKey="los_h" name="Avg Stay" stroke="#8b5cf6" strokeWidth={1.5} dot={false} strokeOpacity={0.4} />
                            <Line yAxisId="right" type="monotone" dataKey="los_f" name="Avg Stay (F)" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="3 3" dot={false} strokeOpacity={0.4} legendType="none" />

                            {/* Anomalies Layer */}
                            <Scatter yAxisId="left" dataKey="anomalyPoint" fill="#ef4444" name="Anomalies">
                                {processedData.map((entry, index) => (
                                    <Cell key={`anom-${index}`} r={entry.anomalyPoint ? 4 : 0} fill="#ef4444" strokeWidth={2} stroke="white" />
                                ))}
                            </Scatter>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

export default RevenueDualAxisChart;

