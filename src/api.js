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
    const { runId, configStr } = await initRes.json();

    // 2. Upload and process in chunks (1 at a time for Vercel reliability)
    const CHUNK_SIZE = 2;
    let processedFilesCount = 0;
    let allCandidates = [];
    
    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
      const chunk = files.slice(i, i + CHUNK_SIZE);
      const formData = new FormData();
      formData.append('jdId', jdId);
      formData.append('configStr', configStr);

      for (const file of chunk) {
        formData.append('resumes', file);
      }

      // 55-second timeout per chunk
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);
      
      let chunkRes;
      try {
        chunkRes = await fetch(`${BASE}/pipeline/chunk/${runId}`, {
          method: 'POST',
          headers: { 'x-run-id': runId },
          body: formData,
          signal: controller.signal
        });
      } catch (fetchErr) {
        clearTimeout(timeout);
        if (fetchErr.name === 'AbortError') {
          throw new Error(`Chunk ${Math.floor(i/CHUNK_SIZE)+1} timed out after 55s. Try uploading fewer resumes.`);
        }
        throw fetchErr;
      }
      clearTimeout(timeout);
      
      if (!chunkRes.ok) {
        const errText = await chunkRes.text().catch(() => chunkRes.statusText);
        console.error('Chunk error response:', chunkRes.status, errText);
        throw new Error(`Chunk failed (${chunkRes.status}): ${errText.substring(0, 200)}`);
      }

      const data = await chunkRes.json();
      if (data.candidates) {
        allCandidates = allCandidates.concat(data.candidates);
      }
      
      processedFilesCount += chunk.length;
      if (onProgress) onProgress(processedFilesCount, files.length);
    }

    // 3. Finalize
    const finalizeRes = await fetch(`${BASE}/pipeline/finalize/${runId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jdId, configStr, candidates: allCandidates })
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
