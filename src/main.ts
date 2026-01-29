import './style.css'
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
} from '@heygen/streaming-avatar'
import DailyIframe from '@daily-co/daily-js';
import { initializeVAD, startVAD, pauseVAD, resumeVAD, destroyVAD } from './utils/voiceActivityDetection'
import { API_CONFIG, AVATAR_CONFIG } from './config'
// Voice Agent Configuration
// (Removed VAPI configuration)

const HEYGEN_API_TOKEN = import.meta.env.VITE_HEYGEN_API_KEY || '';

// Timestamp utility for console logging
function ts(): string {
  const now = new Date();
  return `[${now.toLocaleTimeString('en-US', { hour12: false })}.${now.getMilliseconds().toString().padStart(3, '0')}]`;
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Current session ID for API calls
let currentSessionId = generateSessionId();



document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>AI Avatar Assistant</h1>
    
    <div class="provider-toggle">
        <label class="switch">
            <input type="checkbox" id="providerToggle">
            <span class="slider round"></span>
        </label>
        <span id="providerLabel">HeyGen</span>
    </div>

    <div id="avatarContainer" class="avatar-container">
      <!-- HeyGen Section -->
      <div id="heygenSection" class="avatar-section active">
        <div class="section-header">
          <h2>HeyGen Interactive Avatar</h2>
          <div class="controls">
            <button id="heygenStartBtn" type="button">Start Session</button>
            <button id="heygenStopBtn" type="button" disabled>End Session</button>
          </div>
        </div>
        
        <div class="mode-selector">
          <button id="textModeBtn" class="mode-btn active">Text Mode</button>
          <button id="voiceModeBtn" class="mode-btn" disabled>Voice Mode</button>
        </div>
        
        <div class="video-container">
          <video id="heygenVideo" autoplay playsinline></video>
          <div id="processingIndicator" class="processing-indicator" style="display: none;">
            <div class="spinner"></div>
            <span id="processingText">Processing...</span>
          </div>
        </div>
        
        <div id="textModeControls" class="chat-controls">
          <input type="text" id="chatInput" placeholder="Ask the AI avatar anything..." />
          <button id="sendBtn" type="button" disabled>Send</button>
        </div>
        
        <div id="voiceModeControls" class="voice-controls" style="display: none;">
          <div class="voice-status">
            <div class="pulse-indicator"></div>
            <span id="voiceStatus">Voice mode inactive</span>
          </div>
          <button id="stopSpeakingBtn" type="button" style="display: none;">Done Speaking</button>
        </div>
        
        <div class="info">
          <p id="heygenStatus">Ready to start</p>
          <p id="heygenSessionInfo"></p>
        </div>
      </div>

      <!-- Tavus Section -->
      <div id="tavusSection" class="avatar-section" style="display: none;">
        <div class="section-header">
          <h2>Tavus Digital Twin</h2>
          <div class="controls">
            <button id="tavusStartBtn" type="button">Start Session</button>
            <button id="tavusStopBtn" type="button" disabled>End Session</button>
          </div>
        </div>
        <div id="tavusContainer" class="video-container" style="background: #000; min-height: 400px; display: flex; align-items: center; justify-content: center;">
            <p id="tavusPlaceholder" style="color: #666;">Click Start to connect...</p>
        </div>
        <div class="info">
            <p id="tavusStatus">Ready to connect</p>
        </div>
      </div>

    </div>
  </div>
`

let avatar: StreamingAvatar | null = null
let sessionId = generateSessionId()
let sessionData: any = null
let currentMode: 'text' | 'voice' = 'text'


const heygenStartBtn = document.querySelector<HTMLButtonElement>('#heygenStartBtn')!
const heygenStopBtn = document.querySelector<HTMLButtonElement>('#heygenStopBtn')!
const heygenVideo = document.querySelector<HTMLVideoElement>('#heygenVideo')!
const heygenStatus = document.querySelector<HTMLParagraphElement>('#heygenStatus')!
const heygenSessionInfo = document.querySelector<HTMLParagraphElement>('#heygenSessionInfo')!

const tavusSection = document.getElementById('tavusSection') as HTMLDivElement;
const heygenSection = document.getElementById('heygenSection') as HTMLDivElement;
const providerToggle = document.getElementById('providerToggle') as HTMLInputElement;
const providerLabel = document.getElementById('providerLabel') as HTMLSpanElement;
const tavusStartBtn = document.getElementById('tavusStartBtn') as HTMLButtonElement;
const tavusStopBtn = document.getElementById('tavusStopBtn') as HTMLButtonElement;
const tavusStatus = document.getElementById('tavusStatus') as HTMLParagraphElement;
const tavusContainer = document.getElementById('tavusContainer') as HTMLDivElement;

let callFrame: any = null;

const textModeBtn = document.querySelector<HTMLButtonElement>('#textModeBtn')!
const voiceModeBtn = document.querySelector<HTMLButtonElement>('#voiceModeBtn')!
const textModeControls = document.querySelector<HTMLDivElement>('#textModeControls')!
const voiceModeControls = document.querySelector<HTMLDivElement>('#voiceModeControls')!
const voiceStatus = document.querySelector<HTMLSpanElement>('#voiceStatus')!
const stopSpeakingBtn = document.querySelector<HTMLButtonElement>('#stopSpeakingBtn')!

const chatInput = document.querySelector<HTMLInputElement>('#chatInput')!
const sendBtn = document.querySelector<HTMLButtonElement>('#sendBtn')!

const processingIndicator = document.querySelector<HTMLDivElement>('#processingIndicator')!
const processingText = document.querySelector<HTMLSpanElement>('#processingText')!

// --- Toggle Logic ---
providerToggle.addEventListener('change', async (e) => {
  const target = e.target as HTMLInputElement;
  const isTavus = target.checked;

  providerLabel.textContent = isTavus ? 'Tavus' : 'HeyGen';

  if (isTavus) {
    heygenSection.style.display = 'none';
    tavusSection.style.display = 'block';
    await stopAvatarSession(); // Cleanup HeyGen
  } else {
    heygenSection.style.display = 'block';
    tavusSection.style.display = 'none';
    if (callFrame) {
      await callFrame.leave();
      callFrame.destroy();
      callFrame = null;
      tavusContainer.innerHTML = '<p id="tavusPlaceholder" style="color: #666;">Click Start to connect...</p>';
      tavusStartBtn.disabled = false;
      tavusStopBtn.disabled = true;
    }
  }
});

// --- Tavus Logic ---
tavusStartBtn.addEventListener('click', async () => {
  tavusStartBtn.disabled = true;
  tavusStatus.textContent = 'Initializing Tavus session...';

  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/tavus/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // Use default persona
    });

    if (!response.ok) throw new Error('Failed to create Tavus session');

    const data = await response.json();
    const conversationUrl = data.conversation_url;

    if (!conversationUrl) throw new Error('No conversation URL returned');

    tavusStatus.textContent = 'Connecting to room...';

    // Clear placeholder
    tavusContainer.innerHTML = '';

    callFrame = DailyIframe.createFrame(tavusContainer, {
      showLeaveButton: true,
      iframeStyle: {
        width: '100%',
        height: '100%',
        minHeight: '400px',
        border: '0',
        borderRadius: '12px'
      },
      videoSource: false,
      dailyConfig: {
        experimentalChromeVideoMuteLightOff: true
      } as any
    });

    // Event Listeners for Tool Calls
    callFrame.on('app-message', async (e: any) => {
      console.log('[Tavus] App Event:', e);
      // Tavus sends tool calls as app-message
      // Structure might vary, log it first.
      // As per Tavus docs, it looks for specific event structure.
      // But usually "app-message" carries the payload.

      // Expected payload from Tavus for tool call might be wrapped.
      // Let's assume standard Daily app-message for now.
      /*
         e.data: {
             event_type: "tool-call",
             tool_name: "web_search",
             tool_call_id: "...",
             args: { query: "..." }
         }
     */
      const msg = e.data;
      if (msg?.event_type === 'tool-call' && msg?.tool_name === 'web_search') {
        console.log('[Tavus] Web Search Requested:', msg.args.query);

        try {
          const searchRes = await fetch(`${API_CONFIG.BACKEND_URL}/api/web-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: msg.args.query })
          });
          const searchData = await searchRes.json();
          const resultText = searchData.response || "No results found.";

          // Send result back
          callFrame.sendAppMessage({
            event_type: 'tool-response',
            tool_call_id: msg.tool_call_id,
            result: resultText
          });
          console.log('[Tavus] Sent tool response');
        } catch (err) {
          console.error('[Tavus] Tool execution failed:', err);
          callFrame.sendAppMessage({
            event_type: 'tool-response',
            tool_call_id: msg.tool_call_id,
            error: "Failed to search web"
          });
        }
      }
    });

    callFrame.on('left-meeting', () => {
      tavusStatus.textContent = 'Session ended';
      tavusStopBtn.disabled = true;
      tavusStartBtn.disabled = false;
      callFrame.destroy();
      callFrame = null;
      tavusContainer.innerHTML = '<p id="tavusPlaceholder" style="color: #666;">Session Ended. Click Start to reconnect.</p>';
    });

    await callFrame.join({
      url: conversationUrl,
      startVideoOff: true // Redundant but safe safeguard
    });

    tavusStatus.textContent = 'Connected (Tavus)';
    tavusStopBtn.disabled = false;

  } catch (err: any) {
    console.error('[Tavus] Error:', err);
    tavusStatus.textContent = `Error: ${err.message}`;
    tavusStartBtn.disabled = false;
  }
});

