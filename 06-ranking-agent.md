# Module 05 — Ranking & Shortlisting Agent

> Sorts, deduplicates, and shortlists candidates with diversity awareness.

---

## Responsibility

Takes the full list of `ScoredCandidate` objects and produces a final ranked `CandidateList` ready for report generation and UI display.

---

## Processing Steps

### 1. Sort
All candidates are sorted by `composite_score` in **descending order**.

### 2. Apply Cutoff
Two configurable shortlisting modes:

| Mode | Description |
|------|-------------|
| **Top-N** | Return the top N candidates regardless of score |
| **Min-score threshold** | Return all candidates scoring above a defined minimum |

If fewer than 3 candidates pass the cutoff, the threshold is automatically lowered and ranking is re-run.

### 3. Deduplication
Detects the same candidate submitted with slightly different resumes:

- Match key: `hash(normalized_name + email)`
- On collision: keep the version with the **higher composite score**
- Merged duplicates are flagged in the audit log

### 4. Diversity Nudge
After shortlisting, the agent checks for breadth in the shortlist. If the shortlist appears homogeneous (e.g., all candidates from identical backgrounds), a **diversity flag** is surfaced to the recruiter — not applied automatically, but visible in the UI for human review.

> Note: Diversity nudge operates on professional profile dimensions (skill spread, domain variety, career trajectory) — never on personal demographic attributes.

---

## Output

```python
@dataclass
class CandidateList:
    ranked_candidates: list[ScoredCandidate]  # sorted descending by score
    cutoff_applied: str                        # "top_n" | "min_score"
    cutoff_value: float
    duplicates_merged: int
    diversity_flag: bool
    diversity_note: str | None
```

---

## Multi-Role Support

When multiple JDs are active in one session, each resume is scored against **all active roles**. The ranking agent:
- Produces a separate `CandidateList` per JD
- Also assigns each candidate a **best-fit role recommendation** across all JDs

---

*Next: [Module 06 — Report Generator](./07-report-generator.md)*
