import axios, { AxiosError } from 'axios';
import { extractErrorMessage, ErrorCode } from '../utils/errors';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || '/api/v1';

const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Request interceptor
client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor with enhanced error handling
client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Handle unauthorized - redirect to login
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
            return Promise.reject(error);
        }

        // Log errors in development
        if ((import.meta as any).env?.DEV) {
            console.error('[API Error]', {
                url: error.config?.url,
                status: error.response?.status,
                message: extractErrorMessage(error),
                code: (error.response?.data as any)?.code,
            });
        }

        return Promise.reject(error);
    }
);

/**
 * Helper to make API calls with standardized error handling
 */
export async function apiRequest<T>(
    request: () => Promise<{ data: { success: boolean; data?: T; error?: string } }>
): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
        const response = await request();
        return response.data;
    } catch (error) {
        return {
            success: false,
            error: extractErrorMessage(error),
        };
    }
}

export { ErrorCode };
export default client;
