/**
 * Module 03 — Skill & Entity Extractor
 * Dual-mode extraction: rule-based taxonomy matching + pattern-based entity recognition.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  API INTEGRATION POINT                                         │
 * │  Replace extractSkillsFromResume() with:                       │
 * │  - spaCy NER pipeline for context-aware entity extraction      │
 * │  - sentence-transformers for semantic similarity matching      │
 * │  - Custom ML model for domain-specific skill detection         │
 * │  Keep the return shape the same: CandidateProfile object       │
 * └─────────────────────────────────────────────────────────────────┘
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const taxonomy = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'skill-taxonomy.json'), 'utf-8')
);

// Build flat lookup maps
const skillLookup = new Map();
const skillCategories = new Map();

for (const [catKey, category] of Object.entries(taxonomy.categories)) {
  for (const [, skill] of Object.entries(category.skills)) {
    skillLookup.set(skill.canonical.toLowerCase(), skill.canonical);
    skillCategories.set(skill.canonical, category.label);
    for (const alias of skill.aliases) {
      skillLookup.set(alias.toLowerCase(), skill.canonical);
    }
  }
}

/**
 * Extract skills, experience, and education from a parsed resume document.
 *
 * @param {object} resumeDoc - ResumeDocument from resume-parser
 * @param {object} jdProfile - JDProfile from jd-processor
 * @returns {object} CandidateProfile
 */
export function extractSkillsFromResume(resumeDoc, jdProfile) {
  const { rawText, sections, contact } = resumeDoc;
  const textLower = rawText.toLowerCase();

  // ── Skill Matching ───────────────────────────────────────────
  const detectedSkills = detectAllSkills(textLower);
  const requiredSet = new Set(jdProfile.requiredSkills.map(s => s.toLowerCase()));
  const preferredSet = new Set(jdProfile.preferredSkills.map(s => s.toLowerCase()));

  const matchedSkills = [];
  const matchedPreferred = [];
  const missingSkills = [];

  for (const reqSkill of jdProfile.requiredSkills) {
    const found = detectedSkills.find(d => d.canonical.toLowerCase() === reqSkill.toLowerCase());
    if (found) {
      matchedSkills.push({
        skill: found.canonical,
        category: found.category,
        confidence: found.confidence,
        source: found.source,
      });
    } else {
      missingSkills.push(reqSkill);
    }
  }

  for (const prefSkill of jdProfile.preferredSkills) {
    const found = detectedSkills.find(d => d.canonical.toLowerCase() === prefSkill.toLowerCase());
    if (found) {
      matchedPreferred.push({
        skill: found.canonical,
        category: found.category,
        confidence: found.confidence,
        source: found.source,
      });
    }
  }

  // ── Experience Extraction ────────────────────────────────────
  const { totalYOE, roles, gaps } = extractExperience(rawText, sections.experience || '');

  // ── Education Extraction ─────────────────────────────────────
  const education = extractEducation(rawText, sections.education || '');

  // ── Key Highlights ───────────────────────────────────────────
  const highlights = extractHighlights(rawText, sections);

  // ── Confidence Score ─────────────────────────────────────────
  const extractionConfidence = calculateConfidence(matchedSkills, totalYOE, education);

  return {
    name: contact?.name || 'Unknown',
    email: contact?.email || '',
    phone: contact?.phone || '',
    matchedSkills,
    missingSkills,
    preferredMatched: matchedPreferred,
    allDetectedSkills: detectedSkills.map(d => d.canonical),
    totalYOE,
    yoePerRole: roles,
    education,
    employmentGaps: gaps,
    keyHighlights: highlights,
    extractionConfidence,
  };
}

// ── Skill Detection ─────────────────────────────────────────────

function detectAllSkills(textLower) {
  const found = new Map();

  for (const [alias, canonical] of skillLookup) {
    if (alias.length < 2) continue; // Skip single-char aliases like "R" or "C"

    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // For short skill names, require word boundaries
    const pattern = alias.length <= 3
      ? new RegExp(`\\b${escaped}\\b`, 'i')
      : new RegExp(`(?:^|[\\s,;|•\\-()])${escaped}(?:[\\s,;|•\\-()]|$)`, 'i');

    if (pattern.test(textLower) && !found.has(canonical)) {
      found.set(canonical, {
        canonical,
        category: skillCategories.get(canonical) || 'Other',
        confidence: 0.85,
        source: 'taxonomy-match',
      });
    }
  }

  return [...found.values()];
}

// ── Experience Extraction ───────────────────────────────────────

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  API INTEGRATION POINT: extractExperience                      │
 * │  Replace with NER-based date/role extraction for better        │
 * │  handling of overlapping roles, freelance, and contract work.  │
 * └─────────────────────────────────────────────────────────────────┘
 */
