export interface VADCallbacks {
  onSpeechStart: () => void;
  onSpeechEnd: (audioBlob: Blob) => void;
  onVADMisfire?: () => void;
}

let vadInstance: any = null;

const ONNX_RUNTIME_VERSION = "1.22.0";
const VAD_VERSION = "0.0.29";

export async function initializeVAD(callbacks: VADCallbacks): Promise<any> {
  console.log("[VAD] Initializing with CDN...");
  
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
        const wavBlob = float32ArrayToWav(audio, 16000);
        callbacks.onSpeechEnd(wavBlob);
      },
      
      onVADMisfire: () => {
        console.log("[VAD] Noise filtered (misfire)");
        callbacks.onVADMisfire?.();
      },
      
      positiveSpeechThreshold: 0.85,
      negativeSpeechThreshold: 0.35,
      minSpeechMs: 250,
      preSpeechPadMs: 500,
      redemptionMs: 300,
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