tavusStopBtn.addEventListener('click', () => {
  if (callFrame) {
    callFrame.leave();
  }
});

function showProcessing(message: string) {
  processingIndicator.style.display = 'flex'
  processingText.textContent = message
}

function hideProcessing() {
  processingIndicator.style.display = 'none'
}

function updateHeyGenStatus(message: string) {
  console.log('[HeyGen]', message)
  heygenStatus.textContent = message
}

async function fetchAccessToken(): Promise<string> {
  try {
    const response = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: {
        'x-api-key': HEYGEN_API_TOKEN,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch access token')
    }

    const data = await response.json()
    return data.data.token
  } catch (error) {
    console.error('[HeyGen] Error fetching access token:', error)
    throw error
  }
}

async function getAIResponse(transcript: string): Promise<string> {
  const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/process-query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript,
      sessionId
    })
  });

  if (!response.ok) {
    throw new Error(`Backend API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`[API] ${data.queryType} response (${data.processingTime}ms)`);
  return data.response;
}

async function initializeAvatarSession() {
  heygenStartBtn.disabled = true
  updateHeyGenStatus('Creating session...')

  try {
    const token = await fetchAccessToken()
    avatar = new StreamingAvatar({ token })
    sessionId = generateSessionId()

    avatar.on(StreamingEvents.STREAM_READY, handleStreamReady)
    avatar.on(StreamingEvents.STREAM_DISCONNECTED, handleStreamDisconnected)

    avatar.on(StreamingEvents.USER_START, () => {
      voiceStatus.textContent = 'Listening...'
    })
    avatar.on(StreamingEvents.USER_STOP, () => {
      voiceStatus.textContent = 'Processing...'
    })
    avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
      voiceStatus.textContent = 'Avatar is speaking...'
      isAvatarSpeaking = true
    })
    avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
      console.log(`${ts()} [HeyGen] Avatar stopped talking event`);
      voiceStatus.textContent = 'Listening... (speak anytime)';
      isAvatarSpeaking = false;
      if (isVoiceModeActive && vadInitialized) {
        resumeVAD();
      }
    })

    updateHeyGenStatus('Starting avatar...')
    sessionData = await avatar.createStartAvatar({
      quality: AvatarQuality.High,
      avatarName: AVATAR_CONFIG.AVATAR_ID,
      voice: {
        voiceId: AVATAR_CONFIG.VOICE_ID
      },
      language: 'en',
      disableIdleTimeout: false
    })

    console.log('[HeyGen] Session data:', sessionData)
    heygenSessionInfo.textContent = `Session ID: ${sessionData.session_id}`

    heygenStopBtn.disabled = false

  } catch (error) {
    console.error('[HeyGen] Failed to initialize avatar session:', error)
    updateHeyGenStatus(`Error: ${error}`)
    heygenStartBtn.disabled = false
  }
}

function handleStreamReady(event: any) {
  updateHeyGenStatus('Stream ready!')
  console.log('[HeyGen] Stream ready:', event)

  if (event.detail && heygenVideo) {
    heygenVideo.srcObject = event.detail
    heygenVideo.onloadedmetadata = () => {
      heygenVideo.play().catch(console.error)
      updateHeyGenStatus('Connected - Ready to chat!')
      sendBtn.disabled = false
      voiceModeBtn.disabled = false
    }
  }
}

function handleStreamDisconnected() {
  updateHeyGenStatus('Disconnected')
  console.log('[HeyGen] Stream disconnected')
}

async function handleSpeak() {
  if (avatar && chatInput.value) {
    const userMessage = chatInput.value
    chatInput.value = ''
    sendBtn.disabled = true

    // Stop avatar if speaking
    if (isAvatarSpeaking) {
      // avatar.interrupt() not available in types, but new speak should override
      isAvatarSpeaking = false
    }

    try {
      updateHeyGenStatus('Getting AI response...')
      showProcessing('Getting AI response...')

      const response = await getAIResponse(userMessage)
      console.log('[HeyGen] AI response:', response)

      hideProcessing()
      updateHeyGenStatus('Avatar speaking...')

      await avatar.speak({
        text: response,
        taskType: TaskType.REPEAT
      })

      updateHeyGenStatus('Ready')
      sendBtn.disabled = false
    } catch (error) {
      console.error('[HeyGen] Error getting response:', error)
      updateHeyGenStatus('Error: ' + error)
      hideProcessing()
      sendBtn.disabled = false
    }
  }
}

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let isVoiceModeActive = false
let isRecording = false
let isAvatarSpeaking = false
let isProcessingAudio = false
let vadInitialized = false
let useFallbackRecording = false
// New variables for streaming text (Removed)

const MIN_AUDIO_SIZE = 5000;
const MIN_TRANSCRIPT_LENGTH = 2;

const SPAM_PATTERNS = [
  /📢|🔔|👍|👉|💯|✨/,
  /share.*video.*social media/i,
  /subscribe.*channel/i,
  /like.*comment.*subscribe/i,
  /click.*link/i,
  /thank.*watching/i,
  /^[^a-zA-Z0-9]+$/,
  /^\s*$/,
  /^(um|uh|hmm|ah|oh)+\s*$/i,
  /^\.+$/,
  /^\[.*\]$/,
];

function isValidTranscript(transcript: string): boolean {
  if (!transcript || transcript.trim().length < MIN_TRANSCRIPT_LENGTH) {
    return false;
  }

  const trimmed = transcript.trim();

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(trimmed)) {
      console.log('[Voice] Filtered spam/noise:', trimmed);
      return false;
    }
  }

  const alphanumericCount = (trimmed.match(/[a-zA-Z0-9]/g) || []).length;
  if (alphanumericCount < 2) {
    console.log('[Voice] Not enough alphanumeric characters:', trimmed);
    return false;
  }

  return true;
}

async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, audioBlob.type.includes('wav') ? 'audio.wav' : 'audio.webm');

  const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/transcribe`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    let errorDetails = '';
    try {
      const errorData = await response.json();
      errorDetails = JSON.stringify(errorData);
      console.error('[Transcribe] Server Error Details:', errorData);
    } catch (e) {
      errorDetails = await response.text();
      console.error('[Transcribe] Server Error Text:', errorDetails);
    }
    throw new Error(`Transcription API error: ${response.status} ${errorDetails}`);
  }

  const data = await response.json();
  return data.text || '';
}

