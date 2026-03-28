# 🤖 AI Resume Screening Agent

An intelligent, autonomous AI-powered resume screening system that analyzes, scores, and ranks candidates with full explainability. Built with Node.js, Express, and vanilla JavaScript.

![AI Resume Screening](https://img.shields.io/badge/AI-Powered-blue)
![Node.js](https://img.shields.io/badge/Node.js-v18+-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

### 🎯 Core Capabilities
- **Intelligent Job Description Processing**: Automatically extracts required skills, experience levels, and education requirements
- **Multi-Format Resume Parsing**: Supports PDF, Word documents, images (with OCR), and text files
- **AI-Powered Scoring**: Multi-dimensional scoring across skills, experience, education, and keywords
- **Smart Ranking**: Automatic candidate ranking with explainable recommendations
- **Interactive Chat**: Ask natural language questions about any candidate's resume
- **Multi-Candidate Comparison**: Compare multiple candidates side-by-side with AI assistance
- **Side-by-Side View**: View candidate profiles alongside original resume files

### 💬 Chat Features
- Ask questions about skills, experience, education, leadership
- Natural language understanding with 10+ question types
- Quick question buttons for common queries
- Chat history per candidate
- Comparison chat for multiple candidates

### 🔐 Authentication
- Google Sign-In integration via Firebase
- Secure session management
- User profile display
- Protected routes

### 📊 Advanced Features
- Real-time score adjustment with custom weights
- Visual score breakdowns with radar charts
- Gap analysis and skill matching
- Audit trail for all decisions
- CSV export for results
- Responsive dark theme UI

## 🚀 Quick Start

### Prerequisites
- Node.js v18 or higher
- npm or yarn
- Python (for Tesseract OCR)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/ai-resume-screening-agent.git
cd ai-resume-screening-agent
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Firebase (Optional - for authentication)**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Google Sign-In in Authentication settings
   - Update `src/firebase-config.js` with your Firebase credentials

4. **Run the application**
```bash
npm run dev
```

The application will start:
- Frontend: http://localhost:5174
- Backend: http://localhost:3000

## 📖 Usage

### 1. Sign In
- Click "Continue with Google" on the landing page
- Authenticate with your Google account

### 2. Create Job Description
- Paste your job description
- AI automatically extracts requirements
- Review and confirm

### 3. Upload Resumes
- Drag and drop resume files (PDF, Word, images)
- Supports batch upload (up to 100 files)
- Multiple formats supported

### 4. AI Processing
- Watch the pipeline process resumes in real-time
- Automatic parsing, extraction, scoring, and ranking
- Takes seconds to process dozens of resumes

### 5. Review Candidates
- View ranked list of candidates
- Click any candidate for detailed analysis
- Use chat to ask questions about resumes
- Compare multiple candidates
- View original files side-by-side with profiles

### 6. Make Decisions
- Approve, reject, or schedule interviews
- Adjust scoring weights in real-time
- Export results to CSV
- Download detailed reports

## 🎨 Key Features Explained

### Chat with Resumes
Ask natural language questions about any candidate:
- "What are their key skills?"
- "Do they have leadership experience?"
- "Tell me about their education"
- "How many years of experience?"

### Multi-Candidate Comparison
Compare top candidates with AI assistance:
- "Compare their skills"
- "Who has more experience?"
- "What are the key differences?"

### Side-by-Side View
- View candidate profile on the left
- Original resume file on the right
- Toggle between original file and extracted text
- Download original files

### Smart Scoring
- **Skills Match**: Weighted scoring based on required/preferred skills
- **Experience Level**: Years of experience evaluation
- **Education Fit**: Degree and field matching
- **Keyword Relevance**: Job description keyword matching

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Better-SQLite3** - Database
- **Multer** - File upload handling
- **PDF-Parse** - PDF text extraction
- **Mammoth** - Word document parsing
- **Tesseract.js** - OCR for images

### Frontend
- **Vanilla JavaScript** - No framework overhead
- **Vite** - Build tool and dev server
- **Chart.js** - Data visualization
- **Firebase** - Authentication

### AI/ML
- Custom skill extraction algorithms
- Natural language processing for JD parsing
- Scoring engine with configurable weights
- Ranking agent with explainability

## 📁 Project Structure

```
ai-resume-screening-agent/
├── server/
│   ├── index.js              # Express server
│   ├── db.js                 # Database setup
│   ├── services/
│   │   ├── jd-processor.js   # Job description processing
│   │   ├── resume-parser.js  # Resume parsing
│   │   ├── skill-extractor.js # Skill extraction
│   │   ├── scoring-engine.js # Candidate scoring
│   │   └── ranking-agent.js  # Ranking logic
│   └── data/
│       └── skill-taxonomy.json # Skill database
├── src/
│   ├── main.js               # Main application
│   ├── api.js                # API client
│   ├── firebase-config.js    # Firebase setup
│   ├── views/
│   │   └── login.js          # Login page
│   ├── components/
│   │   └── ui-components.js  # Reusable components
│   └── styles/
│       ├── app.css           # Main styles
│       └── login.css         # Login styles
├── db/                       # SQLite database
├── uploads/                  # Uploaded resumes
├── reports/                  # Generated reports
└── test-resumes/            # Sample resumes
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file (optional):
```env
PORT=3000
NODE_ENV=development
```

### Scoring Weights
Adjust default weights in `src/main.js`:
```javascript
weights: { 
  skill: 0.40,      // 40% weight on skills
  experience: 0.30, // 30% weight on experience
  education: 0.20,  // 20% weight on education
  keyword: 0.10     // 10% weight on keywords
}
```

## 📊 API Endpoints

### Job Descriptions
- `POST /api/jd` - Create job description
- `GET /api/jd/:id` - Get job description
- `GET /api/jds` - List all job descriptions

### Pipeline
- `POST /api/pipeline/run` - Run screening pipeline
- `GET /api/pipeline/status/:runId` - Get pipeline status

### Candidates
- `GET /api/candidates/:runId` - Get candidates for a run
- `GET /api/candidate/:id` - Get candidate details
- `PATCH /api/candidate/:id/status` - Update candidate status
- `POST /api/candidate/:id/chat` - Chat with resume
- `POST /api/candidates/compare` - Compare candidates
- `GET /api/candidate/:id/file` - Get candidate file path

### Reports
- `GET /api/reports/csv/:runId` - Download CSV report
- `GET /api/reports/json/:runId` - Get JSON report
- `GET /api/audit/:runId` - Get audit log

## 🧪 Testing

Run with sample resumes:
```bash
node test-pipeline.js
```

Sample resumes are provided in `test-resumes/` directory.

## 📝 Documentation

Detailed documentation available in the project:
- `CHATBOT-IMPROVEMENTS.md` - Chatbot enhancements
- `COMPARISON-FEATURES.md` - Multi-candidate comparison
- `GOOGLE-LOGIN-SETUP.md` - Authentication setup
- `SIDE-BY-SIDE-TOGGLE-UPDATE.md` - Side-by-side view
- `FILE-PATH-FIX.md` - File handling details
- `FIXES-APPLIED.md` - Recent bug fixes

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by the need for fair, explainable hiring processes
- Designed for recruiters who value speed and accuracy

## 📧 Contact

For questions or support, please open an issue on GitHub.

## 🚀 Roadmap

- [ ] Integration with OpenAI/Anthropic for advanced NLP
- [ ] Multi-language support
- [ ] Video resume analysis
- [ ] Interview scheduling integration
- [ ] Team collaboration features
- [ ] Advanced analytics dashboard
- [ ] Mobile app
- [ ] API for third-party integrations

---

Made with ❤️ for recruiters who care about finding the right talent.
