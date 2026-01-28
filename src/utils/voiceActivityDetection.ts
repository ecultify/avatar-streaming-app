export interface VADCallbacks {
  onSpeechStart: () => void;
  onSpeechEnd: (audioBlob: Blob) => void;
  onVADMisfire?: () => void;
}

let vadInstance: any = null;
let rnnoiseInitialized = false;

const ONNX_RUNTIME_VERSION = "1.22.0";
const VAD_VERSION = "0.0.29";

// RNNoise module and state
let rnnoiseModule: any = null;
let rnnoiseState: any = null;

async function initializeRNNoise(): Promise<boolean> {
  if (rnnoiseInitialized) return true;

  try {
    const rnnoise = await import('@jitsi/rnnoise-wasm');
    rnnoiseModule = await rnnoise.default();
    rnnoiseState = rnnoiseModule.newState();
    rnnoiseInitialized = true;
    console.log('[RNNoise] Initialized successfully');
    return true;
  } catch (error) {
    console.warn('[RNNoise] Failed to initialize, continuing without noise suppression:', error);
    return false;
  }
}

function applyNoiseSuppression(audioData: Float32Array): Float32Array {
  if (!rnnoiseInitialized || !rnnoiseModule || !rnnoiseState) {
    return audioData; // Return original if RNNoise not available
  }

  try {
    const FRAME_SIZE = 480; // RNNoise expects 480 samples (10ms at 48kHz)
    const outputData = new Float32Array(audioData.length);
    const frameBuffer = new Float32Array(FRAME_SIZE);

    for (let i = 0; i < audioData.length; i += FRAME_SIZE) {
      const remaining = Math.min(FRAME_SIZE, audioData.length - i);

      frameBuffer.fill(0);
      for (let j = 0; j < remaining; j++) {
        // RNNoise expects samples in range [-32768, 32767]
        frameBuffer[j] = audioData[i + j] * 32767;
      }

      // Process through RNNoise
      rnnoiseModule.pipe(rnnoiseState, frameBuffer);

      // Copy back, normalized
      for (let j = 0; j < remaining; j++) {
        outputData[i + j] = frameBuffer[j] / 32767;
      }
    }

    console.log('[RNNoise] Applied noise suppression to audio');
    return outputData;
  } catch (error) {
    console.warn('[RNNoise] Error processing audio:', error);
    return audioData;
  }
}

export async function initializeVAD(callbacks: VADCallbacks): Promise<any> {
  console.log("[VAD] Initializing with CDN...");

  // Initialize RNNoise in parallel
  initializeRNNoise();

  try {
    const { MicVAD } = await import("@ricky0123/vad-web");

    vadInstance = await MicVAD.new({
      onnxWASMBasePath: `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ONNX_RUNTIME_VERSION}/dist/`,
      baseAssetPath: `https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@${VAD_VERSION}/dist/`,

      onSpeechStart: () => {
        console.log("[VAD] Speech detected - listening...");
        callbacks.onSpeechStart();
      },

      onSpeechEnd: (audio: Float32Array) => {
        console.log("[VAD] Speech ended - processing audio...");

        // Apply noise suppression before converting to WAV
        const denoisedAudio = applyNoiseSuppression(audio);
        const wavBlob = float32ArrayToWav(denoisedAudio, 16000);
        callbacks.onSpeechEnd(wavBlob);
      },

      onVADMisfire: () => {
        console.log("[VAD] Noise filtered (misfire)");
        callbacks.onVADMisfire?.();
      },

      // VAD Configuration - tuned to let users finish speaking
      positiveSpeechThreshold: 0.75,    // Slightly lower - easier to detect speech start
      negativeSpeechThreshold: 0.25,   // Lower - wait longer before considering silence
      minSpeechMs: 400,                 // Minimum speech duration to process
      preSpeechPadMs: 500,              // Audio to include before speech detected
      redemptionMs: 1500,               // Wait 1.5s after speech pause before ending (up from 800)
    });

    console.log("[VAD] Initialized successfully!");
    return vadInstance;

  } catch (error) {
    console.error("[VAD] Initialization failed:", error);
    throw error;
  }
}

export function startVAD(): void {
  if (vadInstance) {
    vadInstance.start();
    console.log("[VAD] Started listening");
  } else {
    console.warn("[VAD] Cannot start - not initialized");
  }
}

export function pauseVAD(): void {
  if (vadInstance) {
    vadInstance.pause();
    console.log("[VAD] Paused");
  }
}

export function resumeVAD(): void {
  if (vadInstance) {
    vadInstance.start();
    console.log("[VAD] Resumed");
  }
}

export function destroyVAD(): void {
  if (vadInstance) {
    vadInstance.pause();
    vadInstance = null;
    console.log("[VAD] Destroyed");
  }

  // Cleanup RNNoise
  if (rnnoiseState && rnnoiseModule) {
    try {
      rnnoiseModule.deleteState(rnnoiseState);
    } catch (e) { /* ignore */ }
    rnnoiseState = null;
    rnnoiseModule = null;
    rnnoiseInitialized = false;
    console.log("[RNNoise] Destroyed");
  }
}

export function isVADActive(): boolean {
  return vadInstance !== null;
}

function float32ArrayToWav(audioData: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioData.length * bytesPerSample;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const offset = headerSize;
  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset + i * bytesPerSample, intSample, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
