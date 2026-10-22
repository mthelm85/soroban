/**
 * Core data model for the soroban (算盤).
 *
 * One rod (桁) carries a single heaven bead (五玉, worth 5) above the beam (梁)
 * and four earth beads (一玉, worth 1 each) below it. A bead counts only when it
 * has been pushed *towards* the beam.
 */
export interface Rod {
	/** true when the heaven bead has been pushed down against the beam. */
	heaven: boolean;
	/** how many earth beads (0..4) have been pushed up against the beam. */
	earth: number;
}

/** The whole board. Index 0 is the leftmost rod (most significant). */
export type Board = Rod[];

/**
 * Traditional named techniques. The Japanese terms are the ones used by
 * Japanese soroban schools; see docs/METHODS.md for sources.
 */
export type TechniqueId =
	| 'set'
	| 'clear'
	| 'locate'
	| 'kakusho'
	| 'direct-add'
	| 'direct-sub'
	| 'five-composition'
	| 'five-decomposition'
	| 'ten-carry'
	| 'ten-carry-five'
	| 'ten-borrow'
	| 'ten-borrow-five';

export interface TechniqueInfo {
	id: TechniqueId;
	/** Japanese name. */
	ja: string;
	/** Romanised reading. */
	romaji: string;
	/** English name. */
	en: string;
	/** The rule in symbols, e.g. "+n ⇒ +5 −(5−n)". */
	rule: string;
}

/** What a single step is doing inside its phase. */
export type StepRole =
	| 'set'
	| 'clear'
	| 'main'
	| 'carry'
	| 'borrow'
	| 'complement'
	| 'product'
	| 'quotient';

export interface Step {
	index: number;
	/** Outermost grouping — one pass of the method, e.g. "Multiply by the 3". */
	section: string;
	/** Middle grouping, e.g. "Add 456" or "3 × 4 = 12". */
	group: string;
	/** Why this group lands where it does — the place-value reasoning. */
	groupWhy: string;
	/** The single digit operation this step belongs to, e.g. "ones rod: 7 + 5". */
	phase: string;
	/** Composite technique that names the whole phase, when there is one. */
	phaseTechnique: TechniqueId | null;
	/** Bead mechanics for this one step. */
	technique: TechniqueId;
	role: StepRole;
	/** Compact arithmetic form of this step, e.g. "+5 −2". */
	formula: string;
	/** One-line narration of what moves. */
	text: string;
	/** Why this move is the one the method calls for. */
	why: string;
	/** Rods whose beads move in this step. */
	rods: number[];
	before: Board;
	after: Board;
	/**
	 * Labels for the board after this step, when they change as the work goes
	 * on (division: the quotient grows into rods the dividend leaves). Absent,
	 * the solution's own regions hold throughout.
	 */
	regions?: Region[];
}

/** A labelled span of rods, drawn as a bracket under the board. */
export interface Region {
	label: string;
	labelJa: string;
	from: number;
	to: number;
	/** Rod holding this region's ones digit, when meaningful. */
	unitRod?: number;
	tone: 'operand' | 'result' | 'work';
}

export interface Note {
	heading: string;
	headingJa?: string;
	body: string;
}

export interface Solution {
	problem: string;
	answer: string;
	operation: 'addsub' | 'multiply' | 'divide';
	rodCount: number;
	/** Rod holding the ones digit of the headline answer. */
	unitRod: number;
	/** Rods the headline answer is read from, inclusive. */
	answerSpan: [number, number];
	initial: Board;
	steps: Step[];
	regions: Region[];
	/** Method notes shown beside the board (place value rule, method name, …). */
	notes: Note[];
	/** True when the answer was cut off and goes on (a division that does not come out). */
	continues?: boolean;
}

export class SorobanError extends Error {}
