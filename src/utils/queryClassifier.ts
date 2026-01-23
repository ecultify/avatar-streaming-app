import OpenAI from 'openai';
import { CLASSIFICATION_PROMPT } from '../config/prompts';

export type QueryType = 'web_search' | 'direct';

const GREETING_PATTERNS = /^(hi|hello|hey|howdy|good\s*(morning|afternoon|evening|night)|what'?s?\s*up|yo|sup|greetings)/i;
const FAREWELL_PATTERNS = /^(bye|goodbye|see\s*ya|later|take\s*care|good\s*night|have\s*a\s*good)/i;
const THANKS_PATTERNS = /^(thanks?|thank\s*you|appreciate|thx)/i;
const REALTIME_PATTERNS = /(latest|current|today|right\s*now|this\s*(week|month|year)|recent|happening|news|stock|price|weather|score|crypto|bitcoin|live)/i;

export function quickClassify(transcript: string): QueryType | null {
  const trimmed = transcript.trim().toLowerCase();
  const wordCount = trimmed.split(/\s+/).length;
  
  if (wordCount <= 4) {
    if (GREETING_PATTERNS.test(trimmed)) return 'direct';
    if (FAREWELL_PATTERNS.test(trimmed)) return 'direct';
    if (THANKS_PATTERNS.test(trimmed)) return 'direct';
  }
  
  if (REALTIME_PATTERNS.test(trimmed)) {
    return 'web_search';
  }
  
  return null;
}

export async function classifyQuery(
  transcript: string,
  openaiClient: OpenAI
): Promise<QueryType> {
  const quickResult = quickClassify(transcript);
  if (quickResult !== null) {
    console.log('[Classifier] Quick classification:', quickResult);
    return quickResult;
  }
  
  try {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CLASSIFICATION_PROMPT },
        { role: "user", content: transcript }
      ],
      max_tokens: 10,
      temperature: 0
    });
    
    const classification = response.choices[0].message.content?.toLowerCase().trim();
    const result: QueryType = classification === 'web_search' ? 'web_search' : 'direct';
    console.log('[Classifier] GPT classification:', result);
    return result;
  } catch (error) {
    console.error('[Classifier] Error, defaulting to direct:', error);
    return 'direct';
  }
}
