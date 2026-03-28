# System Pipeline

> End-to-end flow of the AI Resume Screening Agent

---

## Pipeline Stages

```
JD Input → Resume Ingest → Parser → Skill Extractor → Scorer → Ranker → Report Gen
```

Each stage is a **discrete module**. Communication between modules happens via structured Python objects — no API calls, no external services.

---

## Stage Descriptions

| Stage | Module | Input | Output |
|-------|--------|-------|--------|
| **JD Input** | JD Processor | Raw JD text / file | `JDProfile` object |
| **Resume Ingest** | Resume Ingestion Engine | PDF / DOCX / TXT files | Raw text + structure |
| **Parser** | Resume Ingestion Engine | Raw file bytes | Structured sections |
| **Skill Extractor** | Skill & Entity Extractor | Parsed resume sections | Skills, YOE, education |
| **Scorer** | Scoring Engine | Candidate profile + `JDProfile` | Score 0–100 + breakdown |
| **Ranker** | Ranking & Shortlisting Agent | All scored candidates | Ranked `CandidateList` |
| **Report Gen** | Report Generator | Ranked list + scores | PDF, CSV, JSON outputs |

---

## Data Objects

### `JDProfile`
Produced by the JD Processor. Contains:
- Required skills list
- Preferred skills list
- Minimum experience requirement
- Education requirement
- Weighted feature map (skills 40%, exp 30%, edu 20%, misc 10%)

### `CandidateList`
Produced by the Ranking Agent. Contains:
- Ranked list of candidates (descending by composite score)
- Per-candidate: score, sub-scores, reasoning text
- Deduplication metadata

---

## Key Design Decisions

- **No API calls between modules** — all inter-module communication is in-process Python objects
- **Fallback at every stage** — parse failure triggers OCR fallback; scoring failure defaults to 0
- **Structured logging** — every pipeline run is logged to `logs/audit.jsonl` for reproducibility

---

*See individual module docs for implementation details.*
