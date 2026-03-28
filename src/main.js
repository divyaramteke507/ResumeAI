/**
 * AI Resume Screening Agent — Main Application
 * Handles routing, state, views, and keyboard shortcuts.
 */

import { api } from './api.js';
import {
  createScoreRingMini, createScoreRingLarge, getScoreColor,
  getRecommendationClass, formatFileSize, getFileTypeClass, getFileTypeLabel
} from './components/ui-components.js';
import Chart from 'chart.js/auto';
import { signInWithGoogle, logOut, onAuthChange } from './firebase-config.js';
import { renderLoginView } from './views/login.js';

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════

const state = {
  view: 'login', // 'login' | 'upload' | 'processing' | 'dashboard' | 'comparison'
  user: null, // Firebase user object
  jdId: null,
  jdProfile: null,
  runId: null,
  candidates: [],
  selectedCandidateId: null,
  searchQuery: '',
  weights: { skill: 0.40, experience: 0.30, education: 0.20, keyword: 0.10 },
  uploadedFiles: [],
  pipelineStats: null,
  diversityNote: null,
  rescoringTimeout: null,
  showHints: false,
  chatHistory: {},
  comparisonCandidates: [], // For multi-candidate comparison
  sideBySideMode: false, // For side-by-side view
};

// ═══════════════════════════════════════════════════════════════
// APP INIT
// ═══════════════════════════════════════════════════════════════

export function initApp() {
  // Listen for auth state changes
  onAuthChange((user) => {
    if (user) {
      state.user = user;
      if (state.view === 'login') {
        state.view = 'upload';
      }
      render();
    } else {
      state.user = null;
      state.view = 'login';
      render();
    }
  });
  
  render();
  initKeyboardShortcuts();
}

// ═══════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════

function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Login view (no header)
  if (state.view === 'login') {
    app.innerHTML = renderLoginView();
    bindEvents();
    return;
  }

  // Header (always shown for authenticated views)
  app.innerHTML += renderHeader();

  // Current view
  switch (state.view) {
    case 'upload':
      app.innerHTML += renderUploadView();
      break;
    case 'processing':
      app.innerHTML += renderProcessingView();
      break;
    case 'dashboard':
      app.innerHTML += renderDashboardView();
      break;
    case 'comparison':
      app.innerHTML += renderComparisonView();
      break;
  }

  // Bind events after render
  bindEvents();
}

// ═══════════════════════════════════════════════════════════════
// HEADER
// ═══════════════════════════════════════════════════════════════

function renderHeader() {
  return `
    <header class="app-header">
      <div class="app-logo">
        <div class="app-logo-icon">R</div>
        <span class="app-logo-text">ResumeAI</span>
        <span class="app-logo-badge">Agent v1.0</span>
      </div>
      <div class="header-actions">
        ${state.jdProfile ? `
          <div class="header-jd-indicator">
            <span class="dot"></span>
            <span>${state.jdProfile.title || 'Active JD'}</span>
          </div>
        ` : ''}
        ${state.view === 'dashboard' ? `
          <button class="btn btn-secondary btn-sm" id="btn-new-session">
            ✦ New Session
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-export-csv">
            ↓ CSV
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-compare-top">
            ⊞ Compare Top 3
          </button>
        ` : ''}
        ${state.user ? `
          <div class="user-menu">
            <img src="${state.user.photoURL || '/default-avatar.png'}" alt="${state.user.displayName}" class="user-avatar" />
            <span class="user-name">${state.user.displayName || state.user.email}</span>
            <button class="btn btn-secondary btn-sm" id="btn-logout">Logout</button>
          </div>
        ` : ''}
      </div>
    </header>
  `;
}

// ═══════════════════════════════════════════════════════════════
// UPLOAD VIEW
// ═══════════════════════════════════════════════════════════════

