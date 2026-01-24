import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

const router = Router();

// In-memory storage for runtime settings (in production, use database)
let geminiSettings = {
    apiKey: config.gemini.apiKey || '',
    model: config.gemini.model || 'gemini-2.5-flash',
};

// Configure multer for credentials file upload
const credentialsStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.resolve(__dirname, '../../uploads/credentials');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Save as credentials.json to standardize
        cb(null, 'credentials.json');
    },
});

const credentialsUpload = multer({
    storage: credentialsStorage,
    fileFilter: (req, file, cb) => {
        // Only accept JSON files
        if (file.mimetype === 'application/json' || path.extname(file.originalname) === '.json') {
            cb(null, true);
        } else {
            cb(new Error('Only JSON files are allowed'));
        }
    },
    limits: {
        fileSize: 10 * 1024, // 10KB max - credentials files are small
    },
});

// Upload credentials file
router.post('/credentials', credentialsUpload.single('credentials'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
            });
        }

        const filePath = req.file.path;

        // Validate it's a valid service account JSON
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const json = JSON.parse(content);

            // Check for required service account fields
            if (!json.type || json.type !== 'service_account') {
                fs.unlinkSync(filePath); // Remove invalid file
                return res.status(400).json({
                    success: false,
                    error: 'Invalid service account file. Must be a Google Cloud service account key.',
                });
            }

            if (!json.project_id || !json.private_key || !json.client_email) {
                fs.unlinkSync(filePath);
                return res.status(400).json({
                    success: false,
                    error: 'Invalid service account file. Missing required fields.',
                });
            }

            // Update .env file or environment variable
            process.env.GOOGLE_APPLICATION_CREDENTIALS = filePath;

            return res.json({
                success: true,
                data: {
                    projectId: json.project_id,
                    clientEmail: json.client_email,
                    filename: req.file.originalname,
                    uploadedAt: new Date().toISOString(),
                },
                message: 'Credentials uploaded successfully',
            });
        } catch (parseError: any) {
            fs.unlinkSync(filePath);
            return res.status(400).json({
                success: false,
                error: 'Invalid JSON file: ' + parseError.message,
            });
        }
    } catch (error: any) {
        console.error('Credentials upload error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to upload credentials',
        });
    }
});

// Get current credentials status
router.get('/credentials', (req: Request, res: Response) => {
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!credentialsPath || !fs.existsSync(credentialsPath)) {
        return res.json({
            success: true,
            data: {
                configured: false,
            },
        });
    }

    try {
        const content = fs.readFileSync(credentialsPath, 'utf-8');
        const json = JSON.parse(content);

        return res.json({
            success: true,
            data: {
                configured: true,
                projectId: json.project_id,
                clientEmail: json.client_email,
            },
        });
    } catch {
        return res.json({
            success: true,
            data: {
                configured: false,
            },
        });
    }
});

// Delete credentials
router.delete('/credentials', (req: Request, res: Response) => {
    const uploadDir = path.resolve(__dirname, '../../uploads/credentials');
    const credentialsPath = path.join(uploadDir, 'credentials.json');

    try {
        if (fs.existsSync(credentialsPath)) {
            fs.unlinkSync(credentialsPath);
        }
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

        return res.json({
            success: true,
            message: 'Credentials removed successfully',
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to remove credentials',
        });
    }
});

// Get Gemini AI settings
router.get('/gemini', (req: Request, res: Response) => {
    // Mask the API key for security (show only last 4 characters)
    const maskedKey = geminiSettings.apiKey
        ? '****' + geminiSettings.apiKey.slice(-4)
        : '';

    return res.json({
        success: true,
        data: {
            apiKey: geminiSettings.apiKey, // Send full key so it can be edited
            apiKeyMasked: maskedKey,
            model: geminiSettings.model,
            configured: !!geminiSettings.apiKey,
        },
    });
});

// Save Gemini AI settings
router.post('/gemini', async (req: Request, res: Response) => {
    try {
        const { apiKey, model } = req.body;

        if (!apiKey) {
            return res.status(400).json({
                success: false,
                error: 'API key is required',
            });
        }

        // Update in-memory settings
        geminiSettings.apiKey = apiKey;
        geminiSettings.model = model || 'gemini-2.5-flash';

        // Update environment variables
        process.env.GEMINI_API_KEY = apiKey;
        process.env.GEMINI_MODEL = model || 'gemini-2.5-flash';
        config.gemini.apiKey = apiKey;
        config.gemini.model = model || 'gemini-2.5-flash';

        // Persist to .env file
        const envPath = path.resolve(__dirname, '../../.env');

        try {
            let envContent = '';
            if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, 'utf-8');
            }

            const envLines = envContent.split('\n');
            const newEnvLines: string[] = [];
            let apiKeyFound = false;
            let modelFound = false;

            for (const line of envLines) {
                if (line.startsWith('GEMINI_API_KEY=')) {
                    newEnvLines.push(`GEMINI_API_KEY=${apiKey}`);
                    apiKeyFound = true;
                } else if (line.startsWith('GEMINI_MODEL=')) {
                    newEnvLines.push(`GEMINI_MODEL=${model || 'gemini-2.5-flash'}`);
                    modelFound = true;
                } else {
                    newEnvLines.push(line);
                }
            }

            if (!apiKeyFound) {
                newEnvLines.push(`GEMINI_API_KEY=${apiKey}`);
            }
            if (!modelFound) {
                newEnvLines.push(`GEMINI_MODEL=${model || 'gemini-2.5-flash'}`);
            }

            // Remove empty lines at the end before joining (optional cleanup)
            const finalContent = newEnvLines.join('\n').replace(/\n+$/, '') + '\n';

            fs.writeFileSync(envPath, finalContent);
            console.log('Updated .env file with new Gemini settings');
        } catch (fileError) {
            console.error('Failed to write to .env file:', fileError);
            // Continue even if file write fails, as in-memory update worked
        }

        return res.json({
            success: true,
            message: 'Gemini settings saved successfully',
            data: {
                model: geminiSettings.model,
                configured: true,
            },
        });
    } catch (error: any) {
        console.error('Save Gemini settings error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to save settings',
        });
    }
});

export default router;
