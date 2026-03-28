# Agent Execution Loop

> ReAct-style autonomous execution with conditional branching and fallback handling.

---

## Overview

The agent follows a **ReAct-style loop** (Reason → Act → Observe → Repeat) with explicit exit conditions and fallbacks at every step. The agent operates autonomously from start to finish; human input is only required if confidence thresholds are not met.

---

## Execution Steps

| Step | Agent Action | Condition / Exit |
|------|-------------|-----------------|
| **1** | Load JD → build requirement vector | JD confidence < 0.6 → prompt user for clarification before continuing |
| **2** | For each resume: parse → extract → score | Parse failure → fallback to OCR; if OCR also fails → score = 0, flag in audit log |
| **3** | Check skill extraction confidence per candidate | Confidence < threshold → re-run extractor with stricter NER settings |
| **4** | Aggregate scores → rank → apply cutoffs | If top-N shortlist has < 3 candidates → automatically lower threshold and re-rank |
| **5** | Generate report with explanations | Always executes; audit log is written regardless of upstream failures |

---

## Flow Diagram

```
START
  │
  ▼
[Step 1] Load JD & build JDProfile
  │
  ├── confidence < 0.6 ──► Prompt user for clarification ──► retry Step 1
  │
  ▼
[Step 2] For each resume in batch:
  │   parse → extract → score
  │
  ├── parse failure ──► OCR fallback
  │       │
  │       └── OCR failure ──► score = 0, log & continue
  │
  ▼
[Step 3] Check extraction confidence per candidate
  │
  ├── confidence < threshold ──► re-run with stricter NER ──► continue
  │
  ▼
[Step 4] Aggregate → rank → apply cutoffs
  │
  ├── shortlist < 3 candidates ──► lower threshold ──► re-rank
  │
  ▼
[Step 5] Generate reports + write audit log
  │
  ▼
END
```

---

## Design Principles

- **Autonomous by default** — the agent completes the full pipeline without human input unless a confidence gate fails
- **Graceful degradation** — every failure mode has a defined fallback, not a hard crash
- **Audit log always written** — even in partial failure scenarios, the log captures what happened
- **Idempotent** — running the same input twice produces the same output (deterministic scoring, no randomness)

---

## Configuration

Key thresholds that control loop behaviour (configurable in `config.yaml`):

```yaml
jd_confidence_min: 0.6          # below this → prompt user
extraction_confidence_min: 0.75  # below this → re-run NER
shortlist_min_candidates: 3      # below this → lower score threshold
score_threshold_default: 65      # minimum score for shortlist (min_score mode)
top_n_default: 10                # candidates to return (top_n mode)
```

---

*See [Tech Stack](./09-tech-stack.md) for the libraries powering each step.*
