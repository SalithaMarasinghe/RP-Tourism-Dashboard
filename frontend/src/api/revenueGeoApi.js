/**
 * revenueGeoApi.js
 * ~~~~~~~~~~~~~~~~
 * Geopolitical Revenue Analyzer API client.
 *
 * Centralized service for /rev/geo backend endpoints.
 * All functions return promises that resolve to the data payload or throw 
 * an error for the component to handle via try/catch.
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create a dedicated axios instance for revenue geo services
const api = axios.create({
    baseURL: `${API_BASE_URL}/rev/geo`,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * fetchRevenueGeoCurrent
 * Retrieves current geopolitical revenue adjustment tile analysis.
 * 
 * Returns cached result if valid, otherwise triggers fresh pipeline execution.
 * 
 * @returns {Promise<Object>} - RevenueGeoTileResponse with all adjustment data
 * @throws {Error} if API call fails
 */
export const fetchRevenueGeoCurrent = async () => {
    try {
        const response = await api.get('/current');
        return response.data;
    } catch (error) {
        console.error('API Error: fetchRevenueGeoCurrent', error);
        throw error;
    }
};

/**
 * refreshRevenueGeoCurrent
 * Force manual refresh of geopolitical revenue analysis.
 * 
 * Bypasses cache validation and re-runs full pipeline immediately.
 * Resets cache timer.
 * 
 * @returns {Promise<Object>} - Fresh RevenueGeoTileResponse
 * @throws {Error} if API call fails or not authorized
 */
export const refreshRevenueGeoCurrent = async () => {
    try {
        const response = await api.post('/refresh');
        return response.data;
    } catch (error) {
        console.error('API Error: refreshRevenueGeoCurrent', error);
        throw error;
    }
};

/**
 * fetchRevenueGeoStatus
 * Get cache status and freshness information.
 * 
 * @returns {Promise<Object>} - Status object with:
 *   - is_valid: boolean - cache validity
 *   - age_hours: number or null - hours since generation
 *   - cache_expires_at: string - ISO timestamp
 *   - staleness_warning: string or null - warning if 4-7 days old
 *   - trigger_type: string - how cache was triggered
 *   - next_scheduled_refresh: string - ISO date
 * @throws {Error} if API call fails
 */
export const fetchRevenueGeoStatus = async () => {
    try {
        const response = await api.get('/status');
        return response.data;
    } catch (error) {
        console.error('API Error: fetchRevenueGeoStatus', error);
        throw error;
    }
};
