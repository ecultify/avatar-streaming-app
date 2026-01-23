export function sanitizeForVoice(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/[^\s\])},"]+/gi, '')
    .replace(/www\.[^\s\])},"]+/gi, '')
    .replace(/\[\d+\]/g, '')
    .replace(/\[source\d*\]/gi, '')
    .replace(/\[citation[^\]]*\]/gi, '')
    .replace(/\[ref[^\]]*\]/gi, '')
    .replace(/\(source[^)]*\)/gi, '')
    .replace(/^(Source|Reference|Citation|Link|URL)s?:.*$/gim, '')
    .replace(/^(Learn more|Read more|Visit|Check out|See more|More info) at.*$/gim, '')
    .replace(/^For more (information|details).*$/gim, '')
    .replace(/according to [^,.]+(,|\.)/gi, '')
    .replace(/based on (my |the |our )?(search|research|findings)[^,.]*[,.]/gi, '')
    .replace(/I found (that |information |out )?/gi, '')
    .replace(/from what I('ve| have)? (found|gathered|learned)[^,.]*[,.]/gi, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/#+\s+/g, '')
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
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function truncateForVoice(text: string, maxSentences: number = 3): string {
  if (!text) return '';
  
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  if (sentences.length <= maxSentences) {
    return text.trim();
  }
  
  return sentences.slice(0, maxSentences).join(' ').trim();
}

export function prepareForVoice(text: string, maxSentences: number = 3): string {
  const sanitized = sanitizeForVoice(text);
  return truncateForVoice(sanitized, maxSentences);
}
