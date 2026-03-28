/**
 * Module 04 — Scoring Engine
 * Computes a 0–100 match score with full explainability.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  API INTEGRATION POINT                                         │
 * │  The scoring logic is fully rule-based and works as-is.        │
 * │  To enhance accuracy, replace computeSkillScore() with         │
 * │  semantic similarity scoring using sentence-transformers       │
 * │  or similar embedding-based approach.                          │
 * └─────────────────────────────────────────────────────────────────┘
 */

/**
 * Score a candidate profile against a JD profile.
 *
 * @param {object} candidateProfile - CandidateProfile from skill-extractor
 * @param {object} jdProfile - JDProfile from jd-processor
 * @param {object} weights - Custom weight overrides { skill, experience, education, keyword }
 * @returns {object} ScoredCandidate
 */
export function scoreCandidate(candidateProfile, jdProfile, weights = null) {
  const w = weights || jdProfile.featureWeights || {
    skill: 0.40,
    experience: 0.30,
    education: 0.20,
    keyword: 0.10,
  };

  // ── Sub-Scores (each 0–100) ──────────────────────────────────
  const skillScore = computeSkillScore(candidateProfile, jdProfile);
  const experienceScore = computeExperienceScore(candidateProfile, jdProfile);
  const educationScore = computeEducationScore(candidateProfile, jdProfile);
  const keywordScore = computeKeywordScore(candidateProfile, jdProfile);

  // ── Composite Score ──────────────────────────────────────────
  let compositeScore =
    skillScore * w.skill +
    experienceScore * w.experience +
    educationScore * w.education +
    keywordScore * w.keyword;

  // Normalize to 0-100 scale
  const totalWeight = w.skill + w.experience + w.education + w.keyword;
  compositeScore = (compositeScore / totalWeight);

  // ── Penalties ────────────────────────────────────────────────
  const penalties = [];
  let penaltyTotal = 0;

  if (candidateProfile.employmentGaps && candidateProfile.employmentGaps.length > 0) {
    for (const gap of candidateProfile.employmentGaps) {
      if (gap.durationYears >= 2) {
        penalties.push(`Employment gap: ${gap.durationYears} years (${gap.from}–${gap.to})`);
        penaltyTotal += 5;
      } else if (gap.durationYears >= 1) {
        penalties.push(`Employment gap: ~${gap.durationYears} year (${gap.from}–${gap.to})`);
        penaltyTotal += 2;
      }
    }
  }

  // ── Bonuses ──────────────────────────────────────────────────
  const bonuses = [];
  let bonusTotal = 0;

  // Check for OSS contributions / certifications in detected skills or highlights
  const allText = (candidateProfile.keyHighlights || []).join(' ').toLowerCase();

  if (allText.includes('open source') || allText.includes('oss') || allText.includes('contributor') || allText.includes('github')) {
    bonuses.push('Open source contributions detected');
    bonusTotal += 3;
  }

  if (candidateProfile.allDetectedSkills) {
    const certKeywords = ['certification', 'certified', 'aws certified', 'google certified', 'azure certified'];
    const rawTextLower = (candidateProfile.rawText || '').toLowerCase();
    for (const kw of certKeywords) {
      if (rawTextLower.includes(kw)) {
        bonuses.push('Relevant certifications present');
        bonusTotal += 2;
        break;
      }
    }
  }

  // Exact job title match
  if (candidateProfile.yoePerRole) {
    const jdTitleLower = jdProfile.title.toLowerCase();
    for (const role of candidateProfile.yoePerRole) {
      if (role.title && jdTitleLower.split(' ').some(word =>
        word.length > 3 && role.title.toLowerCase().includes(word)
      )) {
        bonuses.push(`Related role found: "${role.title}"`);
        bonusTotal += 2;
        break;
      }
    }
  }

  // Apply penalties and bonuses
  compositeScore = Math.max(0, Math.min(100, compositeScore - penaltyTotal + bonusTotal));
  compositeScore = parseFloat(compositeScore.toFixed(1));

  // ── Explanation ──────────────────────────────────────────────
  const explanation = buildExplanation(
    compositeScore,
    { skill: skillScore, experience: experienceScore, education: educationScore, keyword: keywordScore },
    w,
    candidateProfile,
    jdProfile,
    penalties,
    bonuses
  );

  // ── Recommendation ───────────────────────────────────────────
  let recommendation = 'Review Carefully';
  if (compositeScore >= 85) recommendation = 'Highly Recommended';
  else if (compositeScore >= 65) recommendation = 'Potential Fit';

  // Special labels
  if (candidateProfile.totalYOE > (jdProfile.minExperience * 2) && compositeScore >= 70) {
    recommendation = 'Overqualified';
  }
  if (candidateProfile.matchedSkills.length >= jdProfile.requiredSkills.length * 0.9 &&
      candidateProfile.totalYOE < jdProfile.minExperience * 0.5 && compositeScore >= 50) {
    recommendation = 'Niche Specialist';
  }

  return {
    compositeScore,
    subScores: {
      skill: parseFloat(skillScore.toFixed(1)),
      experience: parseFloat(experienceScore.toFixed(1)),
      education: parseFloat(educationScore.toFixed(1)),
      keyword: parseFloat(keywordScore.toFixed(1)),
    },
    penalties,
    bonuses,
    explanation,
    recommendation,
  };
}

