import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const PORT = 3001;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

app.use(cors());
app.use(express.json());

const sessionThreads = new Map();

const CLASSIFICATION_PROMPT = `You are a query classifier. Respond with ONLY "web_search" or "direct".

Classify as "web_search" if the query:
- Asks about current events, news, or recent happenings
- Requests real-time data (stock prices, weather, sports scores, crypto prices)
- Uses words like "latest", "current", "today", "recent", "now", "this week"
- Asks about specific people's current activities, status, or recent news
- Needs live/updated information that changes frequently
- Asks "what is happening", "what happened", "is [X] still [Y]"

Classify as "direct" if the query:
- Is a greeting (hi, hello, hey, good morning, etc.)
- Is casual conversation or small talk
- Asks for opinions, advice, recommendations, or explanations
- Requests how-to guidance, tutorials, or definitions
- Is about static/historical knowledge (history, science concepts, math, etc.)
- Is a follow-up or continuation of previous conversation
- Asks "how do I", "what is" (general knowledge), "explain", "tell me about"
- Expresses emotions or seeks emotional support
- Is a thank you, goodbye, or acknowledgment`;

const WEB_SEARCH_PROMPT = `You are Marianne, a friendly voice assistant speaking through an animated avatar.

CRITICAL VOICE OUTPUT RULES:
1. NEVER include URLs, links, or web addresses in your response
2. NEVER include citation markers like [1], [2], [source]
3. NEVER say "according to sources" or "based on my search"
4. NEVER start with "Based on..." or "According to..."
5. Keep responses to 2-3 sentences MAXIMUM
6. Speak naturally as if having a real conversation

VOICE-FRIENDLY FORMAT:
- Write exactly as you would speak out loud
- Use contractions (I'm, you're, it's, don't, can't)
- No bullet points, numbered lists, or markdown
- Round large numbers for easier listening ("about 2 million" not "1,987,432")
- If uncertain, say so naturally ("I'm not entirely sure, but...")

Respond conversationally and concisely.`;

const DIRECT_RESPONSE_PROMPT = `You are Marianne, a friendly and warm voice assistant speaking through an animated avatar.

PERSONALITY:
- Warm, helpful, and genuinely interested in the conversation
- Natural speech patterns with contractions
- Concise but not robotic
- Respond as if talking to a friend

VOICE OUTPUT RULES:
1. Keep responses to 1-3 sentences unless more detail is requested
2. NEVER use markdown, bullet points, or any formatting
3. NEVER include URLs, links, or citations
4. Use natural filler words sparingly ("Well,", "So,", "You know,")
5. For greetings, be warm but brief

AVOID:
- Starting every response the same way
- Being overly formal or stiff
- Using "Certainly!", "Absolutely!", "Of course!" excessively
- Bullet points or numbered lists
- Any markdown formatting`;

const INSTANT_RESPONSES = {
  'hello': ["Hey there! How can I help you today?", "Hi! What's on your mind?", "Hello! Great to chat with you."],
  'hi': ["Hi! What can I do for you?", "Hey! How's it going?", "Hi there! What's up?"],
  'hey': ["Hey! What can I help you with?", "Hey there! What's on your mind?"],
  'good morning': ["Good morning! Hope you're having a great day. What can I help with?"],
  'good afternoon': ["Good afternoon! How can I help you?"],
  'good evening': ["Good evening! How can I help you tonight?"],
  'thank you': ["You're welcome! Let me know if you need anything else."],
  'thanks': ["You're welcome!", "No problem!", "Anytime!"],
  'bye': ["Goodbye! Have a great day!", "See you later! Take care!"],
  'goodbye': ["Goodbye! Take care!", "See you! Have a wonderful day!"],
  'how are you': ["I'm doing great, thanks for asking! How about you?"],
  "what's up": ["Not much, just here to help! What do you need?"],
  'whats up': ["Not much! What can I help you with?"],
};

