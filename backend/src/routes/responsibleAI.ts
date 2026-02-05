import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { raiTestService, RAITestConfig } from '../services/raiTestService.js';
import { huggingFaceService, DatasetSample } from '../services/huggingFaceService.js';

const router = Router();

// Configure multer with temp storage that persists for retry capability
const UPLOAD_DIR = 'uploads/';
const FILE_TTL_MS = 60 * 60 * 1000; // 1 hour retention for retry

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({
    dest: UPLOAD_DIR,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Cleanup old temp files (runs on startup and periodically)
const cleanupOldFiles = () => {
    try {
        const files = fs.readdirSync(UPLOAD_DIR);
        const now = Date.now();

        for (const file of files) {
            const filePath = path.join(UPLOAD_DIR, file);
            const stats = fs.statSync(filePath);

            if (now - stats.mtimeMs > FILE_TTL_MS) {
                fs.unlinkSync(filePath);
                console.log(`Cleaned up expired temp file: ${file}`);
            }
        }
    } catch (error) {
        console.error('Error cleaning up temp files:', error);
    }
};

// Run cleanup on startup and every hour
cleanupOldFiles();
setInterval(cleanupOldFiles, FILE_TTL_MS);

// GET /api/v1/responsible-ai/datasets
// List available preset datasets
router.get('/datasets', (_req: Request, res: Response) => {
    try {
        const datasets = huggingFaceService.listPresetDatasets();
        res.json({
            success: true,
            data: datasets
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch datasets'
        });
    }
});

// POST /api/v1/responsible-ai/datasets/validate
// Validate a custom HuggingFace dataset
router.post('/datasets/validate', async (req: Request, res: Response) => {
    try {
        const { datasetId } = req.body;

        if (!datasetId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: datasetId'
            });
        }

        const datasetInfo = await huggingFaceService.validateCustomDataset(datasetId);

        if (!datasetInfo) {
            return res.status(404).json({
                success: false,
                error: `Dataset ${datasetId} not found or is not accessible`
            });
        }

        res.json({
            success: true,
            data: datasetInfo
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to validate dataset'
        });
    }
});

// POST /api/v1/responsible-ai/datasets/preview
// Get sample prompts from a dataset for preview
router.post('/datasets/preview', async (req: Request, res: Response) => {
    try {
        const { datasetId, limit = 10 } = req.body;

        if (!datasetId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: datasetId'
            });
        }

        const samples = await huggingFaceService.getDatasetSamples(datasetId, limit);

        res.json({
            success: true,
            data: samples
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch dataset preview'
        });
    }
});

// POST /api/v1/responsible-ai/upload
// Upload custom adversarial prompts via CSV
// CSV format: prompt,category
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const filePath = req.file.path;
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        // Note: File is NOT deleted immediately - retained for 1 hour for retry capability
        // Cleanup is handled by the periodic cleanupOldFiles job

        // Parse CSV content
        const samples = huggingFaceService.parseCSV(fileContent);

        if (samples.length === 0) {
            // Clean up invalid files immediately
            fs.unlinkSync(filePath);
            return res.status(400).json({
                success: false,
                error: 'No valid prompts found in CSV file. Expected format: prompt,category'
            });
        }

        res.json({
            success: true,
            data: {
                samples,
                count: samples.length
            }
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to parse CSV file'
        });
    }
});

// POST /api/v1/responsible-ai/test
// Start a new RAI test run
router.post('/test', async (req: Request, res: Response) => {
    try {
        const {
            agentId,
            projectId,
            location,
            datasetId,
            sampleSize = 50,
            categories = [],
            customPrompts
        } = req.body;

        // Validate required fields
        if (!agentId || !projectId || !location) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: agentId, projectId, location'
            });
        }

        // Need either datasetId or customPrompts
        if (!datasetId && (!customPrompts || customPrompts.length === 0)) {
            return res.status(400).json({
                success: false,
                error: 'Must provide either datasetId or customPrompts'
            });
        }

        const config: RAITestConfig = {
            agentId,
            projectId,
            location,
            datasetId,
            sampleSize: Math.min(sampleSize, 500), // Cap at 500
            categories,
            customPrompts: customPrompts as DatasetSample[]
        };

        const jobId = await raiTestService.createJob(config);

        res.json({
            success: true,
            data: { jobId }
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to start RAI test'
        });
    }
});

// GET /api/v1/responsible-ai/test/:jobId
// Get job status (for polling)
router.get('/test/:jobId', async (req: Request, res: Response) => {
    try {
        const job = await raiTestService.getJob(req.params.jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Job not found'
            });
        }

        res.json({
            success: true,
            data: job
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch job status'
        });
    }
});

// GET /api/v1/responsible-ai/test/:jobId/results
// Get detailed results
router.get('/test/:jobId/results', async (req: Request, res: Response) => {
    try {
        const job = await raiTestService.getJob(req.params.jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Job not found'
            });
        }

        res.json({
            success: true,
            data: {
                results: job.results,
                summary: job.summary
            }
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch job results'
        });
    }
});

// GET /api/v1/responsible-ai/history
// List past RAI test runs for an agent
router.get('/history', async (req: Request, res: Response) => {
    try {
        const { agentId } = req.query;

        if (!agentId || typeof agentId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Missing required query parameter: agentId'
            });
        }

        const history = await raiTestService.getHistory(agentId);

        res.json({
            success: true,
            data: history
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch test history'
        });
    }
});

// GET /api/v1/responsible-ai/export/:jobId
// Export results as CSV
router.get('/export/:jobId', async (req: Request, res: Response) => {
    try {
        const job = await raiTestService.getJob(req.params.jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Job not found'
            });
        }

        if (job.status !== 'completed') {
            return res.status(400).json({
                success: false,
                error: 'Job is not yet completed'
            });
        }

        const csv = raiTestService.generateCSVReport(job.results);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="rai_test_report_${job.id}.csv"`);
        res.send(csv);
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to export results'
        });
    }
});

export default router;
