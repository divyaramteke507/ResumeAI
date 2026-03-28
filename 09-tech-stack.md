# Tech Stack

> All local — zero external APIs. Every component runs on the recruiter's machine.

---

## Stack Overview

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Language** | Python | 3.11+ | Core agent and all modules |
| **PDF Parsing** | pdfplumber | latest | Text-layer PDF extraction |
| **PDF OCR** | pytesseract + pdf2image | latest | Scanned / image-only PDF extraction |
| **DOCX** | python-docx | latest | Word document ingestion |
| **NLP / NER** | spaCy | `en_core_web_lg` | Entity extraction, skill tagging |
| **Embeddings** | sentence-transformers | `all-MiniLM-L6-v2` | Semantic skill similarity (local) |
| **Scoring** | scikit-learn + numpy | latest | TF-IDF, cosine similarity, weighted scoring |
| **Report (PDF)** | reportlab | latest | PDF report generation |
| **Report (HTML)** | jinja2 + weasyprint | latest | HTML report rendering |
| **UI** | Streamlit | latest | Recruiter-facing web interface |
| **Storage** | SQLite (`sqlite3`) | built-in | Candidate DB, scoring history, audit |

---

## Dependency Details

### PDF Parsing

```
pdfplumber        # primary: extracts text from text-layer PDFs
pdf2image         # converts PDF pages to images for OCR
pytesseract       # OCR engine (requires Tesseract binary installed)
```

### NLP & Embeddings

```
spacy             # NER pipeline
en_core_web_lg    # large English model (most accurate for NER)
sentence-transformers  # local embedding model
# Model: all-MiniLM-L6-v2 (~80MB, runs on CPU)
```

### Scoring & ML

```
scikit-learn      # TF-IDF vectorizer, cosine_similarity
numpy             # vector math, weighted aggregation
```

### Reporting

```
reportlab         # programmatic PDF generation (score bars, tables)
jinja2            # HTML templating
weasyprint        # HTML → PDF rendering (alternative to reportlab)
```

### UI & Storage

```
streamlit         # rapid web UI with Python backend
sqlite3           # built-in Python module; no separate DB server needed
```

---

## Installation

```bash
# Core dependencies
pip install pdfplumber pdf2image pytesseract python-docx \
            spacy sentence-transformers scikit-learn numpy \
            reportlab jinja2 weasyprint streamlit

# spaCy language model
python -m spacy download en_core_web_lg

# System dependency (macOS / Linux)
# macOS:  brew install tesseract
# Ubuntu: apt install tesseract-ocr
```

---

## Why No External APIs?

| Concern | Local Solution |
|---------|---------------|
| Privacy — resumes contain PII | All processing stays on-device |
| Cost — API fees at scale | Zero marginal cost per resume |
| Latency — API round-trips | Sub-second local inference |
| Reproducibility — model versions change | Pinned local models, deterministic output |
| Compliance — data residency requirements | Data never leaves the machine |

---

*See [Agent Execution Loop](./08-agent-execution-loop.md) for how these components are orchestrated.*
