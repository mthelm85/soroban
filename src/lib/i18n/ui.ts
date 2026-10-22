import type { Locale } from '../soroban/messages';
import type { LevelId } from '../soroban/practice';

/** Interface text for the page around the board. Engine narration lives in soroban/messages. */
export interface UiText {
	lang: string;
	title: string;
	description: string;
	problemLabel: string;
	/** The button beside the problem that sets it on the board. */
	solve: string;
	examples: string;
	/** Hint shown beside each example, in the order of EXAMPLES. */
	exampleHints: string[];
	panelOpen: string;
	panelClose: string;
	tabSteps: string;
	tabMethod: string;
	start: string;
	back: string;
	playPause: string;
	forward: string;
	end: string;
	speed: string;
	decimals: string;
	decimalsValue: (n: number) => string;
	resetView: string;
	/** Shown while the board's lighting and shaders are prepared. */
	loading: string;
	sound: string;
	soundTitle: string;
	why: string;
	answer: string;
	resting: string;
	/** The two ways of working a problem: watching it, then recalling it (stage ② of 暗算). */
	modeWatch: string;
	modeRecall: string;
	modeLabel: string;
	/** Before the first step, from memory. */
	recallReady: (problem: string) => string;
	/** Each hidden step's prompt. */
	recallPrompt: string;
	reveal: string;
	/** The answer typed from memory at the last step. */
	recallAnswer: string;
	check: string;
	correct: string;
	/** The learner's own answer, when it was wrong; the right one is shown beside it. */
	yourAnswer: (guess: string) => string;
	/** How many steps were revealed on the way. */
	peeks: (revealed: number, total: number) => string;
	/** Practice: problems dealt at a chosen level. */
	practice: string;
	levels: Record<LevelId, { name: string; hint: string }>;
	nextProblem: string;
	endPractice: string;
	/** Before any problem at the level has been answered from memory. */
	practiceStart: string;
	/** Results at this level: right answers among the last few from memory. */
	practiceRecord: (correct: number, count: number) => string;
	/** Five in a row from memory, with the next level's name. */
	readyToMoveUp: (next: string) => string;
	moveUp: string;
	failed: string;
	/** Link to the other language version. */
	switchLabel: string;
	switchPath: string;
}

/** The built-in examples, the same in both languages. */
export const EXAMPLES = [
	'7 + 5',
	'11 − 6',
	'123 + 456 − 78',
	'23 × 45',
	'12 × 345',
	'4104 ÷ 76',
	'1 ÷ 9'
];

