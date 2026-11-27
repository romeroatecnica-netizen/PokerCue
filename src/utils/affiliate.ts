export const AMAZON_ES_ORIGIN = 'https://www.amazon.es';
export const AMAZON_AFFILIATE_TAG = 'bastelar-21';

/**
 * Forces any Amazon product/search URL (or raw search query) onto https://www.amazon.es
 * and guarantees the Amazon Spain Associates tag=bastelar-21 parameter is present.
 */
export function enforceAmazonEsAffiliateUrl(urlOrQuery: string): string {
  const trimmed = urlOrQuery.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    const parsed = new URL(trimmed);
    parsed.protocol = 'https:';
    parsed.hostname = 'www.amazon.es';
    parsed.port = '';
    parsed.searchParams.set('tag', AMAZON_AFFILIATE_TAG);
    return parsed.toString();
  }

  const url = new URL('/s', AMAZON_ES_ORIGIN);
  url.searchParams.set('k', trimmed);
  url.searchParams.set('tag', AMAZON_AFFILIATE_TAG);
  return url.toString();
}

export function buildAmazonEsSearchUrl(query: string): string {
  return enforceAmazonEsAffiliateUrl(query);
}
