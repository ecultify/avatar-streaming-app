export type QueryType = 'web_search' | 'direct';

export interface ProcessQueryRequest {
  transcript: string;
  sessionId: string;
}

export interface ProcessQueryResponse {
  response: string;
  queryType: QueryType;
  processingTime: number;
  sessionId: string;
  cached?: boolean;
}

export interface VADConfig {
  positiveSpeechThreshold: number;
  negativeSpeechThreshold: number;
  minSpeechFrames: number;
  preSpeechPadFrames: number;
  redemptionFrames: number;
}

export interface AvatarState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
}

export interface CacheEntry {
  response: string;
  timestamp: number;
  queryType: QueryType;
}
