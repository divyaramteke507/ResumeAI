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
  runPipeline: async (jdId, files, config = {}, onProgress) => {
    // 1. Initialize
    const initRes = await fetch(`${BASE}/pipeline/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jdId, config })
    });
    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({ error: initRes.statusText }));
      throw new Error(err.error || 'Failed to initialize pipeline');
    }
    const { runId } = await initRes.json();

    // 2. Upload and process in chunks
    const CHUNK_SIZE = 3;
    let processedFilesCount = 0;
    
    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
      const chunk = files.slice(i, i + CHUNK_SIZE);
      const formData = new FormData();
      for (const file of chunk) {
        formData.append('resumes', file);
      }
      
      const chunkRes = await fetch(`${BASE}/pipeline/chunk/${runId}`, {
        method: 'POST',
        body: formData
      });
      
      if (!chunkRes.ok) {
        const err = await chunkRes.json().catch(() => ({ error: chunkRes.statusText }));
        throw new Error(err.error || `Chunk processing failed`);
      }
      
      processedFilesCount += chunk.length;
      if (onProgress) onProgress(processedFilesCount, files.length);
    }

    // 3. Finalize
    const finalizeRes = await fetch(`${BASE}/pipeline/finalize/${runId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!finalizeRes.ok) {
      const err = await finalizeRes.json().catch(() => ({ error: finalizeRes.statusText }));
      throw new Error(err.error || 'Failed to finalize pipeline');
    }
    
    return finalizeRes.json();
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