// NEW: Unified audio processing (Gemini STT + LLM in one call)
// This is the streamlined flow: Voice → Gemini → Response
async function processAudioUnified(audioBlob: Blob, sessionId: string): Promise<string> {
  console.log(`${ts()} [ProcessAudio] 🎤 Sending audio to Gemini (${(audioBlob.size / 1024).toFixed(1)}KB)`);

  const formData = new FormData();
  formData.append('file', audioBlob, audioBlob.type.includes('wav') ? 'audio.wav' : 'audio.webm');
  formData.append('sessionId', sessionId);

  const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/process-audio`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error(`${ts()} [ProcessAudio] ❌ Error:`, errorData);
    throw new Error(errorData.error || 'Audio processing failed');
  }

  const data = await response.json();
  console.log(`${ts()} [ProcessAudio] ✅ Response in ${data.processingTime}ms (${data.model || 'unknown'})`);
  return data.response || '';
}

// Flag to use unified processing (Gemini) vs separate transcription + query
const USE_UNIFIED_PROCESSING = true;


async function processUserSpeech(audioBlob: Blob): Promise<void> {
  if (isProcessingAudio) { // Removed isAvatarSpeaking check to allow full duplex interruption
    console.log(`${ts()} [Voice] Busy, ignoring audio`);
    return;
  }

  if (audioBlob.size < MIN_AUDIO_SIZE) {
    console.log(`${ts()} [Voice] Audio too short, skipping`);
    voiceStatus.textContent = 'Listening... (speak longer)';
    return;
  }

  console.log(`${ts()} [Voice] 🎙️ Audio received (${(audioBlob.size / 1024).toFixed(1)}KB)`);
  isProcessingAudio = true;
  pauseVAD();

  try {
    let response: string;

    if (USE_UNIFIED_PROCESSING) {
      // Unified flow: Audio → Gemini (STT + LLM) → Response
      voiceStatus.textContent = 'Processing...';
      updateHeyGenStatus('Processing audio...');
      showProcessing('Processing with Gemini...');

      try {
        response = await processAudioUnified(audioBlob, currentSessionId);
        console.log(`${ts()} [Voice] 💬 Response received`);
      } catch (unifiedError) {
        console.warn('[Voice] Unified processing failed, falling back:', unifiedError);
        // Fall back to separate transcription + query
        voiceStatus.textContent = 'Transcribing...';
        const transcript = await transcribeAudio(audioBlob);
        if (!isValidTranscript(transcript)) {
          throw new Error('Invalid transcript');
        }
        response = await getAIResponse(transcript);
      }
    } else {
      // Traditional flow: Audio → Whisper (STT) → GPT (LLM) → Response
      voiceStatus.textContent = 'Transcribing...';
      updateHeyGenStatus('Transcribing...');

      const transcript = await transcribeAudio(audioBlob);
      console.log('[Voice] Transcript:', transcript);

      if (!isValidTranscript(transcript)) {
        voiceStatus.textContent = 'No clear speech - try again';
        updateHeyGenStatus('Voice mode active - Speak now');
        isProcessingAudio = false;
        if (isVoiceModeActive && vadInitialized) resumeVAD();
        return;
      }

      voiceStatus.textContent = 'Getting AI response...';
      updateHeyGenStatus('Processing...');
      showProcessing('Getting AI response...');

      response = await getAIResponse(transcript);
      console.log('[Voice] AI response:', response);
    }

    // Stop avatar if speaking (interrupt)
    if (isAvatarSpeaking) {
      isAvatarSpeaking = false;
    }

    if (!avatar || !isVoiceModeActive) {
      console.log(`${ts()} [Voice] Session ended`);
      isProcessingAudio = false;
      hideProcessing();
      return;
    }

    console.log(`${ts()} [Voice] 🗣️ Avatar starting to speak...`);
    voiceStatus.textContent = 'Avatar speaking...';
    hideProcessing();
    isAvatarSpeaking = true;

    await avatar.speak({
      text: response,
      taskType: TaskType.REPEAT
    });

    console.log(`${ts()} [Voice] ✅ Avatar finished speaking`);
    isAvatarSpeaking = false;
    voiceStatus.textContent = 'Listening...';
    updateHeyGenStatus('Voice mode active - Speak now');
    isProcessingAudio = false;

    if (isVoiceModeActive && vadInitialized) {
      resumeVAD();
    }

  } catch (error) {
    console.error('[Voice] Error:', error);
    voiceStatus.textContent = 'Error - Try again';
    updateHeyGenStatus('Voice error');
    hideProcessing();
    isProcessingAudio = false;
    isAvatarSpeaking = false;

    if (isVoiceModeActive && vadInitialized) {
      setTimeout(() => resumeVAD(), 1000);
    }
  }
}

async function startVoiceChatWithVAD() {
  if (!avatar) return;

  // VAPI-style interruption settings
  const MIN_INTERRUPT_AUDIO_SIZE = 30000; // ~0.9 sec at 16kHz - require substantial speech to interrupt
  const MIN_NORMAL_AUDIO_SIZE = 5000;     // ~0.15 sec for normal listening
  let speechStartTime = 0;

  try {
    updateHeyGenStatus('Starting voice mode with VAD...');
    isVoiceModeActive = true;

    await initializeVAD({
      onSpeechStart: () => {
        speechStartTime = Date.now();

        // If avatar is speaking, just note it - don't interrupt yet
        // We'll decide on interrupt when speech ends based on duration
        if (isAvatarSpeaking) {
          console.log('[VAD] Potential interruption detected...');
        }

        if (!isProcessingAudio) {
          isRecording = true;
          voiceStatus.textContent = isAvatarSpeaking ? 'Listening... (speak to interrupt)' : 'Listening... (speech detected)';
          stopSpeakingBtn.style.display = 'block';
          console.log('[VAD] Speech started');
        }
      },
      onSpeechEnd: async (audioBlob: Blob) => {
        isRecording = false;
        stopSpeakingBtn.style.display = 'none';

        const speechDuration = Date.now() - speechStartTime;
        const wasAvatarSpeaking = isAvatarSpeaking;

        // If avatar was speaking, check if this is a real interruption
        if (wasAvatarSpeaking) {
          // Require minimum audio size to count as real interruption
          // This filters out background noise, self-echo, and short sounds
          if (audioBlob.size < MIN_INTERRUPT_AUDIO_SIZE) {
            console.log(`[VAD] Ignoring short sound during TTS (${audioBlob.size} bytes, ${speechDuration}ms)`);
            voiceStatus.textContent = 'Avatar speaking...';
            return;
          }

          // Real interruption detected!
          console.log(`[VAD] Interrupting avatar! (${audioBlob.size} bytes, ${speechDuration}ms)`);
          isAvatarSpeaking = false;
          // Note: HeyGen avatar.interrupt() can be called here if available
        }

        // If busy processing another request, ignore
        if (!isVoiceModeActive || isProcessingAudio) {
          console.log('[VAD] Ignoring - busy processing');
          return;
        }

        // For normal speech (not interruption), use lower threshold
        if (!wasAvatarSpeaking && audioBlob.size < MIN_NORMAL_AUDIO_SIZE) {
          console.log(`[VAD] Audio too short (${audioBlob.size} bytes)`);
          return;
        }

        console.log('[VAD] Speech ended, size:', audioBlob.size);
        await processUserSpeech(audioBlob);
      },
      onVADMisfire: () => {
        console.log('[VAD] Noise filtered');
        if (!isAvatarSpeaking) {
          voiceStatus.textContent = 'Listening... (noise filtered)';
        }
      }
    });

    vadInitialized = true;
    startVAD();
    voiceStatus.textContent = 'Listening... (speak anytime)';
    updateHeyGenStatus('Voice mode active with VAD');
    console.log('[VAD] Voice mode started');

  } catch (error) {
    console.error('[VAD] Failed:', error);
    updateHeyGenStatus('VAD failed, using fallback...');
    useFallbackRecording = true;
    await startVoiceChatFallback(); // Use fallback if VAD fails
  }
}

async function startVoiceChatFallback() {
  if (!avatar) return;

  try {
    updateHeyGenStatus('Starting voice mode (fallback)...');

    let stream;

    try {
      console.log('[Voice] Requesting mic with strict constraints...');
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000
        }
      });
    } catch (e) {
      console.warn('[Voice] Strict config failed, retrying with defaults...', e);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[Voice] Acquired mic with default config');
      } catch (err) {
        throw err; // Throw original error if both fail
      }
    }

    isVoiceModeActive = true;
    audioChunks = [];

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      if (!isVoiceModeActive || isAvatarSpeaking) {
        audioChunks = [];
        if (isVoiceModeActive && !isAvatarSpeaking) {
          setTimeout(() => startFallbackRecording(), 500);
        }
        return;
      }

      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      audioChunks = [];

      await processUserSpeech(audioBlob);

      if (isVoiceModeActive && !isAvatarSpeaking) {
        setTimeout(() => startFallbackRecording(), 500);
      }
    };

    voiceStatus.textContent = 'Listening...';
    updateHeyGenStatus('Voice mode active - Speak now');
    console.log('[Voice] Fallback mode started');

    startFallbackRecording();

  } catch (error) {
    console.error('[Voice] Fallback error:', error);

    if ((error as any).name === 'NotAllowedError') {
      voiceStatus.textContent = 'Microphone access denied';
      updateHeyGenStatus('Please allow microphone access');
      alert('Microphone access is required for voice mode.');
    } else {
      voiceStatus.textContent = 'Error starting voice mode';
      updateHeyGenStatus('Voice mode error');
    }

    isVoiceModeActive = false;
  }
}

let recordingTimeout: number | null = null;

function startFallbackRecording() {
  if (!mediaRecorder || !isVoiceModeActive || isAvatarSpeaking || isProcessingAudio) return;

  try {
    audioChunks = [];
    isRecording = true;
    mediaRecorder.start();

    voiceStatus.textContent = 'Listening... (speak now)';
    stopSpeakingBtn.style.display = 'block';
    console.log('[Voice] Recording started');

    if (recordingTimeout) {
      clearTimeout(recordingTimeout);
    }

    recordingTimeout = window.setTimeout(() => {
      if (isRecording && mediaRecorder && mediaRecorder.state === 'recording') {
        stopFallbackRecording();
      }
    }, 8000);

  } catch (error) {
    console.error('[Voice] Recording error:', error);
    voiceStatus.textContent = 'Recording error';
  }
}

function stopFallbackRecording() {
  if (!mediaRecorder || !isRecording) return;

  if (recordingTimeout) {
    clearTimeout(recordingTimeout);
    recordingTimeout = null;
  }

  try {
    mediaRecorder.stop();
    isRecording = false;
    stopSpeakingBtn.style.display = 'none';
    console.log('[Voice] Recording stopped');
  } catch (error) {
    console.error('[Voice] Error stopping:', error);
  }
}

async function switchMode(mode: 'text' | 'voice') {
  if (currentMode === mode) return;

  currentMode = mode;

  if (mode === 'text') {
    textModeBtn.classList.add('active');
    voiceModeBtn.classList.remove('active');
    textModeControls.style.display = 'flex';
    voiceModeControls.style.display = 'none';

    isVoiceModeActive = false;
    isRecording = false;
    isProcessingAudio = false;

    if (vadInitialized) {
      pauseVAD();
    }



    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.error('[Voice] Error stopping recorder:', e);
      }
    }
    mediaRecorder = null;
    audioChunks = [];

    updateHeyGenStatus('Text mode active');
  } else {
    textModeBtn.classList.remove('active');
    voiceModeBtn.classList.add('active');
    textModeControls.style.display = 'none';
    voiceModeControls.style.display = 'block';

    if (avatar) {
      if (vadInitialized) {
        isVoiceModeActive = true;
        resumeVAD();
        voiceStatus.textContent = 'Listening...';
        updateHeyGenStatus('Voice mode active');
      } else if (useFallbackRecording) {
        await startVoiceChatFallback();
      } else {
        await startVoiceChatWithVAD();
      }
    }
  }
}

async function stopAvatarSession() {
  try {
    isVoiceModeActive = false;
    isRecording = false;
    isProcessingAudio = false;

    destroyVAD();
    vadInitialized = false;



    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.error('[Voice] Error stopping recorder:', e);
      }
    }
    mediaRecorder = null;
    audioChunks = [];

    if (avatar) {
      await avatar.stopAvatar();
      heygenVideo.srcObject = null;
    }

    avatar = null;
    sessionData = null;

    updateHeyGenStatus('Session ended');
    heygenSessionInfo.textContent = '';

    heygenStartBtn.disabled = false;
    heygenStopBtn.disabled = true;
    sendBtn.disabled = true;
    voiceModeBtn.disabled = true;

    if (currentMode === 'voice') {
      switchMode('text');
    }

  } catch (error) {
    console.error('[HeyGen] Error stopping session:', error);
  }
}

heygenStartBtn.addEventListener('click', initializeAvatarSession)
heygenStopBtn.addEventListener('click', stopAvatarSession)

textModeBtn.addEventListener('click', () => switchMode('text'))
voiceModeBtn.addEventListener('click', () => switchMode('voice'))

sendBtn.addEventListener('click', handleSpeak)
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !sendBtn.disabled) {
    handleSpeak()
  }
})

stopSpeakingBtn.addEventListener('click', () => {
  if (vadInitialized) {
    pauseVAD();
    isRecording = false;
    stopSpeakingBtn.style.display = 'none';
  } else {
    stopFallbackRecording();
  }
})

window.addEventListener('beforeunload', () => {
  destroyVAD();
  if (avatar) {
    avatar.stopAvatar();
  }
});

