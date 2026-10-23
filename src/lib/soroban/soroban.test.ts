import { describe, expect, it } from 'vitest';
import { solve } from './index';
import { formatSpan, rodValue } from './board';
import type { Solution } from './types';

/** Read the headline answer off the final board state. */
function readAnswer(solution: Solution): string {
	const board = solution.steps.length
		? solution.steps[solution.steps.length - 1].after
		: solution.initial;
	return formatSpan(board, solution.answerSpan[0], solution.answerSpan[1], solution.unitRod);
}

/**
 * Every solution must be a physically valid sequence of bead movements: rods
 * always hold 0..9, and each step must start from exactly where the last ended.
 */
function expectWellFormed(solution: Solution) {
	let previous = solution.initial;
	for (const step of solution.steps) {
		// Every move has to be able to explain itself — that is the whole point.
		expect(step.why, `step ${step.index + 1} has no reasoning`).not.toBe('');
		expect(step.before.map(rodValue)).toEqual(previous.map(rodValue));
		for (const rod of step.after) {
			expect(rod.earth).toBeGreaterThanOrEqual(0);
			expect(rod.earth).toBeLessThanOrEqual(4);
		}
		// A step must only move beads on the rods it claims.
		step.before.forEach((rod, i) => {
			if (step.rods.includes(i)) return;
			expect(rodValue(step.after[i])).toBe(rodValue(rod));
		});
		previous = step.after;
	}
	expect(solution.answer).toBe(readAnswer(solution));
}

function check(problem: string, expected: string) {
	const solution = solve(problem);
	expectWellFormed(solution);
	expect(solution.answer, `${problem} = ${expected}`).toBe(expected);
	return solution;
}

describe('addition and subtraction (見取り算)', () => {
	it('adds without a carry', () => check('12 + 23', '35'));
	it('uses the five bead (五の合成)', () => check('4 + 3', '7'));
	it('carries (十の繰り上がり)', () => check('7 + 5', '12'));
	it('carries from a full rod', () => check('9 + 1', '10'));
	it('cascades carries', () => check('999 + 1', '1000'));
	it('subtracts with the five bead (五の分解)', () => check('6 - 2', '4'));
	it('borrows (十の繰り下がり)', () => check('12 - 5', '7'));
	it('cascades borrows', () => check('1000 - 1', '999'));
	it('runs a chain', () => check('123 + 456 - 78 + 9', '510'));
	it('handles decimals', () => check('1.25 + 3.5', '4.75'));
	it('handles decimal subtraction', () => check('10 - 0.25', '9.75'));

	it('names the techniques correctly', () => {
		expect(solve('4 + 3').steps.at(-1)?.technique).toBe('five-composition');
		expect(solve('6 - 2').steps.at(-1)?.technique).toBe('five-decomposition');
		expect(solve('7 + 5').steps.at(-1)?.phaseTechnique).toBe('ten-carry');
		expect(solve('12 - 5').steps.at(-1)?.phaseTechnique).toBe('ten-borrow');
		// 6 + 8 ⇒ +10 then −2, and −2 has to break the five bead.
		expect(solve('6 + 8').steps.at(-1)?.phaseTechnique).toBe('ten-carry-five');
		// 11 − 6 ⇒ −10 then +4, and +4 has to use the five bead.
		expect(solve('11 - 6').steps.at(-1)?.phaseTechnique).toBe('ten-borrow-five');
	});

	it('explains the carried and borrowed bead itself', () => {
		// The +1 of a carry is a plain move, but it must not read as one.
		const carry = solve('7 + 5').steps.find((s) => s.role === 'carry');
		expect(carry?.why).toMatch(/^This is the carry/);
		expect(carry?.why).not.toMatch(/no complement/);
		const borrow = solve('12 - 5').steps.find((s) => s.role === 'borrow');
		expect(borrow?.why).toMatch(/^This is the borrow/);
		// A carried bead that also needs the five explains both.
		const both = solve('49 + 1').steps.find((s) => s.role === 'carry');
		expect(both?.technique).toBe('five-composition');
		expect(both?.why).toMatch(/^This is the carry.*five bead/);
	});

	it('refuses to go negative', () => {
		expect(() => solve('5 - 8')).toThrow(/negative/i);
	});
});