function renderUploadView() {
  const hasJD = state.jdProfile !== null;
  const hasFiles = state.uploadedFiles.length > 0;

  return `
    <div class="upload-view">
      <div class="upload-bg">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
      </div>
      <div class="upload-content">
        <div class="upload-hero">
          <h1>AI Resume Screening Agent</h1>
          <p>Upload a job description and resumes. Get ranked candidates with explainable AI scoring — all processed locally.</p>
        </div>
        
        <div class="upload-steps">
          <!-- Step 1: JD -->
          <div class="upload-step ${hasJD ? 'completed' : 'active'}" id="step-jd">
            <div class="step-header">
              <div class="step-number">${hasJD ? '✓' : '1'}</div>
              <div class="step-title">Job Description</div>
            </div>
            <textarea class="jd-textarea" id="jd-input"
              placeholder="Paste the job description here...&#10;&#10;Example:&#10;Senior Full-Stack Engineer&#10;Requirements: 5+ years experience, React, Node.js, AWS...&#10;Preferred: Kubernetes, GraphQL, TypeScript..."
            >${state.jdProfile?.rawText || ''}</textarea>
            ${!hasJD ? `
              <div style="margin-top: var(--space-3); display: flex; gap: var(--space-2);">
                <button class="btn btn-primary btn-sm" id="btn-process-jd">Process JD</button>
              </div>
            ` : `
              <div style="margin-top: var(--space-3);">
                <div style="font-size: var(--text-xs); color: var(--text-muted);">
                  ✓ ${state.jdProfile.requiredSkills?.length || 0} required skills · 
                  ${state.jdProfile.preferredSkills?.length || 0} preferred · 
                  ${state.jdProfile.minExperience || 0}+ yrs exp · 
                  Confidence: ${((state.jdProfile.confidence || 0) * 100).toFixed(0)}%
                </div>
                <button class="btn btn-ghost btn-sm" id="btn-reprocess-jd" style="margin-top: var(--space-2); font-size: var(--text-xs);">
                  ↻ Re-process
                </button>
              </div>
            `}
          </div>
          
          <!-- Step 2: Resumes -->
          <div class="upload-step ${hasFiles ? 'completed' : (hasJD ? 'active' : '')}" id="step-resumes">
            <div class="step-header">
              <div class="step-number">${hasFiles ? '✓' : '2'}</div>
              <div class="step-title">Upload Resumes</div>
            </div>
            <div class="dropzone" id="dropzone">
              <div class="dropzone-icon">📄</div>
              <div class="dropzone-text">
                Drag & drop resumes or <span>browse files</span>
              </div>
              <div class="dropzone-formats">All files and images — up to 20MB per file</div>
              <input type="file" id="file-input" multiple />
            </div>
            ${hasFiles ? `
              <div class="file-list" id="file-list">
                ${state.uploadedFiles.map((f, i) => `
                  <div class="file-item">
                    <div class="file-item-icon ${getFileTypeClass(f.name)}">${getFileTypeLabel(f.name)}</div>
                    <div class="file-item-name">${f.name}</div>
                    <div class="file-item-size">${formatFileSize(f.size)}</div>
                    <button class="file-item-remove" data-index="${i}">✕</button>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="upload-cta">
          <button class="btn btn-primary btn-lg" id="btn-start-screening"
            ${(!hasJD || !hasFiles) ? 'disabled' : ''}>
            🧠 Start Screening · ${state.uploadedFiles.length} Resume${state.uploadedFiles.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// PROCESSING VIEW
// ═══════════════════════════════════════════════════════════════

const PIPELINE_STAGES = [
  { name: 'JD Processing', desc: 'Building requirement vector from job description', icon: '📋' },
  { name: 'Resume Ingestion', desc: 'Extracting text from uploaded documents', icon: '📄' },
  { name: 'Skill Extraction', desc: 'Identifying skills, experience, and education', icon: '🔍' },
  { name: 'Scoring Engine', desc: 'Computing weighted match scores', icon: '⚡' },
  { name: 'Ranking Agent', desc: 'Sorting, deduplicating, and shortlisting', icon: '📊' },
  { name: 'Report Generation', desc: 'Preparing results and audit trail', icon: '📑' },
];

function renderProcessingView() {
  return `
    <div class="processing-view">
      <div class="processing-content">
        <div class="processing-title">Processing Resumes</div>
        <div class="processing-subtitle">Running the AI pipeline on ${state.uploadedFiles.length} resume${state.uploadedFiles.length !== 1 ? 's' : ''}...</div>
        <div class="pipeline-stages" id="pipeline-stages">
          ${PIPELINE_STAGES.map((stage, i) => `
            <div class="pipeline-stage" data-stage="${i}" id="stage-${i}">
              <div class="stage-icon">
                <span class="stage-dot" style="font-size: 16px;">${stage.icon}</span>
              </div>
              <div class="stage-info">
                <div class="stage-name">${stage.name}</div>
                <div class="stage-desc">${stage.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD VIEW
// ═══════════════════════════════════════════════════════════════

function renderDashboardView() {
  const filtered = getFilteredCandidates();
  const selected = state.candidates.find(c => c.id === state.selectedCandidateId);

  return `
    <div class="dashboard-view">
      <!-- Sidebar — Criteria Tuning -->
      <div class="dashboard-sidebar">
        ${renderSidebar()}
      </div>
      
      <!-- Main Content — Dual Pane -->
      <div class="dashboard-main">
        <!-- Left Pane — The Queue -->
        <div class="pane-queue">
          ${renderQueue(filtered)}
        </div>
        
        <!-- Right Pane — The Insight -->
        <div class="pane-insight" id="pane-insight">
          ${selected ? renderInsight(selected) : renderInsightEmpty()}
        </div>
      </div>
    </div>
    
    <!-- Keyboard Hints Toggle -->
    <button class="hints-toggle-btn" id="btn-toggle-hints" title="Keyboard Shortcuts" type="button">
      ⌨ Shortcuts
    </button>
    
    <div class="keyboard-hints" id="keyboard-hints-container" style="display: none;">
      <div class="kbd-hint"><kbd>→</kbd> Approve</div>
      <div class="kbd-hint"><kbd>←</kbd> Reject</div>
      <div class="kbd-hint"><kbd>Space</kbd> Next</div>
      <div class="kbd-hint"><kbd>↑</kbd><kbd>↓</kbd> Navigate</div>
    </div>
  `;
}

// ── Sidebar ─────────────────────────────────────────────────────

function renderSidebar() {
  const sliders = [
    { key: 'skill', label: 'Skills', color: 'var(--accent-blue)' },
    { key: 'experience', label: 'Experience', color: 'var(--accent-cyan)' },
    { key: 'education', label: 'Education', color: 'var(--accent-purple)' },
    { key: 'keyword', label: 'Keywords', color: 'var(--score-yellow)' },
  ];

  return `
    <div class="sidebar-section">
      <div class="sidebar-section-title">⚙ Scoring Weights</div>
      ${sliders.map(s => `
        <div class="weight-slider">
          <div class="weight-slider-header">
            <span class="weight-slider-label">${s.label}</span>
            <span class="weight-slider-value" id="weight-val-${s.key}">${Math.round(state.weights[s.key] * 100)}%</span>
          </div>
          <input type="range" min="0" max="100" value="${Math.round(state.weights[s.key] * 100)}"
            id="weight-${s.key}" data-key="${s.key}" class="weight-input" />
        </div>
      `).join('')}
      
      <div class="sidebar-section-title" style="margin-top: var(--space-4);">Presets</div>
      <div class="preset-buttons">
        <button class="preset-btn" data-preset="balanced">Balanced</button>
        <button class="preset-btn" data-preset="technical">Technical</button>
        <button class="preset-btn" data-preset="leadership">Leadership</button>
        <button class="preset-btn" data-preset="junior">Junior</button>
      </div>
    </div>
    
    <div class="sidebar-section">
      <div class="sidebar-section-title">📊 Run Statistics</div>
      ${state.pipelineStats ? `
        <div class="stat-row">
          <span class="stat-label">Total Processed</span>
          <span class="stat-value">${state.pipelineStats.totalProcessed}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Successfully Parsed</span>
          <span class="stat-value">${state.pipelineStats.successfullyParsed}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Parse Errors</span>
          <span class="stat-value">${state.pipelineStats.parseErrors}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Duplicates Merged</span>
          <span class="stat-value">${state.pipelineStats.duplicatesMerged}</span>
        </div>
      ` : ''}
    </div>
    
    <div class="sidebar-section">
      <div class="sidebar-section-title">🎯 Shortlist</div>
      <div class="stat-row">
        <span class="stat-label">Approved</span>
        <span class="stat-value" style="color: var(--score-green)">
          ${state.candidates.filter(c => c.status === 'approved').length}
        </span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Rejected</span>
        <span class="stat-value" style="color: var(--score-red)">
          ${state.candidates.filter(c => c.status === 'rejected').length}
        </span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Pending</span>
        <span class="stat-value">
          ${state.candidates.filter(c => c.status === 'pending').length}
        </span>
      </div>
    </div>
  `;
}

// ── Queue ───────────────────────────────────────────────────────

function renderQueue(candidates) {
  return `
    <div class="queue-header">
      <div class="queue-title">
        Candidates
        <span class="queue-count">${candidates.length} of ${state.candidates.length}</span>
      </div>
      <input type="text" class="queue-search" id="queue-search"
        placeholder="Search candidates..." value="${state.searchQuery}" />
    </div>
    ${state.diversityNote ? `
      <div class="diversity-banner">
        <span>⚠</span>
        <span>${state.diversityNote}</span>
      </div>
    ` : ''}
    <div class="queue-list" id="queue-list">
      ${candidates.map(c => renderCandidateCard(c)).join('')}
    </div>
  `;
}

function renderCandidateCard(candidate) {
  const isSelected = candidate.id === state.selectedCandidateId;
  const statusClass = candidate.status !== 'pending' ? `status-${candidate.status}` : '';
  const recClass = getRecommendationClass(candidate.recommendation);

  return `
    <div class="candidate-card ${isSelected ? 'selected' : ''} ${statusClass}"
      data-candidate-id="${candidate.id}" id="card-${candidate.id}">
      ${createScoreRingMini(candidate.composite_score)}
      <div class="card-info">
        <div class="card-name">${candidate.name}</div>
        <div class="card-meta">
          <span class="status-pill ${recClass}">${candidate.recommendation}</span>
          <span>${candidate.total_yoe || 0} yrs</span>
        </div>
      </div>
      <span class="card-rank">#${candidate.rank}</span>
    </div>
  `;
}

// ── Insight ─────────────────────────────────────────────────────

function renderInsightEmpty() {
  return `
    <div class="insight-empty">
      <div>
        <div style="font-size: 48px; margin-bottom: var(--space-4); opacity: 0.3;">👤</div>
        <div>Select a candidate to view their AI analysis</div>
        <div style="font-size: var(--text-sm); color: var(--text-dim); margin-top: var(--space-2);">
          Use ↑↓ keys to navigate, → to approve, ← to reject
        </div>
      </div>
    </div>
  `;
}

function renderInsight(c) {
  const matchedSkills = c.matched_skills || [];
  const missingSkills = c.missing_skills || [];
  const preferredMatched = c.preferred_matched || [];
  const subScores = c.sub_scores || {};
  const penalties = c.penalties || [];
  const bonuses = c.bonuses || [];
  const highlights = c.key_highlights || [];
  const education = c.education || {};

  return `
    <div class="insight-content" style="animation: scaleIn 0.2s ease">
      <!-- Header with Score Ring -->
      <div class="insight-header">
        ${createScoreRingLarge(c.composite_score, subScores)}
        <div class="insight-headline">
          <h2 class="insight-name">${c.name}</h2>
          <div class="insight-meta">
            ${c.email ? `<span>✉ ${c.email}</span>` : ''}
            ${c.total_yoe ? `<span>⏱ ${c.total_yoe} yrs experience</span>` : ''}
            ${education.level ? `<span>🎓 ${education.level}${education.field ? ' in ' + education.field : ''}</span>` : ''}
          </div>
          <div class="insight-actions">
            <button class="btn btn-success btn-sm" data-action="approve" data-id="${c.id}"
              ${c.status === 'approved' ? 'disabled' : ''}>
              ${c.status === 'approved' ? '✓ Approved' : '→ Approve'}
            </button>
            <button class="btn btn-danger btn-sm" data-action="reject" data-id="${c.id}"
              ${c.status === 'rejected' ? 'disabled' : ''}>
              ${c.status === 'rejected' ? '✗ Rejected' : '← Reject'}
            </button>
            <button class="btn btn-secondary btn-sm" data-action="interview" data-id="${c.id}">
              📅 Schedule Interview
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-side-by-side" data-id="${c.id}">
              ⊞ Side-by-Side View
            </button>
          </div>
        </div>
      </div>
      
      <!-- Score Breakdown & Radar Chart -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); margin-bottom: var(--space-6);">
        <div class="score-breakdown" style="margin-bottom: 0;">
          <div class="section-title">📊 Score Breakdown</div>
          ${renderScoreBar('Skills', subScores.skill || 0, 'skill')}
          ${renderScoreBar('Experience', subScores.experience || 0, 'experience')}
          ${renderScoreBar('Education', subScores.education || 0, 'education')}
          ${renderScoreBar('Keywords', subScores.keyword || 0, 'keyword')}
        </div>
        <div style="position: relative; width: 100%; height: 240px; display: flex; justify-content: center; align-items: center;">
          <canvas id="score-radar-chart"></canvas>
        </div>
      </div>
      
      <!-- Skill Badges -->
      <div>
        <div class="section-title">🏷 Skills Analysis</div>
        <div class="skill-badges">
          ${matchedSkills.map(s => `
            <span class="skill-badge matched">✓ ${s.skill || s}</span>
          `).join('')}
          ${preferredMatched.map(s => `
            <span class="skill-badge preferred">★ ${s.skill || s}</span>
          `).join('')}
          ${missingSkills.map(s => `
            <span class="skill-badge missing">✗ ${s}</span>
          `).join('')}
        </div>
      </div>
      
      <!-- Gap Analysis -->
      ${missingSkills.length > 0 ? `
        <div class="gap-analysis">
          <div class="section-title" style="margin-bottom: var(--space-2);">⚠ Gap Analysis</div>
          <div class="gap-text">
            Missing ${missingSkills.length} required skill${missingSkills.length !== 1 ? 's' : ''}: 
            <strong>${missingSkills.join(', ')}</strong>
          </div>
        </div>
      ` : ''}
      
      <!-- Key Highlights -->
      ${highlights.length > 0 ? `
        <div>
          <div class="section-title">✨ Key Highlights</div>
          <ul class="highlights-list">
            ${highlights.map(h => `<li>${h}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <!-- Penalties & Bonuses -->
      ${(penalties.length > 0 || bonuses.length > 0) ? `
        <div class="penalty-bonus-section">
          <div class="penalty-list">
            <div class="pb-title">Penalties</div>
            ${penalties.length === 0 ? '<div class="pb-item">None</div>' : ''}
            ${penalties.map(p => `<div class="pb-item">• ${p}</div>`).join('')}
          </div>
          <div class="bonus-list">
            <div class="pb-title">Bonuses</div>
            ${bonuses.length === 0 ? '<div class="pb-item">None</div>' : ''}
            ${bonuses.map(b => `<div class="pb-item">• ${b}</div>`).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- Full Explanation -->
      <div>
        <div class="section-title">🧠 AI Reasoning (WHY Card)</div>
        <div class="explanation-block">${c.explanation || 'No explanation available.'}</div>
      </div>
      
      <!-- Chat with Resume -->
      <div class="chat-resume-section" style="margin-bottom: var(--space-6);">
        <div class="section-title">💬 Chat with Resume (AI)</div>
        <div class="chat-container" style="background: var(--bg-elevated); border-radius: var(--radius-lg); border: 1px solid var(--border-default); display: flex; flex-direction: column; overflow: hidden; height: 400px;">
          <!-- Quick Questions -->
          <div class="quick-questions" style="padding: var(--space-3); border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface);">
            <div style="font-size: var(--text-xs); color: var(--text-tertiary); margin-bottom: var(--space-2);">Quick questions:</div>
            <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
              <button class="quick-question-btn" data-candidate="${c.id}" data-question="What are their key skills?" style="padding: 4px 8px; font-size: var(--text-xs); border: 1px solid var(--border-default); border-radius: var(--radius-sm); background: var(--bg-active); color: var(--text-secondary); cursor: pointer; transition: all 0.2s;">Skills</button>
              <button class="quick-question-btn" data-candidate="${c.id}" data-question="Tell me about their experience" style="padding: 4px 8px; font-size: var(--text-xs); border: 1px solid var(--border-default); border-radius: var(--radius-sm); background: var(--bg-active); color: var(--text-secondary); cursor: pointer; transition: all 0.2s;">Experience</button>
              <button class="quick-question-btn" data-candidate="${c.id}" data-question="What is their education?" style="padding: 4px 8px; font-size: var(--text-xs); border: 1px solid var(--border-default); border-radius: var(--radius-sm); background: var(--bg-active); color: var(--text-secondary); cursor: pointer; transition: all 0.2s;">Education</button>
              <button class="quick-question-btn" data-candidate="${c.id}" data-question="Do they have leadership experience?" style="padding: 4px 8px; font-size: var(--text-xs); border: 1px solid var(--border-default); border-radius: var(--radius-sm); background: var(--bg-active); color: var(--text-secondary); cursor: pointer; transition: all 0.2s;">Leadership</button>
              <button class="quick-question-btn" data-candidate="${c.id}" data-question="Give me a summary" style="padding: 4px 8px; font-size: var(--text-xs); border: 1px solid var(--border-default); border-radius: var(--radius-sm); background: var(--bg-active); color: var(--text-secondary); cursor: pointer; transition: all 0.2s;">Summary</button>
            </div>
          </div>
          <div class="chat-messages" id="chat-messages-${c.id}" style="flex: 1; padding: var(--space-4); overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-3);">
            ${renderChatMessages(c.id)}
          </div>
          <div class="chat-input-area" style="display: flex; align-items: center; border-top: 1px solid var(--border-subtle); padding: var(--space-2); background: var(--bg-surface); gap: var(--space-2);">
            <input type="text" id="chat-input-${c.id}" class="chat-input-field" placeholder="Ask a question about this resume..." style="flex: 1; padding: var(--space-2) var(--space-3); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-active); color: var(--text-primary); outline: none;" />
            <button class="btn btn-sm chat-clear-btn" data-candidate="${c.id}" style="padding: var(--space-2); background: var(--bg-active); border: 1px solid var(--border-default); color: var(--text-tertiary);" title="Clear chat">🗑️</button>
            <button class="btn btn-primary btn-sm chat-send-btn" data-candidate="${c.id}">Send</button>
          </div>
        </div>
      </div>

      <!-- Audit Badge -->
      <div style="text-align: center; padding: var(--space-4); opacity: 0.5; font-size: var(--text-xs); color: var(--text-dim);">
        Agent v1.0 · Weights: S${Math.round(state.weights.skill * 100)} E${Math.round(state.weights.experience * 100)} Ed${Math.round(state.weights.education * 100)} K${Math.round(state.weights.keyword * 100)}
        · File: ${c.filename} · Parse: ${c.parse_method} (${((c.parse_confidence || 0) * 100).toFixed(0)}%)
      </div>
    </div>
  `;
}

function renderScoreBar(label, score, className) {
  return `
    <div class="score-bar-row">
      <span class="score-bar-label">${label}</span>
      <div class="score-bar-track">
        <div class="score-bar-fill ${className}" style="width: ${score}%"></div>
      </div>
      <span class="score-bar-value" style="color: ${getScoreColor(score)}">${Math.round(score)}</span>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// COMPARE MODAL
// ═══════════════════════════════════════════════════════════════

function showCompareModal() {
  const top3 = state.candidates.slice(0, 3);
  if (top3.length === 0) return;

  const modal = document.getElementById('modal-root');
  modal.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">⊞ Compare Top ${top3.length}</h3>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="compare-grid">
            ${top3.map(c => renderCompareCard(c)).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
}

function renderCompareCard(c) {
  const subScores = c.sub_scores || {};
  const matchedSkills = c.matched_skills || [];
  const missingSkills = c.missing_skills || [];

  return `
    <div class="compare-card">
      <div class="compare-card-header">
        ${createScoreRingMini(c.composite_score, 60)}
        <h4 style="margin-top: var(--space-2); font-size: var(--text-base);">${c.name}</h4>
        <span class="status-pill ${getRecommendationClass(c.recommendation)}">${c.recommendation}</span>
      </div>
      
      <div class="compare-section">
        <div class="compare-section-title">Sub-Scores</div>
        ${renderScoreBar('Skills', subScores.skill || 0, 'skill')}
        ${renderScoreBar('Exp', subScores.experience || 0, 'experience')}
        ${renderScoreBar('Edu', subScores.education || 0, 'education')}
        ${renderScoreBar('KW', subScores.keyword || 0, 'keyword')}
      </div>
      
      <div class="compare-section">
        <div class="compare-section-title">Matched Skills</div>
        <div class="skill-badges">
          ${matchedSkills.slice(0, 6).map(s => `
            <span class="skill-badge matched" style="font-size:9px;">${s.skill || s}</span>
          `).join('')}
        </div>
      </div>
      
      <div class="compare-section">
        <div class="compare-section-title">Gaps</div>
        <div class="skill-badges">
          ${missingSkills.slice(0, 4).map(s => `
            <span class="skill-badge missing" style="font-size:9px;">${s}</span>
          `).join('')}
          ${missingSkills.length === 0 ? '<span style="font-size: var(--text-xs); color: var(--score-green);">None!</span>' : ''}
        </div>
      </div>
      
      <div class="compare-section">
        <div class="compare-section-title">Info</div>
        <div style="font-size: var(--text-xs); color: var(--text-muted);">
          ${c.total_yoe || 0} yrs exp · ${(c.education || {}).level || 'N/A'}
        </div>
      </div>
    </div>
  `;
}

function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}

// ═══════════════════════════════════════════════════════════════
// COMPARISON VIEW (Multi-Candidate with Chat)
// ═══════════════════════════════════════════════════════════════

function renderComparisonView() {
  const candidates = state.comparisonCandidates.map(id => 
    state.candidates.find(c => c.id === id)
  ).filter(Boolean);

  if (candidates.length === 0) {
    return `
      <div class="comparison-view">
        <div class="comparison-empty">
          <div style="font-size: 48px; margin-bottom: var(--space-4);">⊞</div>
          <div>No candidates selected for comparison</div>
          <button class="btn btn-primary" id="btn-back-to-dashboard">← Back to Dashboard</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="comparison-view">
      <div class="comparison-header">
        <h2>Compare Candidates</h2>
        <div style="display: flex; gap: var(--space-2);">
          <button class="btn btn-secondary btn-sm" id="btn-back-to-dashboard">← Back</button>
          <button class="btn btn-secondary btn-sm" id="btn-export-comparison">↓ Export</button>
        </div>
      </div>
      
      <!-- Comparison Chat -->
      <div class="comparison-chat-section">
        <div class="section-title">💬 Ask About These Candidates</div>
        <div class="chat-container" style="background: var(--bg-elevated); border-radius: var(--radius-lg); border: 1px solid var(--border-default); display: flex; flex-direction: column; overflow: hidden; height: 300px;">
          <div class="quick-questions" style="padding: var(--space-3); border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface);">
            <div style="font-size: var(--text-xs); color: var(--text-tertiary); margin-bottom: var(--space-2);">Quick comparisons:</div>
            <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
              <button class="comparison-quick-btn" data-question="Compare their skills">Skills</button>
              <button class="comparison-quick-btn" data-question="Who has more experience?">Experience</button>
              <button class="comparison-quick-btn" data-question="Compare their education">Education</button>
              <button class="comparison-quick-btn" data-question="Who has leadership experience?">Leadership</button>
              <button class="comparison-quick-btn" data-question="What are the key differences?">Differences</button>
            </div>
          </div>
          <div class="chat-messages" id="comparison-chat-messages" style="flex: 1; padding: var(--space-4); overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-3);">
            ${renderComparisonChatMessages()}
          </div>
          <div class="chat-input-area" style="display: flex; align-items: center; border-top: 1px solid var(--border-subtle); padding: var(--space-2); background: var(--bg-surface); gap: var(--space-2);">
            <input type="text" id="comparison-chat-input" class="chat-input-field" placeholder="Ask to compare these candidates..." style="flex: 1; padding: var(--space-2) var(--space-3); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-active); color: var(--text-primary); outline: none;" />
            <button class="btn btn-sm" id="comparison-chat-clear" style="padding: var(--space-2); background: var(--bg-active); border: 1px solid var(--border-default); color: var(--text-tertiary);" title="Clear chat">🗑️</button>
            <button class="btn btn-primary btn-sm" id="comparison-chat-send">Send</button>
          </div>
        </div>
      </div>
      
      <!-- Candidate Cards -->
      <div class="comparison-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: var(--space-4); margin-top: var(--space-6);">
        ${candidates.map(c => renderComparisonDetailCard(c)).join('')}
      </div>
    </div>
  `;
}

function renderComparisonDetailCard(c) {
  const subScores = c.sub_scores || {};
  const matchedSkills = c.matched_skills || [];
  const missingSkills = c.missing_skills || [];
  const education = c.education || {};

  return `
    <div class="comparison-detail-card" style="background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: var(--space-4);">
      <div style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4);">
        ${createScoreRingMini(c.composite_score, 70)}
        <div>
          <h3 style="font-size: var(--text-lg); margin-bottom: var(--space-1);">${c.name}</h3>
          <div style="font-size: var(--text-sm); color: var(--text-muted);">
            Rank #${c.rank} · ${c.total_yoe || 0} yrs
          </div>
        </div>
      </div>
      
      <div style="margin-bottom: var(--space-3);">
        <div style="font-size: var(--text-sm); font-weight: 500; margin-bottom: var(--space-2);">Score Breakdown</div>
        ${renderScoreBar('Skills', subScores.skill || 0, 'skill')}
        ${renderScoreBar('Experience', subScores.experience || 0, 'experience')}
        ${renderScoreBar('Education', subScores.education || 0, 'education')}
        ${renderScoreBar('Keywords', subScores.keyword || 0, 'keyword')}
      </div>
      
      <div style="margin-bottom: var(--space-3);">
        <div style="font-size: var(--text-sm); font-weight: 500; margin-bottom: var(--space-2);">Education</div>
        <div style="font-size: var(--text-sm); color: var(--text-secondary);">
          ${education.level || 'Not specified'}${education.field ? ' in ' + education.field : ''}
        </div>
      </div>
      
      <div style="margin-bottom: var(--space-3);">
        <div style="font-size: var(--text-sm); font-weight: 500; margin-bottom: var(--space-2);">Matched Skills (${matchedSkills.length})</div>
        <div class="skill-badges">
          ${matchedSkills.slice(0, 8).map(s => `
            <span class="skill-badge matched" style="font-size: 10px;">${s.skill || s}</span>
          `).join('')}
          ${matchedSkills.length > 8 ? `<span style="font-size: var(--text-xs); color: var(--text-muted);">+${matchedSkills.length - 8} more</span>` : ''}
        </div>
      </div>
      
      <div>
        <div style="font-size: var(--text-sm); font-weight: 500; margin-bottom: var(--space-2);">Missing Skills (${missingSkills.length})</div>
        <div class="skill-badges">
          ${missingSkills.slice(0, 6).map(s => `
            <span class="skill-badge missing" style="font-size: 10px;">${s}</span>
          `).join('')}
          ${missingSkills.length > 6 ? `<span style="font-size: var(--text-xs); color: var(--text-muted);">+${missingSkills.length - 6} more</span>` : ''}
          ${missingSkills.length === 0 ? '<span style="font-size: var(--text-xs); color: var(--score-green);">None!</span>' : ''}
        </div>
      </div>
    </div>
  `;
}

function renderComparisonChatMessages() {
  const messages = state.chatHistory['comparison'] || [{ 
    role: 'ai', 
    text: 'Hi! Ask me to compare these candidates. Try "Compare their skills" or "Who has more experience?"' 
  }];
  
  return messages.map(m => `
    <div style="display: flex; gap: var(--space-3); margin-bottom: var(--space-2); flex-direction: ${m.role === 'user' ? 'row-reverse' : 'row'}; animation: fadeIn 0.3s ease-in;">
      <div style="font-size: 20px; line-height: 1; flex-shrink: 0;">${m.role === 'user' ? '👤' : '🤖'}</div>
      <div style="padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); font-size: var(--text-sm); line-height: 1.5;
        background: ${m.role === 'user' ? 'var(--accent-blue-glow)' : 'var(--bg-active)'};
        color: ${m.role === 'user' ? 'var(--accent-blue)' : 'var(--text-secondary)'};
        max-width: 80%;
        border: 1px solid ${m.role === 'user' ? 'rgba(59,130,246,0.3)' : 'var(--border-default)'};
        word-wrap: break-word;
        white-space: pre-wrap;
      ">
        ${m.text}
      </div>
    </div>
  `).join('');
}

async function handleComparisonChatSubmit(question) {
  if (!question.trim()) return;

  if (!state.chatHistory['comparison']) {
    state.chatHistory['comparison'] = [{ 
      role: 'ai', 
      text: 'Hi! Ask me to compare these candidates. Try "Compare their skills" or "Who has more experience?"' 
    }];
  }

  state.chatHistory['comparison'].push({ role: 'user', text: question });

  const chatMessagesEl = document.getElementById('comparison-chat-messages');
  if (chatMessagesEl) {
    chatMessagesEl.innerHTML = renderComparisonChatMessages();
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }
  
  const inputEl = document.getElementById('comparison-chat-input');
  if (inputEl) {
    inputEl.value = '';
    inputEl.disabled = true;
  }

  state.chatHistory['comparison'].push({ role: 'ai', text: '<span style="opacity:0.5">● ● ● Analyzing...</span>' });
  if (chatMessagesEl) {
    chatMessagesEl.innerHTML = renderComparisonChatMessages();
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }

  try {
    const res = await api.compareCandidates(state.comparisonCandidates, question);
    state.chatHistory['comparison'].pop();
    state.chatHistory['comparison'].push({ role: 'ai', text: res.answer });
  } catch (err) {
    state.chatHistory['comparison'].pop();
    state.chatHistory['comparison'].push({ role: 'ai', text: '⚠️ Error: ' + err.message });
  }

  if (inputEl) {
    inputEl.disabled = false;
    inputEl.focus();
  }

  if (document.getElementById('comparison-chat-messages')) {
    const el = document.getElementById('comparison-chat-messages');
    el.innerHTML = renderComparisonChatMessages();
    el.scrollTop = el.scrollHeight;
  }
}

// ═══════════════════════════════════════════════════════════════
// SIDE-BY-SIDE VIEW
// ═══════════════════════════════════════════════════════════════

async function showSideBySideView(candidateId) {
  const candidate = state.candidates.find(c => c.id === candidateId);
  if (!candidate) return;

  // Determine file type
  const fileExt = candidate.filename.split('.').pop().toLowerCase();
  
  // Get the correct file path
  let filePath = candidate.file_path;
  
  // If file_path is not set, try to get it from the API
  if (!filePath) {
    try {
      const response = await fetch(`/api/candidate/${candidateId}/file`);
      if (response.ok) {
        const data = await response.json();
        filePath = data.filePath;
        console.log('Found file via API:', filePath);
      } else {
        // Fallback to constructed path
        filePath = `/uploads/${state.runId}/${candidate.filename}`;
        console.log('Using fallback path:', filePath);
      }
    } catch (err) {
      console.error('Error getting file path:', err);
      filePath = `/uploads/${state.runId}/${candidate.filename}`;
    }
  }
  
  console.log('=== Side-by-Side View Debug ===');
  console.log('Candidate:', candidate.name);
  console.log('File path:', filePath);
  console.log('File extension:', fileExt);
  console.log('Run ID:', state.runId);
  console.log('Original filename:', candidate.filename);
  console.log('Stored file_path:', candidate.file_path);
  console.log('================================');
  
  // Initial view mode
  let currentView = 'original'; // 'original' or 'text'
  
  function renderResumeView(viewMode) {
    if (viewMode === 'text') {
      return `
        <div style="width: 100%; height: 100%; overflow: auto; padding: var(--space-4); background: var(--bg-surface);">
          <div style="background: var(--bg-elevated); padding: var(--space-4); border-radius: var(--radius-md); font-family: monospace; font-size: var(--text-sm); line-height: 1.6; white-space: pre-wrap; color: var(--text-secondary);">
            ${candidate.raw_text || 'No text extracted'}
          </div>
        </div>
      `;
    }
    
    // Original file view
    let fileViewer = '';
    
    if (fileExt === 'pdf') {
      fileViewer = `
        <iframe 
          src="${filePath}#view=FitH" 
          style="width: 100%; height: 100%; border: none; background: white;"
          title="Resume PDF"
        ></iframe>
      `;
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExt)) {
      fileViewer = `
        <div style="width: 100%; height: 100%; overflow: auto; background: var(--bg-surface); display: flex; align-items: center; justify-content: center; padding: var(--space-4);">
          <img 
            src="${filePath}" 
            alt="Resume Image"
            style="max-width: 100%; height: auto; border-radius: var(--radius-md); box-shadow: 0 4px 12px rgba(0,0,0,0.3);"
            onerror="this.parentElement.innerHTML='<div style=\\'text-align:center;color:var(--text-muted);\\'>Image failed to load. Path: ${filePath}<br><a href=\\\'${filePath}\\\' download class=\\'btn btn-primary btn-sm\\' style=\\'margin-top:16px;\\'>Download File</a></div>';"
          />
        </div>
      `;
    } else if (['doc', 'docx'].includes(fileExt)) {
      fileViewer = `
        <div style="width: 100%; height: 100%; overflow: auto; padding: var(--space-4); background: var(--bg-surface);">
          <div style="text-align: center; margin-bottom: var(--space-4);">
            <div style="font-size: var(--text-lg); color: var(--text-primary); margin-bottom: var(--space-2);">📄 Word Document</div>
            <a href="${filePath}" download="${candidate.filename}" class="btn btn-primary btn-sm">
              ↓ Download Original File
            </a>
            <div style="font-size: var(--text-sm); color: var(--text-muted); margin-top: var(--space-2);">
              Word documents cannot be previewed directly in the browser.<br>
              Download to view the original formatting.
            </div>
          </div>
          <div style="border-top: 1px solid var(--border-default); padding-top: var(--space-4);">
            <div style="font-size: var(--text-sm); font-weight: 500; margin-bottom: var(--space-2); color: var(--text-secondary);">Extracted Text Preview:</div>
            <div style="background: var(--bg-elevated); padding: var(--space-4); border-radius: var(--radius-md); font-family: monospace; font-size: var(--text-sm); line-height: 1.6; white-space: pre-wrap; color: var(--text-secondary);">
              ${candidate.raw_text || 'No text extracted'}
            </div>
          </div>
        </div>
      `;
    } else {
      fileViewer = `
        <div style="width: 100%; height: 100%; overflow: auto; padding: var(--space-4); background: var(--bg-surface); display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="font-size: 48px; margin-bottom: var(--space-4);">📄</div>
          <div style="font-size: var(--text-lg); color: var(--text-primary); margin-bottom: var(--space-2);">${candidate.filename}</div>
          <a href="${filePath}" download="${candidate.filename}" class="btn btn-primary btn-sm">
            ↓ Download Original File
          </a>
          <div style="font-size: var(--text-sm); color: var(--text-muted); margin-top: var(--space-4); max-width: 400px; text-align: center;">
            This file type cannot be previewed in the browser.<br>
            Download it to view the original.
          </div>
          <div style="font-size: var(--text-xs); color: var(--text-dim); margin-top: var(--space-2);">
            File path: ${filePath}
          </div>
        </div>
      `;
    }
    
    return fileViewer;
  }

  const modal = document.getElementById('modal-root');
  modal.innerHTML = `
    <div class="modal-overlay" id="modal-overlay" style="background: rgba(0,0,0,0.95);">
      <div class="modal-content" style="max-width: 95vw; width: 95vw; height: 90vh; max-height: 90vh;">
        <div class="modal-header">
          <h3 class="modal-title">⊞ ${candidate.name} - Profile & Resume</h3>
          <div style="display: flex; gap: var(--space-2); align-items: center;">
            <a href="${filePath}" download="${candidate.filename}" class="btn btn-secondary btn-sm" title="Download resume">
              ↓ Download
            </a>
            <button class="modal-close" id="modal-close-btn">✕</button>
          </div>
        </div>
        <div class="modal-body" style="height: calc(100% - 60px); overflow: hidden;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); height: 100%;">
            <!-- Left: Profile -->
            <div style="overflow-y: auto; padding-right: var(--space-2);">
              <h3 style="margin-bottom: var(--space-4); font-size: var(--text-lg);">📊 Candidate Profile</h3>
              ${renderSideBySideProfile(candidate)}
            </div>
            
            <!-- Right: Resume Viewer with Toggle -->
            <div style="overflow: hidden; padding-left: var(--space-2); border-left: 1px solid var(--border-default); display: flex; flex-direction: column;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
                <h3 style="font-size: var(--text-lg);">📄 Resume</h3>
                <div class="toggle-buttons" style="display: flex; gap: var(--space-2); background: var(--bg-surface); padding: 4px; border-radius: var(--radius-md); border: 1px solid var(--border-default);">
                  <button class="toggle-btn active" id="btn-view-original" data-view="original" style="padding: 6px 12px; border: none; background: var(--accent-blue); color: white; border-radius: var(--radius-sm); cursor: pointer; font-size: var(--text-sm); transition: all 0.2s;">
                    Original File
                  </button>
                  <button class="toggle-btn" id="btn-view-text" data-view="text" style="padding: 6px 12px; border: none; background: transparent; color: var(--text-secondary); border-radius: var(--radius-sm); cursor: pointer; font-size: var(--text-sm); transition: all 0.2s;">
                    Extracted Text
                  </button>
                </div>
              </div>
              <div id="resume-viewer-container" style="flex: 1; overflow: hidden; border-radius: var(--radius-md); border: 1px solid var(--border-default);">
                ${renderResumeView('original')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Event listeners
  const closeBtn = document.getElementById('modal-close-btn');
  const overlay = document.getElementById('modal-overlay');
  const btnViewOriginal = document.getElementById('btn-view-original');
  const btnViewText = document.getElementById('btn-view-text');
  const viewerContainer = document.getElementById('resume-viewer-container');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }
  
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
  }
  
  if (btnViewOriginal) {
    btnViewOriginal.addEventListener('click', () => {
      currentView = 'original';
      viewerContainer.innerHTML = renderResumeView('original');
      btnViewOriginal.style.background = 'var(--accent-blue)';
      btnViewOriginal.style.color = 'white';
      btnViewText.style.background = 'transparent';
      btnViewText.style.color = 'var(--text-secondary)';
    });
  }
  
  if (btnViewText) {
    btnViewText.addEventListener('click', () => {
      currentView = 'text';
      viewerContainer.innerHTML = renderResumeView('text');
      btnViewText.style.background = 'var(--accent-blue)';
      btnViewText.style.color = 'white';
      btnViewOriginal.style.background = 'transparent';
      btnViewOriginal.style.color = 'var(--text-secondary)';
    });
  }
}

function renderSideBySideProfile(c) {
  const subScores = c.sub_scores || {};
  const matchedSkills = c.matched_skills || [];
  const missingSkills = c.missing_skills || [];
  const preferredMatched = c.preferred_matched || [];
  const education = c.education || {};
  const highlights = c.key_highlights || [];

  return `
    <div>
      <!-- Score Ring -->
      <div style="display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-4);">
        ${createScoreRingLarge(c.composite_score, subScores)}
        <div>
          <h2 style="font-size: var(--text-xl); margin-bottom: var(--space-2);">${c.name}</h2>
          <div style="font-size: var(--text-sm); color: var(--text-muted);">
            ${c.email ? `✉ ${c.email}<br>` : ''}
            ⏱ ${c.total_yoe || 0} years experience<br>
            🎓 ${education.level || 'Not specified'}${education.field ? ' in ' + education.field : ''}
          </div>
        </div>
      </div>
      
      <!-- Score Breakdown -->
      <div style="margin-bottom: var(--space-4);">
        <div class="section-title">📊 Score Breakdown</div>
        ${renderScoreBar('Skills', subScores.skill || 0, 'skill')}
        ${renderScoreBar('Experience', subScores.experience || 0, 'experience')}
        ${renderScoreBar('Education', subScores.education || 0, 'education')}
        ${renderScoreBar('Keywords', subScores.keyword || 0, 'keyword')}
      </div>
      
      <!-- Skills -->
      <div style="margin-bottom: var(--space-4);">
        <div class="section-title">🏷 Skills Analysis</div>
        <div class="skill-badges">
          ${matchedSkills.map(s => `
            <span class="skill-badge matched">✓ ${s.skill || s}</span>
          `).join('')}
          ${preferredMatched.map(s => `
            <span class="skill-badge preferred">★ ${s.skill || s}</span>
          `).join('')}
          ${missingSkills.map(s => `
            <span class="skill-badge missing">✗ ${s}</span>
          `).join('')}
        </div>
      </div>
      
      <!-- Highlights -->
      ${highlights.length > 0 ? `
        <div style="margin-bottom: var(--space-4);">
          <div class="section-title">✨ Key Highlights</div>
          <ul class="highlights-list">
            ${highlights.map(h => `<li>${h}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <!-- Recommendation -->
      <div style="margin-bottom: var(--space-4);">
        <div class="section-title">💡 Recommendation</div>
        <div style="padding: var(--space-3); background: var(--bg-surface); border-radius: var(--radius-md); border-left: 3px solid ${getScoreColor(c.composite_score)};">
          <div style="font-weight: 500; margin-bottom: var(--space-2);">${c.recommendation}</div>
          <div style="font-size: var(--text-sm); color: var(--text-secondary);">${c.reasoning || 'No detailed reasoning available.'}</div>
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-root');
  if (!container.querySelector('.toast-container')) {
    container.innerHTML = '<div class="toast-container"></div>';
  }

  const toastContainer = container.querySelector('.toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ═══════════════════════════════════════════════════════════════
// EVENT BINDINGS
// ═══════════════════════════════════════════════════════════════

function bindEvents() {
  // ── Login View ───────────────────────────────────────────────
  const btnGoogleSignin = document.getElementById('btn-google-signin');
  if (btnGoogleSignin) {
    btnGoogleSignin.addEventListener('click', handleGoogleSignIn);
  }
  
  const btnGoogleSigninBottom = document.getElementById('btn-google-signin-bottom');
  if (btnGoogleSigninBottom) {
    btnGoogleSigninBottom.addEventListener('click', handleGoogleSignIn);
  }
  
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', handleLogout);
  }

  // ── Upload View ──────────────────────────────────────────────
  const btnProcessJD = document.getElementById('btn-process-jd');
  if (btnProcessJD) {
    btnProcessJD.addEventListener('click', handleProcessJD);
  }

  const btnReprocessJD = document.getElementById('btn-reprocess-jd');
  if (btnReprocessJD) {
    btnReprocessJD.addEventListener('click', () => {
      state.jdProfile = null;
      state.jdId = null;
      render();
    });
  }

  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }

  const dropzone = document.getElementById('dropzone');
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      const files = [...e.dataTransfer.files];
      addFiles(files);
    });
  }

  // File remove buttons
  document.querySelectorAll('.file-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index);
      state.uploadedFiles.splice(idx, 1);
      render();
    });
  });

  const btnStart = document.getElementById('btn-start-screening');
  if (btnStart) {
    btnStart.addEventListener('click', handleStartScreening);
  }

  // ── Dashboard View ──────────────────────────────────────────
  // Candidate cards
  document.querySelectorAll('.candidate-card').forEach(card => {
    card.addEventListener('click', () => {
      selectCandidate(card.dataset.candidateId);
    });
  });

  // Search
  const searchInput = document.getElementById('queue-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      updateQueue();
    });
  }

  // Weight sliders
  document.querySelectorAll('.weight-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const key = e.target.dataset.key;
      state.weights[key] = parseInt(e.target.value) / 100;
      const valEl = document.getElementById(`weight-val-${key}`);
      if (valEl) valEl.textContent = `${e.target.value}%`;

      // Debounced rescore
      clearTimeout(state.rescoringTimeout);
      state.rescoringTimeout = setTimeout(() => handleRescore(), 500);
    });
  });

  // Presets
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyPreset(btn.dataset.preset);
    });
  });

  // Action buttons (approve/reject/interview)
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.action;
      const id = e.currentTarget.dataset.id;
      handleCandidateAction(id, action);
    });
  });

  // Header actions
  const btnNewSession = document.getElementById('btn-new-session');
  if (btnNewSession) {
    btnNewSession.addEventListener('click', () => {
      Object.assign(state, {
        view: 'upload', jdId: null, jdProfile: null, runId: null,
        candidates: [], selectedCandidateId: null, uploadedFiles: [],
        pipelineStats: null, diversityNote: null, searchQuery: '',
        showHints: false,
      });
      render();
    });
  }

  const btnExportCSV = document.getElementById('btn-export-csv');
  if (btnExportCSV) {
    btnExportCSV.addEventListener('click', () => {
      if (state.runId) api.downloadCSV(state.runId);
    });
  }

  const btnCompare = document.getElementById('btn-compare-top');
  if (btnCompare) {
    btnCompare.addEventListener('click', () => {
      const top3 = state.candidates.slice(0, 3);
      state.comparisonCandidates = top3.map(c => c.id);
      state.view = 'comparison';
      render();
    });
  }

  const btnBackToDashboard = document.getElementById('btn-back-to-dashboard');
  if (btnBackToDashboard) {
    btnBackToDashboard.addEventListener('click', () => {
      state.view = 'dashboard';
      render();
    });
  }

  // Comparison chat handlers
  const comparisonChatSend = document.getElementById('comparison-chat-send');
  if (comparisonChatSend) {
    comparisonChatSend.addEventListener('click', () => {
      const input = document.getElementById('comparison-chat-input');
      if (input) handleComparisonChatSubmit(input.value);
    });
  }

  const comparisonChatInput = document.getElementById('comparison-chat-input');
  if (comparisonChatInput) {
    comparisonChatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleComparisonChatSubmit(e.target.value);
      }
    });
  }

  const comparisonChatClear = document.getElementById('comparison-chat-clear');
  if (comparisonChatClear) {
    comparisonChatClear.addEventListener('click', () => {
      if (confirm('Clear comparison chat history?')) {
        state.chatHistory['comparison'] = [{ 
          role: 'ai', 
          text: 'Hi! Ask me to compare these candidates. Try "Compare their skills" or "Who has more experience?"' 
        }];
        const chatMessagesEl = document.getElementById('comparison-chat-messages');
        if (chatMessagesEl) {
          chatMessagesEl.innerHTML = renderComparisonChatMessages();
        }
      }
    });
  }

  document.querySelectorAll('.comparison-quick-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const question = e.currentTarget.dataset.question;
      handleComparisonChatSubmit(question);
    });
  });

  const btnToggleHints = document.getElementById('btn-toggle-hints');
  const hintsContainer = document.getElementById('keyboard-hints-container');
  if (btnToggleHints && hintsContainer) {
    btnToggleHints.addEventListener('click', (e) => {
      e.preventDefault();
      if (hintsContainer.style.display === 'none') {
        hintsContainer.style.display = 'flex';
      } else {
        hintsContainer.style.display = 'none';
      }
    });
  }

  if (state.view === 'dashboard' && state.selectedCandidateId) {
    const c = state.candidates.find(x => x.id === state.selectedCandidateId);
    if (c) initInsightComponents(c);
  }
}

function initInsightComponents(c) {
  setTimeout(() => renderRadarChart(c), 0);

  const pane = document.getElementById('pane-insight');
  if (!pane) return;

  // Side-by-side view button
  const btnSideBySide = pane.querySelector('#btn-side-by-side');
  if (btnSideBySide) {
    btnSideBySide.onclick = (e) => {
      const candidateId = e.currentTarget.dataset.id;
      showSideBySideView(candidateId);
    };
  }

  pane.querySelectorAll('.chat-send-btn').forEach(btn => {
    btn.onclick = (e) => {
      const cId = e.currentTarget.dataset.candidate;
      const input = document.getElementById(`chat-input-${cId}`);
      if (input) handleChatSubmit(cId, input.value);
    };
  });

  pane.querySelectorAll('.chat-clear-btn').forEach(btn => {
    btn.onclick = (e) => {
      const cId = e.currentTarget.dataset.candidate;
      if (confirm('Clear chat history?')) {
        state.chatHistory[cId] = [{ role: 'ai', text: 'Hi! Ask me anything about this resume.' }];
        const chatMessagesEl = document.getElementById(`chat-messages-${cId}`);
        if (chatMessagesEl) {
          chatMessagesEl.innerHTML = renderChatMessages(cId);
        }
      }
    };
  });

  pane.querySelectorAll('.quick-question-btn').forEach(btn => {
    btn.onclick = (e) => {
      const cId = e.currentTarget.dataset.candidate;
      const question = e.currentTarget.dataset.question;
      handleChatSubmit(cId, question);
    };
    btn.onmouseenter = (e) => {
      e.target.style.background = 'var(--accent-blue-glow)';
      e.target.style.borderColor = 'var(--accent-blue)';
      e.target.style.color = 'var(--accent-blue)';
    };
    btn.onmouseleave = (e) => {
      e.target.style.background = 'var(--bg-active)';
      e.target.style.borderColor = 'var(--border-default)';
      e.target.style.color = 'var(--text-secondary)';
    };
  });

  pane.querySelectorAll('.chat-input-field').forEach(input => {
    input.onkeypress = (e) => {
      if (e.key === 'Enter') {
        const cId = e.target.id.replace('chat-input-', '');
        handleChatSubmit(cId, e.target.value);
      }
    };
  });
}

// ═══════════════════════════════════════════════════════════════
// HANDLERS
// ═══════════════════════════════════════════════════════════════

let currentRadarChart = null;

function renderRadarChart(c) {
  const ctx = document.getElementById('score-radar-chart');
  if (!ctx) return;
  if (currentRadarChart) {
    currentRadarChart.destroy();
  }

  const subScores = c.sub_scores || {};
  const data = [
    subScores.skill || 0,
    subScores.experience || 0,
    subScores.education || 0,
    subScores.keyword || 0
  ];

  currentRadarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Skills', 'Experience', 'Education', 'Keywords'],
      datasets: [{
        label: 'Candidate Score',
        data: data,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          pointLabels: { color: '#94a3b8', font: { size: 12, family: 'Inter, sans-serif' } },
          ticks: { display: false, min: 0, max: 100 }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderChatMessages(candidateId) {
  const messages = state.chatHistory[candidateId] || [{ role: 'ai', text: 'Hi! Ask me anything about this resume. Try asking about skills, experience, education, or leadership.' }];
  return messages.map(m => `
    <div style="display: flex; gap: var(--space-3); margin-bottom: var(--space-2); flex-direction: ${m.role === 'user' ? 'row-reverse' : 'row'}; animation: fadeIn 0.3s ease-in;">
      <div style="font-size: 20px; line-height: 1; flex-shrink: 0;">${m.role === 'user' ? '👤' : '🤖'}</div>
      <div style="padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); font-size: var(--text-sm); line-height: 1.5;
        background: ${m.role === 'user' ? 'var(--accent-blue-glow)' : 'var(--bg-active)'};
        color: ${m.role === 'user' ? 'var(--accent-blue)' : 'var(--text-secondary)'};
        max-width: 80%;
        border: 1px solid ${m.role === 'user' ? 'rgba(59,130,246,0.3)' : 'var(--border-default)'};
        word-wrap: break-word;
        white-space: pre-wrap;
      ">
        ${m.text}
      </div>
    </div>
  `).join('');
}

async function handleChatSubmit(candidateId, question) {
  if (!question.trim()) return;

  if (!state.chatHistory[candidateId]) {
    state.chatHistory[candidateId] = [{ role: 'ai', text: 'Hi! Ask me anything about this resume. Try asking about skills, experience, education, or leadership.' }];
  }

  state.chatHistory[candidateId].push({ role: 'user', text: question });

  const chatMessagesEl = document.getElementById(`chat-messages-${candidateId}`);
  if (chatMessagesEl) {
    chatMessagesEl.innerHTML = renderChatMessages(candidateId);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }
  const inputEl = document.getElementById(`chat-input-${candidateId}`);
  if (inputEl) {
    inputEl.value = '';
    inputEl.disabled = true;
  }

  // Show typing indicator
  state.chatHistory[candidateId].push({ role: 'ai', text: '<span style="opacity:0.5">● ● ● Thinking...</span>' });
  if (chatMessagesEl) {
    chatMessagesEl.innerHTML = renderChatMessages(candidateId);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }

  try {
    const res = await api.chatWithResume(candidateId, question);
    state.chatHistory[candidateId].pop();
    state.chatHistory[candidateId].push({ role: 'ai', text: res.answer });
  } catch (err) {
    state.chatHistory[candidateId].pop();
    state.chatHistory[candidateId].push({ role: 'ai', text: '⚠️ Error: ' + err.message });
  }

  if (inputEl) {
    inputEl.disabled = false;
    inputEl.focus();
  }

  if (document.getElementById(`chat-messages-${candidateId}`)) {
    const el = document.getElementById(`chat-messages-${candidateId}`);
    el.innerHTML = renderChatMessages(candidateId);
    el.scrollTop = el.scrollHeight;
  }
}


async function handleProcessJD() {
  const input = document.getElementById('jd-input');
  const text = input?.value?.trim();

  if (!text) {
    showToast('Please enter a job description.', 'error');
    return;
  }

  try {
    const btn = document.getElementById('btn-process-jd');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    const result = await api.createJD(text);
    state.jdId = result.id;
    state.jdProfile = result;

    showToast(`JD processed! Found ${result.requiredSkills?.length || 0} required skills.`, 'success');
    render();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
    const btn = document.getElementById('btn-process-jd');
    if (btn) { btn.disabled = false; btn.textContent = 'Process JD'; }
  }
}

function handleFileSelect(e) {
  const files = [...e.target.files];
  addFiles(files);
}

function addFiles(files) {
  state.uploadedFiles.push(...files);
  render();
}

async function handleStartScreening() {
  if (!state.jdId || state.uploadedFiles.length === 0) return;

  state.view = 'processing';
  render();

  // Animate pipeline stages
  await animatePipeline();

  try {
    const result = await api.runPipeline(state.jdId, state.uploadedFiles, {
      weights: state.weights,
      shortlistMode: 'top_n',
      shortlistValue: 50,
    });

    state.runId = result.runId;
    state.pipelineStats = result.stats;
    state.diversityNote = result.diversityNote;

    // Fetch candidates
    const candidates = await api.getCandidates(result.runId);
    state.candidates = candidates;

    if (candidates.length > 0) {
      state.selectedCandidateId = candidates[0].id;
    }

    // Switch to dashboard
    state.view = 'dashboard';
    render();

    if (result.errors?.length > 0) {
      showToast(`${result.errors.length} file(s) had parse errors.`, 'error');
    }
    showToast(`Screening complete! ${candidates.length} candidates ranked.`, 'success');
  } catch (err) {
    showToast(`Pipeline error: ${err.message}`, 'error');
    state.view = 'upload';
    render();
  }
}

async function animatePipeline() {
  for (let i = 0; i < PIPELINE_STAGES.length; i++) {
    const stage = document.getElementById(`stage-${i}`);
    if (!stage) continue;

    // Activate current stage
    stage.classList.add('active');
    const icon = stage.querySelector('.stage-dot');
    if (icon) icon.innerHTML = '<div class="stage-spinner"></div>';

    await sleep(600 + Math.random() * 400);

    // Complete stage
    stage.classList.remove('active');
    stage.classList.add('completed');
    if (icon) icon.innerHTML = '<span class="stage-check">✓</span>';
  }
}

function selectCandidate(id) {
  state.selectedCandidateId = id;
  updateInsight();
  updateQueueSelection();
}

function updateQueue() {
  const queueList = document.getElementById('queue-list');
  if (!queueList) return;
  const filtered = getFilteredCandidates();
  queueList.innerHTML = filtered.map(c => renderCandidateCard(c)).join('');

  // Re-bind card clicks
  queueList.querySelectorAll('.candidate-card').forEach(card => {
    card.addEventListener('click', () => selectCandidate(card.dataset.candidateId));
  });
}

function updateQueueSelection() {
  document.querySelectorAll('.candidate-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.candidateId === state.selectedCandidateId);
  });
}

function updateInsight() {
  const pane = document.getElementById('pane-insight');
  if (!pane) return;
  const selected = state.candidates.find(c => c.id === state.selectedCandidateId);
  pane.innerHTML = selected ? renderInsight(selected) : renderInsightEmpty();

  if (selected) {
    // Re-bind action buttons
    pane.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        handleCandidateAction(e.currentTarget.dataset.id, e.currentTarget.dataset.action);
      });
    });

    // Re-init chart and chat
    initInsightComponents(selected);
  }
}

async function handleCandidateAction(id, action) {
  const statusMap = { approve: 'approved', reject: 'rejected', interview: 'interview' };
  const status = statusMap[action];
  if (!status) return;

  try {
    await api.updateCandidateStatus(id, status);

    // Update local state
    const candidate = state.candidates.find(c => c.id === id);
    if (candidate) candidate.status = status;

    showToast(`Candidate ${status}: ${candidate?.name || ''}`, status === 'approved' ? 'success' : 'info');

    // Move to next pending candidate if available
    if (action !== 'interview') {
      const currentIdx = state.candidates.findIndex(c => c.id === id);
      const next = state.candidates.find((c, i) => i > currentIdx && c.status === 'pending');
      if (next) {
        state.selectedCandidateId = next.id;
      }
    }

    updateQueue();
    updateInsight();
    updateSidebarStats();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function handleRescore() {
  if (!state.runId) return;

  try {
    showToast('Re-ranking with new weights...', 'info');
    const result = await api.rescore(state.runId, state.weights);

    if (result.candidates) {
      state.candidates = result.candidates;
      updateQueue();
      updateInsight();
    }
  } catch (err) {
    showToast(`Rescore error: ${err.message}`, 'error');
  }
}

function applyPreset(preset) {
  const presets = {
    balanced: { skill: 0.40, experience: 0.30, education: 0.20, keyword: 0.10 },
    technical: { skill: 0.55, experience: 0.20, education: 0.10, keyword: 0.15 },
    leadership: { skill: 0.25, experience: 0.45, education: 0.15, keyword: 0.15 },
    junior: { skill: 0.50, experience: 0.10, education: 0.30, keyword: 0.10 },
  };

  if (presets[preset]) {
    state.weights = { ...presets[preset] };

    // Update slider UI
    for (const [key, value] of Object.entries(state.weights)) {
      const slider = document.getElementById(`weight-${key}`);
      const valEl = document.getElementById(`weight-val-${key}`);
      if (slider) slider.value = Math.round(value * 100);
      if (valEl) valEl.textContent = `${Math.round(value * 100)}%`;
    }

    // Highlight active preset
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === preset);
    });

    handleRescore();
  }
}

function updateSidebarStats() {
  // Update the shortlist section stats
  const sidebar = document.querySelector('.dashboard-sidebar');
  if (sidebar) {
    const sections = sidebar.querySelectorAll('.sidebar-section');
    const lastSection = sections[sections.length - 1];
    if (lastSection) {
      const statValues = lastSection.querySelectorAll('.stat-value');
      if (statValues[0]) statValues[0].textContent = state.candidates.filter(c => c.status === 'approved').length;
      if (statValues[1]) statValues[1].textContent = state.candidates.filter(c => c.status === 'rejected').length;
      if (statValues[2]) statValues[2].textContent = state.candidates.filter(c => c.status === 'pending').length;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════════

function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't intercept when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (state.view !== 'dashboard') return;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        if (state.selectedCandidateId) {
          handleCandidateAction(state.selectedCandidateId, 'approve');
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (state.selectedCandidateId) {
          handleCandidateAction(state.selectedCandidateId, 'reject');
        }
        break;

      case ' ':
        e.preventDefault();
        navigateCandidate(1);
        break;

      case 'ArrowUp':
        e.preventDefault();
        navigateCandidate(-1);
        break;

      case 'ArrowDown':
        e.preventDefault();
        navigateCandidate(1);
        break;

      case 'Escape':
        closeModal();
        break;
    }
  });
}

function navigateCandidate(direction) {
  const filtered = getFilteredCandidates();
  if (filtered.length === 0) return;

  const currentIdx = filtered.findIndex(c => c.id === state.selectedCandidateId);
  let newIdx = currentIdx + direction;

  if (newIdx < 0) newIdx = 0;
  if (newIdx >= filtered.length) newIdx = filtered.length - 1;

  selectCandidate(filtered[newIdx].id);

  // Scroll card into view
  const card = document.getElementById(`card-${filtered[newIdx].id}`);
  if (card) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getFilteredCandidates() {
  if (!state.searchQuery) return state.candidates;

  const q = state.searchQuery.toLowerCase();
  return state.candidates.filter(c => {
    const name = (c.name || '').toLowerCase();
    const skills = (c.matched_skills || []).map(s => (s.skill || s).toLowerCase()).join(' ');
    const rec = (c.recommendation || '').toLowerCase();
    return name.includes(q) || skills.includes(q) || rec.includes(q);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════
// BOOTSTRAP
// ═══════════════════════════════════════════════════════════════

async function boot() {
  // Check for hash route: #dashboard/<runId>
  const hash = window.location.hash;
  const dashMatch = hash.match(/#dashboard\/(.+)/);

  if (dashMatch) {
    const runId = dashMatch[1];
    try {
      const runStatus = await api.getPipelineStatus(runId);
      const candidates = await api.getCandidates(runId);
      const jdData = await api.getJD(runStatus.jd_id);

      state.runId = runId;
      state.jdId = runStatus.jd_id;
      state.jdProfile = {
        title: jdData.title,
        rawText: jdData.raw_text,
        requiredSkills: jdData.required_skills,
        preferredSkills: jdData.preferred_skills,
        minExperience: jdData.min_experience,
        educationRequirement: jdData.education_requirement,
        featureWeights: jdData.feature_weights,
        confidence: jdData.confidence,
      };
      state.candidates = candidates;
      state.selectedCandidateId = candidates[0]?.id || null;
      state.pipelineStats = runStatus.stats;
      state.view = 'dashboard';
    } catch (err) {
      console.error('Failed to load run:', err);
    }
  }

  initApp();
}

// Expose state for debugging
window.__APP_STATE = state;

document.addEventListener('DOMContentLoaded', boot);



// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION HANDLERS
// ═══════════════════════════════════════════════════════════════

async function handleGoogleSignIn() {
  const btn = event.target.closest('.btn-google-signin');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Signing in...</span>';
  }
  
  const result = await signInWithGoogle();
  
  if (result.success) {
    showToast('Welcome! Signed in successfully.', 'success');
    state.user = result.user;
    state.view = 'upload';
    render();
  } else {
    showToast('Sign in failed: ' + result.error, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg class="google-icon" viewBox="0 0 24 24" width="24" height="24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span>Continue with Google</span>
      `;
    }
  }
}

async function handleLogout() {
  const result = await logOut();
  
  if (result.success) {
    showToast('Signed out successfully', 'info');
    state.user = null;
    state.view = 'login';
    // Reset state
    Object.assign(state, {
      jdId: null,
      jdProfile: null,
      runId: null,
      candidates: [],
      selectedCandidateId: null,
      uploadedFiles: [],
      pipelineStats: null,
      diversityNote: null,
      searchQuery: '',
      showHints: false,
      chatHistory: {},
      comparisonCandidates: [],
    });
    render();
  } else {
    showToast('Sign out failed: ' + result.error, 'error');
  }
}
