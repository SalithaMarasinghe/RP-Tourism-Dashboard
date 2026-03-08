import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { AlertTriangle, TrendingUp } from 'lucide-react';

const ALERT_LEVEL_ORDER = {
    HIGH: 0,
    MEDIUM: 1,
    WARN: 1,
    WARNING: 1,
    INFO: 2
};

const LEVEL_BADGE_CLASSES = {
    HIGH: 'bg-red-500/20 text-red-300 border-red-700',
    MEDIUM: 'bg-amber-500/20 text-amber-300 border-amber-700',
    WARN: 'bg-amber-500/20 text-amber-300 border-amber-700',
    WARNING: 'bg-amber-500/20 text-amber-300 border-amber-700',
    INFO: 'bg-blue-500/20 text-blue-300 border-blue-700'
};

const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const formatSegmentType = (value) => {
    if (!value) return 'Unknown';
    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (m) => m.toUpperCase());
};

const formatSegmentName = (value) => {
    if (!value) return 'N/A';
    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (m) => m.toUpperCase());
};

const normalizeAlerts = (alerts) => {
    if (!Array.isArray(alerts)) return [];

    return alerts
        .map((item) => {
            const levelRaw = String(item?.alert_level || item?.severity || 'INFO').toUpperCase();
            const level = LEVEL_BADGE_CLASSES[levelRaw] ? levelRaw : 'INFO';

            return {
                segmentType: item?.segment_type || item?.segment?.split(':')?.[0] || 'unknown',
                segmentName: item?.segment_name || item?.segment?.split(':')?.[1] || item?.segment || 'N/A',
                reportYear: item?.report_year ?? null,
                alertLevel: level,
                changeValue: toNumber(item?.change_value ?? item?.growth_pct),
                rationale: item?.rationale || item?.message || 'No rationale provided.'
            };
        })
        .sort((a, b) => {
            const yearDiff = (toNumber(b.reportYear) || 0) - (toNumber(a.reportYear) || 0);
            if (yearDiff !== 0) return yearDiff;
            const levelDiff = (ALERT_LEVEL_ORDER[a.alertLevel] ?? 99) - (ALERT_LEVEL_ORDER[b.alertLevel] ?? 99);
            if (levelDiff !== 0) return levelDiff;
            return String(a.segmentName).localeCompare(String(b.segmentName));
        });
};

const formatChangeValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
};

const RisingSegmentAlerts = ({ alerts, loading }) => {
    const rows = useMemo(() => normalizeAlerts(alerts), [alerts]);

    if (loading) {
        return (
            <Card className="shadow-sm !bg-[#151515] !border-[#2a2a2a]">
                <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-56" />
                </CardHeader>
                <CardContent className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="rounded-lg border border-[#2a2a2a] bg-[#1b1b1b] p-3">
                            <div className="flex items-center justify-between mb-2">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-5 w-16" />
                            </div>
                            <Skeleton className="h-3 w-24 mb-2" />
                            <Skeleton className="h-3 w-full" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm !bg-[#151515] !border-[#2a2a2a] hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-rose-600" />
                    Rising Segment Alerts
                </CardTitle>
            </CardHeader>
            <CardContent>
                {rows.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#2a2a2a] bg-[#1b1b1b] px-4 py-8 text-center">
                        <div className="mx-auto mb-2 h-9 w-9 rounded-full bg-[#151515] border border-[#2a2a2a] flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-200">No rising alerts detected</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Segment movements are currently within expected levels.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rows.map((row, index) => (
                            <div
                                key={`${row.segmentType}-${row.segmentName}-${row.reportYear}-${index}`}
                                className="rounded-lg border border-[#2a2a2a] bg-[#1b1b1b] px-4 py-3"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-100 truncate">
                                            {formatSegmentName(row.segmentName)}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {formatSegmentType(row.segmentType)}
                                            {row.reportYear ? ` - ${row.reportYear}` : ''}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Badge
                                            className={`border text-[10px] uppercase tracking-wide ${LEVEL_BADGE_CLASSES[row.alertLevel]}`}
                                        >
                                            {row.alertLevel}
                                        </Badge>
                                        <span className="text-sm font-semibold text-white">
                                            {formatChangeValue(row.changeValue)}
                                        </span>
                                    </div>
                                </div>

                                <p className="mt-2 text-xs text-gray-300 leading-relaxed">
                                    {row.rationale}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default RisingSegmentAlerts;
