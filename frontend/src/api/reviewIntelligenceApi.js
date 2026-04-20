import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/review-intelligence`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Handle API responses and errors
 */
const handleResponse = async (request) => {
  try {
    const response = await request;
    return response.data;
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.detail || error.message || 'An unexpected error occurred';
    throw new ApiError(message, status);
  }
};

export const fetchAllLocations = () => {
  return handleResponse(api.get('/locations'));
};

export const fetchLocationByName = (name) => {
  const encodedName = encodeURIComponent(name);
  return handleResponse(api.get(`/locations/${encodedName}`));
};

export const fetchLocationsByStatus = (status) => {
  return handleResponse(api.get('/locations/filter', { params: { status } }));
};