describe('multiplication (両落とし)', () => {
	it('single digits', () => check('3 * 4', '12'));
	it('two by two', () => check('23 * 45', '1035'));
	it('two by three', () => check('12 * 345', '4140'));
	it('the worked example from the sources', () => check('59 * 263', '15517'));
	it('carries across partial products', () => check('99 * 99', '9801'));
	it('handles an inner zero', () => check('105 * 23', '2415'));
	it('handles decimals', () => check('1.5 * 2.5', '3.75'));
	it('handles a small decimal', () => check('0.25 * 0.4', '0.1'));

	it('places neither factor on the board', () => {
		const solution = solve('23 * 45');
		// Nothing is ever set as an operand, and nothing is swept off again.
		expect(solution.steps.some((s) => s.technique === 'set')).toBe(false);
		expect(solution.steps.some((s) => s.technique === 'clear')).toBe(false);
		// Only the product's own rods are ever touched.
		const [from, to] = solution.answerSpan;
		for (const step of solution.steps) {
			step.after.forEach((rod, i) => {
				if (i < from || i > to) expect(rodValue(rod)).toBe(0);
			});
		}
	});

	it('works both factors from the highest digit down', () => {
		const order = [
			...new Set(
				solve('23 * 45')
					.steps.map((s) => s.group)
					.filter((g) => g.includes('×') && g.includes('='))
			)
		];
		expect(order).toEqual([
			expect.stringContaining('2 × 4 = 8'),
			expect.stringContaining('2 × 5 = 10'),
			expect.stringContaining('3 × 4 = 12'),
			expect.stringContaining('3 × 5 = 15')
		]);
	});

	it('places each product by the sum of the two place indices', () => {
		const groupWhy = solve('23 * 45')
			.steps.map((s) => s.groupWhy)
			.find((w) => w.includes('1 + 1'));
		expect(groupWhy).toContain('2 rods left');
	});
});

describe('division (商除法 / 片落とし)', () => {
	it('never places the divisor on the board', () => {
		const solution = solve('4104 / 76');
		const placed = solution.steps.filter((s) => s.role === 'set');
		expect(placed).toHaveLength(1);
		expect(placed[0].formula).toBe('4104');
	});

	it('settles each quotient digit by 確商 before placing it', () => {
		const first = solve('4104 / 76').steps.find((s) => s.role === 'quotient');
		expect(first?.technique).toBe('kakusho');
		// The multiple that fits and the one that does not, both named up front.
		expect(first?.why).toContain('76 × 5 = 380');
		expect(first?.why).toContain('76 × 6 = 456');
	});

	it('exact single digit divisor', () => check('18 / 2', '9'));
	it('two digit quotient', () => check('84 / 2', '42'));
	it('two digit divisor', () => check('4116 / 42', '98'));
	it('the worked example from the sources', () => check('4104 / 76', '54'));
	it('quotient below one', () => check('5 / 25', '0.2'));
	it('recurring, stopped at four places', () => check('1 / 9', '0.1111'));
	it('decimal divisor', () => check('12 / 0.4', '30'));
	it('decimal dividend', () => check('1.2 / 4', '0.3'));
	it('a divisor much longer than the dividend', () => check('5 / 2500', '0.002'));
	it('zero dividend', () => check('0 / 5', '0'));

	it('places the first quotient digit two rods left when the divisor fits', () => {
		const solution = solve('84 / 2');
		const note = solution.notes.find((n) => n.heading === 'First quotient digit');
		expect(note?.body).toMatch(/two rods left/);
	});

	it('places it one rod left when the divisor does not fit', () => {
		const solution = solve('4116 / 42');
		const note = solution.notes.find((n) => n.heading === 'First quotient digit');
		expect(note?.body).toMatch(/one rod left/);
	});

	it('refuses to divide by zero', () => {
		expect(() => solve('5 / 0')).toThrow(/zero/i);
	});
});

