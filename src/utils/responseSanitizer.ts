export function sanitizeForVoice(text: string): string {
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

export function truncateForVoice(text: string, maxSentences: number = 3): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.slice(0, maxSentences).join(' ').trim();
}

export function cleanResponseForAvatar(text: string): string {
  let cleaned = sanitizeForVoice(text);
  cleaned = truncateForVoice(cleaned, 3);
  return cleaned;
}
