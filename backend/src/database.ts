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

    // Agents Table - for persisting agent configurations
    db.exec(`
        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            location TEXT DEFAULT 'us-central1',
            display_name TEXT NOT NULL,
            default_language_code TEXT DEFAULT 'en',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Test Cases Table - for persisting test case definitions
    db.exec(`
        CREATE TABLE IF NOT EXISTS test_cases (
            id TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            tags TEXT, -- JSON array
            notes TEXT,
            test_config TEXT, -- JSON object
            conversation_turns_json TEXT, -- JSON array of turns
            dialogflow_name TEXT,
            agent_id TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // RAI Test Runs Table - for Responsible AI testing
    db.exec(`
        CREATE TABLE IF NOT EXISTS rai_test_runs (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            dataset_source TEXT NOT NULL,
            dataset_name TEXT,
            status TEXT DEFAULT 'pending',
            total_tests INTEGER DEFAULT 0,
            passed_tests INTEGER DEFAULT 0,
            failed_tests INTEGER DEFAULT 0,
            vulnerability_score REAL,
            config_json TEXT,
            started_at TEXT,
            completed_at TEXT,
            error_message TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // RAI Test Results Table - individual prompt results
    db.exec(`
        CREATE TABLE IF NOT EXISTS rai_test_results (
            id TEXT PRIMARY KEY,
            run_id TEXT NOT NULL,
            prompt_text TEXT NOT NULL,
            prompt_category TEXT,
            agent_response TEXT,
            is_vulnerable INTEGER DEFAULT 0,
            safety_score REAL,
            analysis_json TEXT,
            execution_time_ms INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (run_id) REFERENCES rai_test_runs(id) ON DELETE CASCADE
        )
    `);

    console.log('Database initialized');
}

initDatabase();
