# AI Avatar Assistant - HeyGen + OpenAI + D-ID

An intelligent avatar assistant powered by HeyGen's Streaming Avatar SDK, OpenAI Assistant API, and D-ID's Talks API.

## Features

- 🤖 **AI-Powered Conversations**: OpenAI Assistant integration for intelligent responses
- 🔍 **Web Search Integration**: Real-time web search for current information and facts
- 🌤️ **Weather Information**: Get weather updates for any location
- 🎙️ **Voice & Text Modes**: Switch between text chat and voice conversation
- 🎬 **HeyGen Live Avatar**: Real-time streaming with interactive capabilities
- 📹 **D-ID Video Generation**: Create talking avatar videos from text
- 🎨 Modern, responsive UI with landscape video (16:9)
- 🔐 Secure environment variable configuration

## AI Capabilities

The assistant is powered by **OpenAI GPT-4 Turbo** with advanced function calling capabilities:

### 🔍 Web Search
- Automatically searches the web for current information
- Provides up-to-date news, facts, and answers
- Works with any topic or question
- Uses Brave Search API for reliable results

### 🌤️ Weather Information
- Get current weather for any location
- Temperature in Celsius or Fahrenheit
- Weather conditions and forecasts

### 💬 Natural Conversation
- Maintains conversation context
- Brief, conversational responses optimized for avatar speech
- Engages naturally with users

**How it works:** When you ask a question, the AI automatically decides whether to:
1. Search the web for current information
2. Check weather data for a location
3. Answer directly from its knowledge base

## Platforms

### HeyGen + OpenAI (Real-time Interactive AI)
- **Avatar**: Marianne_Chair_Sitting_public
- **AI Model**: GPT-4 Turbo via OpenAI Assistant
- **Modes**: Text chat & Voice conversation
- **Technology**: HeyGen Streaming Avatar SDK
- **Quality**: High (1080p)
- **Status**: ✅ Fully working

### D-ID (Video Generation)
- **Technology**: Talks API
- **Presenter**: Noelle (default)
- **Voice**: Microsoft en-US-JennyNeural
- **Process**: Generate video from text input
- **Status**: ✅ Fully working

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Credentials

Create a `.env` file in the project root and paste your API credentials:

```bash
# Create .env file
touch .env
```

Then add the following variables to your `.env` file:

```env
VITE_HEYGEN_API_KEY=your_heygen_api_key_here
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_DID_API_KEY=your_did_api_key_here
```

**Environment Variables:**
- `VITE_HEYGEN_API_KEY`: Your HeyGen API token (starts with `sk_V2_`)
- `VITE_OPENAI_API_KEY`: Your OpenAI API key (starts with `sk-proj-`)
- `VITE_DID_API_KEY`: Your D-ID API key (format: `email:token`)

**Note**: The `.env` file is automatically ignored by git to protect your credentials.

### 3. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Usage

### Using HeyGen + OpenAI Avatar (AI-Powered Interactive Avatar)

#### Getting Started
1. Make sure your `.env` file has both `VITE_HEYGEN_API_KEY` and `VITE_OPENAI_API_KEY` configured
2. Click on **HeyGen + OpenAI** tab
3. Click **Start Session** to initialize the avatar

The app will:
- Create a HeyGen streaming session
- Initialize OpenAI Assistant with GPT-4
- Connect the avatar stream to the video player
- Enable both text and voice interaction modes

#### Text Mode (Default)
1. Type your question or message in the input field
2. Press **Send** or hit Enter
3. The app will:
   - Send your message to OpenAI Assistant
   - Get an intelligent AI response (using web search if needed)
   - Make the avatar speak the response
4. Have a natural conversation with the AI avatar!

**Example Questions:**
- "What's the weather in San Francisco?"
- "Tell me about the latest news in AI"
- "What happened today in technology?"
- "Who won the game yesterday?"
- "Explain quantum computing"

The assistant will automatically:
- Use web search for current information, news, and facts
- Use the weather function for weather-related queries
- Provide conversational, up-to-date answers

#### Voice Mode
1. Click **Voice Mode** button (enabled after stream is ready)
2. Speak naturally to the avatar
3. The avatar will:
   - Listen to your speech (status shows "Listening...")
   - Process your input
   - Respond with AI-generated answers
4. Continue having a voice conversation!

#### Switching Modes
- Click **Text Mode** or **Voice Mode** buttons to switch
- Voice mode automatically handles speech-to-text
- Both modes use OpenAI for intelligent responses

### Using D-ID Avatar (Video Generation)

1. Make sure your `.env` file has the D-ID API key configured
2. Click on **D-ID Avatar** tab
3. Enter text in the input field
4. Click **Generate Video**
5. Wait 15-30 seconds for video generation
6. Click play to watch the generated avatar video

### Monitoring

- Check the browser console for detailed logs:
  - `[HeyGen]` - Avatar connection, OpenAI responses, and events
  - `[D-ID]` - Video generation status
- Real-time status updates show current activity
- Session/Talk IDs are displayed for debugging

## Complete Environment Setup

Create a `.env` file with all three API keys:

```env
VITE_HEYGEN_API_KEY=your_heygen_api_key_here
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_DID_API_KEY=your_did_api_key_here
```

## API Integration Details

