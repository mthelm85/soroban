/**
 * Digit-level addition and subtraction, expressed as the named techniques that
 * Japanese soroban schools teach: direct moves, 五の合成/五の分解 (the
 * five-complement pair) and 十の繰り上がり/十の繰り下がり (the ten-complement
 * pair, i.e. carry and borrow).
 *
 * Every step carries both a `text` (which beads move) and a `why` (what about
 * the rod forced that choice). The `why` is the part that transfers to mental
 * arithmetic: the complements are the whole trick, and a learner who only ever
 * reads the finger motion never internalises them. All wording comes from the
 * locale's message catalogue in ./messages.
 *
 * Two conventions from the Japanese sources are baked in here:
 *
 *  - A multi-digit number is added one digit at a time **from the highest
 *    place down**, not from the ones up.
 *  - For a carry, the ten goes onto the rod to the left **first**, then the
 *    ten's complement comes off the current rod (「10をたして7をひく」). A
 *    borrow mirrors it: take the ten off the left rod, then add the complement.
 */
import { rodFromDigit, rodValue } from './board';
import type { Tape } from './tape';
import { SorobanError, type Rod, type StepRole, type TechniqueId } from './types';

const MINUS = '−';

interface Plan {
	next: Rod;
	technique: TechniqueId;
	formula: string;
	text: (place: string) => string;
	why: () => string;
}

/** Plan adding n (1..9) to a rod, given that it fits without a carry. */
function planAddWithin(tape: Tape, rod: Rod, n: number): Plan {
	const { bead } = tape.m;
	const ones = rod.earth;
	const free = 4 - ones;

	if (n >= 5) {
		const extra = n - 5;
		return {
			next: { heaven: true, earth: ones + extra },
			technique: 'direct-add',
			formula: extra ? `+5 +${extra}` : '+5',
			text: (place) => bead.addFive({ place, extra }),
			why: () => bead.addFiveWhy({ n, extra })
		};
	}

	if (ones + n <= 4) {
		return {
			next: { heaven: rod.heaven, earth: ones + n },
			technique: 'direct-add',
			formula: `+${n}`,
			text: (place) => bead.addEarth({ place, n }),
			why: () => bead.addEarthWhy({ n, free })
		};
	}

	const give = 5 - n;
	return {
		next: { heaven: true, earth: ones - give },
		technique: 'five-composition',
		formula: `+5 ${MINUS}${give}`,
		text: (place) => bead.fiveComposition({ place, give }),
		why: () => bead.fiveCompositionWhy({ n, free, give })
	};
}

/** Plan subtracting n (1..9) from a rod, given that the rod holds enough. */
function planSubWithin(tape: Tape, rod: Rod, n: number): Plan {
	const { bead } = tape.m;
	const ones = rod.earth;

	if (n >= 5) {
		const extra = n - 5;
		return {
			next: { heaven: false, earth: ones - extra },
			technique: 'direct-sub',
			formula: extra ? `${MINUS}5 ${MINUS}${extra}` : `${MINUS}5`,
			text: (place) => bead.subFive({ place, extra }),
			why: () => bead.subFiveWhy({ n, extra })
		};
	}

	if (ones >= n) {
		return {
			next: { heaven: rod.heaven, earth: ones - n },
			technique: 'direct-sub',
			formula: `${MINUS}${n}`,
			text: (place) => bead.subEarth({ place, n }),
			why: () => bead.subEarthWhy({ n, ones })
		};
	}

	const give = 5 - n;
	return {
		next: { heaven: false, earth: ones + give },
		technique: 'five-decomposition',
		formula: `${MINUS}5 +${give}`,
		text: (place) => bead.fiveDecomposition({ place, give }),
		why: () => bead.fiveDecompositionWhy({ n, ones, give })
	};
}

/** Would subtracting m from this rod have to break the five bead? */
function subNeedsFive(rod: Rod, m: number): boolean {
	return m <= 4 && rod.earth < m;
}

/** Would adding m to this rod have to use the five bead as a complement? */
function addNeedsFive(rod: Rod, m: number): boolean {
	return m <= 4 && rod.earth + m > 4;
}

function run(tape: Tape, rod: number, plan: Plan, role: StepRole, why?: string): void {
	tape.commit(
		{
			rods: [rod],
			technique: plan.technique,
			role,
			formula: plan.formula,
			text: plan.text(tape.place(rod)),
			why: why ?? plan.why()
		},
		() => tape.writeRod(rod, plan.next)
	);
}

/**
 * The reasoning for a carried or borrowed bead. A plain move needs only the
 * reason it is happening at all; if the bead also has to use the five, both
 * reasons are given.
 */
function explainCarry(tape: Tape, context: string | undefined, plan: Plan): string | undefined {
	if (!context) return undefined;
	if (plan.technique === 'direct-add' || plan.technique === 'direct-sub') return context;
	const gap = tape.m.locale === 'ja' ? '' : ' ';
	return `${context}${gap}${plan.why()}`;
}

function requireRod(tape: Tape, rod: number, message: string): void {
	if (rod < 0 || rod >= tape.rodCount) throw new SorobanError(message);
}

/**
 * Where a carry or borrow started, while it ripples left past rods that cannot
 * take it (9s for a carry, 0s for a borrow), so the bead that finally lands can
 * explain the whole chain rather than only its last link.
 */
interface Ripple {
	place: string;
	value: number;
	n: number;
	through: string[];
}

