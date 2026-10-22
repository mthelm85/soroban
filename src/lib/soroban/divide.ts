/**
 * 除算 — division by 商除法 (shōjohō), laid out 片落とし: the divisor is **not**
 * placed on the board, only held in mind. That is what Japanese practice
 * actually teaches, and it is the form that carries over to mental arithmetic —
 * the rods show only the dividend being eaten away and the quotient growing.
 *
 * Quotient digits are settled by 確商 (kakushō): work out in your head which
 * multiple of the divisor still fits, and place only a digit you already know
 * is right. The beginner's alternative, 還元 / 戻し算 — place a digit, discover
 * it is too big, and give the difference back — is deliberately not used here,
 * because backtracking is exactly what does not survive the move to 暗算.
 *
 * The rules, from the Japanese sources in docs/METHODS.md:
 *
 *  - 実 (the dividend) sits on the right; the quotient (商) is built up in the
 *    space to its left.
 *  - 定位法: the quotient's ones digit sits as many rods to the left of the
 *    dividend's ones rod as the divisor has digits, plus one.
 *  - The first quotient digit goes two rods left of the dividend's leading
 *    digit when the divisor fits into the dividend's leading digits, and one
 *    rod left when it does not. (Both cases fall out of the 定位法 rule.)
 *  - Each quotient digit is multiplied by the divisor digit by digit, highest
 *    divisor digit first, and each partial product is subtracted from the
 *    dividend where it falls.
 */
import { setNumber, subValueAt } from './arithmetic';
import { formatSpan, readSpan, rodFromDigit, rodValue, spanIsZero } from './board';
import { kuku } from './kuku';
import { chooseRodCount } from './layout';
import type { Messages } from './messages';
import { decInt, decToString, type Problem } from './parse';
import { Tape } from './tape';
import type { Note, Region, Solution } from './types';

export const DEFAULT_MAX_DECIMALS = 4;

