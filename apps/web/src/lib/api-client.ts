import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
    ? 'https://bizflow-api-v5m3.onrender.com/api/v1'
    : typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')
    ? window.location.origin.replace('bizflow-web', 'bizflow-api') + '/api/v1'
    : 'http://localhost:4000/api/v1');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessToken: string | null = null;
let activeOrganizationId: string | null = null;

export function getClientAccessToken(): string | null {
  if (typeof window !== 'undefined' && !accessToken) {
    accessToken = localStorage.getItem('bizflow_access_token');
  }
  return accessToken;
}

export function getClientActiveOrgId(): string | null {
  if (typeof window !== 'undefined' && !activeOrganizationId) {
    activeOrganizationId = localStorage.getItem('bizflow_active_org_id');
  }
  return activeOrganizationId;
}

export function setClientAuth(token?: string | null, orgId?: string | null) {
  if (token !== undefined) {
    accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('bizflow_access_token', token);
      } else {
        localStorage.removeItem('bizflow_access_token');
      }
    }
  }

  if (orgId !== undefined) {
    activeOrganizationId = orgId;
    if (typeof window !== 'undefined') {
      if (orgId) {
        localStorage.setItem('bizflow_active_org_id', orgId);
      } else {
        localStorage.removeItem('bizflow_active_org_id');
      }
    }
  }
}

apiClient.interceptors.request.use((config) => {
  const token = getClientAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const orgId = getClientActiveOrgId();
  if (orgId) {
    config.headers['X-Organization-Id'] = orgId;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorPayload = error.response?.data?.error || {
      message: error.response?.data?.message || error.message || 'An unexpected network error occurred',
      code: error.response?.status === 401 ? 'UNAUTHORIZED' : 'NETWORK_ERROR',
    };
    return Promise.reject(errorPayload);
  }
);
