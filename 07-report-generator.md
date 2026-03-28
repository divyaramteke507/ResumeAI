# Module 06 — Report Generator

> Produces human-readable and machine-readable outputs from the ranked candidate list.

---

## Responsibility

Takes the final `CandidateList` and generates all output artifacts: a PDF shortlist report, a CSV ranking sheet, a JSON export, and a structured audit log.

---

## Output Files

| File | Format | Purpose |
|------|--------|---------|
| `reports/shortlist.pdf` | PDF | Executive summary + per-candidate breakdown for hiring managers |
| `reports/rankings.csv` | CSV | Full ranked list for spreadsheet review / import |
| `reports/data.json` | JSON | Machine-readable output for downstream systems |
| `logs/audit.jsonl` | JSON Lines | Full audit trail — always written, regardless of run outcome |

---

## PDF Report Structure

Generated using `reportlab` and `jinja2`:

### Executive Summary Page
- Total resumes processed
- Shortlist size and cutoff applied
- Score distribution summary
- Run metadata (timestamp, model version, weights)

### Per-Candidate Pages
Each candidate entry includes:

| Field | Description |
|-------|-------------|
| **Name** | Candidate name |
| **Composite Score** | 0–100 score with visual score bar |
| **Top Skills** | Matched required and preferred skills |
| **Gap Areas** | Missing required skills (plain English) |
| **Recommendation Label** | Highly Recommended / Potential Fit / Review Carefully |
| **Score Sub-bars** | Visual breakdown: Skill / Exp / Edu / Keyword |
| **Plain-English Explanation** | Full reasoning from Scoring Engine |

---

## Visual Elements

| Element | Library | Description |
|---------|---------|-------------|
| Score bars | `reportlab` | Horizontal bar per sub-score category |
| Score ring (UI only) | Streamlit / CSS | Circular progress ring in dashboard |
| Tables | `reportlab` | Skill match tables, gap analysis |
| HTML reports | `jinja2` + `weasyprint` | Alternative HTML/CSS rendering path |

---

## CSV Export

Flat file with one row per candidate:

```
rank, name, email, composite_score, skill_score, experience_score,
education_score, keyword_score, matched_skills, missing_skills,
total_yoe, recommendation, penalties, bonuses
```

---

## Audit Log (`logs/audit.jsonl`)

One JSON object per line, written for every run:

```json
{
  "timestamp": "2025-01-15T14:32:01Z",
  "run_id": "run_abc123",
  "model_version": "1.0.0",
  "weights": {"skill": 0.40, "experience": 0.30, "education": 0.20, "misc": 0.10},
  "resumes_processed": 47,
  "shortlist_size": 10,
  "cutoff": {"mode": "top_n", "value": 10},
  "duplicates_merged": 2,
  "diversity_flag": false
}
```

The audit log is **always written** — even if the run encounters errors — to ensure full compliance and reproducibility.

---

*See [Data Flow & File Structure](./11-data-flow.md) for the complete I/O layout.*
