import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    fetchDemographicAlerts,
    fetchDemographicHeatmap,
    fetchDemographicKpis,
    fetchDemographicPyramid,
    fetchDemographicTrends
} from '../api/demoApi';

const VALID_TREND_GROUPS = ['age', 'gender', 'purpose'];
const VALID_HEATMAP_GROUPS = ['age', 'purpose'];

const ALERT_SEVERITY_ORDER = {
    HIGH: 0,
    MEDIUM: 1,
    WARN: 1,
    WARNING: 1,
    INFO: 2
};

const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const normalizeErrorMessage = (error, fallback) =>
    error?.response?.data?.detail || error?.message || fallback;

const buildTrendSeries = (points = []) => {
    const grouped = new Map();

    points
        .filter((point) => point && point.metric)
        .forEach((point) => {
            const metric = String(point.metric);
            const list = grouped.get(metric) || [];
            list.push({
                report_year: toNumber(point.report_year),
                value: toNumber(point.value)
            });
            grouped.set(metric, list);
        });

    return Array.from(grouped.entries()).map(([metric, series]) => ({
        metric,
        points: series.sort((a, b) => a.report_year - b.report_year)
    }));
};

const buildPyramidRows = (pyramidPayload) => {
    const pyramid = pyramidPayload?.pyramids?.[0];
    if (!pyramid) return [];

    const ageGroups = Array.isArray(pyramid.age_groups) ? pyramid.age_groups : [];
    const maleValues = Array.isArray(pyramid.male_values) ? pyramid.male_values : [];
    const femaleValues = Array.isArray(pyramid.female_values) ? pyramid.female_values : [];

    return ageGroups.map((ageBand, idx) => {
        const male = toNumber(maleValues[idx], 0);
        const female = toNumber(femaleValues[idx], 0);
        return {
            ageBand: String(ageBand),
            male,
            maleMirror: male * -1,
            female,
            total: male + female
        };
    });
};

const buildHeatmapMatrix = (heatmapPayload) => {
    const cells = Array.isArray(heatmapPayload?.cells) ? heatmapPayload.cells : [];
    const rowKeys = Array.from(
        new Set(cells.map((cell) => String(cell.row_key || '')).filter(Boolean))
    );
    const years = Array.from(
        new Set(cells.map((cell) => String(cell.column_key || cell.report_year || '')).filter(Boolean))
    ).sort((a, b) => toNumber(a) - toNumber(b));

    const rowLookup = new Map();
    rowKeys.forEach((rowKey) => rowLookup.set(rowKey, new Map()));

    cells.forEach((cell) => {
        const rowKey = String(cell.row_key || '');
        const colKey = String(cell.column_key || cell.report_year || '');
        if (!rowKey || !colKey) return;
        if (!rowLookup.has(rowKey)) rowLookup.set(rowKey, new Map());
        rowLookup.get(rowKey).set(colKey, toNumber(cell.value));
    });

    const matrix = rowKeys.map((rowKey) => ({
        rowKey,
        values: years.map((year) => ({
            columnKey: year,
            value: rowLookup.get(rowKey)?.get(year) ?? null
        }))
    }));

    return { rowKeys, years, matrix };
};

const normalizeAlerts = (alertPayload) => {
    const alerts = Array.isArray(alertPayload?.alerts) ? alertPayload.alerts : [];
    return [...alerts].sort((a, b) => {
        const yearDiff = toNumber(b.report_year) - toNumber(a.report_year);
        if (yearDiff !== 0) return yearDiff;

        const severityA = String(a.severity || 'INFO').toUpperCase();
        const severityB = String(b.severity || 'INFO').toUpperCase();
        const rankA = ALERT_SEVERITY_ORDER[severityA] ?? 99;
        const rankB = ALERT_SEVERITY_ORDER[severityB] ?? 99;
        return rankA - rankB;
    });
};

