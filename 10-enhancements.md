# Enhancements Beyond Basic Screening

> Features that elevate the agent from a simple keyword matcher to a trustworthy, production-grade hiring tool.

---

## Bias Mitigation

**Goal:** Ensure scoring decisions are based solely on professional qualifications.

**Implementation:**
- Candidate names are stripped from all text before scoring begins
- Gender indicators and pronouns are removed from resume text
- Only skills, experience, and education influence the composite score
- The scoring engine never receives name, photo, or demographic fields

**Result:** Two identical skill profiles receive identical scores regardless of the candidate's name or how they refer to themselves.

---

## Explainability

**Goal:** Every score must be traceable to specific resume content.

**Implementation:**
- The Scoring Engine stores a plain-English breakdown per candidate
- Example output: *"Matched 8/10 required skills. Missing: Kubernetes, Go."*
- Sub-scores (Skill / Experience / Education / Keyword) are stored and displayed separately
- The UI highlights the source text in the original PDF that contributed to each score point

**Result:** Recruiters can always understand *why* a candidate was scored the way they were — no black box decisions.

---

## Multi-Role Support

**Goal:** Support hiring for multiple positions in a single session.

**Implementation:**
- Multiple JDs can be loaded simultaneously
- Each resume is scored against **all active JDs**
- The ranking agent recommends each candidate to their **best-fit role**
- Separate `CandidateList` objects are maintained per JD
- The UI allows switching between role views without re-running the pipeline

---

## Feedback Loop

**Goal:** Improve scoring accuracy over time based on real hiring outcomes.

**Implementation:**
- Recruiters mark candidates as **Hired** or **Rejected** via the UI
- Outcomes are stored in `db/candidates.sqlite`
- After each batch, a local ML fine-tuning step adjusts the scoring weights
- Weight adjustments are logged in the audit trail for reproducibility
- Fine-tuning runs entirely locally — no data leaves the system

---

## Duplicate Handling

**Goal:** Prevent the same candidate from appearing multiple times in the shortlist.

**Implementation:**
- Deduplication key: `hash(normalized_name + email)`
- When duplicates are detected, the version with the **higher composite score** is kept
- Merged duplicates are flagged in the audit log with the filenames involved
- Common scenario handled: candidate submits a slightly updated resume after the batch was already started

---

## Audit Trail

**Goal:** Full reproducibility for compliance and legal review.

**Implementation:**
Every pipeline run writes to `logs/audit.jsonl`:

```json
{
  "timestamp": "ISO 8601 datetime",
  "run_id": "unique run identifier",
  "model_version": "agent version string",
  "weights": {"skill": 0.40, "experience": 0.30, "education": 0.20, "misc": 0.10},
  "resumes_processed": 47,
  "shortlist_size": 10,
  "cutoff_mode": "top_n",
  "duplicates_merged": 2
}
```

- Audit log is written **always** — even on partial failures
- Score breakdowns are stored per candidate in SQLite
- Any weight change (manual or feedback-driven) is logged with a timestamp
- Audit badge displayed on every generated report

---

## Summary Table

| Enhancement | Addresses |
|-------------|---------|
| Bias Mitigation | Fairness and legal compliance |
| Explainability | Recruiter trust, auditability |
| Multi-Role Support | Operational efficiency |
| Feedback Loop | Accuracy improvement over time |
| Duplicate Handling | Data quality |
| Audit Trail | Compliance, reproducibility, legal review |
