import type { Handle } from '@sveltejs/kit/hooks';

/**
 * Set <html lang> per language version. It matters beyond accessibility: the
 * browser uses it to choose Japanese rather than Chinese glyph forms for kanji.
 */
export const handle: Handle = ({ event, resolve }) => {
	// By route, not by path: on GitHub Pages every path starts with /soroban.
	const lang = event.route.id?.startsWith('/ja') ? 'ja' : 'en';
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', lang)
	});
};
