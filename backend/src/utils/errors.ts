/**
 * Centralized error handling utilities
 * Provides consistent error responses and user-friendly messages
 */

// Error codes for programmatic handling
export const ErrorCode = {
    // Validation errors (400)
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    INVALID_INPUT: 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
    INVALID_FILE_FORMAT: 'INVALID_FILE_FORMAT',

    // Authentication errors (401)
    UNAUTHORIZED: 'UNAUTHORIZED',
    INVALID_TOKEN: 'INVALID_TOKEN',

    // Not found errors (404)
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
    TEST_CASE_NOT_FOUND: 'TEST_CASE_NOT_FOUND',
    RUN_NOT_FOUND: 'RUN_NOT_FOUND',

    // Conflict errors (409)
    RESOURCE_EXISTS: 'RESOURCE_EXISTS',
    DUPLICATE_AGENT: 'DUPLICATE_AGENT',

    // Rate limit errors (429)
    RATE_LIMITED: 'RATE_LIMITED',

    // Server errors (500)
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    DIALOGFLOW_ERROR: 'DIALOGFLOW_ERROR',

    // Service unavailable (503)
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// User-friendly error messages mapped to error codes
const ERROR_MESSAGES: Record<ErrorCodeType, string> = {
    [ErrorCode.VALIDATION_FAILED]: 'The provided data is invalid. Please check your input and try again.',
    [ErrorCode.INVALID_INPUT]: 'Invalid input provided. Please verify your data.',
    [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required fields are missing. Please fill in all required information.',
    [ErrorCode.INVALID_FILE_FORMAT]: 'The uploaded file format is not supported. Please use a valid format.',

    [ErrorCode.UNAUTHORIZED]: 'Authentication required. Please log in to continue.',
    [ErrorCode.INVALID_TOKEN]: 'Your session has expired. Please log in again.',

    [ErrorCode.RESOURCE_NOT_FOUND]: 'The requested resource was not found.',
    [ErrorCode.AGENT_NOT_FOUND]: 'Agent not found. Please verify the agent ID and try again.',
    [ErrorCode.TEST_CASE_NOT_FOUND]: 'Test case not found. It may have been deleted.',
    [ErrorCode.RUN_NOT_FOUND]: 'Test run not found. It may have been deleted or expired.',

    [ErrorCode.RESOURCE_EXISTS]: 'A resource with this identifier already exists.',
    [ErrorCode.DUPLICATE_AGENT]: 'An agent with this ID is already configured.',

    [ErrorCode.RATE_LIMITED]: 'Too many requests. Please wait a moment and try again.',

    [ErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again later.',
    [ErrorCode.DATABASE_ERROR]: 'A database error occurred. Please try again.',
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'An external service is unavailable. Please try again later.',
    [ErrorCode.DIALOGFLOW_ERROR]: 'Failed to communicate with Dialogflow. Please check your credentials and agent configuration.',

    [ErrorCode.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable. Please try again later.',
};

// Standard API error response interface
export interface ApiErrorResponse {
    success: false;
    error: string;
    code: ErrorCodeType;
    details?: Array<{ field: string; message: string }>;
    timestamp: string;
}

// Standard API success response interface
export interface ApiSuccessResponse<T = unknown> {
    success: true;
    data: T;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
    code: ErrorCodeType,
    customMessage?: string,
    details?: Array<{ field: string; message: string }>
): ApiErrorResponse {
    return {
        success: false,
        error: customMessage || ERROR_MESSAGES[code],
        code,
        details,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
    return {
        success: true,
        data,
    };
}

/**
 * Get user-friendly message for an error code
 */
export function getErrorMessage(code: ErrorCodeType): string {
    return ERROR_MESSAGES[code] || ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR];
}

/**
 * Determines if an error message is safe to show to users
 * (doesn't contain sensitive implementation details)
 */
export function isSafeErrorMessage(message: string): boolean {
    const sensitivePatterns = [
        /SQLITE/i,
        /ECONNREFUSED/i,
        /ENOTFOUND/i,
        /password/i,
        /credential/i,
        /token/i,
        /secret/i,
        /api[_-]?key/i,
        /stack trace/i,
        /at\s+\w+\s+\(/i, // Stack trace patterns
    ];

    return !sensitivePatterns.some((pattern) => pattern.test(message));
}

/**
 * Sanitizes error message for production
 * Returns user-friendly message if original contains sensitive data
 */
export function sanitizeErrorMessage(message: string, fallbackCode: ErrorCodeType = ErrorCode.INTERNAL_ERROR): string {
    if (isSafeErrorMessage(message)) {
        return message;
    }
    return ERROR_MESSAGES[fallbackCode];
}

/**
 * Parse common error patterns and return appropriate error code
 */
export function parseErrorCode(error: Error | string): ErrorCodeType {
    const message = typeof error === 'string' ? error : error.message;

    if (message.includes('UNIQUE constraint failed')) {
        return ErrorCode.RESOURCE_EXISTS;
    }
    if (message.includes('not found') || message.includes('NOT FOUND')) {
        return ErrorCode.RESOURCE_NOT_FOUND;
    }
    if (message.includes('SQLITE') || message.includes('database')) {
        return ErrorCode.DATABASE_ERROR;
    }
    if (message.includes('Dialogflow') || message.includes('detect intent')) {
        return ErrorCode.DIALOGFLOW_ERROR;
    }
    if (message.includes('unauthorized') || message.includes('401')) {
        return ErrorCode.UNAUTHORIZED;
    }
    if (message.includes('rate limit') || message.includes('429')) {
        return ErrorCode.RATE_LIMITED;
    }

    return ErrorCode.INTERNAL_ERROR;
}
