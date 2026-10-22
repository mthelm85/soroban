import type { Board, Rod } from './types';

export const MAX_EARTH = 4;

export function blankRod(): Rod {
	return { heaven: false, earth: 0 };
}

export function blankBoard(rodCount: number): Board {
	return Array.from({ length: rodCount }, blankRod);
}

export function cloneBoard(board: Board): Board {
	return board.map((rod) => ({ heaven: rod.heaven, earth: rod.earth }));
}

export function rodValue(rod: Rod): number {
	return (rod.heaven ? 5 : 0) + rod.earth;
}

export function rodFromDigit(digit: number): Rod {
	return { heaven: digit >= 5, earth: digit % 5 };
}

export function boardDigits(board: Board): number[] {
	return board.map(rodValue);
}

/** Read rods `from`..`to` inclusive as a single integer. */
export function readSpan(board: Board, from: number, to: number): number {
	let n = 0;
	for (let i = Math.max(0, from); i <= Math.min(board.length - 1, to); i++) {
		n = n * 10 + rodValue(board[i]);
	}
	return n;
}

/** Are all rods `from`..`to` inclusive zero? */
export function spanIsZero(board: Board, from: number, to: number): boolean {
	for (let i = Math.max(0, from); i <= Math.min(board.length - 1, to); i++) {
		if (rodValue(board[i]) !== 0) return false;
	}
	return true;
}

/**
 * Render rods `from`..`to` as a human-readable number, with `unitRod` marking
 * the ones place. Leading zeros and trailing fractional zeros are dropped. The
 * unit rod may sit outside the span, which happens when a product or quotient
 * is very small or very large; the missing places are filled with zeros.
 */
export function formatSpan(board: Board, from: number, to: number, unitRod: number): string {
	const digits: number[] = [];
	for (let i = Math.max(0, from); i <= Math.min(board.length - 1, to); i++) {
		digits.push(rodValue(board[i]));
	}
	// How many of the leading digits belong to the integer part.
	const split = unitRod - from + 1;

	let intDigits: number[];
	let fracDigits: number[];
	if (split <= 0) {
		// Unit rod is left of the span: 0.00…<digits>
		intDigits = [0];
		fracDigits = [...Array(-split).fill(0), ...digits];
	} else if (split >= digits.length) {
		// Unit rod is right of the span: <digits>00…
		intDigits = [...digits, ...Array(split - digits.length).fill(0)];
		fracDigits = [];
	} else {
		intDigits = digits.slice(0, split);
		fracDigits = digits.slice(split);
	}

	while (intDigits.length > 1 && intDigits[0] === 0) intDigits.shift();
	while (fracDigits.length > 0 && fracDigits[fracDigits.length - 1] === 0) fracDigits.pop();
	const head = intDigits.length ? intDigits.join('') : '0';
	return fracDigits.length ? `${head}.${fracDigits.join('')}` : head;
}
