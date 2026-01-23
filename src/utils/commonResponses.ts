const INSTANT_RESPONSES: Record<string, string[]> = {
  'hello': [
    "Hey there! How can I help you today?",
    "Hi! What's on your mind?",
    "Hello! Great to chat with you."
  ],
  'hi': [
    "Hi! What can I do for you?",
    "Hey! How's it going?",
    "Hi there! What's up?"
  ],
  'hey': [
    "Hey! What can I help you with?",
    "Hey there! What's on your mind?",
    "Hey! Nice to hear from you."
  ],
  'good morning': [
    "Good morning! Hope you're having a great day. What can I help with?",
    "Morning! How can I assist you today?",
    "Good morning! What's up?"
  ],
  'good afternoon': [
    "Good afternoon! How can I help you?",
    "Afternoon! What can I do for you?",
    "Good afternoon! What's on your mind?"
  ],
  'good evening': [
    "Good evening! How can I help you tonight?",
    "Evening! What can I do for you?",
    "Good evening! What brings you here?"
  ],
  'thank you': [
    "You're welcome! Let me know if you need anything else.",
    "Happy to help! Anything else?",
    "No problem at all!"
  ],
  'thanks': [
    "You're welcome!",
    "No problem!",
    "Anytime!"
  ],
  'bye': [
    "Goodbye! Have a great day!",
    "See you later! Take care!",
    "Bye! Feel free to come back anytime."
  ],
  'goodbye': [
    "Goodbye! Take care!",
    "See you! Have a wonderful day!",
    "Bye for now!"
  ],
  'how are you': [
    "I'm doing great, thanks for asking! How about you?",
    "I'm good! What can I help you with today?",
    "Doing well, thanks! What's on your mind?"
  ],
  "what's up": [
    "Not much, just here to help! What do you need?",
    "Hey! I'm ready to assist. What's going on?",
    "All good here! What can I do for you?"
  ],
  'whats up': [
    "Not much! What can I help you with?",
    "Hey! What's going on?",
    "All good! What do you need?"
  ],
};

function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

function getRandomResponse(responses: string[]): string {
  return responses[Math.floor(Math.random() * responses.length)];
}

export function getInstantResponse(query: string): string | null {
  const normalized = normalizeQuery(query);
  const responses = INSTANT_RESPONSES[normalized];
  
  if (responses) {
    return getRandomResponse(responses);
  }
  
  for (const [key, value] of Object.entries(INSTANT_RESPONSES)) {
    if (normalized.startsWith(key) || normalized.endsWith(key)) {
      return getRandomResponse(value);
    }
  }
  
  return null;
}

export function isCommonQuery(query: string): boolean {
  const normalized = normalizeQuery(query);
  
  if (INSTANT_RESPONSES[normalized]) return true;
  
  for (const key of Object.keys(INSTANT_RESPONSES)) {
    if (normalized.startsWith(key) || normalized.endsWith(key)) {
      return true;
    }
  }
  
  return false;
}