// ── Sub-Score Computations ──────────────────────────────────────

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  API INTEGRATION POINT: computeSkillScore                      │
 * │  Enhance with cosine similarity of skill embeddings for        │
 * │  semantic near-match detection. Currently uses exact matching. │
 * └─────────────────────────────────────────────────────────────────┘
 */
function computeSkillScore(profile, jd) {
  const totalRequired = jd.requiredSkills.length;
  const totalPreferred = jd.preferredSkills.length;

  if (totalRequired === 0 && totalPreferred === 0) return 50; // No skills to match against

  const matchedRequired = profile.matchedSkills.length;
  const matchedPreferred = profile.preferredMatched ? profile.preferredMatched.length : 0;

  // Required skills: up to 80 points
  const requiredScore = totalRequired > 0
    ? (matchedRequired / totalRequired) * 80
    : 40;

  // Preferred skills: up to 20 bonus points
  const preferredScore = totalPreferred > 0
    ? (matchedPreferred / totalPreferred) * 20
    : 10;

  return Math.min(100, requiredScore + preferredScore);
}

function computeExperienceScore(profile, jd) {
  const minRequired = jd.minExperience || 0;
  const candidateYOE = profile.totalYOE || 0;

  if (minRequired === 0) {
    // No requirement; give proportional score based on experience
    if (candidateYOE >= 10) return 90;
    if (candidateYOE >= 5) return 75;
    if (candidateYOE >= 2) return 60;
    return 40;
  }

  const ratio = candidateYOE / minRequired;

  if (ratio >= 2.0) return 95;     // Well above requirement
  if (ratio >= 1.5) return 90;
  if (ratio >= 1.0) return 85;     // Meets requirement
  if (ratio >= 0.75) return 65;    // Close
  if (ratio >= 0.5) return 45;     // Below
  return 20;                        // Significantly under
}

function computeEducationScore(profile, jd) {
  const edu = profile.education || {};
  const required = jd.educationRequirement || '';

  if (!required) {
    // No requirement specified: proportional by level
    if (edu.rank >= 5) return 95;  // PhD
    if (edu.rank >= 4) return 85;  // Master's
    if (edu.rank >= 3) return 75;  // Bachelor's
    if (edu.rank >= 2) return 55;  // Associate's
    if (edu.rank >= 1) return 40;  // Diploma
    return 30;
  }

  // Compare against requirement
  const requiredLevels = {
    "PhD": 5, "Master's": 4, "Bachelor's": 3, "Associate's": 2, "Diploma": 1
  };

  const requiredRank = requiredLevels[required] || 3;
  const candidateRank = edu.rank || 0;

  if (candidateRank >= requiredRank + 1) return 95;   // Exceeds
  if (candidateRank >= requiredRank) return 85;         // Meets
  if (candidateRank >= requiredRank - 1) return 60;     // One level below
  return 30;                                             // Significantly under
}

