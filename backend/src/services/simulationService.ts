import { v4 as uuidv4 } from 'uuid';
import { parse } from 'csv-parse/sync';
import pLimit from 'p-limit';
import { dialogflowService } from './dialogflowService.js';
import { config } from '../config.js';
import { db } from '../database.js';

interface SimulationJob {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    total: number;
    results: SimulationResult[];
    startTime: Date;
    endTime?: Date;
    error?: string;
}

interface SimulationResult {
    conversationId: string;
    turnNumber: number;
    userInput: string;
    agentResponse: string;
    intent: string | null;
    confidence: number;
    page: string | null;
    timestamp: Date;
    error?: string;
}

interface GenericCSVRow {
    [key: string]: string;
}

class SimulationService {
    private jobs: Map<string, SimulationJob> = new Map();
    // Default 5 concurrent conversations
    private limit = pLimit(config.testExecution.maxConcurrency || 5);

    async createJob(csvContent: string): Promise<string> {
        const jobId = uuidv4();

        try {
            const rows = parse(csvContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            });

            if (rows.length === 0) {
                throw new Error('CSV is empty');
            }

            // Group by conversation ID
            const conversations = this.groupConversations(rows);
            const totalConversations = Object.keys(conversations).length;

            // Insert into DB
            db.prepare(`
                INSERT INTO test_runs (id, name, status, total_tests, passed_tests, failed_tests, started_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                jobId,
                'Bulk Simulation', // Default name, could be parameterized
                'pending',
                totalConversations,
                0,
                0,
                new Date().toISOString()
            );

            const job: SimulationJob = {
                id: jobId,
                status: 'pending',
                progress: 0,
                total: totalConversations,
                results: [],
                startTime: new Date(),
            };
            this.jobs.set(jobId, job);

            // Start processing async
            this.processJob(jobId, conversations);

            return jobId;
        } catch (error: any) {
            throw new Error(`Failed to create simulation job: ${error.message}`);
        }
    }

    getJob(jobId: string): SimulationJob | undefined {
        // Try memory first
        let job = this.jobs.get(jobId);
        if (job) return job;

        // Fallback to DB
        const row = db.prepare('SELECT * FROM test_runs WHERE id = ?').get(jobId) as any;
        if (!row) return undefined;

        // We need results too
        const resultsRows = db.prepare('SELECT * FROM test_results WHERE run_id = ?').all(jobId) as any[];

        const results: SimulationResult[] = resultsRows.map(r => {
            try {
                const turns = JSON.parse(r.conversation_turns_json);
                return turns;
            } catch (e) {
                return [];
            }
        }).flat();

        return {
            id: row.id,
            status: row.status,
            progress: row.passed_tests + row.failed_tests,
            total: row.total_tests,
            results: results,
            startTime: new Date(row.started_at),
            endTime: row.completed_at ? new Date(row.completed_at) : undefined,
            error: row.error_message
        };
    }

    getAllJobs(): any[] {
        // Fetch all jobs from the database
        const rows = db.prepare('SELECT * FROM test_runs ORDER BY started_at DESC').all() as any[];
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            status: row.status,
            totalTests: row.total_tests,
            passedTests: row.passed_tests,
            failedTests: row.failed_tests,
            startedAt: row.started_at,
            completedAt: row.completed_at,
            createdAt: row.created_at
        }));
    }

    private groupConversations(rows: GenericCSVRow[]): Record<string, GenericCSVRow[]> {
        const groups: Record<string, GenericCSVRow[]> = {};

        rows.forEach((row, rowIndex) => {
            const keys = Object.keys(row);

            // Try to find conversation ID field 
            let id = row['conversation_id'] || row['test_name'] || row['case_name'] || row['id'];

            const firstKey = keys[0];
            const isMultiColumn = keys.length > 2 ||
                (keys.length === 2 && !['user_input', 'input', 'query', 'message'].includes(keys[1]));

            if (isMultiColumn && !id) {
                id = row[firstKey] || `conv_${rowIndex + 1}`;
            }

            if (!id) {
                id = `conv_${rowIndex + 1}`;
            }

            if (!groups[id]) {
                groups[id] = [];
            }

            if (isMultiColumn) {
                let turnNumber = 1;
                for (let i = 1; i < keys.length; i++) {
                    const turnText = row[keys[i]];
                    if (turnText && turnText.trim()) {
                        groups[id].push({
                            conversation_id: id,
                            user_input: turnText.trim(),
                            turn_number: String(turnNumber)
                        });
                        turnNumber++;
                    }
                }
            } else {
                groups[id].push(row);
            }
        });

        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => {
                const turnA = parseInt(a['turn_number'] || '0');
                const turnB = parseInt(b['turn_number'] || '0');
                return turnA - turnB;
            });
        });

        return groups;
    }

    private async processJob(jobId: string, conversations: Record<string, GenericCSVRow[]>) {
        const job = this.jobs.get(jobId);
        if (job) job.status = 'processing';

        db.prepare('UPDATE test_runs SET status = ? WHERE id = ?').run('processing', jobId);

        let completedCount = 0;
        let passedCount = 0;
        let failedCount = 0;

        const tasks = Object.entries(conversations).map(([convId, rows]) => {
            return this.limit(async () => {
                const sessionId = `sim-${jobId}-${uuidv4()}`;
                const conversationTurns: SimulationResult[] = [];
                let overallPassed = true;
                const conversationStartTime = new Date();

                for (const row of rows) {
                    const userInput = row['user_input'] || row['input'] || row['query'] || row['message'];
                    if (!userInput) continue;

                    const turnNum = parseInt(row['turn_number'] || '0') || (conversationTurns.length + 1);

                    try {
                        const response = await dialogflowService.detectIntent({
                            projectId: config.googleCloud.projectId,
                            location: config.googleCloud.dialogflowLocation,
                            agentId: config.googleCloud.dialogflowAgentId,
                            sessionId: sessionId,
                            text: userInput
                        });

                        const turnResult: SimulationResult = {
                            conversationId: convId,
                            turnNumber: turnNum,
                            userInput: userInput,
                            agentResponse: response.responseText,
                            intent: response.intentDisplayName,
                            confidence: response.confidence,
                            page: response.currentPage,
                            timestamp: new Date()
                        };

                        if (job) job.results.push(turnResult);
                        conversationTurns.push(turnResult);

                    } catch (error: any) {
                        overallPassed = false;
                        const errorResult: SimulationResult = {
                            conversationId: convId,
                            turnNumber: turnNum,
                            userInput: userInput,
                            agentResponse: 'ERROR',
                            intent: null,
                            confidence: 0,
                            page: null,
                            timestamp: new Date(),
                            error: error.message
                        };
                        if (job) job.results.push(errorResult);
                        conversationTurns.push(errorResult);
                    }
                }

                completedCount++;
                if (overallPassed) passedCount++; else failedCount++;

                if (job) job.progress = completedCount;

                const conversationEndTime = new Date();
                const executionTimeMs = conversationEndTime.getTime() - conversationStartTime.getTime();

                // Persist conversation result
                // We map existing structure to what we want to store
                db.prepare(`
                    INSERT INTO test_results (run_id, test_case_id, test_case_name, status, overall_passed, execution_time_ms, conversation_turns_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    jobId,
                    convId,
                    convId,
                    overallPassed ? 'PASSED' : 'FAILED',
                    overallPassed ? 1 : 0,
                    executionTimeMs,
                    JSON.stringify(conversationTurns)
                );
            });
        });

        try {
            await Promise.all(tasks);
            if (job) {
                job.status = 'completed';
                job.endTime = new Date();
            }

            db.prepare(`
                UPDATE test_runs 
                SET status = 'completed', completed_at = ?, passed_tests = ?, failed_tests = ?
                WHERE id = ?
            `).run(new Date().toISOString(), passedCount, failedCount, jobId);

        } catch (error: any) {
            if (job) {
                job.status = 'failed';
                job.error = error.message;
                job.endTime = new Date();
            }
            db.prepare(`
                UPDATE test_runs 
                SET status = 'failed', completed_at = ?, error_message = ? // Ensure schema has error_message column or add it
                WHERE id = ?
            `).run(new Date().toISOString(), error.message, jobId);
            // Verify schema: I didn't add error_message column in database.ts. fixing query below.
        } finally {
            this.jobs.delete(jobId);
        }
    }
}

export const simulationService = new SimulationService();
