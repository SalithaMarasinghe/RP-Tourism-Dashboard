import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';

const AGE_ORDER = [
    'age_below_10',
    'age_10_19',
    'age_20_29',
    'age_30_39',
    'age_40_49',
    'age_50_59',
    'age_60_plus'
];

const PURPOSE_ORDER = [
    'purpose_leisure',
    'purpose_business',
    'purpose_vfr',
    'purpose_transit',
    'purpose_other'
];

const SEGMENT_LABELS = {
    age_below_10: 'Below 10',
    age_10_19: '10-19',
    age_20_29: '20-29',
    age_30_39: '30-39',
    age_40_49: '40-49',
    age_50_59: '50-59',
    age_60_plus: '60+',
    purpose_leisure: 'Leisure',
    purpose_business: 'Business',
    purpose_vfr: 'VFR',
    purpose_transit: 'Transit',
    purpose_other: 'Other'
};

const GROUP_TITLES = {
    age: 'Age Cohort Heatmap',
    purpose: 'Visit Purpose Heatmap'
};

const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const humanize = (value) => {
    if (!value) return '';
    if (SEGMENT_LABELS[value]) return SEGMENT_LABELS[value];
    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (m) => m.toUpperCase());
};

const isNumericLike = (value) => /^-?\d+(\.\d+)?$/.test(String(value));

const parseCells = (data) => {
    if (!data) return [];

    if (Array.isArray(data)) {
        return data
            .map((item) => ({
                report_year: item?.report_year ?? item?.column_key ?? item?.year,
                segment: item?.row_key ?? item?.segment ?? item?.rowKey,
                value: item?.value
            }))
            .filter((item) => item.report_year !== undefined && item.segment !== undefined);
    }

    if (Array.isArray(data?.cells)) {
        return data.cells
            .map((item) => ({
                report_year: item?.report_year ?? item?.column_key ?? item?.year,
                segment: item?.row_key ?? item?.segment ?? item?.rowKey,
                value: item?.value
            }))
            .filter((item) => item.report_year !== undefined && item.segment !== undefined);
    }

    if (Array.isArray(data?.matrix)) {
        const output = [];
        data.matrix.forEach((row) => {
            const segment = row?.rowKey ?? row?.row_key ?? row?.segment;
            const values = Array.isArray(row?.values) ? row.values : [];
            values.forEach((cell) => {
                output.push({
                    report_year: cell?.columnKey ?? cell?.column_key ?? cell?.report_year ?? cell?.year,
                    segment,
                    value: cell?.value
                });
            });
        });
        return output.filter((item) => item.report_year !== undefined && item.segment !== undefined);
    }

    return [];
};

const sortSegments = (segments, group) => {
    if (group === 'age') {
        const rank = new Map(AGE_ORDER.map((key, idx) => [key, idx]));
        return [...segments].sort((a, b) => {
            const ra = rank.has(a) ? rank.get(a) : 999;
            const rb = rank.has(b) ? rank.get(b) : 999;
            if (ra !== rb) return ra - rb;
            return String(a).localeCompare(String(b));
        });
    }

    if (group === 'purpose') {
        const rank = new Map(PURPOSE_ORDER.map((key, idx) => [key, idx]));
        return [...segments].sort((a, b) => {
            const ra = rank.has(a) ? rank.get(a) : 999;
            const rb = rank.has(b) ? rank.get(b) : 999;
            if (ra !== rb) return ra - rb;
            return String(a).localeCompare(String(b));
        });
    }

    return [...segments].sort((a, b) => String(a).localeCompare(String(b)));
};

const interpolateHex = (startHex, endHex, t) => {
    const norm = Math.max(0, Math.min(1, t));
    const s = startHex.replace('#', '');
    const e = endHex.replace('#', '');

    const sr = parseInt(s.slice(0, 2), 16);
    const sg = parseInt(s.slice(2, 4), 16);
    const sb = parseInt(s.slice(4, 6), 16);

    const er = parseInt(e.slice(0, 2), 16);
    const eg = parseInt(e.slice(2, 4), 16);
    const eb = parseInt(e.slice(4, 6), 16);

    const rr = Math.round(sr + (er - sr) * norm);
    const rg = Math.round(sg + (eg - sg) * norm);
    const rb = Math.round(sb + (eb - sb) * norm);

    return `rgb(${rr}, ${rg}, ${rb})`;
};