function extractExperience(fullText, experienceSection) {
  const text = experienceSection || fullText;
  const roles = [];

  // Date range patterns: "Jan 2020 – Mar 2023", "2019–Present", "2018 to 2021"
  const dateRangePattern = /(?:(\w+\.?\s+)?(\d{4}))\s*(?:–|—|-|to)\s*(?:(\w+\.?\s+)?(\d{4})|present|current|now)/gi;

  let match;
  const dateRanges = [];

  while ((match = dateRangePattern.exec(text)) !== null) {
    const startYear = parseInt(match[2], 10);
    const endStr = match[4];
    const endYear = endStr ? parseInt(endStr, 10) : new Date().getFullYear();

    if (startYear >= 1980 && startYear <= new Date().getFullYear() &&
        endYear >= startYear && endYear <= new Date().getFullYear() + 1) {
      dateRanges.push({ startYear, endYear, startMonth: match[1], endMonth: match[3] });

      // Try to extract role title (line above or same line)
      const context = text.substring(Math.max(0, match.index - 150), match.index);
      const lines = context.split('\n').filter(l => l.trim());
      const roleTitle = lines.length > 0 ? lines[lines.length - 1].trim().substring(0, 100) : 'Role';

      roles.push({
        title: roleTitle,
        startYear,
        endYear,
        duration: endYear - startYear,
      });
    }
  }

  // Calculate total YOE (non-overlapping)
  const totalYOE = calculateTotalYOE(dateRanges);

  // Fallback: regex for explicit "X years" mentions
  if (totalYOE === 0) {
    const yoeMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/i);
    if (yoeMatch) {
      return { totalYOE: parseInt(yoeMatch[1], 10), roles, gaps: [] };
    }

    // Check full text for experience statements
    const fullMatch = fullText.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/i);
    if (fullMatch) {
      return { totalYOE: parseInt(fullMatch[1], 10), roles, gaps: [] };
    }
  }

  // Detect gaps > 12 months
  const gaps = detectGaps(dateRanges);

  return { totalYOE, roles, gaps };
}

function calculateTotalYOE(dateRanges) {
  if (dateRanges.length === 0) return 0;

  // Sort by start year
  const sorted = [...dateRanges].sort((a, b) => a.startYear - b.startYear);

  // Merge overlapping ranges
  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].startYear <= last.endYear) {
      last.endYear = Math.max(last.endYear, sorted[i].endYear);
    } else {
      merged.push({ ...sorted[i] });
    }
  }

  return merged.reduce((total, range) => total + (range.endYear - range.startYear), 0);
}

function detectGaps(dateRanges) {
  if (dateRanges.length < 2) return [];

  const sorted = [...dateRanges].sort((a, b) => a.startYear - b.startYear);
  const gaps = [];

  for (let i = 1; i < sorted.length; i++) {
    const gapYears = sorted[i].startYear - sorted[i - 1].endYear;
    if (gapYears > 1) {
      gaps.push({
        from: sorted[i - 1].endYear,
        to: sorted[i].startYear,
        durationYears: gapYears,
      });
    }
  }

  return gaps;
}

// ── Education Extraction ────────────────────────────────────────

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  API INTEGRATION POINT: extractEducation                       │
 * │  Replace with NER-based education extraction for institutions, │
 * │  GPA, and field of study detection.                            │
 * └─────────────────────────────────────────────────────────────────┘
 */
function extractEducation(fullText, educationSection) {
  const text = educationSection || fullText;
  const textLower = text.toLowerCase();

  const eduLevels = taxonomy.education_levels;
  let detectedLevel = '';
  let detectedRank = 0;

  // Check from highest to lowest
  for (const [, level] of Object.entries(eduLevels)) {
    const allTerms = [level.canonical.toLowerCase(), ...level.aliases.map(a => a.toLowerCase())];
    for (const term of allTerms) {
      if (textLower.includes(term) && level.rank > detectedRank) {
        detectedLevel = level.canonical;
        detectedRank = level.rank;
      }
    }
  }

  // Try to extract field of study
  const fieldPatterns = [
    /(?:in|of)\s+(computer\s*science|software\s*engineering|information\s*technology|electrical\s*engineering|mathematics|physics|data\s*science|mechanical\s*engineering|business|economics|statistics|chemistry|biology)/i,
  ];

  let field = '';
  for (const pattern of fieldPatterns) {
    const match = text.match(pattern);
    if (match) {
      field = match[1].trim();
      break;
    }
  }

  // Try to extract graduation year
  const yearMatch = text.match(/(?:20[0-2]\d|19[89]\d)/);
  const gradYear = yearMatch ? parseInt(yearMatch[0], 10) : null;

  return {
    level: detectedLevel,
    rank: detectedRank,
    field,
    graduationYear: gradYear,
  };
}

// ── Highlights Extraction ───────────────────────────────────────

function extractHighlights(rawText, sections) {
  const highlights = [];
  const text = sections.experience || sections.summary || rawText;

  // Look for achievement-style bullet points
  const achievementPatterns = [
    /(?:•|▪|■|►|·|\*|-)\s*(.{20,120}(?:increased|decreased|improved|reduced|led|built|designed|architected|launched|delivered|managed|achieved|grew|scaled|saved|optimized|developed|implemented|created|established|pioneered).{0,50})/gi,
    /(?:•|▪|■|►|·|\*|-)\s*(.{20,120}(?:\d+%|\d+x|\$\d+|million|thousand).{0,50})/gi,
  ];

  for (const pattern of achievementPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null && highlights.length < 5) {
      const highlight = match[1].trim();
      if (highlight.length > 20 && !highlights.includes(highlight)) {
        highlights.push(highlight);
      }
    }
  }

  // Fallback: first few meaningful sentences from experience/summary
  if (highlights.length === 0) {
    const sentences = text.split(/[.!]\s+/).filter(s => s.trim().length > 30);
    for (const s of sentences.slice(0, 3)) {
      highlights.push(s.trim().substring(0, 150));
    }
  }

  return highlights.slice(0, 4);
}

// ── Confidence Calculation ──────────────────────────────────────

function calculateConfidence(matchedSkills, totalYOE, education) {
  let c = 0;
  if (matchedSkills.length > 0) c += 0.35;
  if (matchedSkills.length >= 3) c += 0.15;
  if (totalYOE > 0) c += 0.25;
  if (education.level) c += 0.15;
  if (education.field) c += 0.10;
  return Math.min(c, 1.0);
}
