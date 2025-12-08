import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import testCasesRoutes from './routes/testCases.js';
import runsRoutes from './routes/runs.js';
import resultsRoutes from './routes/results.js';
import agentsRoutes from './routes/agents.js';
import simulatorRoutes from './routes/simulator.js';
import { db, initDatabase } from './database.js'; // Ensure DB is init
import simulationRoutes from './routes/simulation.js';

const app = express();

// Middleware
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/test-cases', testCasesRoutes);
app.use('/api/v1/runs', runsRoutes);
app.use('/api/v1/results', resultsRoutes);
app.use('/api/v1/agents', agentsRoutes);
app.use('/api/v1/simulator', simulatorRoutes);
app.use('/api/v1/simulation', simulationRoutes);


// Analytics routes
app.get('/api/v1/analytics/dashboard', (req, res) => {
    // Mock dashboard data
    res.json({
        success: true,
        data: {
            totalTestCases: 156,
            totalRuns: 42,
            lastRunPassRate: 87.5,
            overallPassRate: 82.3,
            avgExecutionTime: 1.2,
            coverage: {
                totalIntents: 45,
                testedIntents: 38,
                intentCoveragePercent: 84.4,
                totalPages: 12,
                testedPages: 10,
                pageCoveragePercent: 83.3,
                untestedIntents: ['fallback.default', 'system.goodbye'],
                untestedPages: ['Error Page', 'Maintenance'],
            },
            recentRuns: [],
            trends: [],
        },
    });
});

app.get('/api/v1/analytics/coverage', (req, res) => {
    res.json({
        success: true,
        data: {
            totalIntents: 45,
            testedIntents: 38,
            intentCoveragePercent: 84.4,
            totalPages: 12,
            testedPages: 10,
            pageCoveragePercent: 83.3,
            untestedIntents: ['fallback.default', 'system.goodbye'],
            untestedPages: ['Error Page', 'Maintenance'],
        },
    });
});

app.get('/api/v1/analytics/trends', (req, res) => {
    res.json({
        success: true,
        data: [
            { date: 'Mon', totalTests: 45, passedTests: 38, failedTests: 7, passRate: 84 },
            { date: 'Tue', totalTests: 52, passedTests: 45, failedTests: 7, passRate: 87 },
            { date: 'Wed', totalTests: 38, passedTests: 30, failedTests: 8, passRate: 79 },
            { date: 'Thu', totalTests: 65, passedTests: 58, failedTests: 7, passRate: 89 },
            { date: 'Fri', totalTests: 50, passedTests: 44, failedTests: 6, passRate: 88 },
        ],
    });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: config.nodeEnv === 'development' ? err.message : 'Internal server error',
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not found',
    });
});

// Start server
app.listen(config.port, () => {
    console.log(`🚀 Server running on http://localhost:${config.port}`);
    console.log(`📊 Environment: ${config.nodeEnv}`);
});

export default app;