export const useDemographicCohortTracker = (options = {}) => {
    const {
        initialYear = null,
        initialTrendGroup = 'age',
        initialHeatmapGroup = 'age'
    } = options;

    const [selectedYear, setSelectedYear] = useState(
        Number.isInteger(initialYear) ? initialYear : null
    );
    const [selectedTrendGroup, setSelectedTrendGroup] = useState(
        VALID_TREND_GROUPS.includes(initialTrendGroup) ? initialTrendGroup : 'age'
    );
    const [selectedHeatmapGroup, setSelectedHeatmapGroup] = useState(
        VALID_HEATMAP_GROUPS.includes(initialHeatmapGroup) ? initialHeatmapGroup : 'age'
    );

    const [kpiPayload, setKpiPayload] = useState(null);
    const [trendPayload, setTrendPayload] = useState(null);
    const [pyramidPayload, setPyramidPayload] = useState(null);
    const [heatmapPayload, setHeatmapPayload] = useState(null);
    const [alertPayload, setAlertPayload] = useState(null);

    const [loading, setLoading] = useState({
        kpis: false,
        trends: false,
        pyramid: false,
        heatmap: false,
        alerts: false
    });

    const [errors, setErrors] = useState({
        kpis: null,
        trends: null,
        pyramid: null,
        heatmap: null,
        alerts: null
    });

    const requestIdsRef = useRef({
        base: 0,
        trends: 0,
        heatmap: 0
    });

    const updateYear = useCallback((year) => {
        if (year === null || year === undefined || year === '') {
            setSelectedYear(null);
            return;
        }
        const parsed = parseInt(year, 10);
        if (Number.isInteger(parsed)) setSelectedYear(parsed);
    }, []);

    const updateTrendGroup = useCallback((group) => {
        if (VALID_TREND_GROUPS.includes(group)) {
            setSelectedTrendGroup(group);
        }
    }, []);

    const updateHeatmapGroup = useCallback((group) => {
        if (VALID_HEATMAP_GROUPS.includes(group)) {
            setSelectedHeatmapGroup(group);
        }
    }, []);

    const loadBaseData = useCallback(async () => {
        const requestId = ++requestIdsRef.current.base;

        setLoading((prev) => ({
            ...prev,
            kpis: true,
            pyramid: true,
            alerts: true
        }));
        setErrors((prev) => ({
            ...prev,
            kpis: null,
            pyramid: null,
            alerts: null
        }));

        try {
            const kpiParams = selectedYear ? { year: selectedYear } : {};
            const kpiRes = await fetchDemographicKpis(kpiParams);

            if (requestIdsRef.current.base !== requestId) return;

            const kpiYear = kpiRes?.kpis?.[0]?.report_year ?? null;
            const effectiveYear = selectedYear ?? kpiYear;

            setKpiPayload(kpiRes || null);

            if (selectedYear == null && Number.isInteger(effectiveYear)) {
                setSelectedYear(effectiveYear);
            }

            const [pyramidRes, alertsRes] = await Promise.all([
                Number.isInteger(effectiveYear)
                    ? fetchDemographicPyramid({ year: effectiveYear })
                    : Promise.resolve({ pyramids: [] }),
                Number.isInteger(effectiveYear)
                    ? fetchDemographicAlerts({ year: effectiveYear })
                    : fetchDemographicAlerts({})
            ]);

            if (requestIdsRef.current.base !== requestId) return;

            setPyramidPayload(pyramidRes || null);
            setAlertPayload(alertsRes || null);
        } catch (error) {
            if (requestIdsRef.current.base !== requestId) return;

            const message = normalizeErrorMessage(error, 'Failed to load demographic data.');
            console.error('Error fetching demographic base data:', error);
            setErrors((prev) => ({
                ...prev,
                kpis: message,
                pyramid: message,
                alerts: message
            }));
        } finally {
            if (requestIdsRef.current.base !== requestId) return;

            setLoading((prev) => ({
                ...prev,
                kpis: false,
                pyramid: false,
                alerts: false
            }));
        }
    }, [selectedYear]);

    const loadTrendData = useCallback(async () => {
        const requestId = ++requestIdsRef.current.trends;

        setLoading((prev) => ({ ...prev, trends: true }));
        setErrors((prev) => ({ ...prev, trends: null }));

        try {
            const trendRes = await fetchDemographicTrends({ group: selectedTrendGroup });
            if (requestIdsRef.current.trends !== requestId) return;
            setTrendPayload(trendRes || null);
        } catch (error) {
            if (requestIdsRef.current.trends !== requestId) return;
            const message = normalizeErrorMessage(error, 'Failed to load demographic trend data.');
            console.error('Error fetching demographic trend data:', error);
            setErrors((prev) => ({ ...prev, trends: message }));
        } finally {
            if (requestIdsRef.current.trends !== requestId) return;
            setLoading((prev) => ({ ...prev, trends: false }));
        }
    }, [selectedTrendGroup]);

    const loadHeatmapData = useCallback(async () => {
        const requestId = ++requestIdsRef.current.heatmap;

        setLoading((prev) => ({ ...prev, heatmap: true }));
        setErrors((prev) => ({ ...prev, heatmap: null }));

        try {
            const heatmapRes = await fetchDemographicHeatmap({ group: selectedHeatmapGroup });
            if (requestIdsRef.current.heatmap !== requestId) return;
            setHeatmapPayload(heatmapRes || null);
        } catch (error) {
            if (requestIdsRef.current.heatmap !== requestId) return;
            const message = normalizeErrorMessage(error, 'Failed to load demographic heatmap data.');
            console.error('Error fetching demographic heatmap data:', error);
            setErrors((prev) => ({ ...prev, heatmap: message }));
        } finally {
            if (requestIdsRef.current.heatmap !== requestId) return;
            setLoading((prev) => ({ ...prev, heatmap: false }));
        }
    }, [selectedHeatmapGroup]);

    const refreshAll = useCallback(async () => {
        await Promise.all([loadBaseData(), loadTrendData(), loadHeatmapData()]);
    }, [loadBaseData, loadHeatmapData, loadTrendData]);

    useEffect(() => {
        loadBaseData();
    }, [loadBaseData]);

    useEffect(() => {
        loadTrendData();
    }, [loadTrendData]);

    useEffect(() => {
        loadHeatmapData();
    }, [loadHeatmapData]);

    const kpi = useMemo(() => {
        const row = kpiPayload?.kpis?.[0];
        if (!row) return null;

        return {
            report_year: row.report_year,
            total_arrivals: toNumber(row.total_arrivals),
            male_share_pct: toNumber(row.male_share_pct),
            female_share_pct: toNumber(row.female_share_pct),
            dominant_age_cohort: row.dominant_age_cohort || 'unknown',
            dominant_purpose: row.dominant_purpose || 'unknown',
            yoy_growth_pct:
                row.yoy_growth_pct === null || row.yoy_growth_pct === undefined
                    ? null
                    : toNumber(row.yoy_growth_pct)
        };
    }, [kpiPayload]);

    const trendPoints = useMemo(() => {
        const points = trendPayload?.points;
        return Array.isArray(points) ? points : [];
    }, [trendPayload]);

    const trendSeries = useMemo(() => buildTrendSeries(trendPoints), [trendPoints]);
    const pyramidRows = useMemo(() => buildPyramidRows(pyramidPayload), [pyramidPayload]);

    const heatmapCells = useMemo(() => {
        const cells = heatmapPayload?.cells;
        return Array.isArray(cells) ? cells : [];
    }, [heatmapPayload]);
    const heatmapMatrix = useMemo(() => buildHeatmapMatrix(heatmapPayload), [heatmapPayload]);

    const alerts = useMemo(() => normalizeAlerts(alertPayload), [alertPayload]);
    const alertSummary = useMemo(
        () =>
            alerts.reduce(
                (acc, alert) => {
                    const severity = String(alert.severity || 'INFO').toUpperCase();
                    if (!acc[severity]) acc[severity] = 0;
                    acc[severity] += 1;
                    acc.total += 1;
                    return acc;
                },
                { total: 0 }
            ),
        [alerts]
    );

    const availableYears = useMemo(() => {
        const years = new Set();
        if (kpi?.report_year) years.add(toNumber(kpi.report_year));

        trendPoints.forEach((point) => {
            if (point?.report_year !== undefined && point?.report_year !== null) {
                years.add(toNumber(point.report_year));
            }
        });

        alerts.forEach((alert) => {
            if (alert?.report_year !== undefined && alert?.report_year !== null) {
                years.add(toNumber(alert.report_year));
            }
        });

        return Array.from(years).filter(Number.isFinite).sort((a, b) => a - b);
    }, [alerts, kpi, trendPoints]);

    const isLoading = useMemo(() => Object.values(loading).some(Boolean), [loading]);
    const error = useMemo(() => Object.values(errors).find(Boolean) || null, [errors]);

    return {
        selectedYear,
        selectedTrendGroup,
        selectedHeatmapGroup,
        loading,
        isLoading,
        errors,
        error,
        kpi,
        trendPoints,
        trendSeries,
        pyramidRows,
        heatmapCells,
        heatmapMatrix,
        alerts,
        alertSummary,
        availableYears,
        setSelectedYear: updateYear,
        setSelectedTrendGroup: updateTrendGroup,
        setSelectedHeatmapGroup: updateHeatmapGroup,
        refreshAll
    };
};

export default useDemographicCohortTracker;