export const UI: Record<Locale, UiText> = {
	en: {
		lang: 'en',
		title: 'Soroban — worked bead by bead',
		description:
			'A 3D Japanese soroban that works arithmetic out bead by bead, explaining why each move is the one the method calls for.',
		problemLabel: 'Problem',
		solve: 'Solve',
		examples: 'Examples',
		exampleHints: [
			'a carry',
			'a borrow',
			'a chain',
			'two by two',
			'two by three',
			'exact',
			'recurring'
		],
		panelOpen: 'Steps & method',
		panelClose: 'Close',
		tabSteps: 'Steps',
		tabMethod: 'Method',
		start: 'Start',
		back: 'Back',
		playPause: 'Play or pause',
		forward: 'Forward',
		end: 'End',
		speed: 'Playback speed',
		decimals: 'Decimal places',
		decimalsValue: (n) => `${n} dp`,
		resetView: 'Reset view',
		loading: 'Preparing the board',
		sound: 'Sound',
		soundTitle: 'Bead sounds',
		why: 'Why',
		answer: 'Answer',
		resting: 'The board is clear. Press play, or step through with the arrow keys.',
		modeWatch: 'Watch',
		modeRecall: 'From memory',
		modeLabel: 'How to work the problem',
		recallReady: (problem) =>
			`Set ${problem} on the soroban in your mind, then step through it without looking at the beads.`,
		recallPrompt: 'Picture this move on the beads in your mind, then reveal it to check.',
		reveal: 'Reveal',
		recallAnswer: 'The answer, from memory',
		check: 'Check',
		correct: 'Correct.',
		yourAnswer: (guess) => `You had ${guess}.`,
		peeks: (revealed, total) =>
			revealed === 0
				? 'Every step from memory — none revealed.'
				: `${revealed} of ${total} steps revealed.`,
		practice: 'Practice',
		levels: {
			'first-beads': { name: 'First beads', hint: 'Direct moves only, no complements' },
			fives: { name: 'Fives', hint: 'Every problem needs a five-complement' },
			tens: { name: 'Tens', hint: 'Every problem carries or borrows' },
			'two-digits': { name: 'Two digits', hint: 'Two 2-digit numbers' },
			chains: { name: 'Chains', hint: 'Four 2-digit numbers, + and −' },
			'long-chains': { name: 'Long chains', hint: 'Five numbers of 2–3 digits' },
			'mul-2x1': { name: 'Multiply 2 × 1', hint: '2 digits by 1 digit' },
			'mul-2x2': { name: 'Multiply 2 × 2', hint: '2 digits by 2 digits' },
			'mul-3x2': { name: 'Multiply 3 × 2', hint: '3 digits by 2 digits' },
			'div-1': { name: 'Divide by 1 digit', hint: 'Comes out exactly' },
			'div-2': { name: 'Divide by 2 digits', hint: 'Comes out exactly' }
		},
		nextProblem: 'Next problem',
		endPractice: 'End practice',
		practiceStart: 'Work it from memory to have it counted.',
		practiceRecord: (correct, count) => `${correct} of the last ${count} right from memory`,
		readyToMoveUp: (next) => `Five in a row from memory. Ready for ${next}.`,
		moveUp: 'Move up',
		failed: 'Something went wrong working that out.',
		switchLabel: '日本語',
		switchPath: '/ja'
	},
	ja: {
		lang: 'ja',
		title: 'そろばん — 一玉ずつ、なぜかまで',
		description:
			'3Dのそろばんで、計算を一玉ずつ、なぜその動かし方になるのかまで説明しながら進めます。',
		problemLabel: '問題',
		solve: '解く',
		examples: '例題',
		exampleHints: [
			'繰り上がり',
			'繰り下がり',
			'見取り算',
			'2けた×2けた',
			'2けた×3けた',
			'割り切れる',
			'割り切れない'
		],
		panelOpen: '手順と解説',
		panelClose: '閉じる',
		tabSteps: '手順',
		tabMethod: '解説',
		start: '最初へ',
		back: '戻る',
		playPause: '再生・一時停止',
		forward: '進む',
		end: '最後へ',
		speed: '再生速度',
		decimals: '小数のけた数',
		decimalsValue: (n) => `小数${n}けた`,
		resetView: '視点を戻す',
		loading: '盤を用意しています',
		sound: '音',
		soundTitle: '珠の音',
		why: 'なぜ',
		answer: '答え',
		resting: '盤はまだ空です。再生ボタンを押すか、矢印キーで1手ずつ進めてください。',
		modeWatch: '見る',
		modeRecall: '思い出す',
		modeLabel: '進め方',
		recallReady: (problem) =>
			`${problem}を頭の中のそろばんに置き、珠を見ずに1手ずつ進めてください。`,
		recallPrompt: 'この1手の珠の動きを頭の中で思い浮かべてから、表示して確かめましょう。',
		reveal: '表示する',
		recallAnswer: '頭の中で出した答え',
		check: '確かめる',
		correct: '正解です。',
		yourAnswer: (guess) => `あなたの答えは${guess}でした。`,
		peeks: (revealed, total) =>
			revealed === 0
				? '1手も表示せずに、すべて頭の中で進めました。'
				: `全${total}手のうち、${revealed}手を表示しました。`,
		practice: '練習',
		levels: {
			'first-beads': { name: '入門', hint: '補数を使わない入れ払いだけ' },
			fives: { name: '五の合成・分解', hint: '必ず5の補数を使う' },
			tens: { name: '十の繰り上がり・繰り下がり', hint: '必ず繰り上がりか繰り下がりがある' },
			'two-digits': { name: '2けたの足し引き', hint: '2けたの数を2口' },
			chains: { name: '見取り算（2けた4口）', hint: '2けたの数を4口、足し算と引き算' },
			'long-chains': { name: '見取り算（3けた5口）', hint: '2〜3けたの数を5口' },
			'mul-2x1': { name: 'かけ算 2けた×1けた', hint: '両落としで' },
			'mul-2x2': { name: 'かけ算 2けた×2けた', hint: '両落としで' },
			'mul-3x2': { name: 'かけ算 3けた×2けた', hint: '両落としで' },
			'div-1': { name: 'わり算 わる数1けた', hint: '割り切れる問題' },
			'div-2': { name: 'わり算 わる数2けた', hint: '割り切れる問題' }
		},
		nextProblem: '次の問題',
		endPractice: '練習を終える',
		practiceStart: '「思い出す」で解くと記録されます。',
		practiceRecord: (correct, count) => `思い出して解いた直近${count}問のうち${correct}問正解`,
		readyToMoveUp: (next) => `5問続けて正解です。次は「${next}」へ。`,
		moveUp: '次へ進む',
		failed: '計算中にエラーが起きました。',
		switchLabel: 'English',
		switchPath: '/'
	}
};
