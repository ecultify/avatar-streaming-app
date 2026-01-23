import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const MODELS = {
  CLASSIFIER: "gpt-4o-mini",
  MAIN: "gpt-4o-mini",
  SEARCH: "gpt-4o",
};

const AVATAR_NAME = "Marianne";

const CLASSIFICATION_PROMPT = `You are a query classifier. Respond with ONLY "web_search" or "direct".

Classify as "web_search" if the query:
- Asks about current events, news, or recent happenings
- Requests real-time data (stock prices, weather, sports scores, crypto prices)
- Uses words like "latest", "current", "today", "recent", "now", "this week", "right now"
- Asks about specific people's current activities, status, or recent news
- Asks about NEW movies, TV shows, series, YouTube videos, or media content
- Asks "is [X] on Netflix/YouTube/Spotify" or about streaming availability
- Needs verification of facts that might have changed recently

Classify as "direct" if the query:
- Is a greeting (hi, hello, hey, good morning)
- Is casual conversation or small talk
- Asks for opinions, advice, or general recommendations
- Requests how-to guidance, tutorials, or definitions
- Is about well-established static knowledge (history, science, math)
- Is a follow-up or continuation of previous conversation
- Is a thank you, goodbye, or acknowledgment`;

const WEB_SEARCH_PROMPT = `You are ${AVATAR_NAME}, a friendly voice assistant speaking through an animated avatar.

CRITICAL VOICE OUTPUT RULES:
1. NEVER include URLs, links, or web addresses
2. NEVER include citation markers like [1], [2], [source]
3. NEVER say "according to sources", "based on my search", "I found that"
4. NEVER start with "Based on...", "According to..."
5. Keep responses to 2-3 sentences MAXIMUM
6. Speak naturally as if having a real conversation
7. State information directly and confidently

FORMAT:
- Write exactly as you would speak
- Use contractions (I'm, you're, it's, don't)
- No bullet points, lists, or markdown
- Round large numbers ("about 2 million" not "1,987,432")
- If uncertain, say so naturally`;

const DIRECT_RESPONSE_PROMPT = `You are ${AVATAR_NAME}, a friendly voice assistant speaking through an animated avatar.

PERSONALITY:
- Warm, helpful, genuinely engaged
- Natural speech with contractions
- Concise but not robotic
- Like talking to a friend

RULES:
1. Keep responses to 1-3 sentences
2. NEVER use markdown, bullet points, or formatting
3. NEVER include URLs or citations
4. Use natural filler words sparingly ("Well,", "So,", "Actually,")
5. For greetings, be warm but brief

CONVERSATION MEMORY:
You remember our conversation. Reference previous topics naturally.`;

const INSTANT_RESPONSES = {
  'hello': ["Hey there! How can I help you today?", "Hi! What's on your mind?"],
  'hi': ["Hey! What's up?", "Hi there! How can I help?"],
  'hey': ["Hey! What's going on?", "Hey there! What can I help with?"],
  'good morning': ["Good morning! What can I help with today?"],
  'good afternoon': ["Good afternoon! How can I help you?"],
  'good evening': ["Good evening! What brings you here?"],
  'thank you': ["You're welcome! Anything else?", "No problem!"],
  'thanks': ["You're welcome!", "No problem! Need anything else?"],
  'bye': ["Goodbye! Have a great day!", "See you later!"],
  'goodbye': ["Take care! Come back anytime.", "Goodbye! Great chatting with you."],
  "whats up": ["Not much! What can I do for you?", "Hey! What's on your mind?"],
  'how are you': ["I'm doing great! How about you?", "Pretty good, thanks! How can I help?"]
};

function getInstantResponse(query) {
  const normalized = query.toLowerCase().trim().replace(/[^\w\s']/g, '').replace(/\s+/g, ' ');
  const responses = INSTANT_RESPONSES[normalized];
  if (!responses) return null;
  return responses[Math.floor(Math.random() * responses.length)];
}

function sanitizeForVoice(text) {
  if (!text) return '';
  
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/[^\s\])},"]+/gi, '')
    .replace(/www\.[^\s\])},"]+/gi, '')
    .replace(/\[\d+\]/g, '')
    .replace(/\[source\d*\]/gi, '')
    .replace(/^(Source|Reference|Citation|Link)s?:.*$/gim, '')
    .replace(/^(Learn more|Read more|Visit|Check out).*$/gim, '')
    .replace(/according to [^,.]+(,|\.)/gi, '')
    .replace(/based on (my |the )?(search|research)[^,.]*[,.]/gi, '')
    .replace(/I found (that )?/gi, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^[\s]*[-•*]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateForVoice(text, maxSentences = 3) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.slice(0, maxSentences).join(' ').trim();
}

const WEB_SEARCH_PATTERNS = [
  /\b(latest|current|recent|today|now|this week)\b/i,
  /\b(weather|temperature|forecast)\b/i,
  /\b(stock|price|trading|market)\b/i,
  /\b(bitcoin|crypto|eth)\s*(price)?\b/i,
  /\b(news|headlines|happening)\b/i,
  /\bon (netflix|youtube|spotify|hulu|disney)\b/i,
  /\b(released|came out|announced)\s*(recently|today)?\b/i,
];

