/**
 * Score Ring — SVG circular progress component
 */

/**
 * Create a mini score ring for candidate cards.
 * @param {number} score - Score 0-100
 * @param {number} size - Ring size in pixels (default 48)
 * @returns {string} HTML string
 */
export function createScoreRingMini(score, size = 48) {
  const r = (size / 2) - 3;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return `
    <div class="score-ring-mini" style="width:${size}px;height:${size}px">
      <svg viewBox="0 0 ${size} ${size}">
        <circle class="ring-bg" cx="${size/2}" cy="${size/2}" r="${r}" />
        <circle class="ring-fill" cx="${size/2}" cy="${size/2}" r="${r}"
          stroke="${color}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}" />
      </svg>
      <div class="score-text" style="color:${color}">${Math.round(score)}</div>
    </div>
  `;
}

/**
 * Create a large score ring with sub-score arc segments.
 * @param {number} score - Composite score 0-100
 * @param {object} subScores - { skill, experience, education, keyword }
 * @returns {string} HTML string
 */
export function createScoreRingLarge(score, subScores = {}) {
  const size = 100;
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return `
    <div class="score-ring-large">
      <svg viewBox="0 0 ${size} ${size}">
        <circle class="ring-bg" cx="50" cy="50" r="${r}" />
        <circle class="ring-fill" cx="50" cy="50" r="${r}"
          stroke="${color}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}" />
      </svg>
      <div class="score-text">
        <span class="score-number" style="color:${color}">${Math.round(score)}</span>
        <span class="score-label">Score</span>
      </div>
    </div>
  `;
}

/**
 * Get the color for a given score.
 */
export function getScoreColor(score) {
  if (score >= 85) return '#10b981'; // Green
  if (score >= 65) return '#f59e0b'; // Yellow
  return '#ef4444'; // Red
}

/**
 * Get recommendation pill class.
 */
export function getRecommendationClass(recommendation) {
  switch (recommendation) {
    case 'Highly Recommended': return 'recommended';
    case 'Potential Fit': return 'potential';
    case 'Review Carefully': return 'review';
    case 'Overqualified': return 'overqualified';
    case 'Niche Specialist': return 'niche';
    default: return 'review';
  }
}

/**
 * Format file size.
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Get file type icon class.
 */
export function getFileTypeClass(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['docx', 'doc'].includes(ext)) return 'docx';
  return 'txt';
}

/**
 * Get file type label.
 */
export function getFileTypeLabel(filename) {
  const ext = filename.split('.').pop().toUpperCase();
  return ext;
}
