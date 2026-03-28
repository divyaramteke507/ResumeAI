# Module 03 — Skill & Entity Extractor

> Dual-mode extraction of skills, experience, and education from parsed resume documents.

---

## Responsibility

Takes a `ResumeDocument` and extracts structured entities: matched skills, years of experience (per role and total), education details, employment timeline, and semantic similarity scores against the `JDProfile`.

---

## Extraction Modes

The extractor runs in **dual mode** — both approaches are applied and results are merged:

| Mode | Technique | Best For |
|------|-----------|---------|
| **Rule-based** | Curated skill taxonomy + pattern matching | Known tech keywords, exact matches |
| **ML-based** | spaCy NER (`en_core_web_lg`) | Context-aware entity recognition |

---

## Skill Taxonomy

- **500+ skills** covering technical and soft skills
- Each skill entry includes **synonyms and aliases** (e.g., `JS` → `JavaScript`, `k8s` → `Kubernetes`)
- Categories: Programming Languages, Frameworks, Cloud Platforms, Databases, Soft Skills, Domain Knowledge

---

## What Gets Extracted

### Skills
- Each skill matched against the taxonomy (exact + fuzzy)
- Synonym resolution applied before matching

### Years of Experience (YOE)
- **Per role**: parsed from employment date ranges
- **Total YOE**: sum across all non-overlapping roles
- Date parsing handles formats: `Jan 2020 – Mar 2023`, `2019–Present`, `2018 to 2021`

### Education
- Degree type (BS, MS, PhD, etc.)
- Institution name (via spaCy NER)
- Graduation year

### Employment Timeline
- **Gap detection**: flags gaps > 12 months for the Scoring Engine
- **Tenure per role**: calculated for context

---

## Semantic Matching

Beyond exact keyword matching, the extractor uses **local sentence embeddings** for semantic similarity:

| Component | Detail |
|-----------|--------|
| Model | `all-MiniLM-L6-v2` (sentence-transformers) |
| Method | Cosine similarity between skill embeddings |
| Purpose | Catch semantically equivalent skills (e.g., "REST API design" ≈ "RESTful web services") |
| Runs | 100% locally — no external API |

---

## Output

```python
@dataclass
class CandidateProfile:
    name: str
    email: str
    matched_skills: list[SkillMatch]    # skill, source, confidence
    missing_skills: list[str]           # required skills not found
    total_yoe: float
    yoe_per_role: list[RoleExperience]
    education: EducationRecord
    employment_gaps: list[GapRecord]
    extraction_confidence: float        # < threshold triggers re-run
```

---

## Error Handling

If `extraction_confidence` falls below the configured threshold, the extractor re-runs with **stricter NER settings** before passing results downstream.

---

*Next: [Module 04 — Scoring Engine](./05-scoring-engine.md)*
