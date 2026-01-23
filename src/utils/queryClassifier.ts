import OpenAI from 'openai';
import { MODELS } from '../config';
import { CLASSIFICATION_PROMPT, getInstantResponse } from '../config/prompts';

export type QueryType = 'web_search' | 'direct' | 'instant';

export interface ClassificationResult {
  type: QueryType;
  instantResponse?: string;
}

const WEB_SEARCH_PATTERNS = [
  /\b(latest|current|recent|today'?s?|now|right now|this week|this month)\b/i,
  /\b(weather|temperature|forecast)\b/i,
  /\b(stock|price|trading|market)\s*(price|at|is|of)?\b/i,
  /\b(bitcoin|btc|ethereum|eth|crypto)\s*(price|at|is)?\b/i,
  /\b(news|headlines|happening)\b/i,
  /\b(score|game|match|playing)\s*(today|now|live)?\b/i,
  /\bwho (is|are) (the )?(current|new)\b/i,
  /\b(is|are|did|does|has|have)\s+.+\s+(still|yet|anymore|now)\b/i,
  /\bon (netflix|youtube|spotify|hulu|disney|amazon prime|hbo)\b/i,
  /\b(released|came out|launched|announced)\s*(today|recently|this)?\b/i,
];

const INSTANT_PATTERNS = [
  /^(hi|hello|hey|yo|sup|hiya)[\s!.,?]*$/i,
  /^good\s+(morning|afternoon|evening|night)[\s!.,?]*$/i,
  /^(thanks?|thank\s*you|thx)[\s!.,?]*$/i,
  /^(bye|goodbye|see\s*ya|later|cya)[\s!.,?]*$/i,
  /^(how\s+are\s+you|how'?s\s+it\s+going|what'?s\s+up|whats\s+up)[\s!?.,]*$/i,
  /^(ok|okay|sure|got\s+it|sounds\s+good|perfect|great|cool|nice)[\s!.,?]*$/i,
  /^(yes|no|yeah|nah|yep|nope)[\s!.,?]*$/i,
];

const DIRECT_PATTERNS = [
  /^(hi|hello|hey|yo|sup|hiya)[\s!.,?]*$/i,
  /^good\s+(morning|afternoon|evening|night)[\s!.,?]*$/i,
  /^(thanks?|thank\s*you|thx)[\s!.,?]*$/i,
  /^(bye|goodbye|see\s*ya|later|cya)[\s!.,?]*$/i,
  /^(how\s+are\s+you|how'?s\s+it\s+going|what'?s\s+up)[\s!?.,]*$/i,
  /^(ok|okay|sure|got\s+it|sounds\s+good|perfect|great|cool|nice)[\s!.,?]*$/i,
  /^(yes|no|yeah|nah|yep|nope)[\s!.,?]*$/i,
];

function preClassify(transcript: string): QueryType | null {
  const trimmed = transcript.trim();
  
  for (const pattern of INSTANT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return 'instant';
    }
  }
  
  for (const pattern of WEB_SEARCH_PATTERNS) {
    if (pattern.test(trimmed)) {
      return 'web_search';
    }
  }
  
  for (const pattern of DIRECT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return 'direct';
    }
  }
  
  return null;
}

export async function classifyQuery(
  transcript: string,
  openai: OpenAI
): Promise<ClassificationResult> {
  const preClassification = preClassify(transcript);
  
  if (preClassification === 'instant') {
    const instantResponse = getInstantResponse(transcript);
    if (instantResponse) {
      return { type: 'instant', instantResponse };
    }
    return { type: 'direct' };
  }
  
  if (preClassification !== null) {
    return { type: preClassification };
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
    console.error('[Classifier] LLM classification failed:', error);
    return { type: 'direct' };
  }
}
