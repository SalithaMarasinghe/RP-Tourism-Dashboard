import axios from 'axios';

/**
 * Demographic Cohort Tracker API Module
 *
 * Centralized client for /demo backend endpoints.
 * All functions return response payloads and rethrow errors for caller handling.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: `${API_BASE_URL}/demo`,
    headers: {
        'Content-Type': 'application/json',
    },
});

const logApiError = (fnName, error) => {
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail || error?.message;
    console.error(`API Error: ${fnName}`, { status, detail, error });
};

export const fetchDemographicKpis = async (params = {}) => {
    try {
        const response = await api.get('/kpis', { params });
        return response.data;
    } catch (error) {
        logApiError('fetchDemographicKpis', error);
        throw error;
    }
};

export const fetchDemographicTrends = async (params = {}) => {
    try {
        const response = await api.get('/trends', { params });
        return response.data;
    } catch (error) {
        logApiError('fetchDemographicTrends', error);
        throw error;
    }
};

export const fetchDemographicPyramid = async (params = {}) => {
    try {
        const response = await api.get('/pyramid', { params });
        return response.data;
    } catch (error) {
        logApiError('fetchDemographicPyramid', error);
        throw error;
    }
};

export const fetchDemographicHeatmap = async (params = {}) => {
    try {
        const response = await api.get('/heatmap', { params });
        return response.data;
    } catch (error) {
        logApiError('fetchDemographicHeatmap', error);
        throw error;
    }
};

export const fetchDemographicAlerts = async (params = {}) => {
    try {
        const response = await api.get('/alerts', { params });
        return response.data;
    } catch (error) {
        logApiError('fetchDemographicAlerts', error);
        throw error;
    }
};

export default {
    fetchDemographicKpis,
    fetchDemographicTrends,
    fetchDemographicPyramid,
    fetchDemographicHeatmap,
    fetchDemographicAlerts,
};
