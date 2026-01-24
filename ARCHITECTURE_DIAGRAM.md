# AI Analysis Feature - Visual Architecture & Flow

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
│                     (React/TypeScript)                           │
│                                                                   │
│  ┌───────────────┬──────────────────┬──────────────────────┐    │
│  │ AI Analysis   │  Conversation    │  Analysis Result     │    │
│  │    Page       │    List          │    Display           │    │
│  │               │                  │                      │    │
│  │ • Sessions    │ • Expandable     │ • Situation         │    │
│  │ • Run Buttons │   Cards          │ • Action            │    │
│  │ • Bulk Run    │ • Checkboxes     │ • Resolution        │    │
│  │ • CSV Export  │ • Progress Bar   │ • Satisfaction      │    │
│  │ • Summary     │                  │ • Sentiment         │    │
│  │   Stats       │                  │ • Root Cause        │    │
│  │               │                  │ • Solutions         │    │
│  │               │                  │ • Entities          │    │
│  │               │                  │ • KPIs              │    │
│  │               │                  │ • Agent Performance │    │
│  └───────────────┴──────────────────┴──────────────────────┘    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓
        ┌──────────────────────────────────────┐
        │    API CLIENT (aiAnalysis.ts)       │
        │  • getSessions()                    │
        │  • getTranscript()                  │
        │  • analyzeSession()                 │
        │  • bulkAnalyze()                    │
        │  • exportAnalyses()                 │
        │  • getSummary()                     │
        │  • getAnalysisResult()              │
        │  • deleteAnalysis()                 │
        └──────────────────────┬───────────────┘
                               │
                               ↓
        ┌──────────────────────────────────────────────────────┐
        │              EXPRESS.JS API SERVER                   │
        │          (backend/src/server.ts)                     │
        │                                                       │
        │  GET  /api/v1/ai-analysis/sessions                  │
        │  GET  /api/v1/ai-analysis/sessions/:id/transcript   │
        │  POST /api/v1/ai-analysis/analyze/:id               │
        │  GET  /api/v1/ai-analysis/results/:id               │
        │  POST /api/v1/ai-analysis/bulk-analyze              │
        │  GET  /api/v1/ai-analysis/export                    │
        │  GET  /api/v1/ai-analysis/summary                   │
        │  DELETE /api/v1/ai-analysis/results/:id             │
        └──────┬────────────────────┬─────────────┬────────────┘
               │                    │             │
               ↓                    ↓             ↓
    ┌────────────────┐  ┌─────────────────────┐  ┌──────────────┐
    │  DIALOGFLOW CX │  │  GEMINI LLM API     │  │   SQLite DB  │
    │   API CLIENT   │  │                     │  │              │
    │                │  │ • Prompt Eng.       │  │ • ai_analysis│
    │ • getConv()    │  │ • analyzeTranscript │  │   _results   │
    │ • getTurns()   │  │ • bulkAnalyze()     │  │              │
    │ • parseText()  │  │ • parseJSON()       │  │ Indexes:     │
    │                │  │                     │  │ • session_id │
    └────────────────┘  └─────────────────────┘  │ • agent_id   │
         (Cloud)             (Google)            └──────────────┘
                                                   (Local)
```

## Data Flow Diagram

```
STEP 1: Discover Sessions
┌──────────────┐
│   User       │
│  Opens Page  │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────┐
│ Frontend: aiAnalysis.tsx         │
│ Calls: getSessions()             │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│ Backend: GET /sessions           │
│ Query Dialogflow for conversations
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│ Database: Check existing analyses │
│ Return: Sessions with status      │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│ Frontend: Display Session List    │
│ Show: Title, Duration, Status     │
└──────────────────────────────────┘


STEP 2: Run Analysis
┌──────────────────────────────────┐
│ User: Clicks "Analyze"           │
│       on Session                 │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│ Frontend: Disable Button          │
│ Show: Loading Spinner             │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│ Frontend: analyzeSession()        │
│ Call: POST /analyze/:sessionId    │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│ Backend: Get Full Transcript      │
│ Query: Dialogflow for session data
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│ Backend: Convert to Transcript    │
│ Format: [{role, message}, ...]    │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│ Backend: Send to Gemini           │
│ Prompt: Comprehensive analysis    │
│ Expected: JSON response           │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│ Gemini API: Process Transcript    │
│ Extract: All metrics              │
│ Return: Structured Analysis       │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│ Backend: Store in Database        │
│ Save: analysis_json to ai_results │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│ Frontend: Display Results         │
│ Show: Expanded session with data  │
│ Enable: Re-analyze button         │
└──────────────────────────────────┘


