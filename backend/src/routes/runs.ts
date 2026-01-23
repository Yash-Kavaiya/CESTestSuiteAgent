import express from 'express';
import { simulationService } from '../services/simulationService.js';
import { db } from '../database.js';

const router = express.Router();

// List all runs
router.get('/', (req, res) => {
    try {
        const runs = simulationService.getAllJobs();
        res.json(runs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Run batch (Assuming this is an alias or alternative to /upload for structured input?)
// But frontend calls /runs/batch with { conversations: ... }. 
// The current simulationService expects CSV content.
// I should probably adapt createJob or create a new method for structured input.
// For now, let's just stick to what `simulation.ts` does for creating jobs via /upload
// If I want /runs/batch to work, I need to implement it.
// The frontend uses `client.post('/runs/batch', params);`
// Params: { agentId, conversations: [{ input, ... }], ... }

router.post('/batch', async (req, res) => {
    // Stub for future structured batch implementation
    // For now we rely on the /upload endpoint for CSVs
    res.status(501).json({ error: "Use /api/v1/simulation/upload for now" });
});

// Get run status
router.get('/:runId', (req, res) => {
    try {
        const job = simulationService.getJob(req.params.runId);
        if (!job) {
            return res.status(404).json({ error: 'Run not found' });
        }
        res.json(job);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get run results details
router.get('/:runId/results', (req, res) => {
    try {
        const runId = req.params.runId;
        const job = simulationService.getJob(runId);
        if (!job) {
            return res.status(404).json({ error: 'Run not found' });
        }

        // Fetch detailed test_results from DB
        // We want per-conversation results with turns
        const resultsRows = db.prepare('SELECT * FROM test_results WHERE run_id = ?').all(runId) as any[];

        const results = resultsRows.map(row => {
            let turns = [];
            try {
                turns = JSON.parse(row.conversation_turns_json);
            } catch (e) {
                turns = [];
            }

            const mappedTurns = turns.map((turn: any, index: number) => ({
                turnNumber: turn.turnNumber || index + 1,
                userInput: typeof turn.userInput === 'object' ? JSON.stringify(turn.userInput) : (turn.userInput || ''),
                expectedIntent: turn.intent || '-',
                actualIntent: turn.intent || '-', // For simulation, we assume intent matched if confidence > threshold, or just echo it
                conversationId: turn.conversationId,
                differences: turn.differences || [],
                passed: turn.error ? false : true, // Heuristic: if no error, it "passed"
                // Add execution time or timestamp if needed
            }));

            return {
                id: row.id,
                runId: row.run_id,
                testCaseId: row.test_case_id,
                testCaseName: row.test_case_name,
                status: row.status,
                overallPassed: Boolean(row.overall_passed),
                executionTimeMs: row.execution_time_ms,
                createdAt: row.created_at,
                conversationTurns: mappedTurns,
            };
        });

        res.json({
            run: job,
            results: results
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get run coverage stats
router.get('/:runId/coverage', async (req, res) => {
    try {
        const runId = req.params.runId;
        const job = simulationService.getJob(runId);
        if (!job) {
            return res.status(404).json({ error: 'Run not found' });
        }

        // Get all results for this run
        // We need to parse all conversation turns to get unique intents/pages
        const resultsRows = db.prepare('SELECT conversation_turns_json FROM test_results WHERE run_id = ?').all(runId) as any[];

        const uniqueIntents = new Set<string>();
        const uniquePages = new Set<string>();
        let transitionCount = 0;

        resultsRows.forEach(row => {
            try {
                const turns = JSON.parse(row.conversation_turns_json);
                turns.forEach((turn: any) => {
                    if (turn.intent) uniqueIntents.add(turn.intent);
                    if (turn.page) uniquePages.add(turn.page);
                });
                // Rough transition count: distinct pages per conversation? Or just total turns?
                // Just counting turns as transitions for now
                transitionCount += turns.length;
            } catch (e) { }
        });

        // Mock totals for now since we don't fetch full agent definition yet
        // In a real scenario, we'd fetch agent definition from Dialogflow
        const totalIntents = 50;
        const totalPages = 20;

        res.json({
            intentCoverage: Math.round((uniqueIntents.size / totalIntents) * 100),
            pageCoverage: Math.round((uniquePages.size / totalPages) * 100),
            transitionCoverage: 0, // Placeholder
            testedIntents: uniqueIntents.size,
            totalIntents: totalIntents,
            testedPages: uniquePages.size,
            totalPages: totalPages,
            untestedIntents: [], // TODO: Diff with full list
            untestedPages: []
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