### HeyGen Streaming Avatar SDK
- **Package**: `@heygen/streaming-avatar`
- **Token Endpoint**: `POST /v1/streaming.create_token`
- **Session Management**: Handled by SDK
- **Events**: Stream ready, user speech, avatar talking
- **Voice Chat**: Built-in speech-to-text and text-to-speech

### OpenAI Assistant API
- **Package**: `openai`
- **Model**: GPT-4 Turbo
- **Mode**: Assistants API with threads
- **Context**: Maintains conversation history
- **Response Style**: Brief and conversational for avatar speech
- **Function Calling**: 
  - `get_current_weather`: Retrieves weather information for any location
  - `web_search`: Searches the web for real-time information, news, facts, and current events
- **Search Provider**: Brave Search API (free tier available)

### D-ID Talks API
- **Endpoint**: `POST /talks`
- **Polling**: `GET /talks/{id}`
- **Authentication**: Basic auth
- **Generation Time**: 15-30 seconds
- **Output**: Video URL for playback

## Key Features from HeyGen Documentation

Based on [HeyGen's official documentation](https://docs.heygen.com/docs/integrate-with-opeanai-assistant):

1. **OpenAI Integration**: Seamlessly connects OpenAI Assistant responses to avatar speech
2. **Voice Chat**: Built-in voice interaction following [voice chat guide](https://docs.heygen.com/docs/adding-built-in-voice-chat-integration-to-demo-project)
3. **Event-Driven**: Real-time status updates for speech and avatar states
4. **Mode Switching**: Toggle between text and voice modes seamlessly

## Console Logging

The application provides detailed console logs for debugging:

- `[HeyGen]` prefix for HeyGen-related logs
- `[D-ID]` prefix for D-ID-related logs
- Session initialization and connection states
- WebRTC connection details
- Error messages with full context

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Technologies

- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **HeyGen Streaming Avatar SDK** (`@heygen/streaming-avatar`) - Real-time avatar streaming
- **OpenAI SDK** (`openai`) - GPT-4 powered conversations
- **D-ID Talks API** - Video generation
- **WebRTC** - Real-time communication (handled by SDK)

## Troubleshooting

### Avatar not starting
- Check that your HeyGen API key is valid and starts with `sk_V2_`
- Ensure you have credits in your HeyGen account
- Check browser console for detailed error messages
- Try refreshing the page and starting again

### OpenAI not responding
- Verify your OpenAI API key is correct and starts with `sk-proj-`
- Check that you have API credits available
- Ensure the key has access to GPT-4 Turbo model
- Check console for OpenAI API errors

### Web search not working
- The app uses Brave Search API (free demo key included)
- For production use, get your own Brave Search API key at https://brave.com/search/api/
- Replace the API key in `src/openai-assistant.ts` line 111
- Check console for "Web search failed" errors
- Web search automatically activates for current events and information queries

### Voice mode not working
- Grant microphone permissions when prompted by browser
- Voice mode only activates after stream is ready
- Check browser console for permission errors
- Try refreshing and granting permissions again

### D-ID video not generating
- Verify your D-ID API credentials are in `email:token` format
- Check that you have credits available in D-ID account
- Video generation typically takes 15-30 seconds
- Check console for D-ID API errors

## Platform Comparison

### HeyGen (Real-time Streaming)

**Pros:**
- ✅ True real-time streaming with LiveKit
- ✅ Low latency (< 1 second)
- ✅ Interactive conversations possible
- ✅ High quality video streaming
- ✅ Continuous streaming session

**Cons:**
- ❌ Requires constant connection
- ❌ Higher API costs for long sessions
- ❌ More complex setup (LiveKit)

**Best for:** Live interactions, customer service, real-time conversations

### D-ID (Video Generation)

**Pros:**
- ✅ Simple text-to-video generation
- ✅ Pre-rendered high-quality videos
- ✅ Can cache and reuse videos
- ✅ Lower costs for repeated content
- ✅ Works directly from browser

**Cons:**
- ❌ 10-30 second generation time
- ❌ Not real-time/interactive
- ❌ Each change requires regeneration
- ❌ Video files can be large

**Best for:** Pre-recorded messages, announcements, content that doesn't change

## Technical Details

### HeyGen + OpenAI Implementation
- Uses **HeyGen Streaming Avatar SDK** for simplified integration
- Fetches session tokens via `/v1/streaming.create_token` endpoint
- SDK automatically handles WebRTC connection and video streaming
- **OpenAI Assistant** creates conversational AI with GPT-4 Turbo
- Maintains conversation history through OpenAI threads
- Built-in voice chat with speech recognition (no external STT needed)
- Event-driven architecture for real-time status updates

### D-ID Implementation
- Uses **D-ID Talks API** for video generation
- Polls every 2 seconds for completion status
- Downloads and displays final video when ready
- No backend proxy needed (direct API calls work)
- Supports customizable presenters and voices

## References

### HeyGen Documentation
- [Streaming Avatar SDK](https://docs.heygen.com/docs/streaming-avatar-sdk)
- [Integrating OpenAI Assistant](https://docs.heygen.com/docs/integrate-with-opeanai-assistant)
- [Built-in Voice Chat Integration](https://docs.heygen.com/docs/adding-built-in-voice-chat-integration-to-demo-project)
- [Streaming API Overview](https://docs.heygen.com/docs/streaming-api)

### Other APIs
- [OpenAI Assistants API](https://platform.openai.com/docs/assistants/overview)
- [D-ID Talks API](https://docs.d-id.com/reference/talks)

## License

MIT
