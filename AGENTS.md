## Project Summary
HeyGen Interactive Avatar with real-time web search capabilities. Users can interact with an AI-powered avatar through text or voice. The system intelligently classifies queries to determine whether they need web search (current events, live data) or can be answered directly (greetings, general knowledge).

## Tech Stack
- **Frontend**: Vite + TypeScript
- **Backend**: Node.js Express server (port 3001)
- **Avatar SDK**: `@heygen/streaming-avatar` v2.1.0
- **AI SDK**: `openai` v6.16.0
- **Real-time streaming**: `livekit-client` v2.17.0
- **Voice Activity Detection**: `@ricky0123/vad-web` v0.0.30

## Architecture
```
src/
├── config/
│   └── prompts.ts          # System prompts for different response types
├── utils/
│   ├── queryClassifier.ts  # Classifies queries as web_search or direct
│   ├── responseSanitizer.ts # Cleans responses for voice output
│   ├── commonResponses.ts  # Instant responses for greetings
│   ├── responseCache.ts    # Caches responses to reduce API calls
│   └── voiceActivityDetection.ts # VAD for filtering background noise
├── types/
│   └── index.ts            # TypeScript types
├── openai-assistant.ts     # OpenAI integration with classification
├── main.ts                 # Main application entry point
└── style.css               # Styles

server.js                   # Backend with unified /api/process-query endpoint
```

### Data Flow
1. User speaks → MediaRecorder (WebM) → Whisper API → Transcript
2. Transcript → Query Classification (instant/quick/GPT)
3. If web_search → OpenAI Responses API with web_search tool
4. If direct → OpenAI Assistants API (with memory) or Chat Completions
5. Response → Sanitize (remove URLs, citations, markdown) → Truncate
6. Clean response → avatar.speak() → HeyGen renders with TTS

## User Preferences
(None recorded yet)

## Project Guidelines
- Keep responses voice-friendly: no URLs, citations, bullet points, or markdown
- Maximum 2-3 sentences for avatar responses
- Use conversational tone with contractions
- Instant responses for common greetings (no API call)
- Filter background noise before processing audio

## Common Patterns
- Query Classification: Quick regex patterns for greetings/realtime, fallback to GPT-4o-mini
- Response Sanitization: Strip all formatting, URLs, citations before voice output
- Caching: 5 minutes for direct queries, 30 seconds for web search
