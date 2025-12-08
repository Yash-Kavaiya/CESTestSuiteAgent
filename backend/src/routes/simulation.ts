import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { simulationService } from '../services/simulationService.js';
import { Parser } from 'json2csv';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Upload CSV and start simulation
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        // Clean up file
        fs.unlinkSync(filePath);

        const jobId = await simulationService.createJob(fileContent);

        res.json({
            success: true,
            data: { jobId }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get job status
router.get('/:jobId', (req: Request, res: Response) => {
    const job = simulationService.getJob(req.params.jobId);

    if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({
        success: true,
        data: job
    });
});

// Download report
router.get('/:jobId/download', (req: Request, res: Response) => {
    const job = simulationService.getJob(req.params.jobId);

    if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
    }

    try {
        const fields = ['conversationId', 'turnNumber', 'userInput', 'agentResponse', 'intent', 'confidence', 'page', 'error', 'timestamp'];
        const parser = new Parser({ fields });

        // Sort results by conversationId and then turnNumber
        const sortedResults = [...job.results].sort((a, b) => {
            if (a.conversationId !== b.conversationId) {
                return a.conversationId.localeCompare(b.conversationId, undefined, { numeric: true });
            }
            return a.turnNumber - b.turnNumber;
        });

        const csv = parser.parse(sortedResults);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="simulation_report_${job.id}.csv"`);
        res.send(csv);
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