/** Add a single digit n (0..9) to one rod, recursing for carries. */
export function addDigit(
	tape: Tape,
	rod: number,
	n: number,
	role: StepRole = 'main',
	context?: string,
	ripple?: Ripple
): void {
	if (n === 0) return;
	requireRod(tape, rod, tape.m.errors.needRodsLeft);
	const current = tape.board[rod];
	const value = rodValue(current);
	const place = tape.place(rod);

	if (value + n <= 9) {
		const plan = planAddWithin(tape, current, n);
		tape.setPhase(tape.m.bead.phaseAdd({ place, value, n }), plan.technique);
		run(tape, rod, plan, role, explainCarry(tape, context, plan));
		return;
	}

	// 十の繰り上がり — the ten first, then the ten's complement.
	requireRod(tape, rod - 1, tape.m.errors.carryNowhere);
	const complement = 10 - n;
	const composite: TechniqueId = subNeedsFive(current, complement)
		? 'ten-carry-five'
		: 'ten-carry';
	const phase = tape.m.bead.phaseAdd({ place, value, n });

	tape.setPhase(phase, composite);
	// The next rod is a 9 too: the carry passes over it. Keep the story of
	// where it began, and tell it once, on the rod where it finally lands.
	const origin: Ripple = ripple ?? { place, value, n, through: [] };
	const chain: Ripple = ripple ? { ...origin, through: [...origin.through, place] } : origin;
	const passesOn = rod - 1 >= 0 && rodValue(tape.board[rod - 1]) === 9;
	const landing = chain.through.length
		? tape.m.bead.carryRipple({ ...chain, target: tape.place(rod - 1) })
		: tape.m.bead.carryIn({ place, value, n });
	addDigit(tape, rod - 1, 1, 'carry', passesOn ? undefined : landing, passesOn ? chain : undefined);

	tape.setPhase(phase, composite);
	run(
		tape,
		rod,
		planSubWithin(tape, tape.board[rod], complement),
		'complement',
		tape.m.bead.carryWhy({ value, n, complement, leftPlace: tape.place(rod - 1) })
	);
}

/** Subtract a single digit n (0..9) from one rod, recursing for borrows. */
export function subDigit(
	tape: Tape,
	rod: number,
	n: number,
	role: StepRole = 'main',
	context?: string,
	ripple?: Ripple
): void {
	if (n === 0) return;
	requireRod(tape, rod, tape.m.errors.needRodsLeft);
	const current = tape.board[rod];
	const value = rodValue(current);
	const place = tape.place(rod);

	if (value >= n) {
		const plan = planSubWithin(tape, current, n);
		tape.setPhase(tape.m.bead.phaseSub({ place, value, n }), plan.technique);
		run(tape, rod, plan, role, explainCarry(tape, context, plan));
		return;
	}

	// 十の繰り下がり — take the ten off the rod to the left, then add the complement.
	requireRod(tape, rod - 1, tape.m.errors.nothingToBorrow);
	const complement = 10 - n;
	const composite: TechniqueId = addNeedsFive(current, complement)
		? 'ten-borrow-five'
		: 'ten-borrow';
	const phase = tape.m.bead.phaseSub({ place, value, n });

	tape.setPhase(phase, composite);
	// The next rod is empty too: the borrow reaches past it to the first bead.
	const origin: Ripple = ripple ?? { place, value, n, through: [] };
	const chain: Ripple = ripple ? { ...origin, through: [...origin.through, place] } : origin;
	const passesOn = rod - 1 >= 0 && rodValue(tape.board[rod - 1]) === 0;
	const landing = chain.through.length
		? tape.m.bead.borrowRipple({ ...chain, target: tape.place(rod - 1) })
		: tape.m.bead.borrowIn({ place, value, n });
	subDigit(tape, rod - 1, 1, 'borrow', passesOn ? undefined : landing, passesOn ? chain : undefined);

	tape.setPhase(phase, composite);
	run(
		tape,
		rod,
		planAddWithin(tape, tape.board[rod], complement),
		'complement',
		tape.m.bead.borrowWhy({ value, n, complement, leftPlace: tape.place(rod - 1) })
	);
}

/** Place a whole number on the rods in one motion (置く). */
export function setNumber(
	tape: Tape,
	digits: number[],
	firstRod: number,
	text: string,
	why: string
): void {
	requireRod(tape, firstRod, tape.m.errors.doesNotFit);
	requireRod(tape, firstRod + digits.length - 1, tape.m.errors.doesNotFit);
	const rods = digits.map((_, i) => firstRod + i);
	tape.setPhase(text, 'set');
	tape.commit({ rods, technique: 'set', role: 'set', formula: digits.join(''), text, why }, () => {
		digits.forEach((d, i) => tape.writeRod(firstRod + i, rodFromDigit(d)));
	});
}

/** Digits of a non-negative integer, highest first. */
export function digitsOf(n: number): number[] {
	return String(n)
		.split('')
		.map((c) => Number(c));
}

/**
 * Add `value` to the board with its ones digit on `onesRod`, highest digit
 * first — the order you read a 九九 (times-table) result out loud.
 */
export function addValueAt(tape: Tape, value: number, onesRod: number, role: StepRole): void {
	const digits = digitsOf(value);
	digits.forEach((d, i) => {
		const rod = onesRod - (digits.length - 1 - i);
		addDigit(tape, rod, d, role);
	});
}

/** Subtract `value` from the board with its ones digit on `onesRod`. */
export function subValueAt(tape: Tape, value: number, onesRod: number, role: StepRole): void {
	const digits = digitsOf(value);
	digits.forEach((d, i) => {
		const rod = onesRod - (digits.length - 1 - i);
		subDigit(tape, rod, d, role);
	});
}

export { MINUS };
