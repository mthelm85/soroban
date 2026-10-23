/**
 * 見取り算 (mitorizan) — running addition and subtraction.
 *
 * Each term is added or subtracted one digit at a time starting from its
 * highest place, which is the order Japanese soroban practice uses (and the
 * reason a soroban can keep up with dictation).
 */
import { addDigit, setNumber, subDigit } from './arithmetic';
import { formatSpan } from './board';
import { chooseRodCount, pickUnitRod } from './layout';
import type { Messages } from './messages';
import { decInt, decToString, type Problem } from './parse';
import { Tape } from './tape';
import { SorobanError, type Region, type Solution } from './types';

/** Digits of `value`, padded so the last digit sits at `maxDec` decimal places. */
function alignedDigits(digits: string, dec: number, maxDec: number): number[] {
	return `${digits}${'0'.repeat(maxDec - dec)}`.split('').map(Number);
}

export function solveAddSub(problem: Problem, m: Messages): Solution {
	const { terms } = problem;
	const maxDec = Math.max(...terms.map((t) => t.value.dec));

	// Work in integers scaled by 10^maxDec so the running checks are exact.
	const scaled = terms.map((t) => ({
		op: t.op,
		value: t.value,
		n: decInt(t.value) * 10 ** (maxDec - t.value.dec)
	}));

	// If the whole chain comes out below zero, no order of the terms can help.
	const total = scaled.reduce((sum, t) => sum + (t.op === '+' ? t.n : -t.n), 0);
	if (total < 0) throw new SorobanError(m.errors.negativeResult(problem.text));

	let running = 0;
	const runningTotals: number[] = [];
	for (const term of scaled) {
		running += term.op === '+' ? term.n : -term.n;
		if (running < 0) {
			const sign = term.op === '+' ? '+' : '−';
			throw new SorobanError(m.errors.negativeRunning(`${sign}${decToString(term.value)}`));
		}
		runningTotals.push(running);
	}

	const widest = Math.max(...runningTotals, ...scaled.map((t) => t.n), 1);
	const maxIntDigits = Math.max(1, String(widest).length - maxDec);
	const rodCount = chooseRodCount(Math.max(13, maxIntDigits + maxDec + 2), m);
	const unitRod = pickUnitRod(rodCount, maxDec, maxIntDigits, m);
	/** Rod holding the last (least significant) digit of every aligned term. */
	const lastRod = unitRod + maxDec;

	const tape = new Tape(rodCount, unitRod, m);
	const s = m.addsub;

	// Set the first term.
	const first = terms[0];
	const firstDigits = alignedDigits(first.value.digits, first.value.dec, maxDec);
	const firstLabel = s.setLabel(decToString(first.value));
	tape.setSection(firstLabel);
	tape.setGroup(firstLabel);
	setNumber(
		tape,
		firstDigits,
		lastRod - firstDigits.length + 1,
		s.setText(decToString(first.value)),
		s.setWhy
	);

	// Then run through the remaining terms.
	for (let i = 1; i < terms.length; i++) {
		const term = terms[i];
		const digits = alignedDigits(term.value.digits, term.value.dec, maxDec);
		const firstRod = lastRod - digits.length + 1;
		const value = decToString(term.value);
		const label = term.op === '+' ? s.addLabel(value) : s.subLabel(value);
		tape.setSection(label);
		tape.setGroup(label, s.groupWhy);
		for (let k = 0; k < digits.length; k++) {
			const rod = firstRod + k;
			if (term.op === '+') addDigit(tape, rod, digits[k]);
			else subDigit(tape, rod, digits[k]);
		}
	}

	const answerSpan: [number, number] = [
		Math.max(0, unitRod - maxIntDigits),
		Math.min(rodCount - 1, lastRod)
	];
	const answer = formatSpan(tape.board, answerSpan[0], answerSpan[1], unitRod);

	const regions: Region[] = [
		{
			label: s.region,
			labelJa: '答え',
			from: answerSpan[0],
			to: answerSpan[1],
			unitRod,
			tone: 'result'
		}
	];

	return {
		problem: problem.text,
		answer,
		operation: 'addsub',
		rodCount,
		unitRod,
		answerSpan,
		initial: tape.initial,
		steps: tape.steps,
		regions,
		notes: s.notes.map((n) => ({ heading: n.heading, headingJa: n.term, body: n.body }))
	};
}
