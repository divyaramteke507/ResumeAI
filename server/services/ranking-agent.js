/**
 * Module 05 — Ranking & Shortlisting Agent
 * Sorts, deduplicates, and shortlists candidates with diversity awareness.
 */

import crypto from 'crypto';

/**
 * Rank and shortlist scored candidates.
 *
 * @param {Array} scoredCandidates - Array of scored candidate objects
 * @param {object} config - Shortlisting configuration
 * @param {string} config.mode - "top_n" or "min_score"
 * @param {number} config.value - N for top_n, threshold for min_score
 * @param {number} config.minCandidates - Minimum shortlist size (default 3)
 * @returns {object} CandidateList
 */
export function rankCandidates(scoredCandidates, config = {}) {
  const mode = config.mode || 'top_n';
  const value = config.value || 10;
  const minCandidates = config.minCandidates || 3;

  // ── 1. Sort by composite score descending ────────────────────
  let ranked = [...scoredCandidates].sort((a, b) => b.compositeScore - a.compositeScore);

  // ── 2. Deduplication ─────────────────────────────────────────
  const { deduplicated, mergedCount } = deduplicateCandidates(ranked);
  ranked = deduplicated;

  // ── 3. Apply cutoff ──────────────────────────────────────────
  let shortlisted;
  let cutoffValue = value;

  if (mode === 'top_n') {
    shortlisted = ranked.slice(0, value);
  } else {
    // min_score mode
    shortlisted = ranked.filter(c => c.compositeScore >= value);
  }

  // If fewer than minCandidates, lower threshold automatically
  if (shortlisted.length < minCandidates && ranked.length >= minCandidates) {
    shortlisted = ranked.slice(0, minCandidates);
    cutoffValue = shortlisted[shortlisted.length - 1]?.compositeScore || 0;
  }

  // ── 4. Assign ranks ─────────────────────────────────────────
  shortlisted.forEach((candidate, index) => {
    candidate.rank = index + 1;
  });

  // Also assign ranks to non-shortlisted
  ranked.forEach((candidate, index) => {
    candidate.rank = index + 1;
  });

  // ── 5. Diversity nudge ───────────────────────────────────────
  const diversityCheck = checkDiversity(shortlisted);

  return {
    allRanked: ranked,
    shortlisted,
    cutoffApplied: mode,
    cutoffValue,
    totalCandidates: ranked.length,
    shortlistSize: shortlisted.length,
    duplicatesMerged: mergedCount,
    diversityFlag: diversityCheck.flag,
    diversityNote: diversityCheck.note,
  };
}

// ── Deduplication ───────────────────────────────────────────────

function deduplicateCandidates(candidates) {
  const seen = new Map();
  const deduplicated = [];
  let mergedCount = 0;

  for (const candidate of candidates) {
    // Generate dedup key from normalized name + email
    const name = (candidate.name || '').toLowerCase().replace(/[^a-z]/g, '');
    const email = (candidate.email || '').toLowerCase().trim();
    const key = crypto.createHash('md5').update(name + email).digest('hex');

    if (seen.has(key)) {
      // Keep the higher-scoring version
      const existing = seen.get(key);
      if (candidate.compositeScore > existing.compositeScore) {
        // Replace
        const idx = deduplicated.indexOf(existing);
        if (idx !== -1) deduplicated[idx] = candidate;
        seen.set(key, candidate);
      }
      mergedCount++;
    } else {
      seen.set(key, candidate);
      deduplicated.push(candidate);
    }
  }

  return { deduplicated, mergedCount };
}

// ── Diversity Check ─────────────────────────────────────────────

function checkDiversity(shortlisted) {
  if (shortlisted.length < 3) return { flag: false, note: null };

  // Check skill profile diversity (how varied the skill sets are)
  const allSkillSets = shortlisted.map(c =>
    new Set((c.matchedSkills || []).map(s => s.skill || s))
  );

  // Calculate average Jaccard similarity between pairs
  let totalSimilarity = 0;
  let pairCount = 0;

  for (let i = 0; i < allSkillSets.length; i++) {
    for (let j = i + 1; j < allSkillSets.length; j++) {
      const intersection = new Set([...allSkillSets[i]].filter(s => allSkillSets[j].has(s)));
      const union = new Set([...allSkillSets[i], ...allSkillSets[j]]);
      if (union.size > 0) {
        totalSimilarity += intersection.size / union.size;
        pairCount++;
      }
    }
  }

  const avgSimilarity = pairCount > 0 ? totalSimilarity / pairCount : 0;

  // If average pairwise similarity > 0.8, flag homogeneous shortlist
  if (avgSimilarity > 0.8) {
    return {
      flag: true,
      note: 'Shortlist candidates have very similar skill profiles. Consider reviewing candidates with complementary skill sets for team diversity.',
    };
  }

  // Check experience diversity
  const yoeValues = shortlisted.map(c => c.totalYOE || 0);
  const yoeRange = Math.max(...yoeValues) - Math.min(...yoeValues);
  if (yoeRange < 2 && shortlisted.length >= 5) {
    return {
      flag: true,
      note: 'All shortlisted candidates have very similar experience levels. Consider including candidates at different career stages.',
    };
  }

  return { flag: false, note: null };
}
