import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Check if dist folder exists
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.warn('⚠️ WARNING: dist/ directory not found. The frontend will not be served.');
  console.warn('Run "npm run build" to generate the frontend assets.');
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Gemini setup
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;

// Use Gemini if available, otherwise fall back to OpenAI
const USE_GEMINI = !!genAI;
console.log(`[Config] Using ${USE_GEMINI ? 'Gemini 2.0 Flash' : 'OpenAI'} for AI processing`);

const MODELS = {
  // OpenAI models (fallback)
  CLASSIFIER: "gpt-4.1-nano",
  MAIN: "gpt-4.1-mini",
  SEARCH: "gpt-4.1",
  TRANSCRIPTION: "whisper-1",
  // Gemini models (primary)
  GEMINI_MAIN: "gemini-2.0-flash",
  GEMINI_SEARCH: "gemini-2.0-flash",
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

const WEB_SEARCH_PROMPT = `You are ${AVATAR_NAME}, a friendly AI assistant speaking through an animated video avatar.

CRITICAL - YOUR RESPONSES WILL BE SPOKEN ALOUD:
1. NEVER include URLs, links, or web addresses
2. NEVER include citation markers like [1], [2], [source]
3. NEVER say "according to sources" or "based on my search"
4. Keep responses to 2-3 sentences MAX
5. Speak naturally like you're having a real conversation
6. Use contractions (I'm, you're, it's, don't, can't)
7. State information directly and confidently
8. Round large numbers ("about 2 million" not "1,987,432")
9. Add natural filler phrases occasionally ("Well," "So," "Actually,")
10. End with a brief follow-up or acknowledgment when appropriate

Remember: Write exactly as you would naturally speak to a friend.`;

const DIRECT_RESPONSE_PROMPT = `You are ${AVATAR_NAME}, a warm and engaging AI assistant speaking through an animated video avatar.

PERSONALITY:
- Friendly, helpful, and genuinely interested in the conversation
- Natural speech with contractions (I'm, you're, don't, can't)
- Concise but warm, not robotic
- Like talking to a knowledgeable friend

RULES:
1. Keep responses to 1-3 sentences for simple questions
2. NEVER use markdown, bullet points, or formatted lists
3. NEVER include URLs, links, or citations
4. Use natural acknowledgments occasionally ("Great question!", "That's interesting!", "I totally get that.")
5. For complex topics, give a brief summary first, then offer to explain more
6. Ask follow-up questions to keep conversation flowing when appropriate

REMEMBER: Your responses will be spoken aloud by an avatar. Write exactly as you would naturally speak, not as you would write.`;

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

import multer from 'multer';
import os from 'os';
const upload = multer({ dest: os.tmpdir() });

// --- Krisp Batch API Helpers ---
const KRISP_API_KEY = process.env.KRISP_API_KEY || process.env.VITE_KRISP_API_KEY;
const KRISP_API_BASE = 'https://sdkapi.krisp.ai/v2/sdk';

async function processWithKrisp(audioBuffer, contentType = 'audio/wav') {
  if (!KRISP_API_KEY) {
    console.log('[Krisp] No API key configured, skipping');
    return audioBuffer;
  }

  const startTime = Date.now();
  console.log(`[Krisp] Starting noise cancellation (${(audioBuffer.length / 1024).toFixed(1)}KB)`);

  try {
    // 1. Get upload URL
    const fileName = `audio-NC-${Date.now()}.wav`;
    const uploadRes = await fetch(`${KRISP_API_BASE}/process-upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `api-key ${KRISP_API_KEY}`
      },
      body: JSON.stringify({ fileName, contentType, service: 'NC' })
    });

    if (!uploadRes.ok) throw new Error(`Upload URL failed: ${uploadRes.status}`);
    const uploadData = await uploadRes.json();
    if (uploadData.code !== 0) throw new Error(`Krisp error: ${uploadData.message}`);

    // 2. Upload audio
    const { uploadUrl, processId } = uploadData.data;
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: audioBuffer
    });
    if (!putRes.ok) throw new Error(`Upload failed: ${putRes.status}`);

    // 3. Poll for completion
    let attempts = 0;
    while (attempts < 10) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(1.5, attempts))); // Exponential backoff
      attempts++;

      const statusRes = await fetch(`${KRISP_API_BASE}/process-status/${processId}`, {
        headers: { 'Authorization': `api-key ${KRISP_API_KEY}` }
      });
      const statusData = await statusRes.json();

      if (statusData.data.status === 'COMPLETED') {
        const downloadRes = await fetch(statusData.data.downloadUrl);
        const arrayBuffer = await downloadRes.arrayBuffer();
        console.log(`[Krisp] ✓ Completed in ${Date.now() - startTime}ms`);
        return Buffer.from(arrayBuffer);
      }
      if (statusData.data.status === 'FAILED') throw new Error(statusData.data.error);
    }
    throw new Error('Polling timeout');
  } catch (error) {
    console.error(`[Krisp] Failed: ${error.message}, using original audio`);
    return audioBuffer; // Fallback to original
  }
}
// -------------------------------

app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      console.error('[Transcribe] No file provided');
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log('[Transcribe] Processing file:', req.file.path);

    // Ensure file has proper extension for Whisper
    const originalName = req.file.originalname || 'audio.wav';
    const extension = path.extname(originalName) || '.wav';
    const newPath = req.file.path + extension;

    fs.renameSync(req.file.path, newPath);
    req.file.path = newPath;

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(newPath),
      model: MODELS.TRANSCRIPTION,
      response_format: "text",  // Faster than json
    });

    // Cleanup temp file
    try { fs.unlinkSync(req.file.path); } catch (e) { }

    const elapsed = Date.now() - startTime;
    console.log(`[Transcribe] ✓ ${elapsed}ms: "${transcription.substring(0, 50)}..."`);

    res.json({ text: transcription });

  } catch (error) {
    console.error('[Transcribe] FAILED:', error.message);

    // Cleanup
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) { }
    }

    res.status(500).json({
      error: 'Transcription failed',
      details: error.message
    });
  }
});

// NEW: Unified audio processing endpoint (Gemini STT + LLM in one call)
// This is the streamlined approach: Voice → Gemini → Response
app.post('/api/process-audio', upload.single('file'), async (req, res) => {
  const startTime = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const sessionId = req.body.sessionId || 'default';
    console.log(`[${sessionId}] Processing audio directly with Gemini...`);

    // Check if Gemini is available
    if (!USE_GEMINI || !genAI) {
      // Fall back to separate transcription + processing
      console.log('[ProcessAudio] Gemini not available, using fallback flow');

      // First transcribe
      const originalName = req.file.originalname || 'audio.wav';
      const extension = path.extname(originalName) || '.wav';
      const newPath = req.file.path + extension;
      fs.renameSync(req.file.path, newPath);

      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(newPath),
        model: MODELS.TRANSCRIPTION,
        response_format: "text",
      });

      try { fs.unlinkSync(newPath); } catch (e) { }

      // Then forward to process-query logic
      req.body.transcript = transcription;
      // Continue with normal processing below
    }

    // Read audio
    let audioBuffer = fs.readFileSync(req.file.path);

    // Process with Krisp if available (and file exists)
    if (KRISP_API_KEY && fs.existsSync(req.file.path)) {
      const mimeType = req.file.mimetype || 'audio/wav';
      // Pass buffer to Krisp
      audioBuffer = await processWithKrisp(audioBuffer, mimeType);
    }

    const base64Audio = audioBuffer.toString('base64');

    // Determine mime type
    const originalName = req.file.originalname || 'audio.wav';
    const ext = path.extname(originalName).toLowerCase();
    const mimeType = ext === '.webm' ? 'audio/webm'
      : ext === '.mp3' ? 'audio/mp3'
        : ext === '.ogg' ? 'audio/ogg'
          : 'audio/wav';

    // Cleanup file immediately
    try { fs.unlinkSync(req.file.path); } catch (e) { }

    // Use Gemini 2.0 Flash with audio input
    const model = genAI.getGenerativeModel({
      model: MODELS.GEMINI_MAIN,
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.7,
      }
    });

    const prompt = `${DIRECT_RESPONSE_PROMPT}

Listen to this audio message and respond naturally as ${AVATAR_NAME}. 
Keep your response conversational and brief (1-3 sentences).
Do not include any transcription - just respond directly to what was said.`;

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          }
        ]
      }]
    });

    let rawResponse = result.response.text();
    let cleanResponse = sanitizeForVoice(rawResponse);
    cleanResponse = truncateForVoice(cleanResponse, 3);

    const processingTime = Date.now() - startTime;
    console.log(`[${sessionId}] ✓ Unified processing (${processingTime}ms): "${cleanResponse.substring(0, 50)}..."`);

    res.json({
      response: cleanResponse,
      queryType: 'unified',
      processingTime,
      sessionId,
      model: 'gemini-2.0-flash'
    });

  } catch (error) {
    console.error('[ProcessAudio] Error:', error.message);

    // Cleanup
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) { }
    }

    res.status(500).json({
      error: 'Audio processing failed',
      details: error.message
    });
  }
});

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

    // Use Gemini if available (faster, unified processing)
    if (USE_GEMINI && genAI) {
      try {
        const model = genAI.getGenerativeModel({
          model: MODELS.GEMINI_MAIN,
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.7,
          }
        });

        // For web search queries, use Google Search grounding
        if (classification.type === 'web_search') {
          const searchModel = genAI.getGenerativeModel({
            model: MODELS.GEMINI_SEARCH,
            tools: [{ googleSearch: {} }],
            generationConfig: {
              maxOutputTokens: 200,
              temperature: 0.5,
            }
          });

          const result = await searchModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: transcript }] }],
            systemInstruction: WEB_SEARCH_PROMPT,
          });

          rawResponse = result.response.text();
        } else {
          // Direct response
          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: transcript }] }],
            systemInstruction: DIRECT_RESPONSE_PROMPT,
          });

          rawResponse = result.response.text();
        }

        console.log(`[Gemini] Response generated successfully`);
      } catch (geminiError) {
        console.error('[Gemini] Error, falling back to OpenAI:', geminiError.message);
        // Fall through to OpenAI
        rawResponse = null;
      }
    }

    // OpenAI fallback
    if (!rawResponse) {
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

  return app._router.handle(req, res, () => { });
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

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'app.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Fallback to index.html just in case, then error
    const fallbackPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(fallbackPath)) {
      res.sendFile(fallbackPath);
      return;
    }

    res.status(503).send(`
      <html>
        <head><title>Building...</title></head>
        <body style="font-family: sans-serif; padding: 2rem; text-align: center;">
          <h1>App is building...</h1>
          <p>The frontend assets are being generated. Please reload in a minute.</p>
          <p>If this persists, the build failed. (Checked for dist/app.html)</p>
        </body>
      </html>
    `);
  }
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
    console.warn('⚠️ WARNING: No OpenAI API key found');
    console.warn('  The backend will start, but AI features will fail until the key is set.');
    console.warn('  Set OPENAI_API_KEY environment variable to fix this.\n');
  }
});

export default app;
