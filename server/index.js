/**
 * AI Resume Screening Agent — Express Server
 * All API routes for the screening pipeline.
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

import db, { queries } from './db.js';
import { processJD } from './services/jd-processor.js';
import { parseResume } from './services/resume-parser.js';
import { extractSkillsFromResume } from './services/skill-extractor.js';
import { scoreCandidate } from './services/scoring-engine.js';
import { rankCandidates } from './services/ranking-agent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isVercel = process.env.VERCEL === '1';
const ROOT = path.join(__dirname, '..');

// ── Ensure directories exist ────────────────────────────────────
const UPLOAD_DIR = isVercel ? path.join('/tmp', 'uploads') : path.join(ROOT, 'uploads');
const REPORT_DIR = isVercel ? path.join('/tmp', 'reports') : path.join(ROOT, 'reports');

if (!isVercel) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  } catch (err) {
    console.warn('Warning: Could not create directories:', err.message);
  }
}

// ── Express App ─────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(UPLOAD_DIR));

// Serve built frontend in production
const distPath = path.join(ROOT, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// ── Multer Config ───────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Read from headers (frontend will pass this)
    const runId = req.headers['x-run-id'] || req.params?.runId || 'temp';
    const runDir = path.join(UPLOAD_DIR, runId);
    fs.mkdirSync(runDir, { recursive: true });
    cb(null, runDir);
  },
  filename: (req, file, cb) => {
    // Preserve original filename but make unique
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e4);
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
});

// ═══════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════

// ── Health Check ────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════════
// JOB DESCRIPTIONS
// ═══════════════════════════════════════════════════════════════

// Create / process a new JD
app.post('/api/jd', (req, res) => {
  try {
    const { text, title } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Job description text is required.' });
    }

    const jdProfile = processJD(text);
    const jdId = uuidv4();

    queries.insertJD.run(
      jdId,
      title || jdProfile.title,
      text,
      JSON.stringify(jdProfile.requiredSkills),
      JSON.stringify(jdProfile.preferredSkills),
      jdProfile.minExperience,
      jdProfile.educationRequirement,
      JSON.stringify(jdProfile.featureWeights),
      jdProfile.confidence
    );

    queries.insertAudit.run(null, 'jd_created', JSON.stringify({
      jdId,
      title: jdProfile.title,
      requiredSkillsCount: jdProfile.requiredSkills.length,
      confidence: jdProfile.confidence,
    }));

    res.json({
      id: jdId,
      ...jdProfile,
      title: title || jdProfile.title,
    });
  } catch (err) {
    console.error('JD processing error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get JD by ID
app.get('/api/jd/:id', (req, res) => {
  const jd = queries.getJD.get(req.params.id);
  if (!jd) return res.status(404).json({ error: 'JD not found' });

  res.json({
    ...jd,
    required_skills: JSON.parse(jd.required_skills),
    preferred_skills: JSON.parse(jd.preferred_skills),
    feature_weights: JSON.parse(jd.feature_weights),
  });
});

// List all JDs
app.get('/api/jds', (req, res) => {
  const jds = queries.getAllJDs.all();
  res.json(jds.map(jd => ({
    ...jd,
    required_skills: JSON.parse(jd.required_skills),
    preferred_skills: JSON.parse(jd.preferred_skills),
    feature_weights: JSON.parse(jd.feature_weights),
  })));
});

// ═══════════════════════════════════════════════════════════════
// PIPELINE — FULL SCREENING RUN
// ═══════════════════════════════════════════════════════════════

// Run full pipeline: upload resumes + process
// 1. Initialize Run (Stateless setup)
app.post('/api/pipeline/init', (req, res) => {
  try {
    const jdId = req.body.jdId;
    const configStr = JSON.stringify(req.body.config || {});
    const runId = uuidv4();
    res.json({ runId, configStr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Process Chunk (Stateless - returns candidates without saving to DB)
app.post('/api/pipeline/chunk/:runId', upload.array('resumes', 10), async (req, res) => {
  const runId = req.params.runId;
  const jdId = req.body.jdId;
  const config = JSON.parse(req.body.configStr || '{}');
  const weights = config.weights || null;

  try {
    let jdProfile = config.jdProfile;
    if (!jdProfile) {
      const jdRow = queries.getJD.get(jdId);
      if (!jdRow) return res.status(400).json({ error: 'JD not found' });
  
      jdProfile = {
        title: jdRow.title,
        rawText: jdRow.raw_text,
        requiredSkills: JSON.parse(jdRow.required_skills),
        preferredSkills: JSON.parse(jdRow.preferred_skills),
        minExperience: jdRow.min_experience,
        educationRequirement: jdRow.education_requirement,
        featureWeights: JSON.parse(jdRow.feature_weights),
        confidence: jdRow.confidence,
      };
    }

    if (!req.files || req.files.length === 0) {
      return res.json({ success: true, processed: 0, errors: [], candidates: [] });
    }

    // Process resumes in parallel
    const processingPromises = req.files.map(async (file) => {
      try {
        const resumeDoc = await parseResume(file.path, file.originalname);

        if (resumeDoc.error || !resumeDoc.rawText) {
          return { error: resumeDoc.error || 'No text extracted', filename: file.originalname };
        }

        const candidateProfile = extractSkillsFromResume(resumeDoc, jdProfile);
        const scored = scoreCandidate(candidateProfile, jdProfile, weights);

        return {
          ...candidateProfile,
          ...scored,
          filename: file.originalname,
          filePath: `/uploads/${runId}/${file.filename}`,
          rawText: resumeDoc.rawText,
          sections: resumeDoc.sections,
          parseMethod: resumeDoc.parseMethod,
          parseConfidence: resumeDoc.parseConfidence,
          id: uuidv4() // Generate ID statelessly
        };
      } catch (err) {
        console.error(`Error processing ${file.originalname}:`, err);
        return { error: err.message, filename: file.originalname };
      }
    });

    const results = await Promise.all(processingPromises);
    const processedCandidates = results.filter(r => !r.error);
    const errors = results.filter(r => r.error);

    res.json({ success: true, processed: processedCandidates.length, errors, candidates: processedCandidates });
  } catch (err) {
    console.error('Chunk error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Finalize Run (Takes all accumulated candidates and saves to DB)
app.post('/api/pipeline/finalize/:runId', (req, res) => {
  const runId = req.params.runId;
  const { jdId, configStr, candidates = [] } = req.body;
  const config = JSON.parse(configStr || '{}');

  // We are processing too large payloads sometimes so let's parse safely
  const safeCandidates = Array.isArray(candidates) ? candidates : [];

  try {
    // 1. Create Run in DB (Finally!)
    queries.insertRun.run(runId, jdId, 'processing', configStr || '{}');
    queries.insertAudit.run(runId, 'pipeline_started', JSON.stringify({ jdId }));

    const rankingConfig = {
      mode: config.shortlistMode || 'top_n',
      value: config.shortlistValue || 50,
      minCandidates: 3,
    };

    // 2. Rank Candidates
    const rankResult = rankCandidates(safeCandidates, rankingConfig);
    
    // 3. Insert all ranked candidates to DB
    const insertMany = db.transaction((ranked) => {
      for (const info of ranked) {
        queries.insertCandidate.run(
          info.id, runId, jdId,
          info.filename, info.name, info.email, info.phone || '',
          info.rawText || '', JSON.stringify(info.sections || {}),
          info.parseMethod || '', info.parseConfidence || 0,
          JSON.stringify(info.matchedSkills || []),
          JSON.stringify(info.missingSkills || []),
          JSON.stringify(info.preferredMatched || []),
          info.totalYOE || 0,
          JSON.stringify(info.yoePerRole || []),
          JSON.stringify(info.education || {}),
          JSON.stringify(info.employmentGaps || []),
          info.compositeScore, JSON.stringify(info.subScores || {}),
          JSON.stringify(info.penalties || []),
          JSON.stringify(info.bonuses || []),
          info.explanation || '',
          info.rank, info.recommendation || '',
          JSON.stringify(info.keyHighlights || [])
        );
      }
    });
    insertMany(rankResult.allRanked);

    // 4. Update stats
    const stats = {
      totalProcessed: safeCandidates.length,
      successfullyParsed: safeCandidates.length,
      parseErrors: 0,
      shortlistSize: rankResult.shortlistSize,
      cutoffMode: rankResult.cutoffApplied,
      cutoffValue: rankResult.cutoffValue,
      duplicatesMerged: rankResult.duplicatesMerged,
      diversityFlag: rankResult.diversityFlag,
    };

    queries.updateRunStatus.run('completed', JSON.stringify(stats), runId);
    queries.insertAudit.run(runId, 'pipeline_completed', JSON.stringify(stats));

    res.json({
      runId,
      jdId,
      stats,
      diversityNote: rankResult.diversityNote,
    });
  } catch (err) {
    console.error('Finalize error:', err);
    try {
      queries.updateRunStatus.run('failed', JSON.stringify({ error: err.message }), runId);
      queries.insertAudit.run(runId, 'pipeline_failed', JSON.stringify({ error: err.message }));
    } catch(e) {}
    res.status(500).json({ error: err.message });
  }
});

// Get pipeline run status
app.get('/api/pipeline/status/:runId', (req, res) => {
  const run = queries.getRun.get(req.params.runId);
  if (!run) return res.status(404).json({ error: 'Run not found' });

  res.json({
    ...run,
    config: JSON.parse(run.config),
    stats: JSON.parse(run.stats),
  });
});

// ═══════════════════════════════════════════════════════════════
// CANDIDATES
// ═══════════════════════════════════════════════════════════════

// Get all candidates for a run
app.get('/api/candidates/:runId', (req, res) => {
  const candidates = queries.getCandidatesByRun.all(req.params.runId);
  res.json(candidates.map(formatCandidate));
});

// Get single candidate detail
app.get('/api/candidate/:id', (req, res) => {
  const candidate = queries.getCandidate.get(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
  res.json(formatCandidate(candidate));
});

// Update candidate status (approve / reject)
app.patch('/api/candidate/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['pending', 'approved', 'rejected', 'interview'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Use: pending, approved, rejected, interview' });
  }

  queries.updateCandidateStatus.run(status, req.params.id);
  queries.insertFeedback.run(req.params.id, status, req.body.notes || '');

  res.json({ success: true, status });
});

// ═══════════════════════════════════════════════════════════════
// RE-SCORING (with new weights)
// ═══════════════════════════════════════════════════════════════

app.post('/api/rescore/:runId', async (req, res) => {
  try {
    const { weights } = req.body;
    const runId = req.params.runId;

    const run = queries.getRun.get(runId);
    if (!run) return res.status(404).json({ error: 'Run not found' });

    const jdRow = queries.getJD.get(run.jd_id);
    if (!jdRow) return res.status(404).json({ error: 'JD not found' });

    const jdProfile = {
      title: jdRow.title,
      rawText: jdRow.raw_text,
      requiredSkills: JSON.parse(jdRow.required_skills),
      preferredSkills: JSON.parse(jdRow.preferred_skills),
      minExperience: jdRow.min_experience,
      educationRequirement: jdRow.education_requirement,
      featureWeights: JSON.parse(jdRow.feature_weights),
      confidence: jdRow.confidence,
    };

    // Get all candidates for this run
    const candidates = queries.getCandidatesByRun.all(runId).map(formatCandidate);

    // Re-score each candidate with new weights
    const rescored = candidates.map(c => {
      const profile = {
        matchedSkills: c.matched_skills,
        missingSkills: c.missing_skills,
        preferredMatched: c.preferred_matched,
        totalYOE: c.total_yoe,
        yoePerRole: c.yoe_per_role,
        education: c.education,
        employmentGaps: c.employment_gaps,
        keyHighlights: c.key_highlights,
        allDetectedSkills: (c.matched_skills || []).map(s => s.skill || s),
        name: c.name,
        rawText: c.raw_text,
      };

      const scored = scoreCandidate(profile, jdProfile, weights);
      return { ...c, ...scored };
    });

    // Rank with new scores
    const ranked = rescored.sort((a, b) => b.compositeScore - a.compositeScore);
    ranked.forEach((c, i) => { c.rank = i + 1; });

    // Update in DB
    const updateMany = db.transaction((items) => {
      for (const c of items) {
        queries.updateCandidateScores.run(
          c.compositeScore,
          JSON.stringify(c.subScores),
          c.explanation,
          c.rank,
          c.recommendation,
          c.id
        );
      }
    });
    updateMany(ranked);

    queries.insertAudit.run(runId, 'rescore', JSON.stringify({ weights }));

    res.json({ success: true, candidates: ranked });
  } catch (err) {
    console.error('Rescore error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// CHAT
// ═══════════════════════════════════════════════════════════════

// Enhanced chat intelligence helper
function generateSmartAnswer(candidate, question) {
  const rawText = candidate.raw_text.toLowerCase();
  const q = question.toLowerCase();
  
  // Parse structured data
  const skills = JSON.parse(candidate.skills || '[]');
  const education = JSON.parse(candidate.education || '{}');
  const workHistory = JSON.parse(candidate.work_history || '[]');
  
  // Question type detection with better patterns
  const questionPatterns = {
    leadership: /\b(lead|manag|director|supervisor|team lead|head of|vp|cto|ceo)\b/i,
    education: /\b(education|degree|universit|college|bachelor|master|phd|diploma|certification)\b/i,
    experience: /\b(years|experience|yoe|how long|tenure|worked)\b/i,
    skills: /\b(skill|technolog|proficien|know|familiar|expert|language|framework|tool)\b/i,
    projects: /\b(project|built|developed|created|implemented|worked on)\b/i,
    achievements: /\b(achiev|accomplish|award|recognition|success|impact|result)\b/i,
    contact: /\b(contact|email|phone|reach|location|address)\b/i,
    summary: /\b(summary|overview|about|who|background|profile)\b/i,
    salary: /\b(salary|compensation|pay|rate|wage)\b/i,
    availability: /\b(availab|start|notice|when can)\b/i,
  };

  // Leadership questions
  if (questionPatterns.leadership.test(q)) {
    const hasLeadership = /\b(lead|manag|director|supervisor|team lead|head of|vp|cto|ceo)\b/i.test(rawText);
    if (hasLeadership) {
      const matches = rawText.match(/\b(lead|manag|director|supervisor|team lead|head of|vp|cto|ceo)[a-z\s]*/gi);
      const roles = matches ? [...new Set(matches.slice(0, 3))].join(', ') : 'leadership roles';
      return `Yes, the candidate has leadership experience. I found mentions of: ${roles}.`;
    }
    return "I don't see explicit leadership or management experience in the resume.";
  }

  // Education questions
  if (questionPatterns.education.test(q)) {
    if (education && education.level) {
      let answer = `The candidate has a ${education.level}`;
      if (education.field) answer += ` in ${education.field}`;
      if (education.institution) answer += ` from ${education.institution}`;
      answer += '.';
      return answer;
    }
    // Fallback to text search
    const eduMatch = rawText.match(/\b(bachelor|master|phd|doctorate|diploma|degree)[^.]*\b/i);
    if (eduMatch) return `Education found: ${eduMatch[0]}.`;
    return "I couldn't find specific degree information in the resume.";
  }

  // Experience/Years questions
  if (questionPatterns.experience.test(q)) {
    let answer = `The candidate has approximately ${candidate.total_yoe || 0} years of total experience.`;
    if (workHistory && workHistory.length > 0) {
      answer += ` They have worked at ${workHistory.length} organization(s).`;
    }
    return answer;
  }

  // Skills questions
  if (questionPatterns.skills.test(q)) {
    if (skills && skills.length > 0) {
      const topSkills = skills.slice(0, 10).join(', ');
      return `Key skills identified: ${topSkills}. Total skills found: ${skills.length}.`;
    }
    return "No structured skills were extracted, but you can ask about specific technologies.";
  }

  // Projects questions
  if (questionPatterns.projects.test(q)) {
    const projectMatches = rawText.match(/\b(project|built|developed|created|implemented)[^.!?]*[.!?]/gi);
    if (projectMatches && projectMatches.length > 0) {
      const samples = projectMatches.slice(0, 3).join(' ');
      return `Project experience found: ${samples}`;
    }
    return "I couldn't find specific project descriptions in the resume.";
  }

  // Achievements questions
  if (questionPatterns.achievements.test(q)) {
    const achievementMatches = rawText.match(/\b(achiev|accomplish|award|increased|improved|reduced|delivered)[^.!?]*[.!?]/gi);
    if (achievementMatches && achievementMatches.length > 0) {
      const samples = achievementMatches.slice(0, 3).join(' ');
      return `Achievements found: ${samples}`;
    }
    return "No specific achievements or awards were clearly identified in the resume.";
  }

  // Contact questions
  if (questionPatterns.contact.test(q)) {
    let contactInfo = [];
    if (candidate.email) contactInfo.push(`Email: ${candidate.email}`);
    if (candidate.phone) contactInfo.push(`Phone: ${candidate.phone}`);
    if (candidate.location) contactInfo.push(`Location: ${candidate.location}`);
    if (contactInfo.length > 0) {
      return contactInfo.join(', ') + '.';
    }
    return "Contact information was not extracted from the resume.";
  }

  // Summary questions
  if (questionPatterns.summary.test(q)) {
    let summary = `${candidate.name || 'This candidate'} has ${candidate.total_yoe || 0} years of experience`;
    if (skills && skills.length > 0) {
      summary += ` with skills in ${skills.slice(0, 5).join(', ')}`;
    }
    if (education && education.level) {
      summary += `. Education: ${education.level}`;
      if (education.field) summary += ` in ${education.field}`;
    }
    summary += `.`;
    return summary;
  }

  // Salary/Compensation questions
  if (questionPatterns.salary.test(q)) {
    return "Salary information is not typically included in resumes. You may need to discuss compensation during the interview process.";
  }

  // Availability questions
  if (questionPatterns.availability.test(q)) {
    return "Availability information is not included in this resume. You should ask the candidate directly during screening.";
  }

  // Keyword-based search (improved fallback)
  const stopWords = ['what', 'when', 'where', 'who', 'why', 'how', 'does', 'have', 'they', 'this', 'that', 'candidate', 'resume', 'about', 'with', 'tell', 'know', 'can', 'you', 'the', 'and', 'for'];
  const keywords = q.replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length > 2 && !stopWords.includes(w));
  
  if (keywords.length > 0) {
    // Check in skills first
    const skillMatches = skills.filter(s => keywords.some(k => s.toLowerCase().includes(k)));
    if (skillMatches.length > 0) {
      return `Yes, I found these related skills: ${skillMatches.join(', ')}.`;
    }
    
    // Check in raw text with context
    const found = keywords.filter(k => rawText.includes(k));
    if (found.length > 0) {
      // Try to extract context around keywords
      const contexts = [];
      for (const keyword of found.slice(0, 3)) {
        const idx = rawText.indexOf(keyword);
        if (idx !== -1) {
          const start = Math.max(0, idx - 50);
          const end = Math.min(rawText.length, idx + 100);
          const context = rawText.substring(start, end).trim();
          contexts.push(context);
        }
      }
      if (contexts.length > 0) {
        return `I found mentions of "${found.join(', ')}" in the resume. Context: ...${contexts[0]}...`;
      }
      return `Yes, I found mentions of: ${found.join(', ')}.`;
    }
  }

  return "I couldn't find specific information about that in the resume. Try asking about skills, experience, education, or leadership.";
}

