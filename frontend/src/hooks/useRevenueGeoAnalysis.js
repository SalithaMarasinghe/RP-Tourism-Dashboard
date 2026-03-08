/**
 * useRevenueGeoAnalysis
 * ~~~~~~~~~~~~~~~~~~~~
 * Custom hook for Geopolitical Revenue Analyzer tile.
 *
 * Manages:
 * - Fetching current geopolitical revenue analysis tile
 * - Manual refresh functionality
 * - Loading and error states
 * - Cache freshness and staleness warnings
 * - Automatic periodic polling (optional)
 */

import { useState, useEffect, useCallback } from 'react';
import {
    fetchRevenueGeoCurrent,
    refreshRevenueGeoCurrent,
    fetchRevenueGeoStatus
} from '../api/revenueGeoApi';

/**
 * useRevenueGeoAnalysis
 * 
 * @param {Object} options Configuration options
 * @param {number} options.pollInterval Polling interval in ms (0 = no polling, default)
 * @returns {Object} Hook state and methods:
 *   - tileData: RevenueGeoTileResponse or null
 *   - status: Cache status object or null
 *   - loading: boolean - whether currently fetching
 *   - error: string or null - error message
 *   - isStale: boolean - whether cache >4 days old
 *   - refresh: function - manually trigger refresh
 *   - refetch: function - fetch current data
 */
export const useRevenueGeoAnalysis = (options = {}) => {
    const { pollInterval = 0 } = options;

    // State management
    const [tileData, setTileData] = useState(null);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isStale, setIsStale] = useState(false);

    /**
     * Fetch current tile data and cache status
     */
    const refetch = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch current tile data
            const tileResponse = await fetchRevenueGeoCurrent();
            setTileData(tileResponse);

            // Fetch cache status
            try {
                const statusResponse = await fetchRevenueGeoStatus();
                setStatus(statusResponse);

                // Check if stale (>4 days old)
                const ageHours = statusResponse.age_hours;
                setIsStale(ageHours && ageHours > 96);
            } catch (statusErr) {
                console.warn('Failed to fetch status, but tile data OK:', statusErr);
            }
        } catch (err) {
            console.error('Error fetching revenue geo analysis:', err);
            setError(err.message || 'Failed to fetch geopolitical revenue analysis');
            setTileData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Manually trigger refresh of analysis
     */
    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Call refresh endpoint
            const tileResponse = await refreshRevenueGeoCurrent();
            setTileData(tileResponse);

            // Fetch updated status
            try {
                const statusResponse = await fetchRevenueGeoStatus();
                setStatus(statusResponse);
                setIsStale(false);  // Just refreshed, can't be stale
            } catch (statusErr) {
                console.warn('Failed to fetch status after refresh:', statusErr);
            }
        } catch (err) {
            console.error('Error refreshing revenue geo analysis:', err);
            setError(err.message || 'Failed to refresh geopolitical revenue analysis');
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Initial load on mount
     */
    useEffect(() => {
        refetch();
    }, [refetch]);

    /**
     * Optional polling
     */
    useEffect(() => {
        if (!pollInterval || pollInterval <= 0) return;

        const interval = setInterval(() => {
            refetch();
        }, pollInterval);

        return () => clearInterval(interval);
    }, [pollInterval, refetch]);

    return {
        tileData,
        status,
        loading,
        error,
        isStale,
        refresh,
        refetch,
        lastUpdated: tileData?.generated_at || null
    };
};