describe('fuzz against exact arithmetic', () => {
	const rand = (() => {
		let seed = 20261021;
		return () => {
			seed = (seed * 1103515245 + 12345) & 0x7fffffff;
			return seed / 0x7fffffff;
		};
	})();
	const pick = (max: number) => 1 + Math.floor(rand() * max);

	it('addition chains', () => {
		for (let i = 0; i < 300; i++) {
			const a = pick(99999);
			const b = pick(99999);
			const c = pick(Math.max(1, a + b));
			check(`${a} + ${b} - ${c}`, String(a + b - c));
		}
	});

	it('multiplication', () => {
		for (let i = 0; i < 300; i++) {
			const a = pick(9999);
			const b = pick(9999);
			check(`${a} * ${b}`, String(a * b));
		}
	});

	it('exact division', () => {
		for (let i = 0; i < 300; i++) {
			const q = pick(9999);
			const b = pick(999);
			check(`${q * b} / ${b}`, String(q));
		}
	});

	it('inexact division matches to four places', () => {
		for (let i = 0; i < 200; i++) {
			const a = pick(99999);
			const b = pick(9999);
			const solution = solve(`${a} / ${b}`);
			expectWellFormed(solution);
			// Truncated, not rounded — the soroban just stops.
			const truncated = Math.floor((a / b) * 1e4) / 1e4;
			expect(Number(solution.answer), `${a} / ${b}`).toBeCloseTo(truncated, 10);
		}
	});
});

describe('languages', () => {
	const PROBLEMS = [
		'7 + 5',
		'11 - 6',
		'6 + 8',
		'4 + 1',
		'5 - 1',
		'123 + 456 - 78',
		'1.25 + 3.5',
		'23 * 45',
		'12 * 345',
		'105 * 23',
		'4104 / 76',
		'1 / 9',
		'5 / 2500',
		'84 / 2'
	];

	/** Every piece of prose a learner reads for a solution. */
	function prose(solution: Solution): string[] {
		return [
			...solution.steps.flatMap((s) => [s.section, s.group, s.groupWhy, s.text, s.why]),
			...solution.notes.map((n) => n.heading),
			...solution.notes.map((n) => n.body),
			...solution.regions.map((r) => r.label)
		].filter((t) => t !== '');
	}

	const CJK = /[぀-ヿ㐀-鿿]/;

	it('changes the words, never the beads', () => {
		for (const problem of PROBLEMS) {
			const en = solve(problem, { locale: 'en' });
			const ja = solve(problem, { locale: 'ja' });
			expect(ja.answer, problem).toBe(en.answer);
			expect(ja.steps.length, problem).toBe(en.steps.length);
			ja.steps.forEach((step, i) => {
				expect(step.after.map(rodValue), `${problem} step ${i + 1}`).toEqual(
					en.steps[i].after.map(rodValue)
				);
				expect(step.technique).toBe(en.steps[i].technique);
			});
		}
	});

	it('keeps Japanese out of English prose', () => {
		// On the English site Japanese appears only as named terms (technique
		// names, note headings), never inside a sentence.
		for (const problem of PROBLEMS) {
			for (const text of prose(solve(problem, { locale: 'en' }))) {
				expect(text, problem).not.toMatch(CJK);
			}
		}
	});

	it('writes the Japanese version entirely in Japanese', () => {
		for (const problem of PROBLEMS) {
			for (const text of prose(solve(problem, { locale: 'ja' }))) {
				// Numbers, symbols and formulas are fine; English words are not.
				expect(text, problem).not.toMatch(/[A-Za-z]{2,}/);
			}
		}
	});

	it('explains every step in Japanese too', () => {
		for (const problem of PROBLEMS) {
			const solution = solve(problem, { locale: 'ja' });
			expectWellFormed(solution);
			for (const step of solution.steps) expect(step.why).toMatch(CJK);
		}
	});

	it('reports errors in the chosen language', () => {
		expect(() => solve('5 / 0', { locale: 'ja' })).toThrow('0でわることはできません。');
		expect(() => solve('5 - 8', { locale: 'ja' })).toThrow(/負の数/);
		expect(() => solve('', { locale: 'ja' })).toThrow(/問題を入力/);
	});

	it('uses Japanese place names', () => {
		const steps = solve('7 + 5', { locale: 'ja' }).steps;
		expect(steps.some((s) => s.text.includes('十の位'))).toBe(true);
		expect(steps.some((s) => s.text.includes('一の位'))).toBe(true);
		const decimals = solve('1 / 9', { locale: 'ja' }).steps.map((s) => s.section);
		expect(decimals).toContain('商の小数第1位');
	});
});