app.post('/api/candidate/:id/chat', (req, res) => {
  const { question } = req.body;
  const candidate = queries.getCandidate.get(req.params.id);

  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
  if (!question) return res.status(400).json({ error: 'Question required' });

  const answer = generateSmartAnswer(candidate, question);

  // Simulate thinking time for better UX
  setTimeout(() => {
    res.json({ answer });
  }, 400);
});

// COMPARISON CHAT
// ═══════════════════════════════════════════════════════════════

app.post('/api/candidates/compare', (req, res) => {
  const { candidateIds, question } = req.body;

  if (!candidateIds || candidateIds.length === 0) {
    return res.status(400).json({ error: 'Candidate IDs required' });
  }
  if (!question) return res.status(400).json({ error: 'Question required' });

  const candidates = candidateIds.map(id => queries.getCandidate.get(id)).filter(Boolean);
  
  if (candidates.length === 0) {
    return res.status(404).json({ error: 'No candidates found' });
  }

  const q = question.toLowerCase();
  let answer = '';

  // Skills comparison
  if (q.includes('skill')) {
    const skillsData = candidates.map(c => ({
      name: c.name,
      skills: JSON.parse(c.skills || '[]'),
      matchedSkills: c.matched_skills || []
    }));

    answer = 'Skills Comparison:\n\n';
    skillsData.forEach(({ name, skills, matchedSkills }) => {
      answer += `${name}: ${matchedSkills.length} matched skills (${skills.slice(0, 5).join(', ')}${skills.length > 5 ? '...' : ''})\n`;
    });

    const bestSkills = skillsData.reduce((best, curr) => 
      curr.matchedSkills.length > best.matchedSkills.length ? curr : best
    );
    answer += `\n${bestSkills.name} has the most matched skills with ${bestSkills.matchedSkills.length} matches.`;
  }
  // Experience comparison
  else if (q.includes('experience') || q.includes('years')) {
    answer = 'Experience Comparison:\n\n';
    candidates.forEach(c => {
      answer += `${c.name}: ${c.total_yoe || 0} years of experience\n`;
    });

    const mostExp = candidates.reduce((best, curr) => 
      (curr.total_yoe || 0) > (best.total_yoe || 0) ? curr : best
    );
    answer += `\n${mostExp.name} has the most experience with ${mostExp.total_yoe || 0} years.`;
  }
  // Education comparison
  else if (q.includes('education') || q.includes('degree')) {
    answer = 'Education Comparison:\n\n';
    candidates.forEach(c => {
      const edu = JSON.parse(c.education || '{}');
      answer += `${c.name}: ${edu.level || 'Not specified'}${edu.field ? ' in ' + edu.field : ''}\n`;
    });
  }
  // Leadership comparison
  else if (q.includes('leadership') || q.includes('manag')) {
    answer = 'Leadership Experience:\n\n';
    candidates.forEach(c => {
      const hasLeadership = /\b(lead|manag|director|supervisor|team lead|head of|vp|cto|ceo)\b/i.test(c.raw_text.toLowerCase());
      answer += `${c.name}: ${hasLeadership ? '✓ Has leadership experience' : '✗ No clear leadership experience'}\n`;
    });
  }
  // Score comparison
  else if (q.includes('score') || q.includes('rank') || q.includes('better') || q.includes('best')) {
    answer = 'Overall Scores:\n\n';
    candidates.forEach(c => {
      answer += `${c.name}: ${Math.round(c.composite_score)}% (Rank #${c.rank})\n`;
    });

    const highest = candidates.reduce((best, curr) => 
      curr.composite_score > best.composite_score ? curr : best
    );
    answer += `\n${highest.name} has the highest score at ${Math.round(highest.composite_score)}%.`;
  }
  // Differences/gaps
  else if (q.includes('difference') || q.includes('gap') || q.includes('missing')) {
    answer = 'Key Differences:\n\n';
    candidates.forEach(c => {
      const missingSkills = c.missing_skills || [];
      answer += `${c.name}:\n`;
      answer += `  Score: ${Math.round(c.composite_score)}%\n`;
      answer += `  Missing skills: ${missingSkills.length > 0 ? missingSkills.slice(0, 3).join(', ') : 'None'}\n`;
      answer += `  Experience: ${c.total_yoe || 0} years\n\n`;
    });
  }
  // General comparison
  else {
    answer = 'Candidate Overview:\n\n';
    candidates.forEach(c => {
      const edu = JSON.parse(c.education || '{}');
      answer += `${c.name}:\n`;
      answer += `  Score: ${Math.round(c.composite_score)}% (Rank #${c.rank})\n`;
      answer += `  Experience: ${c.total_yoe || 0} years\n`;
      answer += `  Education: ${edu.level || 'Not specified'}\n`;
      answer += `  Matched Skills: ${(c.matched_skills || []).length}\n\n`;
    });
  }

  setTimeout(() => {
    res.json({ answer });
  }, 500);
});

