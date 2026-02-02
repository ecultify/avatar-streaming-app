import './style.css'
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
} from '@heygen/streaming-avatar'
import DailyIframe from '@daily-co/daily-js';
import { initializeVAD, startVAD, pauseVAD, resumeVAD, destroyVAD } from './utils/voiceActivityDetection'
import { API_CONFIG, AVATAR_CONFIG, CONVAI_CONFIG } from './config'
import { ConvaiClient } from 'convai-web-sdk';
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
    
    <div class="platform-selector">
        <button id="tabHeyGen" class="tab-btn active">HeyGen</button>
        <button id="tabTavus" class="tab-btn">Tavus</button>
        <button id="tabConvai" class="tab-btn">Convai</button>
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
          <button id="pttBtn" type="button" class="ptt-button">Hold to Talk</button>
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
            <button id="tavusPttBtn" type="button" class="ptt-button" style="display: none;">🎤 Hold to Talk</button>
        </div>
      </div>

      <!-- Convai Section -->
      <div id="convaiSection" class="avatar-section" style="display: none;">
        <div class="section-header">
            <h2>Convai Character</h2>
            <div class="controls">
                <button id="convaiStartBtn" type="button">Start Session</button>
                <button id="convaiStopBtn" type="button" disabled>End Session</button>
            </div>
        </div>
        <div id="convaiContainer" class="video-container" style="background: #000; min-height: 400px; display: flex; align-items: center; justify-content: center;">
            <p id="convaiPlaceholder" style="color: #666;">Click Start to connect...</p>
        </div>
        <div class="info">
            <p id="convaiStatus">Ready to connect</p>
            <button id="convaiPttBtn" type="button" class="ptt-button" style="display: none;">Hold to Talk</button>
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
const convaiSection = document.getElementById('convaiSection') as HTMLDivElement;

const tabHeyGen = document.getElementById('tabHeyGen') as HTMLButtonElement;
const tabTavus = document.getElementById('tabTavus') as HTMLButtonElement;
const tabConvai = document.getElementById('tabConvai') as HTMLButtonElement;

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
const pttBtn = document.querySelector<HTMLButtonElement>('#pttBtn')!
const tavusPttBtn = document.getElementById('tavusPttBtn') as HTMLButtonElement;
const convaiPttBtn = document.getElementById('convaiPttBtn') as HTMLButtonElement;
const convaiStartBtn = document.getElementById('convaiStartBtn') as HTMLButtonElement;
const convaiStopBtn = document.getElementById('convaiStopBtn') as HTMLButtonElement;
const convaiStatus = document.getElementById('convaiStatus') as HTMLParagraphElement;
const convaiContainer = document.getElementById('convaiContainer') as HTMLDivElement;

// Interrupt keywords for HeyGen TTS
const INTERRUPT_KEYWORDS = ['hello', 'hi', 'hey', 'stop', 'wait', 'excuse me', 'hold on', 'one moment'];
let isPttActive = false;

// --- Tab Switching Logic ---
async function switchTab(platform: 'heygen' | 'tavus' | 'convai') {
  // 1. Update Buttons
  tabHeyGen.classList.toggle('active', platform === 'heygen');
  tabTavus.classList.toggle('active', platform === 'tavus');
  tabConvai.classList.toggle('active', platform === 'convai');

  // 2. Hide all sections
  heygenSection.style.display = 'none';
  tavusSection.style.display = 'none';
  convaiSection.style.display = 'none';

  // 3. Cleanup existing sessions
  await stopAvatarSession(); // HeyGen

  if (callFrame) { // Tavus
    await callFrame.leave();
    callFrame.destroy();
    callFrame = null;
    tavusContainer.innerHTML = '<p id="tavusPlaceholder" style="color: #666;">Click Start to connect...</p>';
    tavusStartBtn.disabled = false;
    tavusStopBtn.disabled = true;
  }

  if (convaiClient) { // Convai
    await endConvaiSession();
  }

  // 4. Show selected section
  if (platform === 'heygen') {
    heygenSection.style.display = 'block';
  } else if (platform === 'tavus') {
    tavusSection.style.display = 'block';
  } else if (platform === 'convai') {
    convaiSection.style.display = 'block';
  }
}

