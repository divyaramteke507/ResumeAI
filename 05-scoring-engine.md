# Module 04 — Scoring Engine

> Computes a 0–100 match score for each candidate against the JDProfile with full explainability.

---

## Responsibility

Takes a `CandidateProfile` and a `JDProfile` and produces a composite match score along with a detailed, human-readable score breakdown for every candidate.

---

## Score Composition

The composite score (0–100) is the weighted sum of four sub-scores:

| Sub-Score | Weight | Measures |
|-----------|--------|---------|
| **Skill Score** | 40% | Required and preferred skills matched |
| **Experience Score** | 30% | Total YOE vs minimum required; domain relevance |
| **Education Score** | 20% | Degree level and field vs JD requirement |
| **Keyword Score** | 10% | JD-specific terminology and domain keywords |

---

## Skill Scoring Detail

- Counts matched required skills out of total required
- Preferred skills contribute a partial bonus
- **Semantic similarity** (cosine similarity via local embeddings) used for near-matches
- All computation runs via `scikit-learn` and `numpy` — no API calls

---

## Penalties

| Condition | Penalty Applied |
|-----------|----------------|
| Employment gap > 12 months | Score reduction (configurable magnitude) |
| Domain mismatch (e.g., embedded systems candidate for a web role) | Partial penalty |

---

## Bonuses

| Condition | Bonus Applied |
|-----------|--------------|
| Exact job title match in work history | Positive boost |
| Open source contributions detected | Positive boost |
| Relevant certifications present | Positive boost |

---

## Explainability

Every score includes a stored plain-English breakdown, for example:

```
Score: 82/100
  ├── Skills:      34/40  — Matched 8/10 required skills. Missing: Kubernetes, Go.
  ├── Experience:  26/30  — 6 years total; JD requires 4+. Domain: strong match.
  ├── Education:   16/20  — BS Computer Science. JD preferred: BS or higher.
  └── Keywords:    6/10   — Matched 12/18 JD-specific terms.

Penalties: None.
Bonuses: OSS contributions detected (+2).
```

This breakdown is stored per candidate and surfaced in the UI and reports.

---

## Output

```python
@dataclass
class ScoredCandidate:
    candidate: CandidateProfile
    composite_score: float           # 0–100
    sub_scores: dict[str, float]     # {"skill": x, "experience": x, ...}
    penalties: list[str]
    bonuses: list[str]
    explanation: str                 # plain-English reasoning
```

---

*Next: [Module 05 — Ranking & Shortlisting Agent](./06-ranking-agent.md)*
