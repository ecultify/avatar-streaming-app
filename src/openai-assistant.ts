import OpenAI from "openai";

export class OpenAIAssistant {
  private client: OpenAI;
  private assistant: any;
  private thread: any;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }

  async initialize(
    instructions: string = `You are a helpful AI assistant integrated with a HeyGen avatar.
    Answer questions clearly and conversationally.
    Keep responses brief and engaging (2-4 sentences) since they will be spoken by an avatar.`
  ) {
    this.assistant = await this.client.beta.assistants.create({
      name: "HeyGen Avatar Assistant",
      instructions,
      tools: [],
      model: "gpt-4o",
    });

    this.thread = await this.client.beta.threads.create();
  }

  private async getResponseWithWebSearch(userMessage: string): Promise<string> {
    try {
      console.log('[WebSearch] Calling backend for real-time search');
      
      // Backend performs search + synthesis with GPT-4o
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
      console.log('[WebSearch] Got response:', searchData.success, '| Has real search:', searchData.hasSearchResults);

      // Return the synthesized response directly from backend
      return searchData.summary || "I couldn't find that information.";
      
    } catch (error) {
      console.error('[WebSearch] Error:', error);
      throw error;
    }
  }

  async getResponse(userMessage: string): Promise<string> {
    if (!this.assistant || !this.thread) {
      throw new Error("Assistant not initialized. Call initialize() first.");
    }

    // Always use backend real-time search for every query
    console.log('[Assistant] Using backend real-time search for query:', userMessage);
    try {
      return await this.getResponseWithWebSearch(userMessage);
    } catch (error) {
      console.error('[Assistant] Web search failed, falling back to regular assistant');
      // Fall through to regular assistant
    }

    // Use regular Assistants API as fallback
    console.log('[Assistant] Using Assistants API fallback');
    
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
}
