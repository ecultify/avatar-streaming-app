## Project Summary
HeyGen Interactive Avatar with real-time web search capabilities. Users can interact with an AI-powered avatar through text or voice. The system intelligently classifies queries to determine whether they need web search (current events, live data) or can be answered directly (greetings, general knowledge).

## Tech Stack
- **Frontend**: Vite + TypeScript
- **Backend**: Node.js Express server (port 3001)
- **Avatar SDK**: `@heygen/streaming-avatar` v2.1.0
- **AI SDK**: `openai` v6.25.0 (using Responses API)
- **Real-time streaming**: `livekit-client` v2.17.0
- **Voice Activity Detection**: `@ricky0123/vad-web` v0.0.30 (CDN loaded)

## Architecture
```
src/
├── config/
│   ├── index.ts            # Configuration constants (models, avatar, VAD, API)
│   └── prompts.ts          # System prompts and instant responses
├── utils/
│   ├── queryClassifier.ts  # Pattern + LLM classification (instant/direct/web_search)
│   ├── responseSanitizer.ts # Cleans responses for voice output
│   ├── responseCache.ts    # Caches responses with TTL
│   └── voiceActivityDetection.ts # VAD with CDN model loading
├── types/
│   └── index.ts            # TypeScript types
├── main.ts                 # Main application entry point
└── style.css               # Styles

server.js                   # Backend with /api/process-query endpoint
vite.config.ts              # Vite config (excludes VAD from bundling)
```

### Data Flow
1. User speaks → VAD detects speech end → WAV blob
2. Audio → Whisper API → Transcript
3. Transcript → Query Classification:
   - Pattern match first (instant responses, web search keywords)
   - Fallback to GPT-4o-mini for ambiguous queries
4. If instant → Return pre-defined response (no API call)
5. If web_search → OpenAI Responses API with web_search tool
6. If direct → OpenAI Chat Completions API
7. Response → Sanitize (remove URLs, citations, markdown) → Truncate to 3 sentences
8. Clean response → avatar.speak() → HeyGen renders with TTS

### Key Changes from Previous Version
- **Removed Assistants API** (deprecated Aug 2026)
- **Using Responses API** for web search with built-in tools
- **Chat Completions** for direct responses (simpler, cheaper)
- **VAD loads from CDN** to avoid Vite ONNX bundling issues
- **Three query types**: instant (no API), direct (Chat API), web_search (Responses API)

## User Preferences
(None recorded yet)

## Project Guidelines
- Keep responses voice-friendly: no URLs, citations, bullet points, or markdown
- Maximum 2-3 sentences for avatar responses
- Use conversational tone with contractions
- Instant responses for common greetings (no API call)
- Filter background noise using VAD before processing audio
- Always sanitize AI responses before sending to avatar

## Common Patterns
- Query Classification: Pattern-based first, GPT-4o-mini fallback
- Response Sanitization: Strip all formatting, URLs, citations
- Caching: 5 minutes for direct queries, 30 seconds for web search
- VAD: Load model from CDN, use callbacks for speech detection