const formatValue = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return 'N/A';
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const normalizeHeatmap = (input, group) => {
    const cells = parseCells(input);

    const cleaned = cells
        .map((cell) => {
            const yearRaw = cell.report_year;
            const year = yearRaw === null || yearRaw === undefined ? null : String(yearRaw);
            const segment = cell.segment === null || cell.segment === undefined ? null : String(cell.segment);
            const value = toNumber(cell.value);
            if (!year || !segment || value === null) return null;
            return { report_year: year, segment, value };
        })
        .filter(Boolean);

    const yearsSet = new Set(cleaned.map((cell) => cell.report_year));
    const segmentsSet = new Set(cleaned.map((cell) => cell.segment));

    const years = Array.from(yearsSet).sort((a, b) => {
        if (isNumericLike(a) && isNumericLike(b)) return Number(a) - Number(b);
        return String(a).localeCompare(String(b));
    });
    const segments = sortSegments(Array.from(segmentsSet), group);

    const valueMap = new Map();
    cleaned.forEach((cell) => valueMap.set(`${cell.segment}__${cell.report_year}`, cell.value));

    const values = cleaned.map((item) => item.value);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;

    return { years, segments, valueMap, min, max };
};

const DemographicHeatmap = ({ data, group = 'age', loading }) => {
    const [hoveredCell, setHoveredCell] = useState(null);

    const { years, segments, valueMap, min, max } = useMemo(
        () => normalizeHeatmap(data, group),
        [data, group]
    );

    const hasData = years.length > 0 && segments.length > 0;

    const getCellColor = (value) => {
        if (value === null || value === undefined) return '#f8fafc';
        if (max <= min) return '#93c5fd';
        const t = (value - min) / (max - min);
        return interpolateHex('#dbeafe', '#1d4ed8', t);
    };

    if (loading) {
        return (
            <Card className="shadow-sm border-gray-100 h-[460px]">
                <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-56" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[340px] w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm border-gray-100 hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-lg font-bold text-gray-800">
                        {GROUP_TITLES[group] || 'Demographic Heatmap'}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] px-2 py-0 h-5">
                        {group}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                {!hasData ? (
                    <div className="h-[340px] w-full rounded-lg bg-gray-50 flex items-center justify-center text-sm text-gray-500">
                        No heatmap data available.
                    </div>
                ) : (
                    <div className="relative">
                        <div className="mb-3 flex items-center justify-end gap-2 text-[11px] text-gray-500">
                            <span>{formatValue(min)}</span>
                            <div
                                className="h-2 w-28 rounded-sm"
                                style={{ background: 'linear-gradient(to right, #dbeafe, #1d4ed8)' }}
                            />
                            <span>{formatValue(max)}</span>
                        </div>

                        <div className="max-h-[340px] overflow-auto rounded-lg border border-gray-100">
                            <div
                                className="grid"
                                style={{
                                    gridTemplateColumns: `180px repeat(${years.length}, minmax(52px, 1fr))`,
                                    minWidth: `${180 + years.length * 52}px`
                                }}
                            >
                                <div className="sticky top-0 z-20 bg-white border-b border-r border-gray-100 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Segment \ Year
                                </div>
                                {years.map((year) => (
                                    <div
                                        key={`head-${year}`}
                                        className="sticky top-0 z-10 bg-white border-b border-gray-100 px-2 py-2 text-center text-xs font-semibold text-gray-600"
                                    >
                                        {year}
                                    </div>
                                ))}

                                {segments.map((segment) => (
                                    <React.Fragment key={segment}>
                                        <div className="border-r border-b border-gray-100 px-3 py-2 text-xs text-gray-700 bg-white font-medium">
                                            {humanize(segment)}
                                        </div>

                                        {years.map((year) => {
                                            const key = `${segment}__${year}`;
                                            const value = valueMap.has(key) ? valueMap.get(key) : null;
                                            const bg = getCellColor(value);

                                            return (
                                                <button
                                                    key={`${segment}-${year}`}
                                                    type="button"
                                                    className="h-10 border-b border-gray-100 transition-all"
                                                    style={{ backgroundColor: bg }}
                                                    onMouseEnter={(e) => {
                                                        setHoveredCell({
                                                            x: e.clientX,
                                                            y: e.clientY,
                                                            segment: humanize(segment),
                                                            year,
                                                            value
                                                        });
                                                    }}
                                                    onMouseMove={(e) => {
                                                        setHoveredCell((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));
                                                    }}
                                                    onMouseLeave={() => setHoveredCell(null)}
                                                    aria-label={`${humanize(segment)} in ${year}: ${formatValue(value)}`}
                                                />
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        {hoveredCell && (
                            <div
                                className="pointer-events-none fixed z-[100] rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg"
                                style={{
                                    left: hoveredCell.x + 12,
                                    top: hoveredCell.y + 12
                                }}
                            >
                                <div className="font-semibold text-gray-800">{hoveredCell.segment}</div>
                                <div className="text-gray-600">Year: {hoveredCell.year}</div>
                                <div className="text-gray-900 font-medium">Value: {formatValue(hoveredCell.value)}</div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default DemographicHeatmap;
