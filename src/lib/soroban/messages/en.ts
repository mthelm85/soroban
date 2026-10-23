import type { Messages } from './types';

const MINUS = '−';

const PLACES: Record<number, string> = {
	8: 'hundred-millions',
	7: 'ten-millions',
	6: 'millions',
	5: 'hundred-thousands',
	4: 'ten-thousands',
	3: 'thousands',
	2: 'hundreds',
	1: 'tens',
	0: 'ones',
	[-1]: 'tenths',
	[-2]: 'hundredths',
	[-3]: 'thousandths',
	[-4]: 'ten-thousandths',
	[-5]: 'hundred-thousandths',
	[-6]: 'millionths',
	[-7]: 'ten-millionths',
	[-8]: 'hundred-millionths',
	[-9]: 'billionths',
	[-10]: 'ten-billionths'
};

function earth(n: number): string {
	return n === 1 ? '1 earth bead' : `${n} earth beads`;
}

/** "is" / "are" to agree with a count. */
function be(n: number): string {
	return n === 1 ? 'is' : 'are';
}

function rods(n: number): string {
	return n === 1 ? '1 rod' : `${n} rods`;
}

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'];

function digits(n: number): string {
	return n === 1 ? '1 digit' : `${n} digits`;
}

export const en: Messages = {
	locale: 'en',

	place: (power) => PLACES[power] ?? `10^${power}`,

	bead: {
		addFive: ({ place, extra }) =>
			extra
				? `Lower the heaven bead (+5) and push ${earth(extra)} up on the ${place} rod.`
				: `Lower the heaven bead (+5) on the ${place} rod.`,
		addFiveWhy: ({ n, extra }) =>
			extra
				? `${n} is 5 + ${extra}. The heaven bead is worth exactly 5 and is still free, so it carries the 5 and ${earth(extra)} carry the rest.`
				: 'The heaven bead is worth exactly 5 and is still free, so 5 goes on in one motion.',
		addEarth: ({ place, n }) => `Push ${earth(n)} up on the ${place} rod.`,
		addEarthWhy: ({ n, free }) =>
			`${earth(free)} ${be(free)} still free and only ${n} ${be(n)} needed, so the ${n} goes straight on — no complement required.`,
		fiveComposition: ({ place, give }) =>
			`Lower the heaven bead (+5) and take ${earth(give)} back down on the ${place} rod.`,
		fiveCompositionWhy: ({ n, free, give }) =>
			`Adding ${n} needs ${earth(n)} but ${free === 0 ? 'none are' : `only ${free} ${be(free)}`} free, so the five bead stands in for them. It puts on 5, which overshoots by ${give}, and those ${give} come straight back off: +5 ${MINUS} ${give} = +${n}.`,

		subFive: ({ place, extra }) =>
			extra
				? `Raise the heaven bead (${MINUS}5) and pull ${earth(extra)} down on the ${place} rod.`
				: `Raise the heaven bead (${MINUS}5) on the ${place} rod.`,
		subFiveWhy: ({ n, extra }) =>
			extra
				? `${n} is 5 + ${extra}. The heaven bead gives back its 5 and ${earth(extra)} give back the rest.`
				: 'The heaven bead is worth exactly 5 and is set, so raising it takes the whole 5 off in one motion.',
		subEarth: ({ place, n }) => `Pull ${earth(n)} down on the ${place} rod.`,
		subEarthWhy: ({ n, ones }) =>
			`${earth(ones)} ${be(ones)} set, enough to take ${n} off directly — the five bead is not needed.`,
		fiveDecomposition: ({ place, give }) =>
			`Raise the heaven bead (${MINUS}5) and push ${earth(give)} up on the ${place} rod.`,
		fiveDecompositionWhy: ({ n, ones, give }) =>
			`Taking ${n} off needs ${earth(n)} but ${ones === 0 ? 'none are' : `only ${ones} ${be(ones)}`} set, so the five bead has to be used. Raising it removes 5, which is ${give} too many, and those ${give} go back on: ${MINUS}5 + ${give} = ${MINUS}${n}.`,

		carryIn: ({ place, value, n }) =>
			`This is the carry. ${value} + ${n} on the ${place} rod makes ${value + n}, more than one rod can show, so its ten moves one rod left — where it is worth just one bead.`,
		borrowIn: ({ place, value, n }) =>
			`This is the borrow. The ${place} rod ${value === 0 ? 'is empty' : `shows only ${value}`}, too little to take ${n} from, so a ten is taken from the rod on its left — where a ten is just one bead.`,
		carryWhy: ({ value, n, complement, leftPlace }) =>
			`A rod can only show 9, and ${value} + ${n} is ${value + n}, so the ten has just gone onto the ${leftPlace} rod. ${n} is ${complement} short of 10, so that ${complement} now comes off here: +10 ${MINUS} ${complement} = +${n}.`,
		borrowWhy: ({ value, n, complement, leftPlace }) =>
			`${value === 0 ? 'This rod is empty' : `This rod shows only ${value}`}, so ${n} cannot come off it directly. A whole ten has just come down from the ${leftPlace} rod — ${complement} more than the ${n} that was actually wanted — so that ${complement} goes back on here: ${MINUS}10 + ${complement} = ${MINUS}${n}.`,

		phaseAdd: ({ place, value, n }) => `${place}: ${value} + ${n}`,
		phaseSub: ({ place, value, n }) => `${place}: ${value} ${MINUS} ${n}`
	},

	addsub: {
		setLabel: (v) => `Set ${v}`,
		addLabel: (v) => `Add ${v}`,
		subLabel: (v) => `Subtract ${v}`,
		groupWhy:
			'Digits go on from the highest place down, the opposite of written arithmetic. That is what lets a soroban keep pace with a number being read aloud: you can start before you have heard the end of it.',
		setText: (v) => `Set ${v} on the rods, lining its ones digit up with the unit point.`,
		setWhy:
			'The board holds one running total and nothing else. Every term after this one is worked into these same rods, which is why a soroban never needs scratch paper — and why the board is the thing you learn to picture.',
		region: 'total',
		notes: [
			{
				heading: 'Method',
				term: '見取り算',
				body: 'Straight addition and subtraction. One running total lives on the rods, and every term is worked into it in place.'
			},
			{
				heading: 'Digit order',
				body: 'Each term goes on from its highest place down to its lowest — the opposite of written arithmetic, and what lets a soroban keep pace with numbers read aloud.'
			},
			{
				heading: 'Complements',
				term: '補数',
				body: 'When a rod has too few earth beads, the five bead stands in for the shortfall. When the rod itself is full, a ten goes to the rod on the left and the ten’s complement comes off here.'
			}
		]
	},

	multiply: {
		setup: 'Set up',
		locateGroup: 'Both factors stay off the board',
		locateGroupWhy:
			'Both are held in mind, and the rods carry nothing but the answer as it accumulates.',
		locateText: "Fix the answer's ones digit on a unit point. No beads move yet.",
		locateWhy:
			'Every partial product is positioned relative to this one rod, so it has to be settled before anything else. With nothing else on the board there is no layout to read off — just this reference point and the place of each digit.',
		section: ({ digit, multiplier }) => `${digit} × ${multiplier}`,
		product: ({ a, b, product }) => `${a} × ${b} = ${product}`,
		productWhy: ({ a, aPlace, b, bPlace, k, j }) => {
			const offset = k + j;
			const where =
				offset === 0
					? "on the answer's ones rod"
					: `${rods(offset)} left of the answer's ones rod`;
			return `${a} is the ${aPlace} digit of the multiplicand and ${b} the ${bPlace} digit of the multiplier. Counting the ones place as 0, that is ${k} + ${j} = ${offset}, so this product's ones digit belongs ${where}. Adding the two place numbers is the whole of the place-value rule.`;
		},
		region: 'product',
		notes: [
			{
				heading: 'Method',
				term: '両落とし',
				body: 'Neither factor is placed — both are held in mind while the board carries only the growing product. This is the form that carries over to mental arithmetic, because the rods already show nothing but what you would be picturing.'
			},
			{
				heading: 'Digit order',
				body: 'Start from the multiplicand’s highest digit, and for each one run across the multiplier from its highest digit down — reading order in both directions. With no multiplicand on the rods nothing can be overwritten, so there is no reason to work up from the ones digit.'
			},
			{
				heading: 'Place value',
				term: '位取り',
				body: 'Number the places from the ones place as 0, tens as 1, hundreds as 2. A digit in place k of the multiplicand times a digit in place j of the multiplier lands with its ones digit k + j rods left of the answer’s ones rod. That one rule replaces any layout to read off the board.'
			}
		]
	},

	divide: {
		setup: 'Set up',
		setGroup: (divisor) => `The divisor ${divisor} stays off the board`,
		setGroupWhy:
			'It is held in mind and used from there, so the board carries only the dividend and the quotient growing out of it.',
		setText: (v) =>
			`Set the dividend ${v} on the right, leaving room on the left for the quotient to grow into.`,
		setWhy: ({ d }) =>
			`The divisor has ${digits(d)}, so the quotient's ones digit belongs ${rods(d + 1)} left of the dividend's ones rod. The room for it is left before any dividing starts.`,
		section: (place) => `Quotient digit, ${place}`,
		doesNotGo: ({ divisor, segment }) => `${divisor} does not go into ${segment}`,
		divides: ({ divisor, segment, q }) => `${segment} ÷ ${divisor} → ${q}`,
		settleWhy: ({ segment }) =>
			`Settle the digit in your head before touching a bead: try the divisor against ${segment} and take the largest multiple that still fits.`,
		zeroWhy: ({ divisor, segment }) =>
			`${divisor} × 1 = ${divisor}, already more than ${segment}, so nothing fits here and the digit is 0. The rod is left empty and the work moves one place right.`,
		digitWhy: ({ divisor, q, segment }) =>
			`${divisor} × ${q} = ${q * divisor}, which fits inside ${segment}; ${divisor} × ${q + 1} = ${(q + 1) * divisor}, which does not. So the digit is ${q}. Checking both sides in your head first means the digit is right before it is placed, so there is never anything to take back.`,
		firstDigitWhy: ({ divisor, lead, fits, q, segment, place, empty }) => {
			const where = fits
				? `${divisor} goes into ${lead}, so the first digit of the answer goes two rods left of the dividend's leading digit: the ${place} rod.`
				: `${divisor} does not go into ${lead}, so ${lead} is read together with the next rod as ${segment}, and the first digit of the answer goes one rod left of the dividend's leading digit, not two: the ${place} rod.`;
			const zeros =
				empty.length === 0
					? ''
					: empty.length === 1
						? ` The ${empty[0]} rod stays empty: that place of the answer is 0.`
						: ` The ${empty.slice(0, -1).join(', ')} and ${empty[empty.length - 1]} rods stay empty: those places of the answer are 0.`;
			const check = ` ${divisor} × ${q} = ${q * divisor} fits inside ${segment}; ${divisor} × ${q + 1} = ${(q + 1) * divisor} does not, so the digit is ${q}.`;
			return where + zeros + check;
		},
		zeroText: ({ divisor, segment, quotientPlace }) =>
			`${divisor} does not go into ${segment}, so the quotient's ${quotientPlace} digit is 0.`,
		digitText: ({ q, quotientPlace }) => `Set ${q} as the quotient's ${quotientPlace} digit.`,
		subtract: ({ q, digit, product }) =>
			`${q} × ${digit} = ${product}, subtracted`,
		subtractWhy: ({ q, digit, i }) =>
			i === 0
				? `${digit} is the divisor's first digit, so ${q} × ${digit} is taken off starting right next to the quotient digit: counted as two digits, its tens on the rod just right of the quotient and its ones on the rod after that.`
				: `${digit} is the divisor's ${ORDINALS[i] ?? `${i + 1}th`} digit, so ${q} × ${digit} is taken off ${rods(i)} further right than the first product. Each step along the divisor shifts the product one rod right.`,
		regionQuotient: 'quotient',
		regionDividend: 'dividend',
		regionRemainder: 'remainder',
		notes: {
			method: {
				heading: 'Method',
				term: '商除法（片落とし）',
				body: 'The divisor stays off the board. The quotient is built digit by digit to the left of the dividend, and each digit’s product is subtracted where it falls — so the dividend is eaten away as the quotient grows.'
			},
			kakusho: {
				heading: 'Settling each digit',
				term: '確商',
				body: 'Each quotient digit is worked out in your head first — the largest multiple of the divisor that still fits — and only then placed. The beginner’s method of placing a digit, finding it too big and giving the difference back is avoided on purpose: backtracking is the habit that does not survive the move to mental arithmetic.'
			},
			placeValue: ({ d }) => ({
				heading: 'Place value',
				term: '定位法',
				body: `The divisor has ${digits(d)}, so the quotient’s ones digit sits ${rods(d + 1)} to the left of the dividend’s ones rod.`
			}),
			firstDigit: ({ divisor, d, lead, fits }) => ({
				heading: 'First quotient digit',
				body: fits
					? `The divisor ${divisor} fits into the dividend’s leading ${digits(d)} (${lead}), so the first quotient digit goes two rods left of the dividend’s leading digit.`
					: `The divisor ${divisor} does not fit into the dividend’s leading ${digits(d)} (${lead}), so one more digit is taken in and the first quotient digit goes one rod left of the dividend’s leading digit.`
			}),
			notExact: ({ maxDecimals }) => ({
				heading: 'Not exact',
				body: `${maxDecimals === 0 ? 'Stopped at the ones place' : `Stopped after ${maxDecimals} decimal place${maxDecimals === 1 ? '' : 's'}`}; what is left of the dividend is still on the rods to the right of the quotient.`
			})
		}
	},

	errors: {
		needRodsLeft: 'The board is not wide enough: the number needs more rods on the left.',
		carryNowhere: 'The board is not wide enough: the carry has nowhere to go.',
		nothingToBorrow: 'The board is not wide enough: there is nothing left to borrow from.',
		doesNotFit: 'The number does not fit on the board.',
		tooManyRods: ({ needed, max }) =>
			`This problem needs ${needed} rods; the largest soroban here has ${max}. Try smaller numbers or fewer decimal places.`,
		notANumber: (raw) => `“${raw}” is not a number I can read.`,
		tooManyDigits: (max) =>
			`Numbers are limited to ${max} significant digits so the board stays a realistic size.`,
		empty: 'Type a problem, for example 4104 ÷ 76.',
		endsWithOperator: 'The problem ends with an operator.',
		doubled: 'Two numbers or two operators in a row.',
		mulDivTwo:
			'Multiplication and division take exactly two numbers. Chains like 2 × 3 × 4 are not part of the traditional drill.',
		negativeStart: 'A soroban cannot show a negative number, so start with a positive one.',
		divideByZero: 'Cannot divide by zero.',
		multiplyByZero: 'Multiplying by zero clears the board — try non-zero numbers.',
		negativeRunning: (term) =>
			`A soroban cannot show a negative number, and the running total goes below zero at ${term}. Reorder the terms so the total never drops below zero.`
	}
};
