import type { Locale } from '../soroban/messages';

/**
 * The page's plain-language account of itself, below the board: what a
 * soroban is and which methods the app teaches. It is written as questions
 * and answers because that is how people (and the search and answer engines
 * that read for them) ask about it, and the same text feeds the page's
 * structured data, so the two can never disagree.
 */
export interface AboutText {
	heading: string;
	lead: string;
	faq: { q: string; a: string }[];
}

export const ABOUT: Record<Locale, AboutText> = {
	en: {
		heading: 'About this soroban',
		lead: 'A free 3D Japanese abacus that works any addition, subtraction, multiplication or division bead by bead, and explains why each move is the one the method calls for. Type a problem or pick a practice level, watch it worked, try it from memory, then do it in your head from a flash. The methods are the ones taught in Japanese soroban schools.',
		faq: [
			{
				q: 'What is a soroban?',
				a: 'The soroban (算盤) is the Japanese abacus. Each rod is one decimal place and holds one upper bead worth 5 and four lower beads worth 1 each, so a single rod shows any digit from 0 to 9. Dots on the beam mark the unit rods, where a number’s ones digit is lined up. It descends from the Chinese suanpan and took its present one-and-four form in the 20th century.'
			},
			{
				q: 'How do you add and subtract on a soroban?',
				a: 'Each number goes on from its highest digit down, into one running total on the rods. When a rod has too few beads for a move, a complement stands in: the five bead covers 1 to 4 (五の合成 and 五の分解, five-complement addition and subtraction), and a full rod carries ten to the rod on its left or borrows ten from it (十の繰り上がり and 十の繰り下がり). The app names the technique behind every move.'
			},
			{
				q: 'How does multiplication work on a soroban?',
				a: 'This app teaches 両落とし (ryō-otoshi): neither factor is set on the rods. Both are held in mind, and each single-digit product is added straight into the answer. Where it goes follows one rule: count places from the ones place as 0, and a digit in place k times a digit in place j lands with its ones digit k + j rods left of the answer’s ones rod. Because the board shows nothing but the answer, the same work carries over to mental arithmetic.'
			},
			{
				q: 'How does division work on a soroban?',
				a: 'Division uses 片落とし (kata-otoshi) with 確商 (kakushō): the divisor is held in mind and only the dividend is set. Each quotient digit is settled in your head first, as the largest multiple of the divisor that still fits, then set to the left of the dividend, and its products are subtracted where they fall. Nothing is placed and then taken back, a habit that would not survive the move to mental arithmetic. A division that does not come out exactly runs to the number of decimal places you choose.'
			},
			{
				q: 'What is anzan, and how does the app build up to it?',
				a: 'Anzan (暗算) is calculating on a soroban you picture rather than touch, and it is the goal of soroban training. Every problem can be worked in three stages: Watch, where each bead moves with its reason; From memory, where you work it yourself and reveal a step only when stuck; and Flash, where the problem is shown for a moment and you answer from your head, as in flash anzan (フラッシュ暗算).'
			},
			{
				q: 'Is it free, and what do I need?',
				a: 'It is free, with nothing to install and no sign-up. It runs in a modern browser on a computer, tablet or phone, in English or Japanese.'
			}
		]
	},
	ja: {
		heading: 'このそろばんについて',
		lead: '3Dのそろばんで、足し算・引き算・かけ算・わり算を一玉ずつ動かし、なぜその動かし方になるのかまで説明する無料のアプリです。問題を入力するか練習のレベルを選び、まず見て、次に思い出して解き、最後はフラッシュで暗算します。手法は珠算教室で教えられているものです。',
		faq: [
			{
				q: 'そろばんとは？',
				a: 'そろばん（算盤）は日本の計算具です。一本の桁が十進法の一桁にあたり、5を表す五珠が一つ、1を表す一珠が四つあるので、一本で0から9までを表せます。梁の上の点（定位点）は、数の一の位を合わせる桁の目印です。中国の算盤をもとに、20世紀に今の「五珠一つ・一珠四つ」の形になりました。'
			},
			{
				q: '足し算と引き算はどう計算する？',
				a: '数は大きい位から順に置き、盤上の一つの合計に加えていきます。珠が足りないときは補数を使います。1から4は五珠で補い（五の合成・五の分解）、桁がいっぱいなら左の桁へ十を繰り上げ、または左の桁から十を借ります（十の繰り上がり・十の繰り下がり）。アプリはすべての動きに技法の名前を示します。'
			},
			{
				q: 'かけ算はどう計算する？',
				a: 'このアプリは両落としを使います。どちらの数も盤には置かず、頭に置いたまま、一桁ずつの積を答えにそのまま加えていきます。積を置く位置は一つの規則で決まります。一の位を0として位を数えると、k の位の数字と j の位の数字の積は、一の位が答えの一の位から k + j 桁左にきます。盤には答えしか出ないので、そのまま暗算につながります。'
			},
			{
				q: 'わり算はどう計算する？',
				a: 'わり算は片落としと確商で行います。除数は頭に置き、盤には被除数だけを置きます。商の各桁は、除数の倍数のうち収まる最大のものを先に頭の中で決めてから被除数の左に置き、積をその場で引きます。置いた商を後から直すことがないので、暗算に移っても崩れない手順になります。割り切れないわり算は、選んだ小数点以下の桁数まで続けます。'
			},
			{
				q: '暗算とは？　アプリでどう身につける？',
				a: '暗算は、手で触れずに頭の中のそろばんで計算することで、珠算の学習の目標です。どの問題も三段階で練習できます。「見る」ではすべての珠の動きを理由とともに見られ、「思い出す」では自分で解き、迷ったときだけ手順を表示します。「フラッシュ」では問題が一瞬だけ表示され、フラッシュ暗算のように頭の中で答えます。'
			},
			{
				q: '無料ですか？　何が必要ですか？',
				a: '無料で、インストールも登録もいりません。パソコン、タブレット、スマートフォンのブラウザで動き、日本語と英語に対応しています。'
			}
		]
	}
};
