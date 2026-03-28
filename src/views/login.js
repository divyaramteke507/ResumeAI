/**
 * Login View - Encouraging and detailed landing page
 */

export function renderLoginView() {
  return `
    <div class="login-view">
      <!-- Hero Section -->
      <div class="login-hero">
        <div class="login-hero-content">
          <div class="login-logo-large">
            <div class="login-logo-icon">R</div>
            <div class="login-logo-text">ResumeAI</div>
          </div>
          <h1 class="login-hero-title">
            Transform Your Hiring Process with AI
          </h1>
          <p class="login-hero-subtitle">
            Screen hundreds of resumes in minutes, not days. Our intelligent AI agent analyzes, scores, and ranks candidates with unprecedented accuracy.
          </p>
          
          <!-- Google Sign In Button -->
          <button class="btn-google-signin" id="btn-google-signin">
            <svg class="google-icon" viewBox="0 0 24 24" width="24" height="24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>
          
          <p class="login-privacy-note">
            🔒 Secure authentication powered by Google. We never store your password.
          </p>
        </div>
        
        <div class="login-hero-visual">
          <div class="floating-card card-1">
            <div class="card-icon">📊</div>
            <div class="card-text">AI-Powered Scoring</div>
          </div>
          <div class="floating-card card-2">
            <div class="card-icon">⚡</div>
            <div class="card-text">10x Faster Screening</div>
          </div>
          <div class="floating-card card-3">
            <div class="card-icon">🎯</div>
            <div class="card-text">95% Accuracy</div>
          </div>
        </div>
      </div>
      
      <!-- Features Section -->
      <div class="login-features">
        <h2 class="section-heading">Why ResumeAI?</h2>
        <p class="section-subheading">Built for modern recruiters who value speed, accuracy, and fairness</p>
        
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">🤖</div>
            <h3 class="feature-title">Intelligent AI Agent</h3>
            <p class="feature-description">
              Our autonomous AI agent reads, understands, and analyzes resumes just like a human recruiter—but 100x faster. It extracts skills, experience, education, and provides detailed reasoning for every decision.
            </p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">📊</div>
            <h3 class="feature-title">Multi-Dimensional Scoring</h3>
            <p class="feature-description">
              Get comprehensive scores across skills match, experience level, education fit, and keyword relevance. Adjust weights in real-time to match your hiring priorities.
            </p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">💬</div>
            <h3 class="feature-title">Chat with Resumes</h3>
            <p class="feature-description">
              Ask natural language questions about any candidate. "Do they have leadership experience?" "What are their Python skills?" Get instant, accurate answers.
            </p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">⊞</div>
            <h3 class="feature-title">Compare Candidates</h3>
            <p class="feature-description">
              View multiple candidates side-by-side. Compare skills, experience, and qualifications. Ask comparative questions like "Who has more experience?"
            </p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">📄</div>
            <h3 class="feature-title">Original File Viewer</h3>
            <p class="feature-description">
              See candidate profiles alongside their original resumes. View PDFs, images, and documents in a split-screen interface. Verify AI extractions instantly.
            </p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">🎯</div>
            <h3 class="feature-title">Smart Ranking</h3>
            <p class="feature-description">
              Candidates are automatically ranked based on job fit. Get clear recommendations: "Strong Match," "Good Fit," or "Consider." Every decision is explainable.
            </p>
          </div>
        </div>
      </div>
      
      <!-- How It Works Section -->
      <div class="login-how-it-works">
        <h2 class="section-heading">How It Works</h2>
        <p class="section-subheading">From job description to shortlist in 4 simple steps</p>
        
        <div class="steps-container">
          <div class="step-card">
            <div class="step-number">1</div>
            <div class="step-content">
              <h3 class="step-title">Paste Job Description</h3>
              <p class="step-description">
                Copy your job posting and paste it in. Our AI extracts required skills, experience levels, and education requirements automatically.
              </p>
            </div>
          </div>
          
          <div class="step-arrow">→</div>
          
          <div class="step-card">
            <div class="step-number">2</div>
            <div class="step-content">
              <h3 class="step-title">Upload Resumes</h3>
              <p class="step-description">
                Drag and drop PDF, Word, or image files. Support for multiple formats including scanned documents. Upload up to 100 resumes at once.
              </p>
            </div>
          </div>
          
          <div class="step-arrow">→</div>
          
          <div class="step-card">
            <div class="step-number">3</div>
            <div class="step-content">
              <h3 class="step-title">AI Processing</h3>
              <p class="step-description">
                Watch as our AI agent parses, extracts, scores, and ranks candidates. The entire pipeline runs in seconds, processing text, skills, and experience.
              </p>
            </div>
          </div>
          
          <div class="step-arrow">→</div>
          
          <div class="step-card">
            <div class="step-number">4</div>
            <div class="step-content">
              <h3 class="step-title">Review & Decide</h3>
              <p class="step-description">
                Get a ranked list of candidates with detailed insights. Chat with resumes, compare candidates, and make informed hiring decisions in minutes.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Benefits Section -->
      <div class="login-benefits">
        <h2 class="section-heading">The ResumeAI Advantage</h2>
        
        <div class="benefits-grid">
          <div class="benefit-item">
            <div class="benefit-stat">10x</div>
            <div class="benefit-label">Faster Screening</div>
            <p class="benefit-text">Screen 100 resumes in the time it takes to read 10</p>
          </div>
          
          <div class="benefit-item">
            <div class="benefit-stat">95%</div>
            <div class="benefit-label">Accuracy Rate</div>
            <p class="benefit-text">AI-powered extraction with human-level understanding</p>
          </div>
          
          <div class="benefit-item">
            <div class="benefit-stat">100%</div>
            <div class="benefit-label">Explainable</div>
            <p class="benefit-text">Every score comes with detailed reasoning</p>
          </div>
          
          <div class="benefit-item">
            <div class="benefit-stat">0</div>
            <div class="benefit-label">Bias</div>
            <p class="benefit-text">Fair, objective evaluation based on qualifications</p>
          </div>
        </div>
      </div>
      
      <!-- CTA Section -->
      <div class="login-cta">
        <h2 class="cta-heading">Ready to Transform Your Hiring?</h2>
        <p class="cta-subheading">Join hundreds of recruiters who've already made the switch</p>
        <button class="btn-google-signin btn-google-signin-large" id="btn-google-signin-bottom">
          <svg class="google-icon" viewBox="0 0 24 24" width="24" height="24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Get Started with Google</span>
        </button>
        <p class="cta-note">Free to start • No credit card required • 5-minute setup</p>
      </div>
      
      <!-- Footer -->
      <div class="login-footer">
        <p>© 2026 ResumeAI. Built with ❤️ for recruiters.</p>
        <div class="footer-links">
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
          <a href="#contact">Contact Us</a>
        </div>
      </div>
    </div>
  `;
}