describe('division reads clearly', () => {
	it('names every rod from the unit point, so one rod never has two names', () => {
		const s = solve('1 ÷ 9', { maxDecimals: 4 });
		const tenthsRod = s.unitRod + 1;
		const tenthsDigit = s.steps.find((st) => st.role === 'quotient' && st.text.includes('tenths'));
		expect(tenthsDigit?.rods).toEqual([tenthsRod]);
		// Beads named "tenths rod" are always on that same rod.
		for (const st of s.steps) {
			if (st.role !== 'quotient' && /\btenths rod/.test(st.text)) expect(st.rods).toEqual([tenthsRod]);
		}
		// The first subtraction takes its bead from the hundredths rod, where the 1 was set.
		expect(s.steps[2].text).toContain('hundredths rod');
	});

	it('moves the labels with the work and marks what is left over', () => {
		const s = solve('1 ÷ 9', { maxDecimals: 4 });
		expect(s.continues).toBe(true);
		const at = (i: number) => s.steps[i].regions?.map((r) => [r.label, r.from, r.to]);
		// At the start the 1 is under "dividend", not under "quotient".
		expect(at(0)).toEqual([
			['quotient', 1, 2],
			['dividend', 3, 3]
		]);
		// At the end the quotient holds its four digits and the leftover 1 is the remainder.
		expect(at(s.steps.length - 1)).toEqual([
			['quotient', 1, 5],
			['remainder', 7, 7]
		]);
		// A borrow that briefly empties a rod does not drop the dividend's label.
		for (const st of s.steps.slice(0, -1)) {
			expect(st.regions?.some((r) => r.label === 'dividend')).toBe(true);
		}
	});

	it('says why the first digit goes one rod left or two, and which places are 0', () => {
		const firstWhy = (problem: string) =>
			solve(problem).steps.find((st) => st.role === 'quotient')?.why ?? '';
		// 9 does not go into 1: one rod left, and the ones rod stays empty.
		expect(firstWhy('1 ÷ 9')).toContain('one rod left');
		expect(firstWhy('1 ÷ 9')).toContain('ones rod stays empty');
		// 2 goes into 8: two rods left, onto the ones rod, with nothing skipped.
		expect(firstWhy('8 ÷ 2')).toContain('two rods left');
		expect(firstWhy('8 ÷ 2')).not.toContain('empty');
		// Two places skipped before the first digit of 1 ÷ 76 (0.01…).
		expect(firstWhy('1 ÷ 76')).toContain('ones and tenths rods stay empty');
		// Later digits keep the plain check.
		const second = solve('1 ÷ 9').steps.filter((st) => st.role === 'quotient')[1];
		expect(second.why).not.toContain('rod left');
	});

	it('ends an exact division with the quotient alone', () => {
		const s = solve('4104 ÷ 76');
		expect(s.continues).toBe(false);
		expect(s.steps[s.steps.length - 1].regions?.map((r) => r.label)).toEqual(['quotient']);
	});
});
