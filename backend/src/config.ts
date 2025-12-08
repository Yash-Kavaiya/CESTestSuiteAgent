import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
    // Server
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Google Cloud
    googleCloud: {
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
        credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
        dialogflowLocation: process.env.DIALOGFLOW_LOCATION || 'global',
        dialogflowAgentId: process.env.DIALOGFLOW_AGENT_ID || '',
    },

    // Redis (for Bull queue)
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },

    // Database
    database: {
        url: process.env.DATABASE_URL || './data/database.sqlite',
    },

    // Frontend
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

    // Test Execution
    testExecution: {
        maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '5', 10),
        timeoutMs: parseInt(process.env.TEST_TIMEOUT_MS || '30000', 10),
        retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '2', 10),
    },
};

export default config;
