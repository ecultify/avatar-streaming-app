export type QueryType = 'web_search' | 'direct';

interface CacheEntry {
  response: string;
  timestamp: number;
  queryType: QueryType;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;
const REALTIME_CACHE_TTL = 30 * 1000;

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/[^\w\s]/g, '');
}

export function getCachedResponse(query: string): CacheEntry | null {
  const normalizedQuery = normalizeQuery(query);
  const entry = cache.get(normalizedQuery);
  
  if (!entry) return null;
  
  const ttl = entry.queryType === 'web_search' ? REALTIME_CACHE_TTL : CACHE_TTL;
  if (Date.now() - entry.timestamp > ttl) {
    cache.delete(normalizedQuery);
    return null;
  }
  
  console.log('[Cache] Hit for:', query.substring(0, 30));
  return entry;
}

export function setCachedResponse(query: string, response: string, queryType: QueryType): void {
  const normalizedQuery = normalizeQuery(query);
  cache.set(normalizedQuery, {
    response,
    timestamp: Date.now(),
    queryType
  });
  
  if (cache.size > 100) {
    cleanupCache();
  }
  
  console.log('[Cache] Stored response for:', query.substring(0, 30));
}

function cleanupCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
  console.log('[Cache] Cleanup complete, size:', cache.size);
}

export function clearCache(): void {
  cache.clear();
  console.log('[Cache] Cleared');
}
