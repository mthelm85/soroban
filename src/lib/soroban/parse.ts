import type { Messages } from './messages';
import { SorobanError } from './types';

/**
 * A decimal number held as a digit string plus a decimal-place count, so the
 * engine can lay digits onto rods without ever touching floating point.
 *
 *   value = (neg ? -1 : 1) × Number(digits) × 10^(-dec)
 */
export interface Dec {
	digits: string;
	dec: number;
	neg: boolean;
}

export const MAX_DIGITS = 9;

export function decFromParts(digits: string, dec: number, neg = false): Dec {
	// Drop leading zeros, but keep at least one digit.
	let d = digits.replace(/^0+(?=\d)/, '');
	let places = dec;
	// Drop trailing fractional zeros.
	while (places > 0 && d.endsWith('0')) {
		d = d.slice(0, -1);
		places -= 1;
	}
	if (d === '') d = '0';
	return { digits: d, dec: places, neg: neg && d !== '0' };
}

export function parseDec(raw: string, m: Messages): Dec {
	const text = raw.trim().replace(/[,\s_]/g, '');
	if (!/^\d*(\.\d*)?$/.test(text) || text === '' || text === '.') {
		throw new SorobanError(m.errors.notANumber(raw.trim()));
	}
	const [intPart = '', fracPart = ''] = text.split('.');
	const digits = `${intPart}${fracPart}` || '0';
	if (digits.replace(/^0+/, '').length > MAX_DIGITS) {
		throw new SorobanError(m.errors.tooManyDigits(MAX_DIGITS));
	}
	return decFromParts(digits, fracPart.length);
}

/** The digit string as an integer (safe: capped at MAX_DIGITS digits). */
export function decInt(d: Dec): number {
	return Number(d.digits);
}

export function decToNumber(d: Dec): number {
	return (d.neg ? -1 : 1) * decInt(d) * 10 ** -d.dec;
}

export function decToString(d: Dec): string {
	const sign = d.neg ? '−' : '';
	if (d.dec === 0) return `${sign}${d.digits}`;
	const padded = d.digits.padStart(d.dec + 1, '0');
	const cut = padded.length - d.dec;
	return `${sign}${padded.slice(0, cut)}.${padded.slice(cut)}`;
}

export function decIsZero(d: Dec): boolean {
	return d.digits === '0';
}

/** Integer digit count (how many rods the integer part needs). */
export function intDigitCount(d: Dec): number {
	return Math.max(1, d.digits.length - d.dec);
}

export type Operator = '+' | '-' | '*' | '/';

export interface Problem {
	kind: 'addsub' | 'multiply' | 'divide';
	/** Signed terms, for an addition/subtraction chain. */
	terms: { op: '+' | '-'; value: Dec }[];
	/** Operands, for multiplication and division. */
	a: Dec;
	b: Dec;
	/** Normalised display form. */
	text: string;
}

const OPERATORS: Record<string, Operator> = {
	'+': '+',
	'-': '-',
	'−': '-', // minus sign
	'–': '-', // en dash
	'ー': '-', // katakana prolonged sound mark, a common typo
	'*': '*',
	'×': '*', // ×
	x: '*',
	X: '*',
	'·': '*',
	'/': '/',
	'÷': '/', // ÷
	':': '/'
};

const OP_SYMBOL: Record<Operator, string> = {
	'+': '+',
	'-': '−',
	'*': '×',
	'/': '÷'
};

/**
 * Split an expression into alternating number and operator tokens. Any leading
 * sign has already been stripped by the caller.
 */
function tokenize(input: string, m: Messages): (Operator | Dec)[] {
	const tokens: (Operator | Dec)[] = [];
	let buffer = '';
	const flush = () => {
		if (buffer.trim() !== '') tokens.push(parseDec(buffer, m));
		buffer = '';
	};
	for (const ch of input) {
		const op = OPERATORS[ch];
		if (op) {
			flush();
			tokens.push(op);
		} else {
			buffer += ch;
		}
	}
	flush();
	return tokens;
}

function isOp(token: Operator | Dec): token is Operator {
	return typeof token === 'string';
}

export function parseProblem(input: string, m: Messages): Problem {
	// Full-width digits and signs (７＋５, as a Japanese keyboard often types
	// them) and ideographic spaces become their ordinary forms.
	const trimmed = input.normalize('NFKC').trim();
	if (trimmed === '') throw new SorobanError(m.errors.empty);

	let negateFirst = false;
	// A leading plus sign changes nothing: "+5" is 5.
	let body = trimmed.replace(/^\+\s*/, '');
	if (body.startsWith('-') || body.startsWith('−')) {
		negateFirst = true;
		body = body.slice(1);
	}

	const tokens = tokenize(body, m);
	if (tokens.length === 0) throw new SorobanError(m.errors.empty);
	if (isOp(tokens[0])) throw new SorobanError(m.errors.startsWithOperator);
	if (isOp(tokens[tokens.length - 1])) throw new SorobanError(m.errors.endsWithOperator);
	// Tokens must alternate number, operator, number, …
	for (let i = 0; i < tokens.length; i++) {
		if (isOp(tokens[i]) !== (i % 2 === 1)) {
			throw new SorobanError(m.errors.doubled);
		}
	}

	const numbers = tokens.filter((t): t is Dec => !isOp(t));
	const ops = tokens.filter(isOp);

	if (ops.some((o) => o === '*' || o === '/')) {
		if (ops.length !== 1 || numbers.length !== 2) {
			throw new SorobanError(m.errors.mulDivTwo);
		}
		if (negateFirst) {
			throw new SorobanError(m.errors.negativeStart);
		}
		const [a, b] = numbers;
		const kind = ops[0] === '*' ? 'multiply' : 'divide';
		if (kind === 'divide' && decIsZero(b)) throw new SorobanError(m.errors.divideByZero);
		return {
			kind,
			terms: [],
			a,
			b,
			text: `${decToString(a)} ${OP_SYMBOL[ops[0]]} ${decToString(b)}`
		};
	}

	if (negateFirst) {
		throw new SorobanError(m.errors.negativeStart);
	}

	const terms = numbers.map((value, i) => ({
		op: i === 0 ? ('+' as const) : (ops[i - 1] as '+' | '-'),
		value
	}));

	const text = terms
		.map((t, i) => (i === 0 ? decToString(t.value) : ` ${OP_SYMBOL[t.op]} ${decToString(t.value)}`))
		.join('');

	return { kind: 'addsub', terms, a: numbers[0], b: numbers[1] ?? numbers[0], text };
}