STEP 3: Export Results
┌──────────────────────────────────┐
│ User: Clicks "Export CSV"        │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│ Frontend: Call exportAnalyses()   │
│ Query: GET /export               │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│ Backend: Fetch All Analyses      │
│ From: ai_analysis_results table  │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│ Backend: Generate CSV             │
│ Headers: 30+ columns              │
│ Rows: One per analysis            │
└──────┬───────────────────────────┘
       │
       ↓
┌──────────────────────────────────┐
│ Frontend: Download File           │
│ Filename: ai-analysis-export-... │
│ Format: CSV (Excel compatible)    │
└──────────────────────────────────┘
```

## Metrics Extraction Diagram

```
INPUT: Conversation Transcript
│
├─ [USER]: "Hi, I can't access my account"
├─ [AGENT]: "I'll help you. Can I have your account number?"
├─ [USER]: "It's ACC123456"
├─ [AGENT]: "Let me check... I see the issue. Your account was locked."
├─ [USER]: "Why?"
├─ [AGENT]: "Unusual activity detected. I'm unlocking it now."
├─ [USER]: "Thanks, it's working!"
└─ [AGENT]: "Great! Is there anything else?"


GEMINI LLM PROCESSING
│
├─→ SITUATION ANALYSIS
│   Output: "Customer unable to access account due to security lock"
│
├─→ ACTION TRACKING
│   Output: "Agent identified lock cause and unlocked account"
│
├─→ RESOLUTION CHECK
│   Output: "Issue resolved successfully, account restored"
│
├─→ SATISFACTION SCORING
│   Output: { level: "satisfied", score: 4, explanation: "..." }
│
├─→ SENTIMENT ANALYSIS
│   Output: {
│     overall: "positive",
│     score: 0.75,
│     progression: [
│       { turn: 1, sentiment: "negative", intensity: 0.8 },
│       { turn: 2, sentiment: "neutral", intensity: 0.5 },
│       { turn: 3, sentiment: "positive", intensity: 0.9 }
│     ]
│   }
│
├─→ ENTITY EXTRACTION
│   Output: [
│     { type: "account_number", value: "ACC123456", context: "..." },
│     { type: "issue_type", value: "security_lock", context: "..." }
│   ]
│
├─→ KPI CALCULATION
│   Output: {
│     firstContactResolution: true,
│     escalationRequired: false,
│     transferCount: 0,
│     customerEffortScore: "low"
│   }
│
└─→ AGENT PERFORMANCE
    Output: {
      professionalism: 4.5,
      empathy: 4.3,
      problemSolving: 4.5,
      communication: 4.4
    }


OUTPUT: Complete Analysis JSON
```

## State Management Flow

```
┌─────────────────────────────────────┐
│     Global State (useAgentStore)    │
│  • selectedAgent                    │
│  • projectId                        │
│  • location                         │
│  • authToken                        │
└─────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────┐
│   Local State (AIAnalysis.tsx)      │
│                                     │
│  • sessions: []                    │
│  • loading: false                  │
│  • analyzing: null                 │
│  • bulkAnalyzing: false            │
│  • selectedSessions: Set()         │
│  • expandedSession: null           │
│  • summary: null                   │
│  • error: null                     │
│  • successMessage: null            │
│                                     │
└─────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────┐
│  Component Tree Rendering           │
│                                     │
│  AIAnalysis.tsx (Main Page)        │
│  ├─ Summary Cards (Stats)          │
│  ├─ Controls (Buttons)             │
│  ├─ Session List                   │
│  │  └─ Session Cards               │
│  │     └─ AnalysisResult.tsx       │
│  └─ Notifications (Error/Success)  │
│                                     │
└─────────────────────────────────────┘
```

## Database Schema Visualization

```
AI_ANALYSIS_RESULTS Table
┌────────┬──────────────┬─────────────┬──────────────────┬────────────┐
│   id   │  session_id  │  agent_id   │ analysis_json    │ created_at │
├────────┼──────────────┼─────────────┼──────────────────┼────────────┤
│   1    │ session-001  │ agent-123   │ {                │ 2024-01-24 │
│        │              │             │   "situation":   │   10:30:00 │
│        │              │             │   "...",         │            │
│        │              │             │   "action":      │            │
│        │              │             │   "...",         │            │
│        │              │             │   ...            │            │
│        │              │             │ }                │            │
├────────┼──────────────┼─────────────┼──────────────────┼────────────┤
│   2    │ session-002  │ agent-123   │ {...}            │ 2024-01-24 │
│        │              │             │                  │   10:45:00 │
└────────┴──────────────┴─────────────┴──────────────────┴────────────┘

