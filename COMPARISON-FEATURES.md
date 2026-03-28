# Multi-Candidate Comparison & Side-by-Side View

## New Features

### 1. Multi-Candidate Comparison View

Compare multiple candidates side-by-side with an intelligent chatbot that can answer comparative questions.

#### How to Access:
- Click "⊞ Compare Top 3" button in the dashboard header
- Automatically selects the top 3 ranked candidates
- Opens a dedicated comparison view

#### Features:
- **Visual Comparison Cards**: See all candidates' profiles side-by-side
- **Score Breakdowns**: Compare skills, experience, education, and keyword scores
- **Matched vs Missing Skills**: Quickly identify strengths and gaps
- **Comparison Chat**: Ask questions to compare candidates

#### Comparison Chat Examples:
- "Compare their skills"
- "Who has more experience?"
- "Compare their education"
- "Who has leadership experience?"
- "What are the key differences?"
- "Who has the highest score?"

#### Quick Question Buttons:
- Skills
- Experience
- Education
- Leadership
- Differences

### 2. Side-by-Side View

View a candidate's profile and full resume text side-by-side in a large modal.

#### How to Access:
- Open any candidate's detail view
- Click "⊞ Side-by-Side View" button

#### Features:
- **Split View**: Profile on left, resume text on right
- **Full Profile**: Complete score breakdown, skills analysis, highlights, and recommendation
- **Raw Resume Text**: Full resume content in readable format
- **Independent Scrolling**: Scroll each side independently
- **Large Modal**: 95% viewport width for maximum readability

#### Use Cases:
- Verify extracted information against original resume
- Read full resume while reviewing profile
- Check context for specific skills or experience
- Detailed candidate review

## Technical Implementation

### Frontend (`src/main.js`)

#### New State Properties:
```javascript
comparisonCandidates: [], // Array of candidate IDs for comparison
```

#### New Views:
- `renderComparisonView()` - Main comparison interface
- `renderComparisonDetailCard()` - Individual candidate cards
- `renderComparisonChatMessages()` - Chat message rendering
- `showSideBySideView()` - Modal for side-by-side view
- `renderSideBySideProfile()` - Profile section in modal

#### New Functions:
- `handleComparisonChatSubmit()` - Process comparison questions
- Event handlers for comparison chat and navigation

### Backend (`server/index.js`)

#### New API Endpoint:
```javascript
POST /api/candidates/compare
Body: { candidateIds: string[], question: string }
Response: { answer: string }
```

#### Comparison Intelligence:
- Skills comparison (count and list)
- Experience comparison (years)
- Education comparison (degrees)
- Leadership comparison (presence/absence)
- Score comparison (overall ranking)
- Gap analysis (missing skills)
- General overview

### API Client (`src/api.js`)

#### New Method:
```javascript
compareCandidates: (candidateIds, question) => request(`/candidates/compare`, {
  method: 'POST',
  body: JSON.stringify({ candidateIds, question }),
})
```

### Styling (`src/styles/app.css`)

#### New Classes:
- `.comparison-view` - Main container
- `.comparison-header` - Header with title and actions
- `.comparison-chat-section` - Chat interface
- `.comparison-grid` - Responsive grid for candidate cards
- `.comparison-detail-card` - Individual candidate card
- `.comparison-quick-btn` - Quick question buttons
- Modal enhancements for side-by-side view

## User Workflow

### Comparison Workflow:
1. User clicks "Compare Top 3" in dashboard
2. System loads top 3 candidates into comparison view
3. User sees all candidates side-by-side
4. User can ask comparison questions via chat
5. Chatbot analyzes and compares candidates
6. User can return to dashboard anytime

### Side-by-Side Workflow:
1. User selects a candidate in dashboard
2. User clicks "Side-by-Side View" button
3. Modal opens with split view
4. Left side shows complete profile
5. Right side shows full resume text
6. User can scroll each side independently
7. User closes modal to return

## Benefits

### For Recruiters:
- Faster candidate comparison
- Easy identification of best fit
- Quick gap analysis
- Natural language queries
- No need to switch between views

### For Hiring Managers:
- Comprehensive candidate overview
- Verify extracted data accuracy
- Read full context
- Make informed decisions
- Compare multiple candidates efficiently

## Future Enhancements

Consider adding:
- Custom candidate selection (not just top 3)
- Export comparison as PDF
- Save comparison sessions
- Add notes to comparison
- Compare specific attributes (e.g., only skills)
- Visual charts for comparison
- Print-friendly comparison view
- Share comparison with team
