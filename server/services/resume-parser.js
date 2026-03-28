/**
 * Module 02 — Resume Parser
 * Extracts text from PDF, DOCX, and TXT files and detects document structure.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  API INTEGRATION POINT                                         │
 * │  Replace the local parsing with a document intelligence API    │
 * │  (e.g., Azure Form Recognizer, AWS Textract, Google Document   │
 * │  AI) for better accuracy on complex layouts and scanned PDFs.  │
 * └─────────────────────────────────────────────────────────────────┘
 */

import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';

/**
 * Parse a resume file and extract structured text.
 *
 * @param {string} filePath - Absolute path to the resume file
 * @param {string} filename - Original filename
 * @returns {object} ResumeDocument object
 */
export async function parseResume(filePath, filename) {
  const ext = path.extname(filename).toLowerCase();
  let rawText = '';
  let parseMethod = '';
  let parseConfidence = 0.0;

  try {
    switch (ext) {
      case '.pdf':
        ({ rawText, parseMethod, parseConfidence } = await parsePDF(filePath));
        break;
      case '.docx':
        ({ rawText, parseMethod, parseConfidence } = await parseDOCX(filePath));
        break;
      case '.doc':
        ({ rawText, parseMethod, parseConfidence } = await parseDOCX(filePath));
        break;
      case '.txt':
        ({ rawText, parseMethod, parseConfidence } = parseTXT(filePath));
        break;
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.webp':
      case '.bmp':
        ({ rawText, parseMethod, parseConfidence } = await parseImage(filePath));
        break;
      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }
  } catch (err) {
    console.error(`Parse error for ${filename}:`, err.message);
    return {
      filename,
      rawText: '',
      sections: {},
      parseMethod: 'failed',
      parseConfidence: 0.0,
      error: err.message,
    };
  }

  // Normalize text
  rawText = normalizeText(rawText);

  // Detect sections
  const sections = detectSections(rawText);

  // Extract contact info
  const contact = extractContactInfo(rawText);

  return {
    filename,
    rawText,
    sections,
    parseMethod,
    parseConfidence,
    contact,
  };
}

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  API INTEGRATION POINT: parsePDF                               │
 * │  Replace with OCR-capable API for scanned PDFs.                │
 * │  Current implementation only handles text-layer PDFs.          │
 * └─────────────────────────────────────────────────────────────────┘
 */
async function parsePDF(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdf(buffer);

  const rawText = data.text || '';
  const parseConfidence = rawText.length > 100 ? 0.85 : rawText.length > 20 ? 0.5 : 0.1;

  return {
    rawText,
    parseMethod: 'pdf-parse',
    parseConfidence,
  };
}

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  API INTEGRATION POINT: parseDOCX                              │
 * │  Current implementation handles standard DOCX well.            │
 * │  Replace only if complex table/image extraction is needed.     │
 * └─────────────────────────────────────────────────────────────────┘
 */
async function parseDOCX(filePath) {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });

  return {
    rawText: result.value || '',
    parseMethod: 'mammoth',
    parseConfidence: result.value.length > 100 ? 0.90 : 0.5,
  };
}

function parseTXT(filePath) {
  const rawText = fs.readFileSync(filePath, 'utf-8');
  return {
    rawText,
    parseMethod: 'plaintext',
    parseConfidence: rawText.length > 50 ? 0.95 : 0.3,
  };
}

async function parseImage(filePath) {
  const worker = await createWorker('eng');
  const { data: { text, confidence } } = await worker.recognize(filePath);
  await worker.terminate();

  return {
    rawText: text || '',
    parseMethod: 'tesseract-ocr',
    parseConfidence: confidence ? confidence / 100 : 0.5,
  };
}

// ── Text Normalization ──────────────────────────────────────────

function normalizeText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ {3,}/g, '  ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

// ── Section Detection ───────────────────────────────────────────

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  API INTEGRATION POINT: detectSections                         │
 * │  Replace with document layout analysis API for better          │
 * │  section detection accuracy on complex resume formats.         │
 * └─────────────────────────────────────────────────────────────────┘
 */
function detectSections(text) {
  const sections = {};
  const lines = text.split('\n');

  const sectionHeaders = {
    summary: /^(summary|profile|objective|about\s*me|professional\s*summary|career\s*objective)/i,
    experience: /^(experience|work\s*experience|employment|professional\s*experience|work\s*history|career\s*history)/i,
    education: /^(education|academic|qualifications|educational\s*background|academic\s*background)/i,
    skills: /^(skills|technical\s*skills|core\s*competencies|technologies|tech\s*stack|competencies|areas\s*of\s*expertise)/i,
    projects: /^(projects|personal\s*projects|key\s*projects|portfolio|notable\s*projects)/i,
    certifications: /^(certifications?|certificates?|licenses?|professional\s*development)/i,
    awards: /^(awards?|honors?|achievements?|recognition)/i,
    publications: /^(publications?|papers?|research)/i,
    volunteer: /^(volunteer|community|extracurricular)/i,
  };

  let currentSection = 'header';
  let currentContent = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if this line is a section header
    let matched = false;
    for (const [sectionName, pattern] of Object.entries(sectionHeaders)) {
      if (pattern.test(trimmed)) {
        // Save previous section
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = sectionName;
        currentContent = [];
        matched = true;
        break;
      }
    }

    if (!matched) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return sections;
}

// ── Contact Info Extraction ─────────────────────────────────────

function extractContactInfo(text) {
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

  // Try to extract name from first couple of lines
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let name = 'Unknown';

  // First non-empty line that doesn't look like contact info is likely the name
  for (const line of lines.slice(0, 5)) {
    if (
      !line.includes('@') &&
      !line.match(/^\+?\d/) &&
      !line.match(/^http/i) &&
      !line.match(/^(summary|profile|objective|experience|education|skills)/i) &&
      line.length < 60 &&
      line.length > 2
    ) {
      name = line.replace(/[|•·,]/g, '').trim();
      break;
    }
  }

  return {
    name,
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0] : '',
  };
}
