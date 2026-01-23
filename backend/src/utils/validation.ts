import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { createErrorResponse, ErrorCode } from './errors.js';

// ============================================
// Agent Schemas
// ============================================

export const createAgentSchema = z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    agentId: z.string().min(1, 'Agent ID is required'),
    displayName: z.string().min(1, 'Display name is required'),
    location: z.string().optional().default('us-central1'),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;

// ============================================
// Test Case Schemas
// ============================================

export const conversationTurnSchema = z.object({
    virtualAgentOutput: z.object({
        triggeredIntent: z.object({
            name: z.string().optional(),
            displayName: z.string().optional(),
        }).optional(),
        currentPage: z.object({
            name: z.string().optional(),
            displayName: z.string().optional(),
        }).optional(),
        textResponses: z.array(z.object({
            text: z.array(z.string()).optional(),
        })).optional(),
    }).optional(),
    userInput: z.object({
        input: z.string().optional(),
        isWebhookEnabled: z.boolean().optional(),
        enableSentimentAnalysis: z.boolean().optional(),
    }).optional(),
});

export const testCaseSchema = z.object({
    displayName: z.string().min(1, 'Display name is required'),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    testConfig: z.object({
        trackingParameters: z.array(z.string()).optional(),
        flow: z.string().optional(),
        page: z.string().optional(),
    }).optional(),
    conversationTurns: z.array(conversationTurnSchema).optional(),
    agentId: z.string().optional(),
});

export type CreateTestCaseInput = z.infer<typeof testCaseSchema>;

export const bulkTestCasesSchema = z.object({
    testCases: z.array(z.object({
        displayName: z.string().min(1),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
        testConfig: z.any().optional(),
        testCaseConversationTurns: z.array(z.any()).optional(),
    })),
    agentId: z.string().optional(),
});

export const bulkDeleteSchema = z.object({
    ids: z.array(z.string().min(1)).min(1, 'At least one ID is required'),
});

// ============================================
// Simulation Schemas
// ============================================

export const simulationSchema = z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    location: z.string().optional().default('us-central1'),
    agentId: z.string().min(1, 'Agent ID is required'),
});

// ============================================
// Validation Middleware
// ============================================

export function validateRequest<T extends z.ZodType>(schema: T) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = schema.safeParse(req.body);

            if (!result.success) {
                const errors = result.error.errors.map(err => ({
                    field: err.path.join('.') || 'unknown',
                    message: formatValidationMessage(err),
                }));

                return res.status(400).json(
                    createErrorResponse(ErrorCode.VALIDATION_FAILED, undefined, errors)
                );
            }

            // Replace body with parsed/validated data
            req.body = result.data;
            next();
        } catch (error: any) {
            return res.status(400).json(
                createErrorResponse(ErrorCode.INVALID_INPUT, 'Failed to validate request data.')
            );
        }
    };
}

/**
 * Formats validation error messages to be more user-friendly
 */
function formatValidationMessage(error: z.ZodIssue): string {
    const field = error.path.join('.') || 'field';

    switch (error.code) {
        case 'invalid_type':
            if (error.received === 'undefined') {
                return `${capitalize(field)} is required`;
            }
            return `${capitalize(field)} must be a ${error.expected}`;
        case 'too_small':
            if (error.type === 'string') {
                return `${capitalize(field)} must be at least ${(error as any).minimum} characters`;
            }
            return `${capitalize(field)} must be at least ${(error as any).minimum}`;
        case 'too_big':
            if (error.type === 'string') {
                return `${capitalize(field)} must be at most ${(error as any).maximum} characters`;
            }
            return `${capitalize(field)} must be at most ${(error as any).maximum}`;
        case 'invalid_string':
            if ((error as any).validation === 'email') {
                return `${capitalize(field)} must be a valid email address`;
            }
            return `${capitalize(field)} format is invalid`;
        default:
            return error.message || `${capitalize(field)} is invalid`;
    }
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/([A-Z])/g, ' $1').trim();
}

// ============================================
// Query Param Validators
// ============================================

export const paginationSchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

export function validateQuery<T extends z.ZodType>(schema: T) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = schema.safeParse(req.query);

            if (!result.success) {
                const errors = result.error.errors.map(err => ({
                    field: err.path.join('.') || 'unknown',
                    message: formatValidationMessage(err),
                }));

                return res.status(400).json(
                    createErrorResponse(ErrorCode.VALIDATION_FAILED, 'Invalid query parameters', errors)
                );
            }

            req.query = result.data as any;
            next();
        } catch (error: any) {
            return res.status(400).json(
                createErrorResponse(ErrorCode.INVALID_INPUT, 'Failed to validate query parameters.')
            );
        }
    };
}
