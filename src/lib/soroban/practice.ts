import { solve } from './index';
import type { TechniqueId } from './types';

/**
 * Practice problems, graded the way soroban schools grade them: one new move
 * at a time, then more digits, then longer chains, then multiplication and
 * division.
 *
 * Each level deals random problems, but a problem only counts if working it
 * actually exercises the level. The engine solves every candidate and reports
 * the technique behind each move, and a candidate is kept only when its moves
 * are all allowed at the level and include the one the level is for. So a
 * "fives" problem is certain to need a five-complement and certain not to need
 * a carry — not merely likely to.
 */

export type LevelId =
	| 'first-beads'
	| 'fives'
	| 'tens'
	| 'two-digits'
	| 'chains'
	| 'long-chains'
	| 'mul-2x1'
	| 'mul-2x2'
	| 'mul-3x2'
	| 'div-1'
	| 'div-2';

export type Track = 'addsub' | 'multiply' | 'divide';

export interface Level {
	id: LevelId;
	track: Track;
	/** Builds one candidate problem. */
	make: (rng: Rng) => string;
	/** Moves allowed anywhere in the problem; null allows every move. */
	allowed: readonly TechniqueId[] | null;
	/** At least one move must be one of these; null requires nothing. */
	requires: readonly TechniqueId[] | null;
}

/** A source of random numbers in [0, 1). */
export type Rng = () => number;

const SET: TechniqueId[] = ['set'];
const DIRECT: TechniqueId[] = ['direct-add', 'direct-sub'];
const FIVES: TechniqueId[] = ['five-composition', 'five-decomposition'];
const TENS: TechniqueId[] = ['ten-carry', 'ten-carry-five', 'ten-borrow', 'ten-borrow-five'];

function int(rng: Rng, lo: number, hi: number): number {
	return lo + Math.floor(rng() * (hi - lo + 1));
}

/** A whole number with exactly `n` digits. */
function digits(rng: Rng, n: number): number {
	return int(rng, 10 ** (n - 1), 10 ** n - 1);
}

/**
 * A chain of `terms` numbers of `size` digits each, added and subtracted at
 * random, never letting the running total fall below zero — the board cannot
 * show a negative number.
 */
function chain(rng: Rng, terms: number, size: () => number): string {
	let total = size();
	let text = String(total);
	for (let i = 1; i < terms; i++) {
		const n = size();
		if (rng() < 0.4 && total >= n) {
			total -= n;
			text += ` − ${n}`;
		} else {
			total += n;
			text += ` + ${n}`;
		}
	}
	return text;
}

/** An exact division: the dividend is built from the divisor and quotient. */
function exactDivision(rng: Rng, divisor: number, quotientDigits: number): string {
	const quotient = digits(rng, quotientDigits);
	return `${divisor * quotient} ÷ ${divisor}`;
}

export const LEVELS: readonly Level[] = [
	{
		id: 'first-beads',
		track: 'addsub',
		make: (rng) => chain(rng, int(rng, 2, 3), () => int(rng, 1, 9)),
		allowed: [...SET, ...DIRECT],
		requires: DIRECT
	},
	{
		id: 'fives',
		track: 'addsub',
		make: (rng) => chain(rng, int(rng, 2, 3), () => int(rng, 1, 9)),
		allowed: [...SET, ...DIRECT, ...FIVES],
		requires: FIVES
	},
	{
		id: 'tens',
		track: 'addsub',
		make: (rng) => chain(rng, int(rng, 2, 3), () => int(rng, 1, 9)),
		allowed: null,
		requires: TENS
	},
	{
		id: 'two-digits',
		track: 'addsub',
		make: (rng) => chain(rng, 2, () => digits(rng, 2)),
		allowed: null,
		requires: null
	},
	{
		id: 'chains',
		track: 'addsub',
		make: (rng) => chain(rng, 4, () => digits(rng, 2)),
		allowed: null,
		requires: null
	},
	{
		id: 'long-chains',
		track: 'addsub',
		make: (rng) => chain(rng, 5, () => digits(rng, int(rng, 2, 3))),
		allowed: null,
		requires: null
	},
	{
		id: 'mul-2x1',
		track: 'multiply',
		make: (rng) => `${digits(rng, 2)} × ${int(rng, 2, 9)}`,
		allowed: null,
		requires: null
	},
	{
		id: 'mul-2x2',
		track: 'multiply',
		make: (rng) => `${digits(rng, 2)} × ${digits(rng, 2)}`,
		allowed: null,
		requires: null
	},
	{
		id: 'mul-3x2',
		track: 'multiply',
		make: (rng) => `${digits(rng, 3)} × ${digits(rng, 2)}`,
		allowed: null,
		requires: null
	},
	{
		id: 'div-1',
		track: 'divide',
		make: (rng) => exactDivision(rng, int(rng, 2, 9), int(rng, 2, 3)),
		allowed: null,
		requires: null
	},
	{
		id: 'div-2',
		track: 'divide',
		make: (rng) => exactDivision(rng, int(rng, 12, 98), 2),
		allowed: null,
		requires: null
	}
];

export function levelById(id: LevelId): Level {
	const level = LEVELS.find((l) => l.id === id);
	if (!level) throw new Error(`Unknown practice level: ${id}`);
	return level;
}

/** The level after this one, or null at the end. */
export function nextLevel(id: LevelId): Level | null {
	const i = LEVELS.findIndex((l) => l.id === id);
	return LEVELS[i + 1] ?? null;
}

/** Whether a problem's moves fit the level: all allowed, and the required one used. */
export function fitsLevel(level: Level, problem: string): boolean {
	let used: TechniqueId[];
	try {
		used = solve(problem).steps.flatMap((step) =>
			step.phaseTechnique ? [step.technique, step.phaseTechnique] : [step.technique]
		);
	} catch {
		return false;
	}
	const allowed = level.allowed;
	const requires = level.requires;
	if (allowed && !used.every((t) => allowed.includes(t))) return false;
	if (requires && !used.some((t) => requires.includes(t))) return false;
	return true;
}

const ATTEMPTS = 400;

/**
 * Deal a problem for the level. `avoid` is the problem just worked, so the
 * same one is not dealt twice running.
 */
export function dealProblem(id: LevelId, rng: Rng = Math.random, avoid?: string): string {
	const level = levelById(id);
	for (let i = 0; i < ATTEMPTS; i++) {
		const problem = level.make(rng);
		if (problem !== avoid && fitsLevel(level, problem)) return problem;
	}
	throw new Error(`Could not deal a problem for level ${id}`);
}
