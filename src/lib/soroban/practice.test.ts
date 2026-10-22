import { describe, expect, it } from 'vitest';
import { LEVELS, dealProblem, fitsLevel, levelById, nextLevel } from './practice';
import { parseProblem } from './parse';
import { messagesFor } from './messages';
import { solve } from './index';

/** A small seeded generator (mulberry32), so every run deals the same problems. */
function seeded(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const m = messagesFor('en');

/** Every technique a problem uses: each step's own move, and the phase it belongs to. */
function moves(problem: string): string[] {
	return solve(problem).steps.flatMap((s) =>
		s.phaseTechnique ? [s.technique, s.phaseTechnique] : [s.technique]
	);
}

describe('practice levels', () => {
	for (const level of LEVELS) {
		it(`${level.id}: deals problems that fit the level`, () => {
			const rng = seeded(level.id.length * 7919);
			for (let i = 0; i < 40; i++) {
				const problem = dealProblem(level.id, rng);
				expect(fitsLevel(level, problem), problem).toBe(true);
				const parsed = parseProblem(problem, m);
				expect(parsed.kind === 'multiply' || parsed.kind === 'divide' ? parsed.kind : 'addsub').toBe(
					level.track
				);
			}
		});
	}

	it('keeps "first beads" to direct moves, "fives" off carries', () => {
		const rng = seeded(11);
		for (let i = 0; i < 40; i++) {
			const techniques = moves(dealProblem('fives', rng));
			expect(techniques.some((t) => t.startsWith('five-'))).toBe(true);
			expect(techniques.some((t) => t.startsWith('ten-'))).toBe(false);
		}
		for (let i = 0; i < 40; i++) {
			const techniques = moves(dealProblem('first-beads', rng));
			expect(techniques.every((t) => t === 'set' || t.startsWith('direct-'))).toBe(true);
		}
	});

	it('always makes tens problems carry or borrow', () => {
		const rng = seeded(23);
		for (let i = 0; i < 40; i++) {
			const techniques = moves(dealProblem('tens', rng));
			expect(techniques.some((t) => t.startsWith('ten-'))).toBe(true);
		}
	});

	it('deals divisions that come out exactly', () => {
		const rng = seeded(5);
		for (const id of ['div-1', 'div-2'] as const) {
			for (let i = 0; i < 20; i++) {
				const [dividend, divisor] = dealProblem(id, rng).split(' ÷ ').map(Number);
				expect(dividend % divisor).toBe(0);
			}
		}
	});

	it('never deals the problem it was asked to avoid', () => {
		const rng = seeded(3);
		let last = dealProblem('mul-2x1', rng);
		for (let i = 0; i < 30; i++) {
			const next = dealProblem('mul-2x1', rng, last);
			expect(next).not.toBe(last);
			last = next;
		}
	});

	it('orders the levels so each leads to the next', () => {
		expect(nextLevel('first-beads')?.id).toBe('fives');
		expect(nextLevel('div-2')).toBeNull();
		expect(levelById('tens').track).toBe('addsub');
	});
});

describe('chains of a chosen length', () => {
	for (const level of LEVELS.filter((l) => l.term)) {
		it(`${level.id}: deals chains of 3, 10 and 15 numbers that fit the level`, () => {
			const rng = seeded(level.id.length * 104729);
			for (const count of [3, 10, 15]) {
				for (let i = 0; i < 4; i++) {
					const problem = dealProblem(level.id, rng, undefined, count);
					expect(problem.split(/ [+−] /).length, problem).toBe(count);
					expect(fitsLevel(level, problem), problem).toBe(true);
				}
			}
		});
	}

	it('keeps a long "fives" chain free of carries', () => {
		const rng = seeded(77);
		for (let i = 0; i < 5; i++) {
			const techniques = moves(dealProblem('fives', rng, undefined, 15));
			expect(techniques.some((t) => t.startsWith('ten-'))).toBe(false);
		}
	});
});