function getInstantResponse(query) {
  const normalized = query.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
  const responses = INSTANT_RESPONSES[normalized];
  if (responses) {
    return responses[Math.floor(Math.random() * responses.length)];
  }
  for (const [key, value] of Object.entries(INSTANT_RESPONSES)) {
    if (normalized.startsWith(key) || normalized.endsWith(key)) {
      return value[Math.floor(Math.random() * value.length)];
    }
  }
  return null;
}

function sanitizeForVoice(text) {
  if (!text) return '';
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/[^\s\])}]+/gi, '')
    .replace(/www\.[^\s\])}]+/gi, '')
    .replace(/\[\d+\]/g, '')
    .replace(/\[source\]/gi, '')
    .replace(/\[citation[^\]]*\]/gi, '')
    .replace(/^(Source|Reference|Citation|Link)s?:.*$/gim, '')
    .replace(/(Learn more|Visit|Check out|See more|Read more) at.*$/gim, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^[\s]*[-•*]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    .replace(/#\w+/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/([.,!?;:])\1+/g, '$1')
    .replace(/\n\s*\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateForVoice(text, maxSentences = 3) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.slice(0, maxSentences).join(' ').trim();
}

const GREETING_PATTERNS = /^(hi|hello|hey|howdy|good\s*(morning|afternoon|evening|night)|what'?s?\s*up|yo|sup|greetings)/i;
const FAREWELL_PATTERNS = /^(bye|goodbye|see\s*ya|later|take\s*care|good\s*night|have\s*a\s*good)/i;
const THANKS_PATTERNS = /^(thanks?|thank\s*you|appreciate|thx)/i;
const REALTIME_PATTERNS = /(latest|current|today|right\s*now|this\s*(week|month|year)|recent|happening|news|stock|price|weather|score|crypto|bitcoin|live)/i;

function quickClassify(transcript) {
  const trimmed = transcript.trim().toLowerCase();
  const wordCount = trimmed.split(/\s+/).length;
  
  if (wordCount <= 4) {
    if (GREETING_PATTERNS.test(trimmed)) return 'direct';
    if (FAREWELL_PATTERNS.test(trimmed)) return 'direct';
    if (THANKS_PATTERNS.test(trimmed)) return 'direct';
  }
  
  if (REALTIME_PATTERNS.test(trimmed)) return 'web_search';
  
  return null;
}

async function classifyQuery(transcript) {
  const quickResult = quickClassify(transcript);
  if (quickResult !== null) {
    console.log(`[Classifier] Quick: ${quickResult}`);
    return quickResult;
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CLASSIFICATION_PROMPT },
        { role: "user", content: transcript }
      ],
      max_tokens: 10,
      temperature: 0
    });
    
    const classification = response.choices[0].message.content?.toLowerCase().trim();
    const result = classification === 'web_search' ? 'web_search' : 'direct';
    console.log(`[Classifier] GPT: ${result}`);
    return result;
  } catch (error) {
    console.error('[Classifier] Error:', error.message);
    return 'direct';
  }
}

async function getWebSearchResponse(query) {
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        tools: [{ type: 'web_search' }],
        input: query,
        instructions: WEB_SEARCH_PROMPT
      })
    });

    if (!response.ok) {
      throw new Error(`Responses API failed: ${response.status}`);
    }

    const data = await response.json();
    
    let outputText = '';
    if (data.output_text) {
      outputText = data.output_text;
    } else if (data.output) {
      for (const item of data.output) {
        if (item.type === 'message' && item.content) {
          for (const content of item.content) {
            if (content.type === 'output_text' || content.type === 'text') {
              outputText = content.text;
              break;
            }
          }
        }
      }
    }
    
    return outputText || "I couldn't find that information.";
  } catch (error) {
    console.error('[WebSearch] Primary failed:', error.message);
    
    try {
      const fallbackResponse = await openai.chat.completions.create({
        model: "gpt-4o-search-preview",
        web_search_options: { search_context_size: "medium" },
        messages: [
          { role: "system", content: WEB_SEARCH_PROMPT },
          { role: "user", content: query }
        ],
        max_tokens: 200
      });
      
      return fallbackResponse.choices[0].message.content || "I couldn't find that information.";
    } catch (fallbackError) {
      console.error('[WebSearch] Fallback failed:', fallbackError.message);
      return "I'm having trouble searching for that right now. Could you ask me something else?";
    }
  }
}

