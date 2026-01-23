/**
 * Frontend error handling utilities
 * Provides consistent error extraction and user-friendly messages
 */

import { AxiosError } from 'axios';

// Error codes matching backend
export const ErrorCode = {
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    INVALID_INPUT: 'INVALID_INPUT',
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
    TEST_CASE_NOT_FOUND: 'TEST_CASE_NOT_FOUND',
    RUN_NOT_FOUND: 'RUN_NOT_FOUND',
    RESOURCE_EXISTS: 'RESOURCE_EXISTS',
    DUPLICATE_AGENT: 'DUPLICATE_AGENT',
    RATE_LIMITED: 'RATE_LIMITED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    DIALOGFLOW_ERROR: 'DIALOGFLOW_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// User-friendly messages for error codes
const ERROR_MESSAGES: Record<string, string> = {
    [ErrorCode.VALIDATION_FAILED]: 'Please check your input and try again.',
    [ErrorCode.INVALID_INPUT]: 'The provided data is invalid.',
    [ErrorCode.RESOURCE_NOT_FOUND]: 'The requested item was not found.',
    [ErrorCode.AGENT_NOT_FOUND]: 'Agent not found. Please verify the agent configuration.',
    [ErrorCode.TEST_CASE_NOT_FOUND]: 'Test case not found. It may have been deleted.',
    [ErrorCode.RUN_NOT_FOUND]: 'Test run not found.',
    [ErrorCode.RESOURCE_EXISTS]: 'This item already exists.',
    [ErrorCode.DUPLICATE_AGENT]: 'An agent with this ID already exists.',
    [ErrorCode.RATE_LIMITED]: 'Too many requests. Please wait a moment and try again.',
    [ErrorCode.INTERNAL_ERROR]: 'Something went wrong. Please try again later.',
    [ErrorCode.DATABASE_ERROR]: 'A database error occurred. Please try again.',
    [ErrorCode.DIALOGFLOW_ERROR]: 'Failed to connect to Dialogflow. Please check your credentials.',
    [ErrorCode.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable.',
    [ErrorCode.NETWORK_ERROR]: 'Unable to connect to the server. Please check your internet connection.',
    [ErrorCode.TIMEOUT_ERROR]: 'The request timed out. Please try again.',
};

// API error response interface
export interface ApiErrorResponse {
    success: false;
    error: string;
    code?: ErrorCodeType;
    details?: Array<{ field: string; message: string }>;
    timestamp?: string;
}

// API success response interface
export interface ApiSuccessResponse<T = unknown> {
    success: true;
    data: T;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Extracts a user-friendly error message from various error types
 */
export function extractErrorMessage(error: unknown): string {
    // Handle Axios errors
    if (isAxiosError(error)) {
        // Check for network errors
        if (error.code === 'ERR_NETWORK' || !error.response) {
            return ERROR_MESSAGES[ErrorCode.NETWORK_ERROR];
        }

        // Check for timeout
        if (error.code === 'ECONNABORTED') {
            return ERROR_MESSAGES[ErrorCode.TIMEOUT_ERROR];
        }

        // Extract from response data
        const data = error.response?.data as ApiErrorResponse | undefined;
        if (data?.error) {
            return data.error;
        }

        // Use status-based messages
        const status = error.response?.status;
        if (status === 401) return 'Please log in to continue.';
        if (status === 403) return 'You do not have permission to perform this action.';
        if (status === 404) return ERROR_MESSAGES[ErrorCode.RESOURCE_NOT_FOUND];
        if (status === 429) return ERROR_MESSAGES[ErrorCode.RATE_LIMITED];
        if (status && status >= 500) return ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR];
    }

    // Handle standard Error objects
    if (error instanceof Error) {
        // Don't expose technical error messages to users
        if (isTechnicalError(error.message)) {
            return ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR];
        }
        return error.message;
    }

    // Handle string errors
    if (typeof error === 'string') {
        if (isTechnicalError(error)) {
            return ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR];
        }
        return error;
    }

    // Fallback
    return ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR];
}

/**
 * Extracts error code from API response
 */
export function extractErrorCode(error: unknown): ErrorCodeType | undefined {
    if (isAxiosError(error)) {
        const data = error.response?.data as ApiErrorResponse | undefined;
        return data?.code;
    }
    return undefined;
}

/**
 * Extracts validation errors from API response
 */
export function extractValidationErrors(error: unknown): Array<{ field: string; message: string }> | undefined {
    if (isAxiosError(error)) {
        const data = error.response?.data as ApiErrorResponse | undefined;
        return data?.details;
    }
    return undefined;
}

/**
 * Type guard for Axios errors
 */
function isAxiosError(error: unknown): error is AxiosError {
    return (error as AxiosError)?.isAxiosError === true;
}

/**
 * Checks if an error message contains technical details that shouldn't be shown to users
 */
function isTechnicalError(message: string): boolean {
    const technicalPatterns = [
        /SQLITE/i,
        /ECONNREFUSED/i,
        /ENOTFOUND/i,
        /ETIMEDOUT/i,
        /at\s+\w+\s+\(/i, // Stack traces
        /Cannot read propert/i,
        /undefined is not/i,
        /null is not/i,
    ];

    return technicalPatterns.some(pattern => pattern.test(message));
}

/**
 * Gets user-friendly message for an error code
 */
export function getErrorMessage(code: ErrorCodeType): string {
    return ERROR_MESSAGES[code] || ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR];
}

/**
 * Creates a standardized error for throwing
 */
export function createError(code: ErrorCodeType, customMessage?: string): Error {
    const message = customMessage || ERROR_MESSAGES[code];
    const error = new Error(message);
    (error as any).code = code;
    return error;
}
