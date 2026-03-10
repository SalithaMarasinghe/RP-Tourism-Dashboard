import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    fetchRevenueKpis,
    fetchRevenueSummary,
    fetchRevenueAnomalies,
    fetchRevenueDrivers,
    fetchArrivalsTimeline
} from '../api/revApi';

/**
 * useRevenueDashboard
 * 
 * Custom hook to manage the state and data fetching for the 
 * Tourism Revenue Intelligence Dashboard.
 * 
 * It handles scenario switching, year selection, and orchestrates 
 * parallel API calls while providing memoized data for charts.
 */
export const useRevenueDashboard = (initialYear = 2026, initialScenario = 'baseline') => {
    // --- State Management ---
    const [scenario, setScenario] = useState(initialScenario);
    const [selectedYear, setSelectedYear] = useState(initialYear);
    const [startYear, setStartYear] = useState(2013); // Dataset bounds
    const [endYear, setEndYear] = useState(2030);

    const [data, setData] = useState({
        kpis: null,      // Full time-series (Monthly/Annual)
        summary: null,   // Headline card for selected year
        anomalies: null, // Event markers and statistical anomalies
        drivers: null,   // Channel breakdown for selected year
        arrivalsTimeline: null // Additional forecast arrivals from dedicated API
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Data Fetching Orchestration ---

    // Update scenario
    const updateScenario = useCallback((newScenario) => {
        setScenario(newScenario.toLowerCase());
    }, []);

    // Update selected year
    const updateYear = useCallback((year) => {
        setSelectedYear(parseInt(year, 10));
    }, []);

    // Update year range
    const updateRange = useCallback((start, end) => {
        setStartYear(start);
        setEndYear(end);
    }, []);

    // Fetch all data
    const refreshAllData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Debug: Log what scenario value is being passed
            console.log('DEBUG: scenario value:', scenario, typeof scenario);

            // Parallel fetch for heavy time-series, anomalies, and forecast arrivals
            const [kpiRes, anomalyRes, summaryRes, driversRes, arrivalsRes] = await Promise.all([
                fetchRevenueKpis({ scenario, start_year: startYear, end_year: endYear }),
                fetchRevenueAnomalies({ scenario, start_year: startYear, end_year: endYear }),
                fetchRevenueSummary({ year: selectedYear, scenario }),
                // Drivers only for forecast years, skip for historical
                scenario.toLowerCase() !== 'historical'
                    ? fetchRevenueDrivers({ year: selectedYear, scenario }).catch(() => null)
                    : Promise.resolve(null),
                // Fetch the comprehensive arrivals timeline (2010-2030)
                fetchArrivalsTimeline().catch(() => null)
            ]);

            setData({
                kpis: kpiRes,
                anomalies: anomalyRes,
                summary: summaryRes,
                drivers: driversRes,
                arrivalsTimeline: arrivalsRes
            });
        } catch (err) {
            console.error('Error fetching revenue dashboard data:', err);
            setError(err.message || 'Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    }, [scenario, selectedYear, startYear, endYear]);

    // Effect: Reload everything on scenario or range change
    useEffect(() => {
        refreshAllData();
    }, [refreshAllData]);

    // --- Derived / Memoized Data ---

    // Prepare time-series for Recharts (e.g., merging monthly data with anomalies and forecast arrivals)
    const chartData = useMemo(() => {
        if (!data.kpis?.monthly) return [];

        // Convert monthly array into a format with anomaly flags merged if ds matches
        const anomaliesMap = new Map();
        data.anomalies?.anomalies?.forEach(a => anomaliesMap.set(a.ds, a));
        data.anomalies?.events?.forEach(e => anomaliesMap.set(e.ds, e));

        // Build a map of forecast arrivals from the dedicated arrivals timeline API
        // Key: "YYYY-MM" format, Value: arrivals count
        const forecastArrivalsMap = new Map();
        if (data.arrivalsTimeline && Array.isArray(data.arrivalsTimeline)) {
            data.arrivalsTimeline.forEach(row => {
                if (row.type === 'predicted' && row.date && row.arrivals) {
                    forecastArrivalsMap.set(row.date, row.arrivals);
                }
            });
        }

        return data.kpis.monthly.map(row => {
            const dateKey = row.ds ? row.ds.substring(0, 7) : null; // Extract YYYY-MM from date
            const forecastArrivals = dateKey ? forecastArrivalsMap.get(dateKey) : null;

            return {
                ...row,
                // Add the dedicated forecast arrivals if available
                arrivals_forecast_api: forecastArrivals,
                // Add a helper field for scatter overlays or tooltips
                hasAnomaly: anomaliesMap.has(row.ds),
                anomalyInfo: anomaliesMap.get(row.ds),
                // Flag to indicate if forecast arrivals differ from KPI arrivals
                has_forecast_arrivals_api: forecastArrivals !== null && forecastArrivals !== undefined
            };
        });
    }, [data.kpis, data.anomalies, data.arrivalsTimeline]);

    // Forecast split year (from metadata)
    const forecastPivotYear = useMemo(() => data.kpis?.meta?.forecast_start || 2026, [data.kpis]);

    return {
        // State
        scenario,
        selectedYear,
        startYear,
        endYear,
        data,
        loading,
        error,

        // Memoized Data
        chartData,
        forecastPivotYear,

        // Actions
        updateScenario,
        updateYear,
        updateRange,
        refreshAllData,
    };
};

export default useRevenueDashboard;
