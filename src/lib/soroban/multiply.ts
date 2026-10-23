/**
 * 乗算 — multiplication by 両落とし (ryōotoshi): neither factor is placed on
 * the board. Only the product is built, which is why this is the form Japanese
 * teachers point at when the goal is 珠算式暗算 — what your fingers do here is
 * exactly what you will later picture with nothing in front of you.
 *
 * The digit order is the 破頭頭乗法 pairing: start from the multiplicand's
 * **highest** digit (実の首桁) and, for each, run across the multiplier from
 * **its** highest digit down (法の首位数). With no multiplicand sitting on the
 * rods there is nothing to overwrite, so there is no need to work upwards from
 * the ones digit the way 新頭乗法 must, and no 先払い step at all.
 *
 * 位取り is pure index arithmetic: a digit in place `k` of the multiplicand
 * times a digit in place `j` of the multiplier gives a product whose ones digit
 * belongs `k + j` rods left of the answer's ones rod.
 */
import { addValueAt } from './arithmetic';
import { formatSpan } from './board';
import { kuku } from './kuku';
import { chooseRodCount, pickUnitRod } from './layout';
import type { Messages } from './messages';
import { decToString, type Problem } from './parse';
import { Tape } from './tape';
import type { Region, Solution } from './types';

export function solveMultiply(problem: Problem, m: Messages): Solution {
	const multiplicand = problem.a;
	const multiplier = problem.b;
	const multiplicandDigits = multiplicand.digits.split('').map(Number);
	const multiplierDigits = multiplier.digits.split('').map(Number);
	const count = multiplicandDigits.length;
	const n = multiplierDigits.length;

	// The product of two digit strings never needs more than count + n digits.
	const width = count + n;
	const decimals = multiplicand.dec + multiplier.dec;
	const rodCount = chooseRodCount(Math.max(13, width + 4), m);
	// The board carries nothing but the product, so centre it rather than
	// pushing it to the right-hand end.
	const unitRod = pickUnitRod(rodCount, decimals, width - decimals, m, 'centre');
	/** Rod holding the product's least significant digit. */
	const lastRod = unitRod + decimals;
	const firstRod = lastRod - width + 1;
	const answerSpan: [number, number] = [firstRod, lastRod];

	const tape = new Tape(rodCount, unitRod, m);
	const s = m.multiply;

	// 0 digits add nothing and are skipped below; say so once, up front. And
	// when a whole factor is 0, nothing moves at all and the answer is 0.
	const zeroFactor = /^0+$/.test(multiplicand.digits) || /^0+$/.test(multiplier.digits);
	const zerosAt = (digits: number[]) =>
		digits.flatMap((digit, i) => (digit === 0 ? [m.place(digits.length - 1 - i)] : []));
	const skipped = {
		multiplicand: zerosAt(multiplicandDigits),
		multiplier: zerosAt(multiplierDigits)
	};
	const locateWhy = zeroFactor
		? s.zeroFactor
		: skipped.multiplicand.length || skipped.multiplier.length
			? `${s.locateWhy}${s.skippedZeros(skipped)}`
			: s.locateWhy;

	// 定位 — in 両落とし the only thing to set up is where the answer will sit.
	tape.setSection(s.setup);
	tape.setGroup(s.locateGroup, s.locateGroupWhy);
	tape.setPhase(s.locateText, 'locate');
	tape.commit(
		{
			rods: [lastRod],
			technique: 'locate',
			role: 'set',
			formula: `${decToString(multiplicand)} × ${decToString(multiplier)}`,
			text: s.locateText,
			why: locateWhy
		},
		() => {}
	);

	// Multiplicand from its highest digit down.
	for (let k = count - 1; k >= 0; k--) {
		const digit = multiplicandDigits[count - 1 - k];
		if (digit === 0) continue;

		tape.setSection(s.section({ digit, multiplier: multiplier.digits }));

		// Multiplier from its highest digit down.
		for (let j = n - 1; j >= 0; j--) {
			const other = multiplierDigits[n - 1 - j];
			if (other === 0) continue;
			const k9 = kuku(digit, other);
			tape.setGroup(
				s.product({ a: digit, b: other, product: k9.product, kuku: k9.ja }),
				s.productWhy({
					a: digit,
					aPlace: m.place(k),
					b: other,
					bPlace: m.place(j),
					k,
					j
				})
			);
			addValueAt(tape, k9.product, lastRod - (k + j), 'product');
		}
	}

	const answer = formatSpan(tape.board, answerSpan[0], answerSpan[1], unitRod);

	const regions: Region[] = [
		{
			label: s.region,
			labelJa: '積',
			from: answerSpan[0],
			to: answerSpan[1],
			unitRod,
			tone: 'result'
		}
	];

	return {
		problem: problem.text,
		answer,
		operation: 'multiply',
		rodCount,
		unitRod,
		answerSpan,
		initial: tape.initial,
		steps: tape.steps,
		regions,
		notes: s.notes.map((note) => ({ heading: note.heading, headingJa: note.term, body: note.body }))
	};
}
