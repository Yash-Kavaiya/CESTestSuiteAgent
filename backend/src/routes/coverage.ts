import { Router } from 'express';
import { conversationTestService } from '../services/conversationTestService.js';
import { db } from '../database.js';

const router = Router();

// Prepared statement to get agent details
const getAgentById = db.prepare('SELECT * FROM agents WHERE id = ?');

/**
 * Calculate coverage for an agent
 * GET /api/v1/coverage/:agentId?type=INTENT|PAGE_TRANSITION|TRANSITION_ROUTE_GROUP
 */
router.get('/:agentId', async (req, res) => {
    try {
        const { agentId } = req.params;
        const { type = 'INTENT' } = req.query;

        // Validate coverage type
        const validTypes = ['INTENT', 'PAGE_TRANSITION', 'TRANSITION_ROUTE_GROUP'];
        if (!validTypes.includes(type as string)) {
            return res.status(400).json({
                success: false,
                error: `Invalid coverage type. Must be one of: ${validTypes.join(', ')}`,
            });
        }

        // Verify agent exists
        const agent = getAgentById.get(agentId);
        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found',
            });
        }

        // Calculate coverage using Dialogflow CX API
        const coverageData = await conversationTestService.calculateCoverage(
            agentId,
            type as 'INTENT' | 'PAGE_TRANSITION' | 'TRANSITION_ROUTE_GROUP'
        );

        res.json({
            success: true,
            data: {
                agentId,
                coverageType: type,
                ...coverageData,
            },
        });
    } catch (error: any) {
        console.error('Error calculating coverage:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to calculate coverage',
        });
    }
});

/**
 * Calculate all coverage types for an agent
 * GET /api/v1/coverage/:agentId/all
 */
router.get('/:agentId/all', async (req, res) => {
    try {
        const { agentId } = req.params;

        // Verify agent exists
        const agent = getAgentById.get(agentId);
        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found',
            });
        }

        // Calculate all coverage types in parallel
        const [intentCoverage, pageTransitionCoverage, routeGroupCoverage] = await Promise.all([
            conversationTestService.calculateCoverage(agentId, 'INTENT'),
            conversationTestService.calculateCoverage(agentId, 'PAGE_TRANSITION'),
            conversationTestService.calculateCoverage(agentId, 'TRANSITION_ROUTE_GROUP'),
        ]);

        res.json({
            success: true,
            data: {
                agentId,
                intentCoverage,
                pageTransitionCoverage,
                routeGroupCoverage,
            },
        });
    } catch (error: any) {
        console.error('Error calculating all coverage:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to calculate coverage',
        });
    }
});

export default router;