export function solveDivide(
	problem: Problem,
	m: Messages,
	maxDecimals = DEFAULT_MAX_DECIMALS
): Solution {
	const dividend = problem.a;
	const divisor = problem.b;
	const L = dividend.digits.length;
	const d = divisor.digits.length;
	const divisorInt = decInt(divisor);
	const divisorDigits = divisor.digits.split('').map(Number);
	const dividendDigits = dividend.digits.split('').map(Number);

	// Layout: [quotient][dividend L rods][room for decimals]. The divisor is not
	// on the board at all, so the only room needed on the left is for the
	// quotient — widened when the divisor has more digits than the dividend.
	const dividendStart = Math.max(3, d + 3 - L);
	const dividendOnes = dividendStart + L - 1;
	const quotientOnes = dividendOnes - (d + 1);
	const needed = Math.max(dividendStart + L, quotientOnes + maxDecimals + d + 2) + 1;
	const rodCount = chooseRodCount(Math.max(13, needed), m);
	const unitRod = quotientOnes + (divisor.dec - dividend.dec);

	// Every rod is named in the answer's place values, counted from the unit
	// point on the beam — the one reference the learner can see. (Naming the
	// subtractions in the dividend's own frame, d+1 rods to the right, gave the
	// same rod two names: the quotient's tenths digit sat on one "tenths rod"
	// while beads came off another.)
	const tape = new Tape(rodCount, unitRod, m);
	const quotientPlace = (rod: number) => m.place(unitRod - rod);
	const s = m.divide;

	tape.setSection(s.setup);
	tape.setGroup(s.setGroup(decToString(divisor)), s.setGroupWhy);
	setNumber(tape, dividendDigits, dividendStart, s.setText(decToString(dividend)), s.setWhy({ d }));

	// 定位法 / where the first quotient digit goes.
	const lead = readSpan(tape.board, dividendStart, dividendStart + d - 1);
	const fits = lead >= divisorInt;
	const firstQuotientRod = fits ? dividendStart - 2 : dividendStart - 1;

	let p = firstQuotientRod;
	let lastQuotientRod = firstQuotientRod;
	let exact = false;

	for (;;) {
		const segTo = p + d + 1;
		const segment = readSpan(tape.board, p + 1, segTo);
		const q = Math.floor(segment / divisorInt);

		tape.setSection(s.section(quotientPlace(p)));
		tape.setGroup(
			q === 0
				? s.doesNotGo({ divisor: divisorInt, segment })
				: s.divides({ divisor: divisorInt, segment, q }),
			s.settleWhy({ segment })
		);
		// 確商: the multiple that fits and the one that does not are both stated,
		// which is the mental check that replaces 還元 (place a digit, fail, back off).
		const text =
			q === 0
				? s.zeroText({ divisor: divisorInt, segment, quotientPlace: quotientPlace(p) })
				: s.digitText({ q, quotientPlace: quotientPlace(p) });
		const why =
			q === 0
				? s.zeroWhy({ divisor: divisorInt, segment })
				: s.digitWhy({ divisor: divisorInt, q, segment });
		tape.setPhase(text, 'kakusho');
		tape.commit(
			{ rods: [p], technique: 'kakusho', role: 'quotient', formula: String(q), text, why },
			() => tape.writeRod(p, rodFromDigit(q))
		);

		if (q > 0) {
			// Subtract q × divisor, one divisor digit at a time, highest first.
			for (let j = d - 1; j >= 0; j--) {
				const digit = divisorDigits[d - 1 - j];
				if (digit === 0) continue;
				const k9 = kuku(q, digit);
				tape.setGroup(
					s.subtract({ q, digit, product: k9.product, kuku: k9.ja }),
					s.subtractWhy({ q, digit, i: d - 1 - j })
				);
				subValueAt(tape, k9.product, segTo - j, 'product');
			}
		}

		lastQuotientRod = p;
		if (spanIsZero(tape.board, p + 1, rodCount - 1)) {
			exact = true;
			break;
		}
		if (p >= quotientOnes + maxDecimals) break;
		p += 1;
	}

	const answerSpan: [number, number] = [
		Math.max(0, Math.min(firstQuotientRod, unitRod, quotientOnes)),
		lastQuotientRod
	];
	const answer = formatSpan(tape.board, answerSpan[0], answerSpan[1], unitRod);
	const remainder = exact
		? null
		: formatSpan(tape.board, lastQuotientRod + 1, rodCount - 1, dividendOnes);

	/*
	 * Labels that follow the work. The quotient grows into rods the dividend
	 * has left, so one fixed pair of labels is wrong for most of the problem
	 * (1 ÷ 9 starts with its 1 under "quotient"). At each step the quotient
	 * covers its room and the digits found so far; the dividend covers what is
	 * still being divided; and at the end, anything left is the remainder.
	 */
	const quotientLabel = (to: number): Region => ({
		label: s.regionQuotient,
		labelJa: '商',
		from: answerSpan[0],
		to,
		unitRod,
		tone: 'result'
	});
	/**
	 * The dividend still being divided: from just past the quotient to its last
	 * bead — and always over the rods a step is working, so the label does not
	 * blink off when a borrow empties them for a moment. At the end, the
	 * remainder covers only what is actually left.
	 */
	const workLabel = (
		board: typeof tape.board,
		from: number,
		working: number[],
		end: boolean
	): Region | null => {
		let to = rodCount - 1;
		while (to >= from && rodValue(board[to]) === 0) to--;
		for (const rod of working) if (rod >= from) to = Math.max(to, rod);
		if (to < from) return null;
		if (!end) return { label: s.regionDividend, labelJa: '実', from, to, tone: 'work' };
		let first = from;
		while (first < to && rodValue(board[first]) === 0) first++;
		if (rodValue(board[first]) === 0) return null;
		return { label: s.regionRemainder, labelJa: '余り', from: first, to, tone: 'work' };
	};

	// Before any digit is found, the quotient's room is everything left of the dividend.
	const regions: Region[] = [
		quotientLabel(dividendStart - 1),
		{ label: s.regionDividend, labelJa: '実', from: dividendStart, to: dividendOnes, tone: 'work' }
	];
	let found = dividendStart - 1;
	tape.steps.forEach((step, i) => {
		if (step.role === 'quotient') found = Math.max(found, step.rods[0]);
		const end = i === tape.steps.length - 1;
		const quotientTo = end ? lastQuotientRod : found;
		const work = workLabel(step.after, quotientTo + 1, step.role === 'quotient' ? [] : step.rods, end);
		step.regions = work ? [quotientLabel(quotientTo), work] : [quotientLabel(quotientTo)];
	});

	const noteTexts = [
		s.notes.method,
		s.notes.kakusho,
		s.notes.placeValue({ d }),
		s.notes.firstDigit({ divisor: divisorInt, d, lead, fits })
	];
	if (!exact && remainder && remainder !== '0') {
		noteTexts.push(s.notes.notExact({ maxDecimals }));
	}
	const notes: Note[] = noteTexts.map((n) => ({
		heading: n.heading,
		headingJa: n.term,
		body: n.body
	}));

	return {
		problem: problem.text,
		answer,
		operation: 'divide',
		rodCount,
		unitRod,
		answerSpan,
		initial: tape.initial,
		steps: tape.steps,
		regions,
		notes,
		continues: !exact
	};
}
