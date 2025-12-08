import Database from 'better-sqlite3';
import { config } from './config.js';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dbPath = config.database.url;
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

import type { Database as DatabaseType } from 'better-sqlite3';

export const db: DatabaseType = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

export function initDatabase() {
    // Test Runs Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS test_runs (
            id TEXT PRIMARY KEY,
            name TEXT,
            status TEXT,
            total_tests INTEGER,
            passed_tests INTEGER,
            failed_tests INTEGER,
            started_at TEXT,
            completed_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            agent_id TEXT
        )
    `);

    // Test Results Table
    // Storing complex conversation objects as JSON for flexibility
    db.exec(`
        CREATE TABLE IF NOT EXISTS test_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT,
            test_case_id TEXT,
            test_case_name TEXT,
            status TEXT,
            overall_passed BOOLEAN,
            execution_time_ms INTEGER,
            conversation_turns_json TEXT, -- JSON array of turns
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (run_id) REFERENCES test_runs(id) ON DELETE CASCADE
        )
    `);

    // Coverage stats cache (optional, or just calc on fly)
    console.log('Database initialized');
}

initDatabase();