Indexes:
├─ PRIMARY KEY: id
├─ UNIQUE: session_id (fast lookup)
└─ INDEX: agent_id (fast filtering)
```

## CSV Export Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ ai-analysis-export-2024-01-24.csv                               │
├─────────────────────────────────────────────────────────────────┤
│ Session ID,Situation,Action,Resolution,Satisfaction Level,     │
│ Satisfaction Score,Sentiment,Root Cause,Solutions,...          │
├─────────────────────────────────────────────────────────────────┤
│ session-001,"Customer unable to...","Agent identified...","...│
│ satisfied,4,positive,"Security lock",...                       │
├─────────────────────────────────────────────────────────────────┤
│ session-002,"Billing issue...","Agent reviewed...","...        │
│ very_satisfied,5,positive,null,...                             │
└─────────────────────────────────────────────────────────────────┘

30+ Columns:
├─ Core: Session ID, Situation, Action, Resolution
├─ Satisfaction: Level, Score, Explanation
├─ Sentiment: Overall, Score, Progression
├─ Root Cause: Identified, Primary, Factors, Caller Intention
├─ Solutions: Suggested Solutions
├─ Entities: Extracted Entities
├─ KPIs: FCR, Escalation, Transfers, Effort Score
├─ Performance: Professionalism, Empathy, Problem Solving, Communication
└─ Other: Category, Subcategory, Follow-up, Analysis Time
```

## UI Layout Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR (280px / 80px collapsed)                           │
│  ├─ Logo + CX Tester                                        │
│  ├─ Navigation Items                                        │
│  │  ├─ Dashboard                                            │
│  │  ├─ Simulator                                            │
│  │  ├─ Agent URL Test                                       │
│  │  ├─ Bulk Test                                            │
│  │  ├─ Results                                              │
│  │  ├─ Coverage                                             │
│  │  ├─ History                                              │
│  │  └─ AI Analysis ← NEW ★                                  │
│  └─ Settings                                                │
└─────────────────────────────────────────────────────────────┘
│
├─────────────────────────────────────────────────────────────┐
│  MAIN CONTENT AREA                                          │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Title: AI Analysis                                    │ │
│  │ Description: Analyze transcripts using AI             │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────┬──────────┬──────────┬──────────┐              │
│  │ Total   │   Avg    │   FCR    │Escalat. │              │
│  │Analyses │  Satisf. │   Rate   │   Rate  │              │
│  │   150   │  4.2/5   │  86.7%   │   3.3%  │              │
│  └─────────┴──────────┴──────────┴──────────┘              │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ [Bulk Analyze All] [Export CSV (42)] [Refresh]       │ │
│  │ Progress: [████████████░░░░░░░░] 75% (75/100)        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ☑ Select All (50)                                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ☐ session-001                                      │ ▼ │
│  │   30 turns • 2m 15s    [Analyze] ✓                 │  │
│  │                                                     │  │
│  │   ┌─ EXPANDED ─────────────────────────────────┐  │  │
│  │   │                                             │  │  │
│  │   │ Summary: Customer called about billing...  │  │  │
│  │   │                                             │  │  │
│  │   │ [Situation] [Action] [Resolution]          │  │  │
│  │   │ [Satisfaction] [Sentiment] [Root Cause]   │  │  │
│  │   │ [Solutions] [Entities] [KPIs] [Performance]│ │  │
│  │   │                                             │  │  │
│  │   └─────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ☐ session-002                                      │ ◄ │
│  │   15 turns • 1m 30s    [Analyze]                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                              │
│  ... (more sessions)                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Files & Dependencies

```
Frontend Dependencies:
├─ React (UI Framework)
├─ TypeScript (Type Safety)
├─ Tailwind CSS (Styling)
├─ Lucide React (Icons)
├─ Axios (HTTP Client)
├─ Zustand (State Management)
└─ date-fns (Date Formatting)

Backend Dependencies:
├─ Express.js (Web Framework)
├─ TypeScript (Type Safety)
├─ @google-cloud/dialogflow-cx (Dialogflow)
├─ @google/generative-ai (Gemini API)
├─ better-sqlite3 (SQLite Database)
├─ CORS (Cross-Origin)
└─ Rate Limiter (Request Limiting)
```

---

This architecture ensures:
✅ Separation of concerns  
✅ Type safety throughout  
✅ Efficient data flow  
✅ Real-time UI updates  
✅ Proper error handling  
✅ Scalable design  
