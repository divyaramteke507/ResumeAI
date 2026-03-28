/**
 * Module 01 — JD Processor
 * Transforms raw job description text into a structured JDProfile.
 * 
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  API INTEGRATION POINT                                         │
 * │  Replace the rule-based extraction below with your NLP API     │
 * │  (e.g., spaCy NER, OpenAI, custom model) for better accuracy. │
 * │  The function signature and return shape should stay the same. │
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

// Build a flat lookup: lowercase alias → canonical skill name
const skillLookup = new Map();
for (const category of Object.values(taxonomy.categories)) {
  for (const skill of Object.values(category.skills)) {
    skillLookup.set(skill.canonical.toLowerCase(), skill.canonical);
    for (const alias of skill.aliases) {
      skillLookup.set(alias.toLowerCase(), skill.canonical);
    }
  }
}

/**
 * Process a raw job description and extract structured requirements.
 * 
 * @param {string} rawText - The raw JD text
 * @returns {object} JDProfile object
 */
export function processJD(rawText) {
  const text = rawText || '';
  const textLower = text.toLowerCase();

  // ── Extract Title ──────────────────────────────────────────────
  const title = extractTitle(text);

  // ── Extract Skills ─────────────────────────────────────────────
  const { required, preferred } = extractSkills(text, textLower);

  // ── Extract Experience ─────────────────────────────────────────
  const minExperience = extractExperience(textLower);

  // ── Extract Education ──────────────────────────────────────────
  const educationReq = extractEducation(textLower);

  // ── Build Feature Weights ──────────────────────────────────────
  const featureWeights = {
    skill: 0.40,
    experience: 0.30,
    education: 0.20,
    keyword: 0.10,
  };

  // ── Confidence Score ───────────────────────────────────────────
  let confidence = 0.0;
  if (required.length > 0) confidence += 0.35;
  if (preferred.length > 0) confidence += 0.15;
  if (minExperience > 0) confidence += 0.20;
  if (educationReq) confidence += 0.15;
  if (title) confidence += 0.15;
  confidence = Math.min(confidence, 1.0);

  return {
    title,
    rawText: text,
    requiredSkills: required,
    preferredSkills: preferred,
    minExperience,
    educationRequirement: educationReq,
    featureWeights,
    confidence: parseFloat(confidence.toFixed(2)),
  };
}

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  API INTEGRATION POINT: extractTitle                           │
 * │  Replace with NER-based title extraction for better accuracy.  │
 * └─────────────────────────────────────────────────────────────────┘
 */
function extractTitle(text) {
  // Try first non-empty line as title
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return 'Untitled Position';

  // Look for explicit title patterns
  const titlePatterns = [
    /(?:job\s*title|position|role)\s*[:—–-]\s*(.+)/i,
    /(?:hiring|looking for|seeking)\s+(?:a\s+)?(.+?)(?:\.|$)/i,
  ];

  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim().substring(0, 100);
  }

  // Fallback: use first line if it's short enough to be a title
  const firstLine = lines[0];
  if (firstLine.length <= 80) return firstLine;

  return 'Untitled Position';
}

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  API INTEGRATION POINT: extractSkills                          │
 * │  Replace with NLP-based skill extraction (spaCy, OpenAI, etc.) │
 * │  for context-aware skill detection and semantic matching.       │
 * └─────────────────────────────────────────────────────────────────┘
 */
function extractSkills(text, textLower) {
  const required = new Set();
  const preferred = new Set();

  // Split text into sections
  const requiredSection = extractSection(textLower, [
    'required', 'requirements', 'must have', 'qualifications', 'what you need',
    'what we\'re looking for', 'key skills', 'core skills', 'essential',
    'responsibilities', 'you will', 'you\'ll'
  ]);

  const preferredSection = extractSection(textLower, [
    'preferred', 'nice to have', 'nice-to-have', 'bonus', 'desirable',
    'good to have', 'additionally', 'plus', 'advantageous'
  ]);

  // Match skills against taxonomy
  for (const [alias, canonical] of skillLookup) {
    // Use word boundary matching to avoid partial matches
    const regex = new RegExp(`\\b${escapeRegex(alias)}\\b`, 'i');

    if (preferredSection && regex.test(preferredSection)) {
      preferred.add(canonical);
    } else if (requiredSection && regex.test(requiredSection)) {
      required.add(canonical);
    } else if (regex.test(textLower)) {
      // If no clear section, treat as required
      required.add(canonical);
    }
  }

  // Move any preferred that are also in required
  for (const skill of preferred) {
    if (required.has(skill)) {
      preferred.delete(skill);
    }
  }

  return {
    required: [...required],
    preferred: [...preferred],
  };
}

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  API INTEGRATION POINT: extractExperience                      │
 * │  Replace with NLP-based experience parsing for better handling │
 * │  of complex experience requirements.                           │
 * └─────────────────────────────────────────────────────────────────┘
 */
function extractExperience(textLower) {
  const patterns = [
    /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/i,
    /(?:experience|exp)\s*[:—–-]\s*(\d+)\+?\s*(?:years?|yrs?)/i,
    /(?:minimum|min|at\s*least)\s+(\d+)\s*(?:years?|yrs?)/i,
    /(\d+)\s*-\s*\d+\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/i,
  ];

  for (const pattern of patterns) {
    const match = textLower.match(pattern);
    if (match) return parseInt(match[1], 10);
  }

  return 0;
}

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  API INTEGRATION POINT: extractEducation                       │
 * │  Replace with NER-based education extraction.                  │
 * └─────────────────────────────────────────────────────────────────┘
 */
function extractEducation(textLower) {
  const eduLevels = taxonomy.education_levels;

  // Check from highest to lowest
  const ordered = Object.entries(eduLevels).sort((a, b) => b[1].rank - a[1].rank);

  for (const [, level] of ordered) {
    const allTerms = [level.canonical.toLowerCase(), ...level.aliases.map(a => a.toLowerCase())];
    for (const term of allTerms) {
      if (textLower.includes(term)) {
        return level.canonical;
      }
    }
  }

  return '';
}

// ── Helpers ────────────────────────────────────────────────────

function extractSection(textLower, keywords) {
  for (const keyword of keywords) {
    const idx = textLower.indexOf(keyword);
    if (idx !== -1) {
      // Extract ~500 chars after the keyword
      return textLower.substring(idx, idx + 500);
    }
  }
  return null;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
