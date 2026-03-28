# Module 01 — JD Processor

> Transforms raw job description text into a structured, weighted requirement vector.

---

## Responsibility

Accepts a raw job description (pasted text or file upload) and produces a `JDProfile` object that all downstream modules use as the scoring target.

---

## Inputs

| Format | Description |
|--------|-------------|
| Paste | Raw text pasted directly into the UI |
| File upload | `.txt` or `.pdf` job description file |

---

## Processing Steps

1. **Ingest** raw JD text
2. **Extract** structured fields using NLP:
   - Required skills
   - Preferred / nice-to-have skills
   - Minimum years of experience
   - Education requirements
3. **Build** weighted requirement vector
4. **Output** `JDProfile` object

---

## NLP Approach

| Technique | Purpose |
|-----------|---------|
| spaCy NER (`en_core_web_lg`) | Named entity recognition for roles, tools, technologies |
| Custom regex patterns | Tech stack detection (e.g., `Python`, `AWS`, `Kubernetes`) |
| Rule-based extraction | Structured fields like "minimum 5 years experience" |

All NLP runs **locally** — no external API calls.

---

## Weighting Scheme

| Dimension | Weight |
|-----------|--------|
| Skills match | 40% |
| Experience match | 30% |
| Education match | 20% |
| Miscellaneous (certifications, domain fit, etc.) | 10% |

---

## Output: `JDProfile` Object

```python
@dataclass
class JDProfile:
    required_skills: list[str]
    preferred_skills: list[str]
    min_experience_years: int
    education_requirement: str
    feature_map: dict[str, float]  # weighted requirement vector
    confidence_score: float        # 0.0–1.0; < 0.6 triggers user clarification
```

---

## Error Handling

If the extracted `JDProfile` has a **confidence score below 0.6**, the agent pauses and prompts the recruiter to clarify the job description before proceeding.

---

*Next: [Module 02 — Resume Ingestion Engine](./03-resume-ingestion.md)*
