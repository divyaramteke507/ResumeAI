# Data Flow & File Structure

> How data moves through the system and where every file lives.

---

## End-to-End Data Flow

```
INPUT                    PROCESSING                        OUTPUT
─────────────────────    ──────────────────────────────    ──────────────────────────
job_description.txt  ──► jd_processor                      reports/shortlist.pdf
                              │                             reports/rankings.csv
resumes/*.pdf        ──► resume_engine                      logs/audit.jsonl
resumes/*.docx            │                                 db/candidates.sqlite
                          ▼
                     extractor
                          │
                          ▼
                     scorer
                          │
                          ▼
                     ranker
                          │
                          ▼
                     report_gen ──────────────────────────► reports/ + logs/
```

**Entry point:** `agent.py` calls `pipeline.run()`

---

## File Structure

```
resume-screening-agent/
│
├── agent.py                    # Entry point — orchestrates pipeline.run()
├── pipeline.py                 # Pipeline coordinator
├── config.yaml                 # Thresholds, weights, top-N settings
│
├── modules/
│   ├── jd_processor.py         # Module 01 — JD parsing and JDProfile creation
│   ├── resume_engine.py        # Module 02 — Batch ingestion, PDF/DOCX/TXT parsing
│   ├── skill_extractor.py      # Module 03 — Skill/entity extraction, embeddings
│   ├── scoring_engine.py       # Module 04 — Composite scoring, explainability
│   ├── ranking_agent.py        # Module 05 — Ranking, deduplication, shortlisting
│   └── report_generator.py     # Module 06 — PDF/CSV/JSON report generation
│
├── models/
│   └── all-MiniLM-L6-v2/      # Local sentence-transformers model (cached)
│
├── data/
│   └── skill_taxonomy.json     # 500+ skills with synonyms
│
├── input/
│   ├── job_description.txt     # Active job description
│   └── resumes/                # Drop resumes here (PDF, DOCX, TXT)
│       ├── candidate_a.pdf
│       ├── candidate_b.docx
│       └── ...
│
├── reports/                    # Generated output (created on first run)
│   ├── shortlist.pdf           # Executive shortlist report
│   ├── rankings.csv            # Full ranked candidate list
│   └── data.json               # Machine-readable export
│
├── logs/
│   └── audit.jsonl             # Append-only audit trail (one JSON object per run)
│
├── db/
│   └── candidates.sqlite       # Candidate records, scoring history, feedback
│
└── ui/
    └── app.py                  # Streamlit recruiter dashboard
```

---

## Data Object Lineage

```
JD text
  └──► JDProfile
            └──► (paired with each) ──► CandidateProfile
                                              └──► ScoredCandidate
                                                        └──► CandidateList
                                                                  └──► Reports + Audit Log
```

---

## Storage

### SQLite Database (`db/candidates.sqlite`)

| Table | Contents |
|-------|---------|
| `candidates` | Name, email, filename, run_id |
| `scores` | Composite score + sub-scores per run |
| `explanations` | Plain-English reasoning per candidate |
| `feedback` | Recruiter-marked Hired / Rejected outcomes |
| `runs` | Run metadata (matches audit log) |

### Audit Log (`logs/audit.jsonl`)
- Append-only; never overwritten
- One JSON object per line, one line per run
- Human-readable and machine-parseable

---

*See [Report Generator](./07-report-generator.md) for output file format details.*