// ═══════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════

// CSV Export
app.get('/api/reports/csv/:runId', (req, res) => {
  const candidates = queries.getCandidatesByRun.all(req.params.runId).map(formatCandidate);

  const headers = [
    'Rank', 'Name', 'Email', 'Composite Score', 'Skill Score', 'Experience Score',
    'Education Score', 'Keyword Score', 'Matched Skills', 'Missing Skills',
    'Total YOE', 'Education', 'Recommendation', 'Penalties', 'Bonuses', 'Status'
  ];

  const rows = candidates.map(c => [
    c.rank,
    `"${c.name}"`,
    `"${c.email}"`,
    c.composite_score,
    c.sub_scores?.skill || 0,
    c.sub_scores?.experience || 0,
    c.sub_scores?.education || 0,
    c.sub_scores?.keyword || 0,
    `"${(c.matched_skills || []).map(s => s.skill || s).join(', ')}"`,
    `"${(c.missing_skills || []).join(', ')}"`,
    c.total_yoe,
    `"${c.education?.level || ''} ${c.education?.field || ''}"`,
    `"${c.recommendation}"`,
    `"${(c.penalties || []).join('; ')}"`,
    `"${(c.bonuses || []).join('; ')}"`,
    `"${c.status}"`,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=rankings-${req.params.runId.substring(0, 8)}.csv`);
  res.send(csv);
});

// JSON Export
app.get('/api/reports/json/:runId', (req, res) => {
  const run = queries.getRun.get(req.params.runId);
  const candidates = queries.getCandidatesByRun.all(req.params.runId).map(formatCandidate);

  if (!run) return res.status(404).json({ error: 'Run not found' });

  const jd = queries.getJD.get(run.jd_id);

  res.json({
    run: {
      ...run,
      config: JSON.parse(run.config),
      stats: JSON.parse(run.stats),
    },
    jobDescription: jd ? {
      ...jd,
      required_skills: JSON.parse(jd.required_skills),
      preferred_skills: JSON.parse(jd.preferred_skills),
    } : null,
    candidates,
  });
});

// Audit Log
app.get('/api/audit/:runId', (req, res) => {
  const logs = queries.getAuditByRun.all(req.params.runId);
  res.json(logs.map(l => ({
    ...l,
    details: JSON.parse(l.details),
  })));
});

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function formatCandidate(c) {
  return {
    ...c,
    sections: safeParse(c.sections),
    matched_skills: safeParse(c.matched_skills),
    missing_skills: safeParse(c.missing_skills),
    preferred_matched: safeParse(c.preferred_matched),
    yoe_per_role: safeParse(c.yoe_per_role),
    education: safeParse(c.education),
    employment_gaps: safeParse(c.employment_gaps),
    sub_scores: safeParse(c.sub_scores),
    penalties: safeParse(c.penalties),
    bonuses: safeParse(c.bonuses),
    key_highlights: safeParse(c.key_highlights),
  };
}

function safeParse(val) {
  if (typeof val === 'object' && val !== null) return val;
  try { return JSON.parse(val); } catch { return val; }
}

// ── SPA Fallback ────────────────────────────────────────────────
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── Error Handler ───────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  res.status(500).json({ error: err.message });
});

// ── Start Server ────────────────────────────────────────────────
if (!isVercel) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🧠 AI Resume Screening Agent — Server running on http://localhost:${PORT}`);
    console.log(`   Database: ${path.relative(ROOT, path.join(ROOT, 'db', 'candidates.sqlite'))}`);
    console.log(`   Uploads:  ${path.relative(ROOT, UPLOAD_DIR)}`);
    console.log(`   Reports:  ${path.relative(ROOT, REPORT_DIR)}\n`);
  });
}

export default app;


// Get actual filename for a candidate (for old data without file_path)
app.get('/api/candidate/:id/file', (req, res) => {
  const candidate = queries.getCandidate.get(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
  
  // If file_path is already set, return it
  if (candidate.file_path) {
    return res.json({ filePath: candidate.file_path });
  }
  
  // Otherwise, try to find the file in the uploads directory
  const runDir = path.join(UPLOAD_DIR, candidate.run_id);
  
  try {
    const files = fs.readdirSync(runDir);
    const originalName = candidate.filename;
    const baseName = path.basename(originalName, path.extname(originalName));
    
    // Find file that starts with the original name
    const matchingFile = files.find(f => {
      const fBaseName = path.basename(f, path.extname(f));
      return fBaseName.startsWith(baseName) || f.includes(baseName);
    });
    
    if (matchingFile) {
      const filePath = `/uploads/${candidate.run_id}/${matchingFile}`;
      return res.json({ filePath, actualFilename: matchingFile });
    }
    
    res.status(404).json({ error: 'File not found' });
  } catch (err) {
    console.error('Error finding file:', err);
    res.status(500).json({ error: 'Error finding file' });
  }
});
