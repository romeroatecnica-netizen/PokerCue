import {CANONICAL_ORIGIN, LangCode, SUPPORTED_LANGS, TranslationBundle} from './types';

/**
 * Returns the canonical URL strictly derived from CANONICAL_ORIGIN.
 * Clean root for default English ('en'), ?lang=xx for all other languages.
 */
export function getCanonicalUrl(lang: LangCode): string {
  return lang === 'en' ? `${CANONICAL_ORIGIN}/` : `${CANONICAL_ORIGIN}/?lang=${lang}`;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string, hreflang?: string): void {
  if (typeof document === 'undefined') return;
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector(selector) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    if (hreflang) el.setAttribute('hreflang', hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function syncDocumentSeo(lang: LangCode, t: TranslationBundle): void {
  if (typeof document === 'undefined') return;

  const metaLang = SUPPORTED_LANGS.find((l) => l.code === lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = metaLang?.dir ?? 'ltr';

  document.title = t.seoTitle;
  upsertMeta('name', 'description', t.seoDescription);
  upsertMeta('name', 'keywords', t.seoKeywords);

  const canonicalHref = getCanonicalUrl(lang);
  upsertLink('canonical', canonicalHref);

  upsertLink('alternate', `${CANONICAL_ORIGIN}/`, 'x-default');
  for (const item of SUPPORTED_LANGS) {
    upsertLink('alternate', getCanonicalUrl(item.code), item.code);
  }

  upsertMeta('property', 'og:url', canonicalHref);
  upsertMeta('property', 'og:title', t.seoTitle);
  upsertMeta('property', 'og:description', t.seoDescription);
  upsertMeta('name', 'twitter:title', t.seoTitle);
  upsertMeta('name', 'twitter:description', t.seoDescription);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: t.seoTitle,
        url: canonicalHref,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'All',
        inLanguage: lang,
        description: t.seoDescription,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
      {
        '@type': 'HowTo',
        name: t.howToTitle,
        inLanguage: lang,
        step: t.howToSteps.map((s) => ({
          '@type': 'HowToStep',
          name: s.name,
          text: s.text,
        })),
      },
      {
        '@type': 'FAQPage',
        inLanguage: lang,
        mainEntity: t.faqItems.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    ],
  };

  let scriptEl = document.getElementById('pokercue-jsonld') as HTMLScriptElement | null;
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.type = 'application/ld+json';
    scriptEl.id = 'pokercue-jsonld';
    document.head.appendChild(scriptEl);
  }
  scriptEl.textContent = JSON.stringify(jsonLd);
}
