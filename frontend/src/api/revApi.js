import axios from 'axios';

/**
 * Tourism Revenue Intelligence API Module
 * 
 * Centralized service for interacting with /rev backend endpoints.
 * All functions return promises that resolve to the data payload or 
 * throw an error for the component to handle via try/catch or Toast alerts.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create a dedicated axios instance for revenue services
const api = axios.create({
    baseURL: `${API_BASE_URL}/rev`,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Internal helper to normalize scenario names for the backend.
 * Maps lowercase frontend values to capitalized backend expectations.
 */
const normalizeParams = (params) => {
    if (!params || !params.scenario) return params;

    const mapping = {
        'historical': 'Historical',
        'baseline': 'Baseline',
        'optimistic': 'Optimistic',
        'pessimistic': 'Pessimistic'
    };

    return {
        ...params,
        scenario: mapping[params.scenario.toLowerCase()] || params.scenario
    };
};

/**
 * fetchRevenueKpis
 * Retrieves full time-series arrays for monthly and annual revenue.
 * 
 * @param {Object} params - { scenario, start_year, end_year }
 * @returns {Promise<Object>} - { monthly: [], annual: [], meta: {} }
 */
export const fetchRevenueKpis = async (params = {}) => {
    try {
        const response = await api.get('/kpis', { params: normalizeParams(params) });
        return response.data;
    } catch (error) {
        console.error('API Error: fetchRevenueKpis', error);
        throw error;
    }
};

/**
 * fetchRevenueSummary
 * Retrieves headline metric card data for a specific year.
 * 
 * @param {Object} params - { year (required), scenario }
 * @returns {Promise<Object>} - { year, scenario, total_revenue_usd_bn, arrivals, ... }
 */
export const fetchRevenueSummary = async (params = {}) => {
    try {
        const response = await api.get('/summary', { params: normalizeParams(params) });
        return response.data;
    } catch (error) {
        console.error('API Error: fetchRevenueSummary', error);
        throw error;
    }
};

/**
 * fetchRevenueAnomalies
 * Retrieves historical event markers and statistical anomalies.
 * 
 * @param {Object} params - { metric, scenario, start_year, end_year }
 * @returns {Promise<Object>} - { events: [], anomalies: [] }
 */
export const fetchRevenueAnomalies = async (params = {}) => {
    try {
        const response = await api.get('/anomalies', { params: normalizeParams(params) });
        return response.data;
    } catch (error) {
        console.error('API Error: fetchRevenueAnomalies', error);
        throw error;
    }
};

/**
 * fetchRevenueDrivers
 * Retrieves revenue channel contribution (Hotels, Travel Agencies, etc.) for a forecast year.
 * 
 * @param {Object} params - { year (required), scenario }
 * @returns {Promise<Object>} - { year, scenario, total_revenue_usd_mn, drivers: [] }
 */
export const fetchRevenueDrivers = async (params = {}) => {
    try {
        const response = await api.get('/drivers', { params: normalizeParams(params) });
        return response.data;
    } catch (error) {
        console.error('API Error: fetchRevenueDrivers', error);
        throw error;
    }
};

export default {
    fetchRevenueKpis,
    fetchRevenueSummary,
    fetchRevenueAnomalies,
    fetchRevenueDrivers,
};
