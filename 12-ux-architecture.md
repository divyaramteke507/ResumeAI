# UI/UX Architecture

> Trust-Centric Recruiter Dashboard · Dual-Pane Design · Explainable AI

---

## Design Principles

| Principle | Description |
|-----------|-------------|
| **Minimal Cognitive Load** | Recruiters see what they need, when they need it — no unnecessary navigation |
| **Bias-Free by Design** | AI scores are shown before candidate names to reduce anchoring bias |
| **Explainable AI** | Every score surfaces a plain-English reason — no black box verdicts |
| **Trust-Centric** | Recruiter always has access to the original resume; AI advises, human decides |
| **Keyboard-First** | High-throughput screening via keyboard shortcuts, not mouse-heavy UI |

---

## 1. Dual-Pane Dashboard

The core layout is a **persistent split-screen** that eliminates navigation fatigue. The recruiter never leaves the main screen — full context is always visible.

```
┌─────────────────────────┬──────────────────────────────────────┐
│      LEFT PANE          │           RIGHT PANE                 │
│      The Queue          │           The Insight                │
│                         │                                      │
│  ◉ 94%  Alice Chen      │  AI Reasoning ───────────────────── │
│  ◉ 87%  Bob Smith       │  [React.js — 4 yrs] [Python — 6 yrs]│
│  ◉ 71%  Carol Davis     │  [AWS] [TypeScript]                  │
│  ○ 58%  Dan Lee         │                                      │
│                         │  Gap Analysis:                       │
│  → Approve  ← Reject    │  Missing: Kubernetes, Go             │
│                         │                                      │
│                         │  Key Highlights:                     │
│                         │  • Led team of 8 engineers           │
│                         │  • Reduced API latency by 40%        │
│                         │  • OSS contributor (3k+ stars)       │
│                         │                                      │
│                         │  [View Original Resume PDF]          │
└─────────────────────────┴──────────────────────────────────────┘
```

---

## 2. Left Pane — The Queue

- Ranked list of all candidates with circular **Match Score ring**
- **Color-coded score bands** for instant prioritization:

| Band | Score Range | Label |
|------|-------------|-------|
| 🟢 Green | ≥ 85% | Highly Recommended |
| 🟡 Yellow | 65–84% | Potential Fit |
| 🔴 Red | < 65% | Review Carefully |

- **Status pills** on each card: `Highly Recommended` · `Niche Specialist` · `Overqualified`
- **Keyboard shortcuts:** `→` Approve · `←` Reject · `Space` Next

---

## 3. Right Pane — The Insight

AI reasoning is displayed **before** the raw resume to anchor the recruiter on qualifications, not presentation.

| Element | Description |
|---------|-------------|
| **Skill Badges** | Visual chips per matched requirement, e.g. `[React.js — 4 yrs]` `[AWS]` |
| **Gap Analysis** | Missing required skills in one plain-English sentence |
| **Key Highlights** | 3 AI-generated achievement bullets from resume content |
| **Score Ring** | Circular progress ring with sub-category arc breakdown |
| **Source Transparency** | Yellow highlight on original PDF text linked to each score reason |
| **View Original** | Direct link to the original resume PDF — always accessible |

---

## 4. Key UX Features

### The 'WHY' Card
Full score breakdown visible at a glance:
- Skill Badges (matched and missing)
- Plain-English explanation of every scoring decision
- Score ring with Skill / Experience / Education / Keyword arc segments

### Interactive Criteria Tuning
- **Sidebar sliders** to adjust scoring weights in real time
- Ranked list **re-orders instantly** as sliders change
- **Presets:** Technical Role / Leadership / Junior
- Weight profiles saved per JD
- All slider changes logged in the audit trail automatically

### Bulk Actions & Auto-Email
- `→` / `←` keyboard shortcuts for approve / reject
- `Schedule Interview` pre-drafts an AI-generated email citing the specific strengths identified in the resume
- **Compare Top 3** side-by-side mode for final shortlisting
- Export selected candidates to CSV / Google Sheets

---

## 5. Visual Component Reference

| Component | UI Treatment | Purpose |
|-----------|-------------|---------|
| **Match Score** | Circular progress ring with bold % inside | Instant at-a-glance prioritization |
| **Score Sub-bands** | Segmented arc: Skill / Exp / Edu / Keyword | Understand score composition |
| **Skill Badges** | Color chips (green = matched, red = missing) | Visualize fit vs gap quickly |
| **Status Pills** | Rounded tags: Recommended · Niche · Overqualified | Human-readable AI verdict |
| **Compare Mode** | 'Compare Top 3' — AI summaries side-by-side | Speed up final shortlisting |
| **Source Highlight** | Yellow highlight on PDF text linked to score reason | Trust & transparency mechanism |
| **Criteria Sliders** | Sidebar knobs: Skills / Exp / Edu / Location weights | Real-time re-ranking control |
| **Keyboard Nav** | `→` Approve · `←` Reject · `Space` = Next | High-throughput screening flow |
| **Dark Mode** | Slate-900 base, blue + cyan accents | Reduce fatigue over long sessions |
| **Audit Badge** | Small 'AI version + weights' tag on each report | Compliance & legal reproducibility |

---

## 6. Design Themes

### SaaS Dark Mode (Default)
- **Base:** Slate-900
- **Accents:** Blue + Cyan
- **Goal:** Reduce eye strain during long screening sessions; high contrast for readability

### Enterprise White (Alternative)
- **Base:** Clean white with generous negative space
- **Goal:** Organizations preferring light-mode; identical feature set, different palette

---

## 7. Implementation

The UI is built with **Streamlit** for rapid Python-native development:

```
ui/
└── app.py          # Streamlit app — dual-pane layout, sliders, keyboard shortcuts
```

Key Streamlit components used:
- `st.columns()` — dual-pane layout
- `st.slider()` — criteria tuning sidebar
- `st.session_state` — keyboard shortcut handling and approval tracking
- Custom HTML/CSS injected via `st.markdown()` for score rings, skill badges, and status pills

---

*See [Enhancements](./10-enhancements.md) for bias mitigation and explainability implementation details.*