async function getDirectResponse(query, sessionId) {
  try {
    let threadId = sessionThreads.get(sessionId);
    
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      sessionThreads.set(sessionId, threadId);
      console.log(`[${sessionId}] New thread: ${threadId}`);
    }

    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: query
    });

    const run = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID || 'asst_placeholder',
      instructions: DIRECT_RESPONSE_PROMPT
    });

    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(threadId);
      const assistantMessage = messages.data.find(m => m.role === 'assistant');
      
      if (assistantMessage && assistantMessage.content[0]?.type === 'text') {
        return assistantMessage.content[0].text.value;
      }
    }

    return await getSimpleCompletion(query);
  } catch (error) {
    console.error('[Assistant] Error:', error.message);
    return await getSimpleCompletion(query);
  }
}

async function getSimpleCompletion(query) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: DIRECT_RESPONSE_PROMPT },
      { role: "user", content: query }
    ],
    max_tokens: 150,
    temperature: 0.7
  });
  
  return response.choices[0].message.content || "I'm not sure how to respond to that.";
}

app.post('/api/process-query', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { transcript, sessionId = 'default' } = req.body;
    
    if (!transcript || transcript.trim() === '') {
      return res.status(400).json({ error: 'Empty transcript' });
    }

    console.log(`\n[${sessionId}] Processing: "${transcript}"`);

    const instantResponse = getInstantResponse(transcript);
    if (instantResponse) {
      console.log(`[${sessionId}] Instant response`);
      return res.json({
        response: instantResponse,
        queryType: 'direct',
        processingTime: Date.now() - startTime,
        sessionId,
        cached: false
      });
    }

    const queryType = await classifyQuery(transcript);
    console.log(`[${sessionId}] Query type: ${queryType}`);

    let rawResponse;
    if (queryType === 'web_search') {
      rawResponse = await getWebSearchResponse(transcript);
    } else {
      rawResponse = await getDirectResponse(transcript, sessionId);
    }

    let cleanResponse = sanitizeForVoice(rawResponse);
    cleanResponse = truncateForVoice(cleanResponse, 3);

    const processingTime = Date.now() - startTime;
    console.log(`[${sessionId}] Response (${processingTime}ms): "${cleanResponse.substring(0, 80)}..."`);

    res.json({
      response: cleanResponse,
      queryType,
      processingTime,
      sessionId
    });

  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ 
      error: 'Failed to process query',
      response: "I'm sorry, I had trouble processing that. Could you try again?"
    });
  }
});

app.post('/api/web-search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log('[Backend] Web search:', query);

    const response = await getWebSearchResponse(query);
    const cleanResponse = sanitizeForVoice(truncateForVoice(response, 3));

    return res.json({
      success: true,
      query,
      summary: cleanResponse,
      hasSearchResults: true,
      model: 'gpt-4o-responses-api'
    });

  } catch (error) {
    console.error('[Backend] Error:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message,
      summary: 'Search service temporarily unavailable.'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Backend running on http://localhost:${PORT}`);
  console.log(`   - Health: http://localhost:${PORT}/health`);
  console.log(`   - Process: POST http://localhost:${PORT}/api/process-query`);
  console.log(`   - Search: POST http://localhost:${PORT}/api/web-search\n`);
  
  if (OPENAI_API_KEY) {
    console.log('✅ OpenAI API key detected\n');
  } else {
    console.log('❌ ERROR: No OpenAI API key found\n');
    process.exit(1);
  }
});
