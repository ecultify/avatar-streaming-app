import { API_CONFIG } from '../config';
import type { QueryType } from './queryClassifier';

interface CacheEntry {
  response: string;
  timestamp: number;
  queryType: string;
}

const cache = new Map<string, CacheEntry>();

function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

export function getCachedResponse(query: string): CacheEntry | null {
  const key = normalizeQuery(query);
  const entry = cache.get(key);
  
  if (!entry) return null;
  
  const ttl = entry.queryType === 'web_search' 
    ? API_CONFIG.CACHE_TTL_SEARCH 
    : API_CONFIG.CACHE_TTL_DIRECT;
  
  if (Date.now() - entry.timestamp > ttl) {
    cache.delete(key);
    return null;
  }
  
  return entry;
}

export function setCachedResponse(
  query: string, 
  response: string, 
  queryType: QueryType
): void {
  const key = normalizeQuery(query);
  
  cache.set(key, {
    response,
    timestamp: Date.now(),
    queryType
  });
  
  if (cache.size > 100) {
    cleanupCache();
  }
}

function cleanupCache(): void {
  const now = Date.now();
  const maxAge = Math.max(API_CONFIG.CACHE_TTL_DIRECT, API_CONFIG.CACHE_TTL_SEARCH);
  
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > maxAge) {
      cache.delete(key);
    }
  }
}

export function clearCache(): void {
  cache.clear();
}
