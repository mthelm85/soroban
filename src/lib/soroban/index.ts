import { solveAddSub } from './addsub';
import { DEFAULT_MAX_DECIMALS, solveDivide } from './divide';
import { messagesFor, type Locale } from './messages';
import { solveMultiply } from './multiply';
import { parseProblem } from './parse';
import type { Solution } from './types';

export interface SolveOptions {
	/** How far to carry a division that does not come out exactly. */
	maxDecimals?: number;
	/** Language every step is narrated in. */
	locale?: Locale;
}

/** Parse a problem and work it through on the soroban. */
export function solve(input: string, options: SolveOptions = {}): Solution {
	const m = messagesFor(options.locale ?? 'en');
	const problem = parseProblem(input, m);
	switch (problem.kind) {
		case 'multiply':
			return solveMultiply(problem, m);
		case 'divide':
			return solveDivide(problem, m, options.maxDecimals ?? DEFAULT_MAX_DECIMALS);
		default:
			return solveAddSub(problem, m);
	}
}

export { DEFAULT_MAX_DECIMALS } from './divide';
export * from './board';
export * from './layout';
export { TECHNIQUES } from './techniques';
export { kuku } from './kuku';
export { parseProblem, decToString } from './parse';
export { messagesFor, LOCALES } from './messages';
export type { Locale, Messages } from './messages';
export type { Dec, Problem } from './parse';
export type {
	Board,
	Note,
	Region,
	Rod,
	Solution,
	Step,
	StepRole,
	TechniqueId,
	TechniqueInfo
} from './types';
export { SorobanError } from './types';
