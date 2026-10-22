/**
 * Every user-facing string the engine produces, as a typed contract.
 *
 * Each locale implements this interface in full, so a missing or misnamed
 * message is a compile error rather than a silent English fallback. Keeping all
 * of one language in one file also means a native speaker can review the whole
 * site by reading a single file.
 */
export type Locale = 'en' | 'ja';

export const LOCALES: readonly Locale[] = ['en', 'ja'];

/** A method note: a heading, the Japanese term it names, and the explanation. */
export interface NoteText {
	heading: string;
	/** The Japanese term, shown beside the heading. Omitted when the heading already is it. */
	term?: string;
	body: string;
}

interface Placed {
	place: string;
}

export interface Messages {
	readonly locale: Locale;

	/** Name of a place by its power of ten: 0 is ones, 1 is tens, −1 is tenths. */
	place(power: number): string;

	/** The digit-level techniques in arithmetic.ts. */
	bead: {
		addFive(p: Placed & { extra: number }): string;
		addFiveWhy(p: { n: number; extra: number }): string;
		addEarth(p: Placed & { n: number }): string;
		addEarthWhy(p: { n: number; free: number }): string;
		fiveComposition(p: Placed & { give: number }): string;
		fiveCompositionWhy(p: { n: number; free: number; give: number }): string;

		subFive(p: Placed & { extra: number }): string;
		subFiveWhy(p: { n: number; extra: number }): string;
		subEarth(p: Placed & { n: number }): string;
		subEarthWhy(p: { n: number; ones: number }): string;
		fiveDecomposition(p: Placed & { give: number }): string;
		fiveDecompositionWhy(p: { n: number; ones: number; give: number }): string;

		/** The carried one itself: why a bead is going onto the next rod. */
		carryIn(p: Placed & { value: number; n: number }): string;
		/** The borrowed one itself: why a bead is coming off the next rod. */
		borrowIn(p: Placed & { value: number; n: number }): string;
		carryWhy(p: { value: number; n: number; complement: number; leftPlace: string }): string;
		borrowWhy(p: { value: number; n: number; complement: number; leftPlace: string }): string;

		phaseAdd(p: Placed & { value: number; n: number }): string;
		phaseSub(p: Placed & { value: number; n: number }): string;
	};

	addsub: {
		setLabel(value: string): string;
		addLabel(value: string): string;
		subLabel(value: string): string;
		groupWhy: string;
		setText(value: string): string;
		setWhy: string;
		region: string;
		notes: NoteText[];
	};

	multiply: {
		setup: string;
		locateGroup: string;
		locateGroupWhy: string;
		locateText: string;
		locateWhy: string;
		section(p: { digit: number; multiplier: string }): string;
		product(p: { a: number; b: number; product: number; kuku: string }): string;
		productWhy(p: {
			a: number;
			aPlace: string;
			b: number;
			bPlace: string;
			k: number;
			j: number;
		}): string;
		region: string;
		notes: NoteText[];
	};

	divide: {
		setup: string;
		/** The setup's heading: names the divisor, which stays off the board. */
		setGroup(divisor: string): string;
		setGroupWhy: string;
		setText(dividend: string): string;
		setWhy(p: { d: number }): string;
		section(quotientPlace: string): string;
		doesNotGo(p: { divisor: number; segment: number }): string;
		divides(p: { divisor: number; segment: number; q: number }): string;
		settleWhy(p: { segment: number }): string;
		zeroWhy(p: { divisor: number; segment: number }): string;
		digitWhy(p: { divisor: number; q: number; segment: number }): string;
		zeroText(p: { divisor: number; segment: number; quotientPlace: string }): string;
		digitText(p: { q: number; quotientPlace: string }): string;
		subtract(p: { q: number; digit: number; product: number; kuku: string }): string;
		/** `i` counts the divisor's digits from the left, starting at 0. */
		subtractWhy(p: { q: number; digit: number; i: number }): string;
		regionQuotient: string;
		regionDividend: string;
		notes: {
			method: NoteText;
			kakusho: NoteText;
			placeValue(p: { d: number }): NoteText;
			firstDigit(p: { divisor: number; d: number; lead: number; fits: boolean }): NoteText;
			notExact(p: { maxDecimals: number }): NoteText;
		};
	};

	errors: {
		needRodsLeft: string;
		carryNowhere: string;
		nothingToBorrow: string;
		doesNotFit: string;
		tooManyRods(p: { needed: number; max: number }): string;
		notANumber(raw: string): string;
		tooManyDigits(max: number): string;
		empty: string;
		endsWithOperator: string;
		doubled: string;
		mulDivTwo: string;
		negativeStart: string;
		divideByZero: string;
		multiplyByZero: string;
		negativeRunning(term: string): string;
	};
}