const INSTANT_PATTERNS = [
  /^(hi|hello|hey)[\s!.,?]*$/i,
  /^good\s+(morning|afternoon|evening)[\s!.,?]*$/i,
  /^(thanks?|thank\s*you)[\s!.,?]*$/i,
  /^(bye|goodbye)[\s!.,?]*$/i,
  /^(whats\s+up|what'?s\s+up)[\s!?]*$/i,
  /^how\s+are\s+you[\s!?]*$/i,
];

async function classifyQuery(transcript) {
  const trimmed = transcript.trim();
  
  for (const pattern of INSTANT_PATTERNS) {
    if (pattern.test(trimmed)) {
      const instant = getInstantResponse(trimmed);
      if (instant) return { type: 'instant', instantResponse: instant };
      return { type: 'direct' };
    }
  }
  
  for (const pattern of WEB_SEARCH_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { type: 'web_search' };
    }
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: MODELS.CLASSIFIER,
      messages: [
        { role: "system", content: CLASSIFICATION_PROMPT },
        { role: "user", content: transcript }
      ],
      max_tokens: 10,
      temperature: 0
    });
    
    const result = response.choices[0].message.content?.toLowerCase().trim();
    return { type: result === 'web_search' ? 'web_search' : 'direct' };
  } catch (error) {
    console.error('[Classifier] Error:', error.message);
    return { type: 'direct' };
  }
}

function extractTextFromResponse(response) {
  if (response.output_text) {
    return response.output_text;
  }
  
  if (response.output && Array.isArray(response.output)) {
    for (const item of response.output) {
      if (item.type === 'message' && item.content) {
        for (const content of item.content) {
          if (content.type === 'output_text' || content.type === 'text') {
            return content.text;
          }
        }
      }
    }
  }
  
  if (response.choices?.[0]?.message?.content) {
    return response.choices[0].message.content;
  }
  
  return "I couldn't process that. Could you try again?";
}

const sessionConversations = new Map();

app.post('/api/process-query', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { transcript, sessionId = 'default' } = req.body;
    
    if (!transcript?.trim()) {
      return res.status(400).json({ error: 'Empty transcript' });
    }
    
    console.log(`[${sessionId}] Processing: "${transcript}"`);
    
    const classification = await classifyQuery(transcript);
    console.log(`[${sessionId}] Classification: ${classification.type}`);
    
    if (classification.type === 'instant' && classification.instantResponse) {
      const processingTime = Date.now() - startTime;
      console.log(`[${sessionId}] Instant response (${processingTime}ms)`);
      
      return res.json({
        response: classification.instantResponse,
        queryType: 'instant',
        processingTime,
        sessionId,
        cached: false
      });
    }
    
    let rawResponse;
    let conversationId = sessionConversations.get(sessionId);
    
    if (classification.type === 'web_search') {
      try {
        const searchResponse = await openai.responses.create({
          model: MODELS.SEARCH,
          input: transcript,
          tools: [{ type: "web_search" }],
          instructions: WEB_SEARCH_PROMPT,
        });
        
        rawResponse = extractTextFromResponse(searchResponse);
      } catch (error) {
        console.error('[WebSearch] Responses API failed:', error.message);
        const fallback = await openai.chat.completions.create({
          model: MODELS.SEARCH,
          messages: [
            { role: "system", content: WEB_SEARCH_PROMPT },
            { role: "user", content: transcript }
          ],
          max_tokens: 200
        });
        rawResponse = fallback.choices[0].message.content;
      }
      
    } else {
      const messages = [
        { role: "system", content: DIRECT_RESPONSE_PROMPT },
        { role: "user", content: transcript }
      ];
      
      const directResponse = await openai.chat.completions.create({
        model: MODELS.MAIN,
        messages,
        max_tokens: 150,
        temperature: 0.7
      });
      
      rawResponse = directResponse.choices[0].message.content;
    }
    
    let cleanResponse = sanitizeForVoice(rawResponse);
    cleanResponse = truncateForVoice(cleanResponse, 3);
    
    const processingTime = Date.now() - startTime;
    console.log(`[${sessionId}] Response (${processingTime}ms): "${cleanResponse.substring(0, 100)}..."`);
    
    res.json({
      response: cleanResponse,
      queryType: classification.type,
      processingTime,
      sessionId,
      conversationId,
      cached: false
    });
    
  } catch (error) {
    console.error('[API] Error:', error);
    
    res.status(500).json({
      error: 'Failed to process query',
      response: "I'm sorry, I had trouble with that. Could you try again?",
      queryType: 'error',
      processingTime: Date.now() - startTime
    });
  }
});

app.post('/api/web-search', async (req, res) => {
  const { query, sessionId = 'legacy' } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  req.body.transcript = query;
  req.body.sessionId = sessionId;
  
  return app._router.handle(req, res, () => {});
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    models: MODELS
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.post('/api/clear-session', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) {
    sessionConversations.delete(sessionId);
  }
  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  HeyGen Avatar Backend Server                              ║
║  Port: ${PORT}                                                ║
║  Models:                                                   ║
║    - Classifier: ${MODELS.CLASSIFIER.padEnd(20)}             ║
║    - Main: ${MODELS.MAIN.padEnd(26)}             ║
║    - Search: ${MODELS.SEARCH.padEnd(24)}             ║
╚════════════════════════════════════════════════════════════╝
  `);
  
  if (OPENAI_API_KEY) {
    console.log('✅ OpenAI API key detected\n');
  } else {
    console.log('❌ ERROR: No OpenAI API key found\n');
    process.exit(1);
  }
});
