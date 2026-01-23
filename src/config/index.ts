export const MODELS = {
  CLASSIFIER: "gpt-4o-mini",
  MAIN: "gpt-4o-mini",
  SEARCH: "gpt-4o",
};

export const AVATAR_CONFIG = {
  NAME: "Marianne",
  VOICE_ID: "2d5b0e6cf36f460aa7fc47e3eee4ba54",
  AVATAR_ID: "Marianne_Chair_Sitting_public"
};

export const VAD_CONFIG = {
  ONNX_RUNTIME_VERSION: "1.22.0",
  VAD_VERSION: "0.0.29",
  POSITIVE_SPEECH_THRESHOLD: 0.85,
  NEGATIVE_SPEECH_THRESHOLD: 0.35,
  MIN_SPEECH_MS: 250,
  PRE_SPEECH_PAD_MS: 500,
  REDEMPTION_MS: 300,
};

export const API_CONFIG = {
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "",
  MAX_RESPONSE_SENTENCES: 3,
  CACHE_TTL_DIRECT: 5 * 60 * 1000,
  CACHE_TTL_SEARCH: 30 * 1000,
};
