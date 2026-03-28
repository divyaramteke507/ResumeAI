import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isVercel = process.env.VERCEL === '1';
const DB_PATH = isVercel 
  ? path.join('/tmp', 'candidates.sqlite')
  : path.join(__dirname, '..', 'db', 'candidates.sqlite');

// Ensure db directory exists (if not on Vercel or if creating in tmp)
if (!isVercel) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS job_descriptions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    required_skills TEXT DEFAULT '[]',
    preferred_skills TEXT DEFAULT '[]',
    min_experience INTEGER DEFAULT 0,
    education_requirement TEXT DEFAULT '',
    feature_weights TEXT DEFAULT '{}',
    confidence REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    jd_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    config TEXT DEFAULT '{}',
    stats TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (jd_id) REFERENCES job_descriptions(id)
  );

  CREATE TABLE IF NOT EXISTS candidates (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    jd_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    name TEXT DEFAULT 'Unknown',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    raw_text TEXT DEFAULT '',
    sections TEXT DEFAULT '{}',
    parse_method TEXT DEFAULT '',
    parse_confidence REAL DEFAULT 0.0,
    matched_skills TEXT DEFAULT '[]',
    missing_skills TEXT DEFAULT '[]',
    preferred_matched TEXT DEFAULT '[]',
    total_yoe REAL DEFAULT 0.0,
    yoe_per_role TEXT DEFAULT '[]',
    education TEXT DEFAULT '{}',
    employment_gaps TEXT DEFAULT '[]',
    composite_score REAL DEFAULT 0.0,
    sub_scores TEXT DEFAULT '{}',
    penalties TEXT DEFAULT '[]',
    bonuses TEXT DEFAULT '[]',
    explanation TEXT DEFAULT '',
    rank INTEGER DEFAULT 0,
    recommendation TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    key_highlights TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs(id),
    FOREIGN KEY (jd_id) REFERENCES job_descriptions(id)
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    event TEXT NOT NULL,
    details TEXT DEFAULT '{}',
    FOREIGN KEY (run_id) REFERENCES runs(id)
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id TEXT NOT NULL,
    action TEXT NOT NULL,
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id)
  );
`);

// ─── Prepared Statements ───────────────────────────────────────────────────

export const queries = {
  // Job Descriptions
  insertJD: db.prepare(`
    INSERT INTO job_descriptions (id, title, raw_text, required_skills, preferred_skills, min_experience, education_requirement, feature_weights, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getJD: db.prepare(`SELECT * FROM job_descriptions WHERE id = ?`),
  getAllJDs: db.prepare(`SELECT * FROM job_descriptions ORDER BY created_at DESC`),

  // Runs
  insertRun: db.prepare(`
    INSERT INTO runs (id, jd_id, status, config) VALUES (?, ?, ?, ?)
  `),
  getRun: db.prepare(`SELECT * FROM runs WHERE id = ?`),
  updateRunStatus: db.prepare(`UPDATE runs SET status = ?, stats = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?`),
  getRunsByJD: db.prepare(`SELECT * FROM runs WHERE jd_id = ? ORDER BY created_at DESC`),

  // Candidates
  insertCandidate: db.prepare(`
    INSERT INTO candidates (id, run_id, jd_id, filename, name, email, phone, raw_text, sections, parse_method, parse_confidence,
      matched_skills, missing_skills, preferred_matched, total_yoe, yoe_per_role, education, employment_gaps,
      composite_score, sub_scores, penalties, bonuses, explanation, rank, recommendation, key_highlights)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getCandidatesByRun: db.prepare(`SELECT * FROM candidates WHERE run_id = ? ORDER BY rank ASC`),
  getCandidate: db.prepare(`SELECT * FROM candidates WHERE id = ?`),
  updateCandidateStatus: db.prepare(`UPDATE candidates SET status = ? WHERE id = ?`),
  updateCandidateScores: db.prepare(`
    UPDATE candidates SET composite_score = ?, sub_scores = ?, explanation = ?, rank = ?, recommendation = ? WHERE id = ?
  `),

  // Audit Log
  insertAudit: db.prepare(`INSERT INTO audit_log (run_id, event, details) VALUES (?, ?, ?)`),
  getAuditByRun: db.prepare(`SELECT * FROM audit_log WHERE run_id = ? ORDER BY timestamp ASC`),

  // Feedback
  insertFeedback: db.prepare(`INSERT INTO feedback (candidate_id, action, notes) VALUES (?, ?, ?)`),
};

export default db;
