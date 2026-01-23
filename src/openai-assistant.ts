import OpenAI from "openai";
import { classifyQuery, type QueryType } from './utils/queryClassifier';
import { prepareForVoice } from './utils/responseSanitizer';
import { getInstantResponse } from './config/prompts';
import { getCachedResponse, setCachedResponse } from './utils/responseCache';
import { DIRECT_RESPONSE_PROMPT } from './config/prompts';

export class OpenAIAssistant {
  private client: OpenAI;
  private assistant: any;
  private thread: any;
  private sessionId: string;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async initialize(
    instructions: string = ASSISTANT_INSTRUCTIONS
  ) {
    this.assistant = await this.client.beta.assistants.create({
      name: "HeyGen Avatar Assistant",
      instructions,
      tools: [],
      model: "gpt-4o",
    });

    this.thread = await this.client.beta.threads.create();
    console.log('[Assistant] Initialized with thread:', this.thread.id);
  }

  private async getResponseWithWebSearch(userMessage: string): Promise<string> {
    try {
      console.log('[WebSearch] Calling backend for real-time search');
      
      const searchResponse = await fetch('http://localhost:3001/api/web-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userMessage })
      });

      if (!searchResponse.ok) {
        throw new Error(`Backend search failed: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      console.log('[WebSearch] Got response:', searchData.success);

      return searchData.summary || "I couldn't find that information.";
      
    } catch (error) {
      console.error('[WebSearch] Error:', error);
      throw error;
    }
  }

  private async getDirectResponseFromAssistant(userMessage: string): Promise<string> {
    if (!this.assistant || !this.thread) {
      throw new Error("Assistant not initialized. Call initialize() first.");
    }

    await this.client.beta.threads.messages.create(this.thread.id, {
      role: "user",
      content: userMessage,
    });

    const run = await this.client.beta.threads.runs.createAndPoll(
      this.thread.id,
      { assistant_id: this.assistant.id }
    );

    if (run.status === "completed") {
      const messages = await this.client.beta.threads.messages.list(
        this.thread.id
      );

      const lastMessage = messages.data.filter(
        (msg) => msg.role === "assistant"
      )[0];

      if (lastMessage && lastMessage.content[0].type === "text") {
        return lastMessage.content[0].text.value;
      }
    }

    console.error("Run did not complete successfully. Status:", run.status);
    return "Sorry, I couldn't process your request.";
  }

  private async getSimpleCompletion(userMessage: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: DIRECT_RESPONSE_PROMPT },
        { role: "user", content: userMessage }
      ],
      max_tokens: 150,
      temperature: 0.7
    });
    
    return response.choices[0].message.content || "I'm not sure how to respond to that.";
  }

  async getResponse(userMessage: string): Promise<string> {
    if (!this.assistant || !this.thread) {
      throw new Error("Assistant not initialized. Call initialize() first.");
    }

    const startTime = Date.now();
    console.log('[Assistant] Processing:', userMessage);

    const instantResponse = getInstantResponse(userMessage);
    if (instantResponse) {
      console.log('[Assistant] Using instant response');
      return instantResponse;
    }

    const cached = getCachedResponse(userMessage);
    if (cached) {
      console.log('[Assistant] Using cached response');
      return cached.response;
    }

    const queryType = await classifyQuery(userMessage, this.client);
    console.log('[Assistant] Query type:', queryType);

    let rawResponse: string;

    if (queryType === 'web_search') {
      try {
        rawResponse = await this.getResponseWithWebSearch(userMessage);
      } catch (error) {
        console.error('[Assistant] Web search failed, using direct response');
        rawResponse = await this.getSimpleCompletion(userMessage);
      }
    } else {
      try {
        rawResponse = await this.getDirectResponseFromAssistant(userMessage);
      } catch (error) {
        console.error('[Assistant] Assistant failed, using simple completion');
        rawResponse = await this.getSimpleCompletion(userMessage);
      }
    }

    const cleanResponse = cleanResponseForAvatar(rawResponse);

    setCachedResponse(userMessage, cleanResponse, queryType);

    const processingTime = Date.now() - startTime;
    console.log(`[Assistant] Response (${processingTime}ms):`, cleanResponse.substring(0, 80) + '...');

    return cleanResponse;
  }

  async processWithBackend(userMessage: string): Promise<string> {
    try {
      const response = await fetch('http://localhost:3001/api/process-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          transcript: userMessage,
          sessionId: this.sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`Backend failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[Assistant] Backend response:', data.queryType, `(${data.processingTime}ms)`);
      
      return data.response;
    } catch (error) {
      console.error('[Assistant] Backend failed, using local processing:', error);
      return this.getResponse(userMessage);
    }
  }
}
