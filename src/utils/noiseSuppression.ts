/**
 * RNNoise-based noise suppression for voice activity detection
 * Uses WebAssembly for real-time noise filtering
 */

let rnnoiseModule: any = null;
let rnnoiseState: any = null;
let isInitialized = false;

// RNNoise expects 480 samples at 48kHz (10ms frames)
const RNNOISE_SAMPLE_RATE = 48000;
const FRAME_SIZE = 480;

/**
 * Initialize the RNNoise noise suppression module
 */
export async function initializeNoiseSuppression(): Promise<boolean> {
    if (isInitialized) return true;

    try {
        // Dynamic import of RNNoise WASM
        const rnnoise = await import('@jitsi/rnnoise-wasm');
        rnnoiseModule = await rnnoise.default();

        // Create a new denoiser state
        rnnoiseState = rnnoiseModule.newState();
        isInitialized = true;

        console.log('[NoiseSuppression] RNNoise initialized successfully');
        return true;
    } catch (error) {
        console.error('[NoiseSuppression] Failed to initialize RNNoise:', error);
        return false;
    }
}

/**
 * Process audio data through RNNoise to remove background noise
 * @param audioData - Float32Array of audio samples (normalized -1 to 1)
 * @param sampleRate - Sample rate of the input audio
 * @returns Denoised audio data
 */
export function suppressNoise(audioData: Float32Array, sampleRate: number): Float32Array {
    if (!isInitialized || !rnnoiseModule || !rnnoiseState) {
        console.warn('[NoiseSuppression] Not initialized, returning original audio');
        return audioData;
    }

    try {
        // Resample if needed (RNNoise expects 48kHz)
        let processData = audioData;
        if (sampleRate !== RNNOISE_SAMPLE_RATE) {
            processData = resample(audioData, sampleRate, RNNOISE_SAMPLE_RATE);
        }

        // Process in 480-sample frames
        const outputData = new Float32Array(processData.length);
        const frameBuffer = new Float32Array(FRAME_SIZE);

        for (let i = 0; i < processData.length; i += FRAME_SIZE) {
            const remaining = Math.min(FRAME_SIZE, processData.length - i);

            // Copy frame data
            frameBuffer.fill(0);
            for (let j = 0; j < remaining; j++) {
                // RNNoise expects samples in range [-32768, 32767]
                frameBuffer[j] = processData[i + j] * 32767;
            }

            // Process through RNNoise
            rnnoiseModule.pipe(rnnoiseState, frameBuffer);

            // Copy back to output, normalized
            for (let j = 0; j < remaining; j++) {
                outputData[i + j] = frameBuffer[j] / 32767;
            }
        }

        // Resample back if we changed sample rate
        if (sampleRate !== RNNOISE_SAMPLE_RATE) {
            return resample(outputData, RNNOISE_SAMPLE_RATE, sampleRate);
        }

        return outputData;
    } catch (error) {
        console.error('[NoiseSuppression] Error processing audio:', error);
        return audioData;
    }
}

/**
 * Simple linear resampling
 */
function resample(data: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) return data;

    const ratio = fromRate / toRate;
    const newLength = Math.round(data.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
        const srcIndex = i * ratio;
        const srcIndexFloor = Math.floor(srcIndex);
        const srcIndexCeil = Math.min(srcIndexFloor + 1, data.length - 1);
        const t = srcIndex - srcIndexFloor;

        // Linear interpolation
        result[i] = data[srcIndexFloor] * (1 - t) + data[srcIndexCeil] * t;
    }

    return result;
}

/**
 * Clean up RNNoise resources
 */
export function destroyNoiseSuppression(): void {
    if (rnnoiseState && rnnoiseModule) {
        try {
            rnnoiseModule.deleteState(rnnoiseState);
        } catch (e) {
            // Ignore cleanup errors
        }
    }
    rnnoiseState = null;
    rnnoiseModule = null;
    isInitialized = false;
    console.log('[NoiseSuppression] RNNoise destroyed');
}

/**
 * Check if noise suppression is available
 */
export function isNoiseSuppressionAvailable(): boolean {
    return isInitialized;
}