tabHeyGen.addEventListener('click', () => switchTab('heygen'));
tabTavus.addEventListener('click', () => switchTab('tavus'));
tabConvai.addEventListener('click', () => switchTab('convai'));

// --- Convai Logic ---
let convaiClient: ConvaiClient | null = null;
let convaiIsTalking = false;

convaiStartBtn.addEventListener('click', async () => {
  console.log('[Convai] Start button clicked');
  convaiStartBtn.disabled = true;
  convaiStatus.textContent = 'Initializing Convai...';

  // Check Config
  console.log('[Convai] Config:', CONVAI_CONFIG);
  if (!CONVAI_CONFIG.API_KEY || !CONVAI_CONFIG.CHARACTER_ID) {
    alert('Missing Convai API Key or Character ID in .env');
    convaiStatus.textContent = 'Error: Missing Credentials';
    convaiStartBtn.disabled = false;
    return;
  }

  try {
    console.log('[Convai] Creating client...');
    convaiClient = new ConvaiClient({
      apiKey: CONVAI_CONFIG.API_KEY,
      characterId: CONVAI_CONFIG.CHARACTER_ID,
      enableAudio: true,
    });
    console.log('[Convai] Client created');

    convaiClient.setResponseCallback((response: any) => {
      // console.log('[Convai] Response:', response);
      if (response.hasUserQuery()) {
        const transcript = response.getUserQuery().getTextData();
        if (response.getUserQuery().getIsFinal()) {
          console.log('[Convai] User:', transcript);
        }
      }
      if (response.hasAudioResponse()) {
        const audioResponse = response.getAudioResponse();
        /*
        if (audioResponse) {
           console.log('[Convai] Audio response received');
        }
        */
      }
    });

    // Handle talking state for PTT interruption if needed
    convaiClient.onAudioPlay(() => {
      console.log('[Convai] Audio Play');
      convaiIsTalking = true;
      convaiStatus.textContent = 'Character speaking...';
    });

    convaiClient.onAudioStop(() => {
      console.log('[Convai] Audio Stop');
      convaiIsTalking = false;
      convaiStatus.textContent = 'Connected - Hold button to speak';
    });

    console.log('[Convai] Starting audio chunk...');
    await convaiClient.startAudioChunk();
    console.log('[Convai] Audio chunk started');

    convaiStatus.textContent = 'Connected - Hold button to speak';
    convaiStopBtn.disabled = false;
    convaiPttBtn.style.display = 'block';

    // Setup Placeholder Video (Convai is currently audio-focused in basic SDK, 
    // unless using Unity/Unreal. For Web SDK text/audio, we might just show a static image or visualization.
    // If they support a web avatar viewer, we'd embed it here. 
    // For now, let's just make it clear it's active.)
    convaiContainer.innerHTML = '<div style="text-align:center; color: white;"><h2>🎙️</h2><p>Convai Session Active</p></div>';

  } catch (err: any) {
    console.error('[Convai] Error:', err);
    convaiStatus.textContent = 'Error: ' + err.message;
    convaiStartBtn.disabled = false;
    alert('Convai Error: ' + err.message);
  }
});

async function endConvaiSession() {
  if (convaiClient) {
    try {
      convaiClient.endAudioChunk(); // Correct method? check docs usually. 
      // The SDK might just need setting to null or specific stop.
      // convai-web-sdk usually has .end() or similar? 
      // Looking at standard usage: just stop sending audio and maybe reset.
    } catch (e) {
      console.warn('[Convai] Error stopping', e);
    }
    convaiClient = null;
  }
  convaiStatus.textContent = 'Session ended';
  convaiStopBtn.disabled = true;
  convaiStartBtn.disabled = false;
  convaiPttBtn.style.display = 'none';
  convaiContainer.innerHTML = '<p id="convaiPlaceholder" style="color: #666;">Click Start to connect...</p>';
}

convaiStopBtn.addEventListener('click', endConvaiSession);

