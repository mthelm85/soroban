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
	/**
	 * Addition and subtraction levels only: one number of the chain. Lets a
	 * chain be dealt at any length (for flash and read-aloud drills) while
	 * keeping the level's size of number.
	 */
	term?: (rng: Rng) => number;
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
		term: (rng) => int(rng, 1, 9),
		allowed: [...SET, ...DIRECT],
		requires: DIRECT
	},
	{
		id: 'fives',
		track: 'addsub',
		make: (rng) => chain(rng, int(rng, 2, 3), () => int(rng, 1, 9)),
		term: (rng) => int(rng, 1, 9),
		allowed: [...SET, ...DIRECT, ...FIVES],
		requires: FIVES
	},
	{
		id: 'tens',
		track: 'addsub',
		make: (rng) => chain(rng, int(rng, 2, 3), () => int(rng, 1, 9)),
		term: (rng) => int(rng, 1, 9),
		allowed: null,
		requires: TENS
	},
	{
		id: 'two-digits',
		track: 'addsub',
		make: (rng) => chain(rng, 2, () => digits(rng, 2)),
		term: (rng) => digits(rng, 2),
		allowed: null,
		requires: null
	},
	{
		id: 'chains',
		track: 'addsub',
		make: (rng) => chain(rng, 4, () => digits(rng, 2)),
		term: (rng) => digits(rng, 2),
		allowed: null,
		requires: null
	},
	{
		id: 'long-chains',
		track: 'addsub',
		make: (rng) => chain(rng, 5, () => digits(rng, int(rng, 2, 3))),
		term: (rng) => digits(rng, int(rng, 2, 3)),
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

/** Every technique working the problem uses, or null if it cannot be worked. */
function movesOf(problem: string): TechniqueId[] | null {
	try {
		return solve(problem).steps.flatMap((step) =>
			step.phaseTechnique ? [step.technique, step.phaseTechnique] : [step.technique]
		);
	} catch {
		return null;
	}
}

function onlyAllowed(level: Level, used: TechniqueId[]): boolean {
	const allowed = level.allowed;
	return !allowed || used.every((t) => allowed.includes(t));
}

/** Whether a problem's moves fit the level: all allowed, and the required one used. */
export function fitsLevel(level: Level, problem: string): boolean {
	const used = movesOf(problem);
	if (!used || !onlyAllowed(level, used)) return false;
	const requires = level.requires;
	return !requires || used.some((t) => requires.includes(t));
}

/** Whether a level can deal chains of a chosen length. */
export function dealsChains(id: LevelId): boolean {
	return levelById(id).term !== undefined;
}

/**
 * A chain of exactly `count` numbers at the level. It is grown a number at a
 * time, each one kept only if the chain so far still uses nothing but the
 * level's moves, so even a long chain at "Fives" never needs a carry; the
 * whole chain must then use the move the level is for.
 */
function dealChain(level: Level, count: number, rng: Rng, avoid?: string): string | null {
	const term = level.term;
	if (!term) return null;
	for (let attempt = 0; attempt < 60; attempt++) {
		let total = term(rng);
		let text = String(total);
		for (let k = 1; k < count && text; k++) {
			let grown = '';
			for (let tries = 0; tries < 40 && !grown; tries++) {
				const n = term(rng);
				const subtract = rng() < 0.4 && total >= n;
				const candidate = `${text} ${subtract ? '−' : '+'} ${n}`;
				const used = movesOf(candidate);
				if (used && onlyAllowed(level, used)) {
					grown = candidate;
					total += subtract ? -n : n;
				}
			}
			text = grown;
		}
		if (text && text !== avoid && fitsLevel(level, text)) return text;
	}
	return null;
}

const ATTEMPTS = 400;

/**
 * Deal a problem for the level. `avoid` is the problem just worked, so the
 * same one is not dealt twice running.
 */
export function dealProblem(
	id: LevelId,
	rng: Rng = Math.random,
	avoid?: string,
	/** For addition and subtraction levels: how many numbers in the chain. */
	count?: number
): string {
	const level = levelById(id);
	if (count && level.term) {
		const problem = dealChain(level, count, rng, avoid);
		if (problem) return problem;
		throw new Error(`Could not deal a chain of ${count} for level ${id}`);
	}
	for (let i = 0; i < ATTEMPTS; i++) {
		const problem = level.make(rng);
		if (problem !== avoid && fitsLevel(level, problem)) return problem;
	}
	throw new Error(`Could not deal a problem for level ${id}`);
}
