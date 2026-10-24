import type { Locale } from '#lib/soroban/index.js';

/**
 * Where the site is published. Search engines and link previews need full
 * URLs, so canonical links, hreflang alternates, the sitemap and the social
 * card all start from here, whatever host the page happens to be running on.
 */
export const SITE_URL = 'https://mthelm85.github.io/soroban';

/** Each language version's public address. */
export const PAGE_URL: Record<Locale, string> = {
	en: `${SITE_URL}/`,
	ja: `${SITE_URL}/ja`
};

/** The card shown when a link to the site is shared (1200 × 630). */
export const SOCIAL_IMAGE = `${SITE_URL}/og-image.png`;
