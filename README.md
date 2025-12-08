# Google Conversational Agent Testing Tool

A comprehensive testing platform for Dialogflow CX agents that enables single and bulk conversation testing with advanced visualization and analytics.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Redis (for bulk test queue)
- Google Cloud project with Dialogflow CX API enabled

### Installation

1. **Clone and install dependencies:**
```bash
# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your Google Cloud credentials
```

3. **Start development servers:**
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

4. **Open browser:** Navigate to `http://localhost:5173`

## 📁 Project Structure

```
TestSuiteAgent/
├── frontend/          # React + TypeScript + Vite
├── backend/           # Node.js + Express + TypeScript
├── .env.example       # Environment template
└── README.md
```

## 🔧 Features
- **Single Test**: Manual conversation testing with real-time feedback
- **Bulk Test**: CSV upload for batch testing
- **Dashboard**: Pass/fail metrics and analytics
- **Coverage**: Intent and page coverage reports

## 📄 License
MIT