// Convai PTT Logic
function startConvaiPtt() {
  if (!convaiClient) return;
  try {
    convaiClient.startAudioChunk(); // Signals start of user speech
    convaiPttBtn.textContent = 'Recording...';
    convaiPttBtn.classList.add('recording');
    // Convai usually handles mic input automatically when set up?
    // Actually, with `enableAudio: true`, it might be always listening or VAD?
    // If "Hold to Talk", we might need to manually toggle microphone processing.
    // Ideally, we use `startAudioChunk` (renamed often in newer SDKs to `startRecording` or similar).
    // Let's assume `toggleAudioVolume` or specific mic controls.
    // For standard "Chat" PTT, we often just start the mic.
  } catch (e) { console.error(e) }
}

function stopConvaiPtt() {
  if (!convaiClient) return;
  try {
    convaiClient.endAudioChunk(); // Signals end of speech / process now
    convaiPttBtn.textContent = 'Hold to Talk';
    convaiPttBtn.classList.remove('recording');
  } catch (e) { console.error(e) }
}

convaiPttBtn.addEventListener('mousedown', startConvaiPtt);
convaiPttBtn.addEventListener('mouseup', stopConvaiPtt);
convaiPttBtn.addEventListener('mouseleave', () => stopConvaiPtt());
convaiPttBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startConvaiPtt(); });
convaiPttBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopConvaiPtt(); });

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

    callFrame = DailyIframe.createCallObject({
      videoSource: false, // Disable user's camera completely
      audioSource: true,  // Keep microphone enabled
      dailyConfig: {
        experimentalChromeVideoMuteLightOff: true
      } as any
    });

    // Custom UI Elements
    tavusContainer.style.position = 'relative';
    tavusContainer.style.overflow = 'hidden';

    // 1. Avatar Video Element
    const videoEl = document.createElement('video');
    videoEl.style.width = '100%';
    videoEl.style.height = '100%';
    videoEl.style.objectFit = 'cover';
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    tavusContainer.appendChild(videoEl);

    // 2. Avatar Audio Element
    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    tavusContainer.appendChild(audioEl);

    // 2. Mute Button Overlay
    const muteBtn = document.createElement('button');
    muteBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    `;
    muteBtn.style.position = 'absolute';
    muteBtn.style.bottom = '20px';
    muteBtn.style.left = '50%';
    muteBtn.style.transform = 'translateX(-50%)';
    muteBtn.style.width = '56px';
    muteBtn.style.height = '56px';
    muteBtn.style.borderRadius = '50%';
    muteBtn.style.border = 'none';
    muteBtn.style.backgroundColor = 'rgba(255,255,255,0.2)';
    muteBtn.style.color = 'white';
    muteBtn.style.cursor = 'pointer';
    muteBtn.style.display = 'flex';
    muteBtn.style.alignItems = 'center';
    muteBtn.style.justifyContent = 'center';
    muteBtn.style.backdropFilter = 'blur(10px)';
    tavusContainer.appendChild(muteBtn);

    let isMuted = false;
    muteBtn.onclick = () => {
      isMuted = !isMuted;
      callFrame.setLocalAudio(!isMuted);
      muteBtn.style.backgroundColor = isMuted ? '#ef4444' : 'rgba(255,255,255,0.2)';
      muteBtn.innerHTML = isMuted ? `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      ` : `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      `;
    };

    // Track Handling
    let currentAudioTrackId: string | null = null;

    const handleVideoTrack = (track: MediaStreamTrack) => {
      console.log('[Tavus] Video track received');
      videoEl.srcObject = new MediaStream([track]);
    };

    const handleAudioTrack = (track: MediaStreamTrack) => {
      // Prevent duplicate handling of the same track
      if (currentAudioTrackId === track.id) {
        console.log('[Tavus] Same audio track, skipping');
        return;
      }
      currentAudioTrackId = track.id;

      console.log('[Tavus] Audio track received:', track.id);
      audioEl.srcObject = new MediaStream([track]);

      // Small delay to allow previous play() to settle
      setTimeout(() => {
        audioEl.play().catch(e => {
          // Only log if it's not an abort error (which is expected during rapid updates)
          if (e.name !== 'AbortError') {
            console.error('[Tavus] Audio play failed', e);
          }
        });
      }, 100);
    };

    callFrame.on('participant-joined', (e: any) => {
      if (!e.participant.local) {
        if (e.participant.tracks?.video?.track) handleVideoTrack(e.participant.tracks.video.track);
        if (e.participant.tracks?.audio?.track) handleAudioTrack(e.participant.tracks.audio.track);
      }
    });

    callFrame.on('participant-updated', (e: any) => {
      if (!e.participant.local) {
        if (e.participant.tracks?.video?.track) handleVideoTrack(e.participant.tracks.video.track);
        if (e.participant.tracks?.audio?.track) handleAudioTrack(e.participant.tracks.audio.track);
      }
    });

    callFrame.on('track-started', (e: any) => {
      if (!e.participant?.local) {
        if (e.track.kind === 'video') handleVideoTrack(e.track);
        if (e.track.kind === 'audio') handleAudioTrack(e.track);
      }
    });

    // Event Listeners for Tool Calls
    callFrame.on('app-message', async (e: any) => {
      console.log('[Tavus] App Event:', e);
      const msg = e.data;

      // Handle Tavus tool call events (event_type: conversation.tool_call)
      if (msg?.event_type === 'conversation.tool_call') {
        const toolName = msg?.properties?.name;
        const argsRaw = msg?.properties?.arguments;

        console.log('[Tavus] Tool Call Detected:', toolName, argsRaw);

        if (toolName === 'web_search') {
          try {
            // Parse arguments (Tavus sends as JSON string)
            const args = typeof argsRaw === 'string' ? JSON.parse(argsRaw) : argsRaw;
            console.log('[Tavus] Web Search Query:', args?.query);

            const searchRes = await fetch(`${API_CONFIG.BACKEND_URL}/api/web-search`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: args?.query })
            });
            const searchData = await searchRes.json();
            const resultText = searchData.response || "I couldn't find any results for that search.";

            // Send result back using conversation.echo (makes replica speak the result)
            callFrame.sendAppMessage({
              message_type: 'conversation',
              event_type: 'conversation.echo',
              conversation_id: msg?.conversation_id,
              properties: {
                text: resultText
              }
            });
            console.log('[Tavus] Sent echo response:', resultText.substring(0, 100) + '...');
          } catch (err) {
            console.error('[Tavus] Tool execution failed:', err);
            // Send error message as echo
            callFrame.sendAppMessage({
              message_type: 'conversation',
              event_type: 'conversation.echo',
              conversation_id: msg?.conversation_id,
              properties: {
                text: "I'm sorry, I had trouble searching for that information. Please try again."
              }
            });
          }
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
      startVideoOff: true
    });

    tavusStatus.textContent = 'Connected - Hold button to speak';
    tavusStopBtn.disabled = false;

    // Show PTT button and mute mic by default (PTT mode)
    // tavusPttBtn.style.display = 'block';
    // callFrame.setLocalAudio(false);

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

// Quick transcription for keyword interrupt detection (shorter timeout)
async function quickTranscribeForKeywords(audioBlob: Blob): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'interrupt.webm');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s max

    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/transcribe`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const data = await response.json();
    return data.text || null;
  } catch {
    return null; // Silent fail - just skip keyword check
  }
}


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

    // Unmute now that new stream is ready
    if (heygenVideo.muted) {
      heygenVideo.muted = false;
      console.log('[Voice] Unmuted video for new response');
    }

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
  } finally {
    // Ensure we unmute in case of error so we don't get stuck muted
    if (heygenVideo.muted) heygenVideo.muted = false;
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
          // For short audio during TTS, do quick keyword check
          if (audioBlob.size < MIN_INTERRUPT_AUDIO_SIZE) {
            // Try quick transcription to check for interrupt keywords
            try {
              const quickTranscript = await quickTranscribeForKeywords(audioBlob);
              if (quickTranscript && checkForInterruptKeyword(quickTranscript)) {
                console.log(`[VAD] Keyword interrupt detected: "${quickTranscript}"`);
                isAvatarSpeaking = false;
                // Continue to process the speech
              } else {
                console.log(`[VAD] Ignoring short sound during TTS (${audioBlob.size} bytes, ${speechDuration}ms)`);
                voiceStatus.textContent = 'Avatar speaking...';
                return;
              }
            } catch {
              console.log(`[VAD] Ignoring short sound during TTS (${audioBlob.size} bytes, ${speechDuration}ms)`);
              voiceStatus.textContent = 'Avatar speaking...';
              return;
            }
          } else {
            // Real interruption detected (substantial speech)
            console.log(`[VAD] Interrupting avatar! (${audioBlob.size} bytes, ${speechDuration}ms)`);
            isAvatarSpeaking = false;
          }
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

// --- HeyGen Push-to-Talk Implementation ---
let pttMediaRecorder: MediaRecorder | null = null;
let pttAudioChunks: Blob[] = [];
let pttStream: MediaStream | null = null;

async function startPttRecording() {
  if (!avatar || !isVoiceModeActive) return;

  try {
    if (!pttStream) {
      pttStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });
    }

    pttAudioChunks = [];
    pttMediaRecorder = new MediaRecorder(pttStream, { mimeType: 'audio/webm' });

    pttMediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) pttAudioChunks.push(e.data);
    };

    pttMediaRecorder.onstop = async () => {
      const audioBlob = new Blob(pttAudioChunks, { type: 'audio/webm' });
      if (audioBlob.size > 5000) {
        await processUserSpeech(audioBlob);
      }
    };

    pttMediaRecorder.start();
    isPttActive = true;
    pttBtn.textContent = 'Recording...';
    pttBtn.classList.add('recording');
    voiceStatus.textContent = 'Recording... (release to send)';

    // If avatar is speaking, interrupt it and pause VAD
    if (isAvatarSpeaking) {
      console.log('[PTT] Interrupting avatar...');
      // Mute immediately to ensure silence
      heygenVideo.muted = true;
      try {
        await (avatar as any).interrupt();
        console.log('[PTT] Interruption sent');
      } catch (e) {
        console.warn('[PTT] Failed to interrupt:', e);
      }
      isAvatarSpeaking = false;
      pauseVAD();
    }
  } catch (err) {
    console.error('[PTT] Failed to start:', err);
  }
}

