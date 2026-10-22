/**
 * The 九九 (kuku) multiplication chant.
 *
 * The written form is regular — first digit, second digit, then the product,
 * with が inserted when the product is a single digit (三三が九, 三六十八).
 * The *readings* are not: several pairs take euphonic forms that every Japanese
 * soroban and primary-school pupil learns by rote (さざんがく for 3×3,
 * さぶろく for 3×6, ごっく for 5×9, はっぱ for 8×8, はっく for 8×9 …).
 * Those are listed out rather than generated.
 */

const KANJI_DIGIT = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

/** Kanji for 1..81 — enough for the times table. */
function kanjiNumber(n: number): string {
	if (n < 10) return KANJI_DIGIT[n];
	const tens = Math.floor(n / 10);
	const ones = n % 10;
	const tensPart = tens === 1 ? '十' : `${KANJI_DIGIT[tens]}十`;
	return ones === 0 ? tensPart : `${tensPart}${KANJI_DIGIT[ones]}`;
}

/** Readings, indexed [a - 1][b - 1]. */
const READINGS: string[][] = [
	[
		"in'ichi ga ichi",
		'in ni ga ni',
		'in san ga san',
		'in shi ga shi',
		'in go ga go',
		'in roku ga roku',
		'in shichi ga shichi',
		'in hachi ga hachi',
		'in ku ga ku'
	],
	[
		'ni ichi ga ni',
		'ni nin ga shi',
		'ni san ga roku',
		'ni shi ga hachi',
		'ni go jū',
		'ni roku jū-ni',
		'ni shichi jū-shi',
		'ni hachi jū-roku',
		'ni ku jū-hachi'
	],
	[
		'san ichi ga san',
		'san ni ga roku',
		'sazan ga ku',
		'san shi jū-ni',
		'san go jū-go',
		'saburoku jū-hachi',
		'san shichi nijū-ichi',
		'sanpa nijū-shi',
		'san ku nijū-shichi'
	],
	[
		'shi ichi ga shi',
		'shi ni ga hachi',
		'shi san jū-ni',
		'shi shi jū-roku',
		'shi go nijū',
		'shi roku nijū-shi',
		'shi shichi nijū-hachi',
		'shi ha sanjū-ni',
		'shi ku sanjū-roku'
	],
	[
		'go ichi ga go',
		'go ni jū',
		'go san jū-go',
		'go shi nijū',
		'go go nijū-go',
		'go roku sanjū',
		'go shichi sanjū-go',
		'go ha shijū',
		'gokku shijū-go'
	],
	[
		'roku ichi ga roku',
		'roku ni jū-ni',
		'roku san jū-hachi',
		'roku shi nijū-shi',
		'roku go sanjū',
		'roku roku sanjū-roku',
		'roku shichi shijū-ni',
		'roku ha shijū-hachi',
		'rokku gojū-shi'
	],
	[
		'shichi ichi ga shichi',
		'shichi ni jū-shi',
		'shichi san nijū-ichi',
		'shichi shi nijū-hachi',
		'shichi go sanjū-go',
		'shichi roku shijū-ni',
		'shichi shichi shijū-ku',
		'shichi ha gojū-roku',
		'shichi ku rokujū-san'
	],
	[
		'hachi ichi ga hachi',
		'hachi ni jū-roku',
		'hachi san nijū-shi',
		'hachi shi sanjū-ni',
		'hachi go shijū',
		'hachi roku shijū-hachi',
		'hachi shichi gojū-roku',
		'happa rokujū-shi',
		'hakku shichijū-ni'
	],
	[
		'ku ichi ga ku',
		'ku ni jū-hachi',
		'ku san nijū-shichi',
		'ku shi sanjū-roku',
		'ku go shijū-go',
		'ku roku gojū-shi',
		'ku shichi rokujū-san',
		'ku ha shichijū-ni',
		'ku ku hachijū-ichi'
	]
];

export interface Kuku {
	product: number;
	/** Written form, e.g. 三四十二. */
	ja: string;
	/** Reading, e.g. "san shi jū-ni". */
	romaji: string;
}

export function kuku(a: number, b: number): Kuku {
	const product = a * b;
	if (a < 1 || a > 9 || b < 1 || b > 9) {
		return { product, ja: `${a}×${b}=${product}`, romaji: '' };
	}
	const ja = `${KANJI_DIGIT[a]}${KANJI_DIGIT[b]}${product < 10 ? 'が' : ''}${kanjiNumber(product)}`;
	return { product, ja, romaji: READINGS[a - 1][b - 1] };
}