function computeKeywordScore(profile, jd) {
  const jdText = jd.rawText.toLowerCase();
  const words = jdText.split(/\W+/).filter(w => w.length > 4);
  const uniqueWords = [...new Set(words)];

  // Filter to meaningful keywords (not common English words)
  const commonWords = new Set([
    'about', 'above', 'after', 'again', 'could', 'every', 'first', 'great',
    'their', 'there', 'these', 'those', 'under', 'where', 'which', 'while',
    'would', 'being', 'doing', 'going', 'having', 'looking', 'making',
    'should', 'through', 'using', 'working', 'years', 'experience', 'skills',
    'ability', 'strong', 'knowledge', 'understanding', 'excellent', 'required',
    'preferred', 'including', 'responsibilities', 'requirements', 'qualifications',
  ]);

  const keywords = uniqueWords.filter(w => !commonWords.has(w));
  const sampleKeywords = keywords.slice(0, 30);

  if (sampleKeywords.length === 0) return 50;

  // Check how many JD keywords appear in the candidate's resume
  const resumeText = (profile.rawText || '').toLowerCase();
  let matched = 0;

  for (const keyword of sampleKeywords) {
    if (resumeText.includes(keyword)) {
      matched++;
    }
  }

  return Math.min(100, (matched / sampleKeywords.length) * 100);
}

// ── Explanation Builder ─────────────────────────────────────────

function buildExplanation(compositeScore, subScores, weights, profile, jd, penalties, bonuses) {
  const totalRequired = jd.requiredSkills.length;
  const matchedCount = profile.matchedSkills.length;
  const missing = profile.missingSkills || [];

  let explanation = `Score: ${compositeScore}/100\n`;
  explanation += `  ├── Skills:      ${(subScores.skill * weights.skill / 100).toFixed(0)}/${(weights.skill * 100).toFixed(0)}`;
  explanation += ` — Matched ${matchedCount}/${totalRequired} required skills.`;
  if (missing.length > 0) {
    explanation += ` Missing: ${missing.join(', ')}.`;
  }
  explanation += '\n';

  explanation += `  ├── Experience:  ${(subScores.experience * weights.experience / 100).toFixed(0)}/${(weights.experience * 100).toFixed(0)}`;
  explanation += ` — ${profile.totalYOE} years total`;
  if (jd.minExperience > 0) {
    explanation += `; JD requires ${jd.minExperience}+.`;
  }
  explanation += '\n';

  explanation += `  ├── Education:   ${(subScores.education * weights.education / 100).toFixed(0)}/${(weights.education * 100).toFixed(0)}`;
  if (profile.education && profile.education.level) {
    explanation += ` — ${profile.education.level}`;
    if (profile.education.field) explanation += ` in ${profile.education.field}`;
    explanation += '.';
  }
  if (jd.educationRequirement) {
    explanation += ` JD preferred: ${jd.educationRequirement} or higher.`;
  }
  explanation += '\n';

  explanation += `  └── Keywords:    ${(subScores.keyword * weights.keyword / 100).toFixed(0)}/${(weights.keyword * 100).toFixed(0)}`;
  explanation += ` — JD-specific terminology match.\n`;

  if (penalties.length > 0) {
    explanation += `\nPenalties: ${penalties.join('; ')}.\n`;
  } else {
    explanation += `\nPenalties: None.\n`;
  }

  if (bonuses.length > 0) {
    explanation += `Bonuses: ${bonuses.join('; ')}.\n`;
  }

  return explanation;
}

/**
 * Re-score all candidates with new weights.
 */
export function rescoreWithWeights(candidateProfiles, jdProfile, weights) {
  return candidateProfiles.map(profile => ({
    ...profile,
    ...scoreCandidate(profile, jdProfile, weights),
  }));
}
