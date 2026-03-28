/**
 * API Client — communicates with the Express backend.
 */

const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  // Handle CSV/binary responses
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) {
    return res.text();
  }

  return res.json();
}

export const api = {
  // Health
  health: () => request('/health'),

  // Job Descriptions
  createJD: (text, title) => request('/jd', {
    method: 'POST',
    body: JSON.stringify({ text, title }),
  }),
  getJD: (id) => request(`/jd/${id}`),
  listJDs: () => request('/jds'),

  // Pipeline
  runPipeline: (jdId, files, config = {}) => {
    const formData = new FormData();
    formData.append('jdId', jdId);
    formData.append('config', JSON.stringify(config));
    for (const file of files) {
      formData.append('resumes', file);
    }
    return fetch(`${BASE}/pipeline/run`, { method: 'POST', body: formData })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(err.error || 'Pipeline failed');
        }
        return res.json();
      });
  },
  getPipelineStatus: (runId) => request(`/pipeline/status/${runId}`),

  // Candidates
  getCandidates: (runId) => request(`/candidates/${runId}`),
  getCandidate: (id) => request(`/candidate/${id}`),
  updateCandidateStatus: (id, status, notes = '') => request(`/candidate/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
  }),
  chatWithResume: (candidateId, question) => request(`/candidate/${candidateId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  }),
  compareCandidates: (candidateIds, question) => request(`/candidates/compare`, {
    method: 'POST',
    body: JSON.stringify({ candidateIds, question }),
  }),

  // Re-scoring
  rescore: (runId, weights) => request(`/rescore/${runId}`, {
    method: 'POST',
    body: JSON.stringify({ weights }),
  }),

  // Reports
  downloadCSV: (runId) => {
    window.open(`${BASE}/reports/csv/${runId}`, '_blank');
  },
  getJSONReport: (runId) => request(`/reports/json/${runId}`),
  getAuditLog: (runId) => request(`/audit/${runId}`),
};
