export type QueryType = 'web_search' | 'direct' | 'instant';

export interface ProcessQueryRequest {
  transcript: string;
  sessionId: string;
}

export interface ProcessQueryResponse {
  response: string;
  queryType: QueryType;
  processingTime: number;
  sessionId: string;
  conversationId?: string;
  cached?: boolean;
}

export interface ClassificationResult {
  type: QueryType;
  instantResponse?: string;
}

export interface AvatarState {
  isConnected: boolean;
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  vadActive: boolean;
}



export interface SessionData {
  sessionId: string;
  conversationId?: string;
  createdAt: number;
}
