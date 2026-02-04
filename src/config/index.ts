export const MODELS = {
  CLASSIFIER: "gpt-4.1-nano",
  MAIN: "gpt-4.1-mini",
  SEARCH: "gpt-4.1",
};

export const AVATAR_CONFIG = {
  AVATAR_ID: import.meta.env.VITE_LIVEAVATAR_CHARACTER_ID || 'bf00036b-558a-44b5-b2ff-1e3cec0f4ceb',
  VOICE_ID: 'en-US-Neural2-A', // Default voice for LiveAvatar/Custom mode
  API_KEY: import.meta.env.VITE_LIVEAVATAR_API_KEY || '',
  BASE_PATH: 'https://api.liveavatar.com',
};

export const CONVAI_CONFIG = {
  API_KEY: import.meta.env.VITE_CONVAI_API_KEY || '',
  CHARACTER_ID: import.meta.env.VITE_CONVAI_CHARACTER_ID || '',
};

export const VAD_CONFIG = {
  ONNX_RUNTIME_VERSION: "1.22.0",
  VAD_VERSION: "0.0.29",
  POSITIVE_SPEECH_THRESHOLD: 0.8,    // Slightly lower for faster detection
  NEGATIVE_SPEECH_THRESHOLD: 0.4,    // Slightly higher to end faster
  MIN_SPEECH_MS: 200,                // Reduced from 250
  PRE_SPEECH_PAD_MS: 300,            // Reduced from 500
  REDEMPTION_MS: 200,                // Reduced from 300 - faster end detection
};

export const API_CONFIG = {
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "",
  MAX_RESPONSE_SENTENCES: 3,
  CACHE_TTL_DIRECT: 5 * 60 * 1000,
  CACHE_TTL_SEARCH: 30 * 1000,
};
