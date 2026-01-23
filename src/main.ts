import './style.css'
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
} from '@heygen/streaming-avatar'
import { OpenAIAssistant } from './openai-assistant'

const HEYGEN_API_TOKEN = import.meta.env.VITE_HEYGEN_API_KEY || '';
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const DID_API_KEY = import.meta.env.VITE_DID_API_KEY || '';

interface DIDTalkResponse {
  id: string;
  result_url?: string;
  status: string;
}

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>AI Avatar Assistant</h1>
    
    <div class="platform-selector">
      <button id="heygenTab" class="tab-btn active">HeyGen + OpenAI</button>
      <button id="didTab" class="tab-btn">D-ID Avatar</button>
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
      
      <!-- D-ID Section -->
      <div id="didSection" class="avatar-section">
        <div class="section-header">
          <h2>D-ID Avatar</h2>
          <div class="controls">
            <button id="didStartBtn" type="button">Generate Video</button>
          </div>
        </div>
        <div class="video-container">
          <video id="didVideo" controls playsinline></video>
          <div id="didPlaceholder" class="placeholder">
            <div class="placeholder-content">
              <p>Enter text below and click "Generate Video"</p>
              <input type="text" id="didTextInput" placeholder="Enter text for avatar to speak..." value="Hello, I am a D-ID avatar!" />
            </div>
          </div>
        </div>
        <div class="info">
          <p id="didStatus">Ready</p>
          <p id="didSessionInfo"></p>
        </div>
      </div>
    </div>
  </div>
