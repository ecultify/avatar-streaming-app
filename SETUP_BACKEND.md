# Backend Setup for Real-Time Web Search

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Check Your .env File

Your `.env` file should have your OpenAI API key. The backend supports both formats:

**Option 1 (Frontend + Backend):**
```
VITE_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
VITE_HEYGEN_API_KEY=xxxxxxxxxxxxxxxxxxxxx
VITE_DID_API_KEY=xxxxxxxxxxxxxxxxxxxxx
```

**Option 2 (Backend specific):**
```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```

**Best:** Have both for compatibility:
```
VITE_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
VITE_HEYGEN_API_KEY=xxxxxxxxxxxxxxxxxxxxx
VITE_DID_API_KEY=xxxxxxxxxxxxxxxxxxxxx
```

**Note:** The backend will automatically use either `OPENAI_API_KEY` or `VITE_OPENAI_API_KEY`!

### 3. Start Backend + Frontend Together
```bash
npm run start
```

**OR** run them separately in two terminals:

**Terminal 1 (Backend):**
```bash
npm run backend
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```

## How It Works

1. **User asks a question** in voice/text mode
2. **Frontend detects** if it needs web search (keywords: weather, news, today, latest, etc.)
3. **Backend calls OpenAI** GPT-4o for real-time information
4. **Assistants API formats** the response naturally
5. **Avatar speaks** the answer

## Test Questions

Try these in voice mode:
- "What's the weather in Mumbai today?"
- "What happened in January 2026?"
- "What's the price of Realme 13 5G?"
- "Who won the BMC elections?"

## Troubleshooting

**Error: OPENAI_API_KEY not found**
- Make sure you set the environment variable before running `npm run backend`

**Backend not starting:**
- Check if port 3001 is already in use
- Try: `npm run backend` first, then `npm run dev` in another terminal

**Frontend can't connect to backend:**
- Ensure backend is running on http://localhost:3001
- Check browser console for CORS errors
