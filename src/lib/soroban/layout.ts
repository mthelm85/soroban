import type { Messages } from './messages';
import { SorobanError } from './types';

/** Rod counts real sorobans are built in. */
export const STANDARD_SIZES = [13, 17, 21, 23, 27, 31];

export function chooseRodCount(needed: number, m: Messages): number {
	const size = STANDARD_SIZES.find((s) => s >= needed);
	if (size === undefined) {
		throw new SorobanError(
			m.errors.tooManyRods({ needed, max: STANDARD_SIZES[STANDARD_SIZES.length - 1] })
		);
	}
	return size;
}

/**
 * Unit points (定位点) are the marks on the beam every third rod, counted from
 * the right-hand end — the same as a real soroban's comma marks.
 */
export function isUnitPoint(rod: number, rodCount: number): boolean {
	return (rodCount - 1 - rod) % 3 === 0;
}

/**
 * Pick a unit rod on a 定位点 that leaves room for `decimals` rods to its right
 * and `intDigits` rods to its left.
 *
 * `prefer` decides which of the valid unit points to take. "right" keeps the
 * work towards the right-hand end, which is where running totals normally sit.
 * "centre" balances the answer across the board — the better choice when the
 * board is otherwise empty, as it is in 両落とし.
 */
export function pickUnitRod(
	rodCount: number,
	decimals: number,
	intDigits: number,
	m: Messages,
	prefer: 'right' | 'centre' = 'right'
): number {
	const valid: number[] = [];
	for (let rod = rodCount - 1; rod >= 0; rod--) {
		if (!isUnitPoint(rod, rodCount)) continue;
		if (rod + decimals > rodCount - 1) continue;
		if (rod - intDigits + 1 < 1) continue; // keep at least one spare rod on the left
		valid.push(rod);
	}
	if (valid.length === 0) {
		throw new SorobanError(m.errors.doesNotFit);
	}
	if (prefer === 'right') return valid[0];

	// Centre the whole answer, decimals included, over the middle of the board.
	const width = intDigits + decimals;
	const ideal = (rodCount - 1 + width) / 2 - decimals;
	return valid.reduce((best, rod) =>
		Math.abs(rod - ideal) < Math.abs(best - ideal) ? rod : best
	);
}
