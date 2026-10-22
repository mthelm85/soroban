import { en } from './en';
import { ja } from './ja';
import type { Locale, Messages } from './types';

const CATALOGUES: Record<Locale, Messages> = { en, ja };

export function messagesFor(locale: Locale): Messages {
	return CATALOGUES[locale];
}

export { LOCALES } from './types';
export type { Locale, Messages, NoteText } from './types';