function stopPttRecording() {
  if (pttMediaRecorder && pttMediaRecorder.state === 'recording') {
    pttMediaRecorder.stop();
  }
  isPttActive = false;
  pttBtn.textContent = 'Hold to Talk';
  pttBtn.classList.remove('recording');
  voiceStatus.textContent = 'Listening... (speak anytime)';

  // Unmute ensuring we hear the next response
  // heygenVideo.muted = false; // MOVED: Unmute only when new speech starts to avoid "tail" audio

  // Resume VAD if it was paused
  if (vadInitialized && isVoiceModeActive) {
    startVAD();
  }
}

// HeyGen PTT button events (mouse + touch)
pttBtn.addEventListener('mousedown', startPttRecording);
pttBtn.addEventListener('mouseup', stopPttRecording);
pttBtn.addEventListener('mouseleave', () => { if (isPttActive) stopPttRecording(); });
pttBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startPttRecording(); });
pttBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopPttRecording(); });

// --- Tavus Push-to-Talk Implementation ---
let tavusPttActive = false;

function startTavusPtt() {
  if (!callFrame) return;
  tavusPttActive = true;
  callFrame.setLocalAudio(true);
  tavusPttBtn.textContent = '🔴 Recording...';
  tavusPttBtn.classList.add('recording');
  tavusStatus.textContent = 'Recording... (release to send)';
}

function stopTavusPtt() {
  if (!callFrame) return;
  tavusPttActive = false;
  callFrame.setLocalAudio(false);
  tavusPttBtn.textContent = '🎤 Hold to Talk';
  tavusPttBtn.classList.remove('recording');
  tavusStatus.textContent = 'Connected - Hold button to speak';
}

// Tavus PTT button events
tavusPttBtn.addEventListener('mousedown', startTavusPtt);
tavusPttBtn.addEventListener('mouseup', stopTavusPtt);
tavusPttBtn.addEventListener('mouseleave', () => { if (tavusPttActive) stopTavusPtt(); });
tavusPttBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startTavusPtt(); });
tavusPttBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopTavusPtt(); });

// --- Keyword Interruption Check for HeyGen ---
function checkForInterruptKeyword(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();
  return INTERRUPT_KEYWORDS.some(kw => lower.includes(kw));
}
