# Module 02 — Resume Ingestion Engine

> Batch-reads resumes in multiple formats and produces structured, normalized text for downstream processing.

---

## Responsibility

Reads all resume files from the input folder, extracts text regardless of format, detects document structure, and normalizes content into a consistent representation.

---

## Supported Formats

| Format | Primary Parser | Fallback |
|--------|---------------|---------|
| PDF (text-layer) | `pdfplumber` | `pytesseract` (OCR) via `pdf2image` |
| PDF (scanned) | `pytesseract` | — |
| DOCX | `python-docx` | — |
| TXT | Built-in `open()` | — |

---

## Processing Steps

### 1. Batch Read
All files from the `resumes/` directory are loaded in a single pass. Filenames and MIME types are detected automatically.

### 2. Text Extraction

**PDF — text-layer:**
```
pdfplumber → extract_text() per page → concatenate
```

**PDF — scanned / no text layer:**
```
pdf2image → page images → pytesseract OCR → concatenate
```

**DOCX:**
```
python-docx → section-aware extraction (paragraphs + tables)
```

### 3. Structure Detection
The engine identifies and labels the following sections:

| Section | Detection Method |
|---------|-----------------|
| Header / contact info | Top-of-document heuristics + regex |
| Summary / objective | Keyword matching ("summary", "objective", "profile") |
| Work experience | Date-range pattern + role-title NER |
| Education | Degree keyword matching + institution NER |
| Skills | Dedicated "Skills" section or inline extraction |
| Projects | "Projects" section keyword |

### 4. Normalization
- Unicode encoding normalized to UTF-8
- Footer text, graphics alt-text, and decorative characters stripped
- Whitespace collapsed and section boundaries marked

---

## Output

A structured `ResumeDocument` object per candidate:

```python
@dataclass
class ResumeDocument:
    filename: str
    raw_text: str
    sections: dict[str, str]   # {"experience": "...", "education": "...", ...}
    parse_method: str          # "pdfplumber" | "ocr" | "docx" | "txt"
    parse_confidence: float    # 0.0–1.0
```

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| PDF parse fails | Automatic fallback to OCR via `pytesseract` |
| OCR also fails | Candidate scored as 0; flagged in audit log |
| Corrupt / unreadable file | Skipped with error entry in `logs/audit.jsonl` |

---

*Next: [Module 03 — Skill & Entity Extractor](./04-skill-extractor.md)*