`

let avatar: StreamingAvatar | null = null
let openaiAssistant: OpenAIAssistant | null = null
let sessionData: any = null
let currentMode: 'text' | 'voice' = 'text'
let didPollingInterval: number | null = null

const heygenTab = document.querySelector<HTMLButtonElement>('#heygenTab')!
const didTab = document.querySelector<HTMLButtonElement>('#didTab')!

const heygenSection = document.querySelector<HTMLDivElement>('#heygenSection')!
const didSection = document.querySelector<HTMLDivElement>('#didSection')!

const heygenStartBtn = document.querySelector<HTMLButtonElement>('#heygenStartBtn')!
const heygenStopBtn = document.querySelector<HTMLButtonElement>('#heygenStopBtn')!
const heygenVideo = document.querySelector<HTMLVideoElement>('#heygenVideo')!
const heygenStatus = document.querySelector<HTMLParagraphElement>('#heygenStatus')!
const heygenSessionInfo = document.querySelector<HTMLParagraphElement>('#heygenSessionInfo')!

const textModeBtn = document.querySelector<HTMLButtonElement>('#textModeBtn')!
const voiceModeBtn = document.querySelector<HTMLButtonElement>('#voiceModeBtn')!
const textModeControls = document.querySelector<HTMLDivElement>('#textModeControls')!
const voiceModeControls = document.querySelector<HTMLDivElement>('#voiceModeControls')!
const voiceStatus = document.querySelector<HTMLSpanElement>('#voiceStatus')!
const stopSpeakingBtn = document.querySelector<HTMLButtonElement>('#stopSpeakingBtn')!

const chatInput = document.querySelector<HTMLInputElement>('#chatInput')!
const sendBtn = document.querySelector<HTMLButtonElement>('#sendBtn')!

const didStartBtn = document.querySelector<HTMLButtonElement>('#didStartBtn')!
const didVideo = document.querySelector<HTMLVideoElement>('#didVideo')!
const didPlaceholder = document.querySelector<HTMLDivElement>('#didPlaceholder')!
const didTextInput = document.querySelector<HTMLInputElement>('#didTextInput')!
const didStatus = document.querySelector<HTMLParagraphElement>('#didStatus')!
const didSessionInfo = document.querySelector<HTMLParagraphElement>('#didSessionInfo')!

function switchView(view: 'heygen' | 'did') {
  heygenTab.classList.remove('active')
  didTab.classList.remove('active')
  heygenSection.classList.remove('active')
  didSection.classList.remove('active')
  
  if (view === 'heygen') {
    heygenTab.classList.add('active')
    heygenSection.classList.add('active')
  } else {
    didTab.classList.add('active')
    didSection.classList.add('active')
  }
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

async function initializeAvatarSession() {
  heygenStartBtn.disabled = true
  updateHeyGenStatus('Creating session...')

  try {
    const token = await fetchAccessToken()
    avatar = new StreamingAvatar({ token })

    if (OPENAI_API_KEY) {
      updateHeyGenStatus('Initializing AI assistant...')
      openaiAssistant = new OpenAIAssistant(OPENAI_API_KEY)
      await openaiAssistant.initialize()
      console.log('[HeyGen] OpenAI Assistant initialized')
    }

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
      voiceStatus.textContent = 'Waiting for you to speak...'
      isAvatarSpeaking = false
    })

    updateHeyGenStatus('Starting avatar...')
    sessionData = await avatar.createStartAvatar({
      quality: AvatarQuality.High,
      avatarName: 'Marianne_Chair_Sitting_public',
      voice: {
        voiceId: '2d5b0e6cf36f460aa7fc47e3eee4ba54'
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
  if (avatar && openaiAssistant && chatInput.value) {
    const userMessage = chatInput.value
    chatInput.value = ''
    sendBtn.disabled = true
    
    try {
      updateHeyGenStatus('Getting AI response...')
      const response = await openaiAssistant.processWithBackend(userMessage)
      console.log('[HeyGen] OpenAI response:', response)
      
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
      sendBtn.disabled = false
    }
  } else if (!openaiAssistant) {
    updateHeyGenStatus('OpenAI not configured')
  }
}

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let isVoiceModeActive = false
let isRecording = false
let isAvatarSpeaking = false
let isProcessingAudio = false

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

async function startVoiceChat() {
  if (!avatar || !openaiAssistant) return
  
  try {
    updateHeyGenStatus('Starting voice mode...')
    
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 16000
      } 
    })
    
    isVoiceModeActive = true
    audioChunks = []
    
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    })
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }
    
    mediaRecorder.onstop = async () => {
      if (!isVoiceModeActive || isAvatarSpeaking || isProcessingAudio) {
        audioChunks = []
        return
      }
      
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      audioChunks = []
      
      if (audioBlob.size < MIN_AUDIO_SIZE) {
        console.log('[Voice] Audio too short, skipping');
        voiceStatus.textContent = 'Listening... (speak clearly)'
        if (isVoiceModeActive && !isAvatarSpeaking) {
          setTimeout(() => startRecording(), 300)
        }
        return
      }

      isProcessingAudio = true
      voiceStatus.textContent = 'Transcribing...'
      updateHeyGenStatus('Transcribing with Whisper...')
      
      try {
        const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' })
        
        console.log('[Voice] Sending audio to Whisper, size:', audioBlob.size)
        const formData = new FormData()
        formData.append('file', audioFile)
        formData.append('model', 'whisper-1')
        formData.append('language', 'en')
        
        const transcription = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
          body: formData
        })
        
        if (!transcription.ok) {
          throw new Error(`Whisper API error: ${transcription.status}`)
        }
        
        const result = await transcription.json()
        const transcript = result.text
        
        console.log('[Voice] Whisper transcript:', transcript)
        
        if (!isValidTranscript(transcript)) {
          voiceStatus.textContent = 'No clear speech - try again'
          updateHeyGenStatus('Voice mode active - Speak now')
          isProcessingAudio = false
          
          if (isVoiceModeActive && !isAvatarSpeaking) {
            setTimeout(() => startRecording(), 500)
          }
          return
        }
        
        voiceStatus.textContent = 'Getting AI response...'
        updateHeyGenStatus('Processing...')
        
        const response = await openaiAssistant!.processWithBackend(transcript)
        console.log('[Voice] AI response:', response)
        
        if (!avatar || !isVoiceModeActive) {
          console.log('[Voice] Session ended, stopping voice mode')
          isProcessingAudio = false
          return
        }
        
        voiceStatus.textContent = 'Avatar speaking...'
        isAvatarSpeaking = true
        await avatar.speak({
          text: response,
          taskType: TaskType.REPEAT
        })
        isAvatarSpeaking = false
        
        voiceStatus.textContent = 'Listening...'
        updateHeyGenStatus('Voice mode active - Speak now')
        isProcessingAudio = false
        
        if (isVoiceModeActive) {
          setTimeout(() => startRecording(), 500)
        }
        
      } catch (error) {
        console.error('[Voice] Error processing audio:', error)
        voiceStatus.textContent = 'Error - Try again'
        updateHeyGenStatus('Voice error')
        isProcessingAudio = false
        isAvatarSpeaking = false
        
        if (isVoiceModeActive) {
          setTimeout(() => startRecording(), 1000)
        }
      }
    }
    
    voiceStatus.textContent = 'Listening...'
    updateHeyGenStatus('Voice mode active - Speak now')
    console.log('[Voice] Voice mode started')
    
    startRecording()
    
  } catch (error) {
    console.error('[Voice] Error starting voice mode:', error)
    
    if ((error as any).name === 'NotAllowedError') {
      voiceStatus.textContent = 'Microphone access denied'
      updateHeyGenStatus('Please allow microphone access')
      alert('Microphone access is required for voice mode.')
    } else {
      voiceStatus.textContent = 'Error starting voice mode'
      updateHeyGenStatus('Voice mode error')
    }
    
    isVoiceModeActive = false
  }
}

let recordingTimeout: number | null = null

function startRecording() {
  if (!mediaRecorder || !isVoiceModeActive || isAvatarSpeaking || isProcessingAudio) return
  
  try {
    audioChunks = []
    isRecording = true
    mediaRecorder.start()
    
    voiceStatus.textContent = 'Listening... (speak now)'
    stopSpeakingBtn.style.display = 'block'
    console.log('[Voice] Recording started')
    
    if (recordingTimeout) {
      clearTimeout(recordingTimeout)
    }

    recordingTimeout = window.setTimeout(() => {
      if (isRecording && mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording()
      }
    }, 8000)
    
  } catch (error) {
    console.error('[Voice] Error starting recording:', error)
    voiceStatus.textContent = 'Recording error'
  }
}

function stopRecording() {
  if (!mediaRecorder || !isRecording) return
  
  if (recordingTimeout) {
    clearTimeout(recordingTimeout)
    recordingTimeout = null
  }

  try {
    mediaRecorder.stop()
    isRecording = false
    stopSpeakingBtn.style.display = 'none'
    console.log('[Voice] Recording stopped')
  } catch (error) {
    console.error('[Voice] Error stopping recording:', error)
  }
}

async function switchMode(mode: 'text' | 'voice') {
  if (currentMode === mode) return
  
  currentMode = mode
  
  if (mode === 'text') {
    textModeBtn.classList.add('active')
    voiceModeBtn.classList.remove('active')
    textModeControls.style.display = 'flex'
    voiceModeControls.style.display = 'none'
    
    isVoiceModeActive = false
    isRecording = false
    isProcessingAudio = false
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop()
        mediaRecorder.stream.getTracks().forEach(track => track.stop())
      } catch (e) {
        console.error('[Voice] Error stopping recorder:', e)
      }
    }
    mediaRecorder = null
    audioChunks = []
    
    updateHeyGenStatus('Text mode active')
  } else {
    textModeBtn.classList.remove('active')
    voiceModeBtn.classList.add('active')
    textModeControls.style.display = 'none'
    voiceModeControls.style.display = 'block'
    
    if (avatar) {
      await startVoiceChat()
    }
  }
}

async function stopAvatarSession() {
  try {
    isVoiceModeActive = false
    isRecording = false
    isProcessingAudio = false
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop()
        mediaRecorder.stream.getTracks().forEach(track => track.stop())
      } catch (e) {
        console.error('[Voice] Error stopping recorder:', e)
      }
    }
    mediaRecorder = null
    audioChunks = []
    
    if (avatar) {
      await avatar.stopAvatar()
      heygenVideo.srcObject = null
    }
    
    avatar = null
    openaiAssistant = null
    sessionData = null
    
    updateHeyGenStatus('Session ended')
    heygenSessionInfo.textContent = ''
    
    heygenStartBtn.disabled = false
    heygenStopBtn.disabled = true
    sendBtn.disabled = true
    voiceModeBtn.disabled = true
    
    if (currentMode === 'voice') {
      switchMode('text')
    }
    
  } catch (error) {
    console.error('[HeyGen] Error stopping session:', error)
  }
}

function updateDIDStatus(message: string) {
  console.log('[D-ID]', message)
  didStatus.textContent = message
}

async function createDIDTalk(text: string): Promise<string> {
  updateDIDStatus('Creating talk...')
  
  const requestData = {
    script: {
      type: 'text',
      input: text,
      provider: {
        type: 'microsoft',
        voice_id: 'en-US-JennyNeural'
      }
    },
    config: {
      stitch: true
    },
    source_url: 'https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.png'
  }
  
  console.log('[D-ID] Creating talk with text:', text)
  
    const response = await fetch('https://api.d-id.com/talks', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(DID_API_KEY)}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[D-ID] API Error:', errorText)
    throw new Error(`Failed to create D-ID talk: ${response.statusText}`)
  }
  
  const data: DIDTalkResponse = await response.json()
  console.log('[D-ID] Talk created:', data)
  
  return data.id
}

async function pollDIDTalkStatus(talkId: string): Promise<void> {
  updateDIDStatus('Generating video...')
  didSessionInfo.textContent = `Talk ID: ${talkId}`
  
  const checkStatus = async () => {
      try {
        const response = await fetch(`https://api.d-id.com/talks/${talkId}`, {
          headers: {
            'Authorization': `Basic ${btoa(DID_API_KEY)}`
          }
        })
      
      if (!response.ok) {
        throw new Error('Failed to check talk status')
      }
      
      const data: DIDTalkResponse = await response.json()
      console.log('[D-ID] Talk status:', data.status)
      
      if (data.status === 'done' && data.result_url) {
        if (didPollingInterval) {
          clearInterval(didPollingInterval)
          didPollingInterval = null
        }
        
        console.log('[D-ID] Video ready:', data.result_url)
        didVideo.src = data.result_url
        didVideo.style.display = 'block'
        didPlaceholder.style.display = 'none'
        updateDIDStatus('Video ready - Click play')
        didSessionInfo.textContent = 'Video generated successfully'
        didStartBtn.disabled = false
        
      } else if (data.status === 'error' || data.status === 'rejected') {
        if (didPollingInterval) {
          clearInterval(didPollingInterval)
          didPollingInterval = null
        }
        updateDIDStatus(`Error: ${data.status}`)
        didStartBtn.disabled = false
      } else {
        updateDIDStatus(`Generating (${data.status})...`)
      }
    } catch (error) {
      console.error('[D-ID] Error checking status:', error)
      if (didPollingInterval) {
        clearInterval(didPollingInterval)
        didPollingInterval = null
      }
      updateDIDStatus('Error checking status')
      didStartBtn.disabled = false
    }
  }
  
  await checkStatus()
  didPollingInterval = window.setInterval(checkStatus, 2000)
}

async function startDIDVideo() {
  const text = didTextInput.value.trim()
  
  if (!text) {
    updateDIDStatus('Please enter text first')
    return
  }
  
  try {
    didStartBtn.disabled = true
    didVideo.style.display = 'none'
    didPlaceholder.style.display = 'flex'
    
    const talkId = await createDIDTalk(text)
    await pollDIDTalkStatus(talkId)
    
  } catch (error) {
    console.error('[D-ID] Error:', error)
    updateDIDStatus(`Error: ${error}`)
    didStartBtn.disabled = false
  }
}

heygenTab.addEventListener('click', () => switchView('heygen'))
didTab.addEventListener('click', () => switchView('did'))

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

stopSpeakingBtn.addEventListener('click', stopRecording)

didStartBtn.addEventListener('click', startDIDVideo)
