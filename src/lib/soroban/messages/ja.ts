/**
 * 日本語のメッセージ。
 *
 * サイト上の日本語はすべてこのファイルにあります。そろばん教室の解説で使われる
 * 言い方（一玉を入れる・払う、商を立てる、繰り上げる など）にそろえ、です・ます調で
 * 書いています。日本語話者によるチェックは、このファイルを読むだけで済みます。
 *
 * All Japanese on the site lives in this file, so a native speaker can review
 * the whole of it in one pass.
 */
import type { Messages } from './types';

const MINUS = '−';

const PLACES: Record<number, string> = {
	8: '一億の位',
	7: '千万の位',
	6: '百万の位',
	5: '十万の位',
	4: '一万の位',
	3: '千の位',
	2: '百の位',
	1: '十の位',
	0: '一の位'
};

function place(power: number): string {
	if (power < 0) return `小数第${-power}位`;
	return PLACES[power] ?? `10^${power}の位`;
}

export const ja: Messages = {
	locale: 'ja',

	place,

	bead: {
		addFive: ({ place, extra }) =>
			extra ? `${place}に五玉を入れ、一玉を${extra}つ入れます。` : `${place}に五玉を入れます。`,
		addFiveWhy: ({ n, extra }) =>
			extra
				? `${n}は5と${extra}に分けられます。五玉はまだ入っていないので、5を五玉で、残りの${extra}を一玉で入れます。`
				: '五玉はまだ入っていないので、5は五玉ひとつで入れられます。',
		addEarth: ({ place, n }) => `${place}に一玉を${n}つ入れます。`,
		addEarthWhy: ({ n, free }) =>
			`下に残っている一玉が${free}つあり、入れるのは${n}つなので、そのまま入れられます。補数は使いません。`,
		fiveComposition: ({ place, give }) => `${place}に五玉を入れ、一玉を${give}つ払います。`,
		fiveCompositionWhy: ({ n, free, give }) =>
			`${n}を足すには一玉が${n}つ必要ですが、${free === 0 ? '下に一玉が残っていません' : `下に残っているのは${free}つだけです`}。そこで五玉を使います。5を入れると${give}多すぎるので、その${give}を一玉で払います。+5 ${MINUS} ${give} = +${n} です。`,

		subFive: ({ place, extra }) =>
			extra ? `${place}の五玉を払い、一玉を${extra}つ払います。` : `${place}の五玉を払います。`,
		subFiveWhy: ({ n, extra }) =>
			extra
				? `${n}は5と${extra}に分けられます。5を五玉で、残りの${extra}を一玉で払います。`
				: '五玉が入っているので、五玉を払えば一度に5を引けます。',
		subEarth: ({ place, n }) => `${place}の一玉を${n}つ払います。`,
		subEarthWhy: ({ n, ones }) =>
			`入っている一玉が${ones}つあるので、そのまま${n}を払えます。五玉は使いません。`,
		fiveDecomposition: ({ place, give }) => `${place}の五玉を払い、一玉を${give}つ入れます。`,
		fiveDecompositionWhy: ({ n, ones, give }) =>
			`${n}を引くには一玉が${n}つ必要ですが、${ones === 0 ? '一玉が入っていません' : `入っているのは${ones}つだけです`}。そこで五玉を使います。五玉を払うと5引くことになり、${give}引きすぎるので、その${give}を一玉で入れます。${MINUS}5 + ${give} = ${MINUS}${n} です。`,

		carryIn: ({ place, value, n }) =>
			`これが繰り上がりです。${place}の${value} + ${n}は${value + n}で、1つのけたに収まりません。そこで10を左のけたへ移します。左のけたでは、10は一玉1つ分です。`,
		borrowIn: ({ place, value, n }) =>
			`これが繰り下がりです。${place}は${value}なので、${n}を引けません。そこで左のけたから10を取ります。左のけたでは、10は一玉1つ分です。`,
		carryWhy: ({ value, n, complement, leftPlace }) =>
			`1つのけたに置けるのは9までで、${value} + ${n}は${value + n}になります。そこで先に${leftPlace}へ1を繰り上げました。${n}の補数（足して10になる数）は${complement}なので、ここでその${complement}を払います。+10 ${MINUS} ${complement} = +${n} です。`,
		borrowWhy: ({ value, n, complement, leftPlace }) =>
			`このけたは${value}なので、${n}をそのまま引けません。そこで先に${leftPlace}の1を払い、10を引きました。引きたいのは${n}だけなので、引きすぎた分、つまり${n}の補数の${complement}をここに入れます。${MINUS}10 + ${complement} = ${MINUS}${n} です。`,

		phaseAdd: ({ place, value, n }) => `${place}：${value} + ${n}`,
		phaseSub: ({ place, value, n }) => `${place}：${value} ${MINUS} ${n}`
	},

	addsub: {
		setLabel: (v) => `${v}を置く`,
		addLabel: (v) => `${v}を足す`,
		subLabel: (v) => `${v}を引く`,
		groupWhy:
			'そろばんでは、大きい位から順に入れていきます。筆算とは逆の順番です。だから読み上げ算でも、数を最後まで聞く前に入れ始められます。',
		setText: (v) => `${v}を置きます。一の位を定位点にそろえます。`,
		setWhy:
			'盤には合計の数だけを置きます。このあとの数はすべて同じけたに足し引きしていくので、そろばんにはメモ書きがいりません。そしてこの盤の様子こそ、暗算で思い浮かべるものです。',
		region: '答え',
		notes: [
			{
				heading: '計算方法',
				term: '見取り算',
				body: '足し算と引き算です。盤に合計を1つだけ置き、そこへ数を順に足し引きしていきます。'
			},
			{
				heading: '入れる順番',
				body: 'どの数も、大きい位から小さい位へ順に入れます。筆算とは逆で、読み上げ算についていけるのはこのためです。'
			},
			{
				heading: '補数',
				body: '一玉が足りないときは五玉で補います（五の合成・分解）。けたがいっぱいのときは左のけたへ1を繰り上げ、足りないときは左のけたから1を借りて、10の補数で調整します（十の繰り上がり・繰り下がり）。'
			}
		]
	},

	multiply: {
		setup: '準備',
		locateGroup: 'どちらの数も盤に置かない',
		locateGroupWhy:
			'両落としでは、かけられる数もかける数も頭の中に置いておき、盤には答えだけを積み上げていきます。',
		locateText: '答えの一の位を定位点に決めます。まだ珠は動かしません。',
		locateWhy:
			'部分積はすべてこのけたを基準に置くので、最初に決めておく必要があります。盤にはほかに何も置かないので、頼りになるのはこの基準点と、それぞれの数字の位だけです。',
		section: ({ digit, multiplier }) => `${digit} × ${multiplier}`,
		product: ({ a, b, product, kuku }) => `${a} × ${b} = ${product}（${kuku}）`,
		productWhy: ({ a, aPlace, b, bPlace, k, j }) => {
			const offset = k + j;
			const where =
				offset === 0 ? '答えの一の位にそのまま置きます' : `答えの一の位から${offset}けた左に置きます`;
			return `${a}はかけられる数の${aPlace}、${b}はかける数の${bPlace}の数字です。一の位を0として位の番号を足すと${k} + ${j} = ${offset}なので、この積の一の位は${where}。位取りは、この足し算だけで決まります。`;
		},
		region: '積',
		notes: [
			{
				heading: '計算方法',
				term: '両落とし',
				body: 'かけられる数もかける数も盤に置かず、頭の中に置いておきます。盤には積だけが積み上がっていきます。盤の様子が暗算で思い浮かべるものとそのまま同じなので、暗算につながる方法です。'
			},
			{
				heading: '計算の順番',
				body: 'かけられる数の大きい位から始め、それぞれの数字に、かける数の大きい位から順にかけていきます。どちらも読む順番どおりです。かけられる数を盤に置かないので上書きの心配がなく、一の位から始める必要はありません。'
			},
			{
				heading: '位取り',
				body: '一の位を0、十の位を1、百の位を2と数えます。かけられる数の位の番号がk、かける数の位の番号がjのとき、その積の一の位は、答えの一の位からk + jけた左に置きます。盤の配置を見なくても、この規則だけで位取りが決まります。'
			}
		]
	},

	divide: {
		setup: '準備',
		setGroup: (divisor) => `わる数${divisor}は盤に置かない`,
		setGroupWhy:
			'片落としでは、わる数は頭の中で使います。盤には、わられる数と、そこから育っていく商だけが並びます。',
		setText: (v) => `わられる数${v}を右側に置きます。左側は商を立てるために空けておきます。`,
		setWhy: ({ d }) =>
			`わる数が${d}けたなので、商の一の位は、わられる数の一の位から${d + 1}けた左になります（定位法）。割り始める前に、そのための場所を空けておきます。`,
		section: (quotientPlace) => `商の${quotientPlace}`,
		doesNotGo: ({ divisor, segment }) => `${segment}に${divisor}は入らない`,
		divides: ({ divisor, segment, q }) => `${segment} ÷ ${divisor} → ${q}`,
		settleWhy: ({ segment }) =>
			`珠を動かす前に、頭の中で商を決めます。${segment}にわる数を当てて、収まるいちばん大きい倍数を選びます。`,
		zeroWhy: ({ divisor, segment }) =>
			`${divisor} × 1 = ${divisor}で、もう${segment}より大きいので、ここには何も入らず、商は0です。このけたは空けたまま、1けた右へ進みます。`,
		digitWhy: ({ divisor, q, segment }) =>
			`${divisor} × ${q} = ${q * divisor}は${segment}に収まりますが、${divisor} × ${q + 1} = ${(q + 1) * divisor}は収まりません。だから商は${q}です。立てる前に頭の中で両方を確かめておくので、立てた商を戻す（還元する）ことがありません。`,
		zeroText: ({ divisor, segment, quotientPlace }) =>
			`${segment}に${divisor}は入らないので、商の${quotientPlace}は0です。`,
		digitText: ({ q, quotientPlace }) => `商の${quotientPlace}に${q}を立てます。`,
		subtract: ({ q, digit, product, kuku }) =>
			`${q} × ${digit} = ${product}（${kuku}）を引く`,
		subtractWhy: ({ q, digit, i }) =>
			i === 0
				? `${digit}はわる数の最初の数字なので、${q} × ${digit}は商のすぐ右から引きます。答えを2けたとみて、十の位を商の右隣のけたで、一の位をそのさらに右のけたで引きます。`
				: `${digit}はわる数の${i + 1}番目の数字なので、${q} × ${digit}は最初の積より${i}けた右にずらして引きます。わる数の数字が1つ進むごとに、1けたずつ右へずれます。`,
		regionQuotient: '商',
		regionDividend: '実',
		notes: {
			method: {
				heading: '計算方法',
				term: '商除法（片落とし）',
				body: 'わる数は盤に置きません。わられる数の左に商を1けたずつ立て、そのたびに積をその場で引いていきます。商が育つにつれて、わられる数が減っていきます。'
			},
			kakusho: {
				heading: '確商',
				body: '商は、収まるいちばん大きい倍数を頭の中で先に確かめてから立てます。立ててから大きすぎたと気づいて戻す方法（還元）は、あえて使いません。戻す習慣は、暗算に移ると続けられないからです。'
			},
			placeValue: ({ d }) => ({
				heading: '定位法',
				body: `わる数が${d}けたなので、商の一の位は、わられる数の一の位から${d + 1}けた左になります。`
			}),
			firstDigit: ({ divisor, d, lead, fits }) => ({
				heading: '最初の商',
				body: fits
					? `わる数${divisor}は、わられる数の上${d}けた（${lead}）に入るので、最初の商は、わられる数のいちばん左のけたから2けた左に立てます。`
					: `わる数${divisor}は、わられる数の上${d}けた（${lead}）に入らないので、もう1けた加えて考え、最初の商は、わられる数のいちばん左のけたから1けた左に立てます。`
			}),
			notExact: ({ maxDecimals }) => ({
				heading: '割り切れない場合',
				body:
					maxDecimals === 0
						? '一の位で止めています。わられる数の残り（余り）は、商の右側のけたにそのまま残っています。'
						: `小数第${maxDecimals}位で止めています。わられる数の残り（余り）は、商の右側のけたにそのまま残っています。`
			})
		}
	},

	errors: {
		needRodsLeft: '盤のけたが足りません。左にもっとけたが必要です。',
		carryNowhere: '盤のけたが足りません。繰り上げる先のけたがありません。',
		nothingToBorrow: '盤のけたが足りません。繰り下げて借りるけたがありません。',
		doesNotFit: '数が盤に収まりません。',
		tooManyRods: ({ needed, max }) =>
			`この問題には${needed}けた必要ですが、ここで使える最大のそろばんは${max}けたです。数を小さくするか、小数のけた数を減らしてください。`,
		notANumber: (raw) => `「${raw}」は数として読めません。`,
		tooManyDigits: (max) => `盤が現実的な大きさに収まるよう、数は有効数字${max}けたまでにしています。`,
		empty: '問題を入力してください（例：4104 ÷ 76）。',
		endsWithOperator: '式が記号で終わっています。',
		doubled: '数または記号が続けて並んでいます。',
		mulDivTwo:
			'かけ算とわり算は、2つの数で計算します。2 × 3 × 4 のような続けての計算は、伝統的な練習には含まれません。',
		negativeStart: 'そろばんでは負の数を表せないので、正の数から始めてください。',
		divideByZero: '0でわることはできません。',
		multiplyByZero: '0をかけると盤が空になります。0以外の数で試してください。',
		negativeRunning: (term) =>
			`そろばんでは負の数を表せませんが、${term}のところで合計が0より小さくなります。合計が0を下回らないよう、順番を入れ替えてください。`
	}
};
