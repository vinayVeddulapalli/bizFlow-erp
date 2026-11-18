import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessToken: string | null = null;
let activeOrganizationId: string | null = null;

export function setClientAuth(token: string | null, orgId?: string | null) {
  accessToken = token;
  if (orgId !== undefined) {
    activeOrganizationId = orgId;
    if (orgId) {
      localStorage.setItem('bizflow_active_org_id', orgId);
    } else {
      localStorage.removeItem('bizflow_active_org_id');
    }
  }
}

export function getClientActiveOrgId(): string | null {
  if (typeof window !== 'undefined' && !activeOrganizationId) {
    activeOrganizationId = localStorage.getItem('bizflow_active_org_id');
  }
  return activeOrganizationId;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
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
      message: error.message || 'An unexpected network error occurred',
      code: 'NETWORK_ERROR',
    };
    return Promise.reject(errorPayload);
  }
);
