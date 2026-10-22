<!--
	Stage ③ of the path to 暗算: the beads are gone, and the chain is worked on
	the soroban in the mind alone.

	Flash (フラッシュ暗算): the numbers appear one at a time where the board
	stood, each followed by a moment of blank paper, so a number repeated twice
	in a row is still seen as two. Read aloud (読み上げ算): the browser speaks
	the chain, in Japanese with the phrases soroban schools read it in, while
	the page stays empty and the eyes can close. Either way the answer is then
	given from memory and checked.
-->
<script module lang="ts">
	export interface DrillText {
		begin: string;
		again: string;
		check: string;
		correct: string;
		yourAnswer: (guess: string) => string;
		answerLabel: string;
		recallAnswer: string;
		watchIt: string;
		nextProblem: string;
		listening: string;
		noSpeech: string;
		noVoice: string;
		/** The spoken chain: the opening, each number, and the close. */
		speech: {
			open: string;
			first: (n: string) => string;
			add: (n: string, afterSubtract: boolean) => string;
			subtract: (n: string) => string;
			close: string;
		};
	}
</script>

<script lang="ts">
	import { onDestroy, tick } from 'svelte';

	interface Props {
		kind: 'flash' | 'read';
		terms: { op: '+' | '-'; text: string }[];
		answer: string;
		/** The page's speed setting, 0.4–3; 1 is a comfortable pace. */
		pace: number;
		/** BCP 47 language for the voice, e.g. "ja-JP". */
		voiceLang: string;
		text: DrillText;
		/** Whether two answers mean the same number. */
		same: (a: string, b: string) => boolean;
		onresult?: (correct: boolean) => void;
		onwatch?: () => void;
		/** Offered after checking when practising. */
		onnext?: (() => void) | null;
	}

	let {
		kind,
		terms,
		answer,
		pace,
		voiceLang,
		text,
		same,
		onresult,
		onwatch,
		onnext = null
	}: Props = $props();

	type Phase = 'ready' | 'settle' | 'running' | 'answer' | 'done';
	let phase = $state<Phase>('ready');
	/** The number on show while flashing; null for the blank between numbers. */
	let shown = $state<{ op: '+' | '-'; text: string; first: boolean } | null>(null);
	let guess = $state('');
	let verdict = $state<{ correct: boolean; guess: string } | null>(null);
	let warning = $state('');
	let field: HTMLInputElement | undefined = $state();

	let timers: ReturnType<typeof setTimeout>[] = [];
	let run = 0;

	function stop() {
		run++;
		for (const t of timers) clearTimeout(t);
		timers = [];
		if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
	}

	function later(ms: number, fn: () => void) {
		timers.push(setTimeout(fn, ms));
	}

	async function ask() {
		phase = 'answer';
		shown = null;
		await tick();
		field?.focus();
	}

	function begin() {
		stop();
		guess = '';
		verdict = null;
		warning = '';
		phase = 'settle';
		// A breath before the first number, as a teacher pauses before reading.
		later(900, () => (kind === 'flash' ? flash() : read()));
	}

	function flash() {
		phase = 'running';
		const each = (1500 / pace) | 0;
		const gap = Math.max(90, each * 0.18);
		terms.forEach((term, i) => {
			later(i * each, () => (shown = { ...term, first: i === 0 }));
			later(i * each + each - gap, () => (shown = null));
		});
		later(terms.length * each, ask);
	}

	function voiceFor(lang: string): SpeechSynthesisVoice | null {
		const prefix = lang.slice(0, 2);
		const voices = speechSynthesis.getVoices();
		return (
			voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(prefix)) ?? null
		);
	}

	function read() {
		if (typeof speechSynthesis === 'undefined') {
			warning = text.noSpeech;
			phase = 'ready';
			return;
		}
		phase = 'running';
		const voice = voiceFor(voiceLang);
		if (!voice && speechSynthesis.getVoices().length) warning = text.noVoice;
		const s = text.speech;
		const lines = [s.open];
		terms.forEach((term, i) => {
			if (i === 0) lines.push(s.first(term.text));
			else if (term.op === '-') lines.push(s.subtract(term.text));
			else lines.push(s.add(term.text, terms[i - 1].op === '-'));
		});
		lines.push(s.close);

		const mine = run;
		const finish = () => {
			if (mine === run && phase === 'running') void ask();
		};
		const rate = Math.min(1.8, Math.max(0.6, 0.55 + 0.45 * pace));
		lines.forEach((line, i) => {
			const u = new SpeechSynthesisUtterance(line);
			u.lang = voiceLang;
			if (voice) u.voice = voice;
			u.rate = rate;
			if (i === lines.length - 1) u.onend = finish;
			u.onerror = () => {
				warning = text.noSpeech;
				finish();
			};
			speechSynthesis.speak(u);
		});
		// Some devices never report the end of speech (or never speak at all).
		// Rather than wait for ever, move on well after the reading should be over.
		const chars = lines.reduce((sum, line) => sum + line.length, 0);
		later(4000 + (chars * 260) / rate, finish);
	}

	function check() {
		if (!guess.trim()) return;
		verdict = { correct: same(guess, answer), guess: guess.trim() };
		phase = 'done';
		onresult?.(verdict.correct);
	}

	// A new problem, or a change of drill, starts over from the beginning.
	$effect(() => {
		void terms;
		void kind;
		stop();
		phase = 'ready';
		shown = null;
		verdict = null;
		guess = '';
		warning = '';
	});

	// Some browsers load their voices late; asking early makes them start.
	$effect(() => {
		if (kind === 'read' && typeof speechSynthesis !== 'undefined') speechSynthesis.getVoices();
	});

	onDestroy(stop);
</script>

<div class="drill" class:reading={kind === 'read'}>
	{#if phase === 'ready'}
		<div class="centre">
			<button type="button" class="begin" onclick={begin}>{text.begin}</button>
			{#if warning}<p class="warning">{warning}</p>{/if}
		</div>
	{:else if phase === 'settle' || phase === 'running'}
		<div class="centre" aria-live="off">
			{#if kind === 'flash'}
				{#if shown}
					<span class="number" class:minus={shown.op === '-' && !shown.first}
						>{shown.op === '-' && !shown.first ? '−' : ''}{shown.text}</span
					>
				{/if}
			{:else}
				<img class="listening" src="/enso.svg" alt="" />
				<span class="quiet-label">{text.listening}</span>
				{#if warning}<p class="warning">{warning}</p>{/if}
			{/if}
		</div>
	{:else}
		<div class="centre">
			{#if phase === 'answer'}
				<form
					class="guess"
					onsubmit={(event) => {
						event.preventDefault();
						check();
					}}
				>
					<label for="drill-guess">{text.recallAnswer}</label>
					<div class="guess-row">
						<input
							id="drill-guess"
							type="text"
							inputmode="decimal"
							autocomplete="off"
							spellcheck="false"
							bind:this={field}
							bind:value={guess}
						/>
						<button type="submit" class="ink-button">{text.check}</button>
					</div>
				</form>
			{:else if verdict}
				<p class="result" aria-live="polite">
					<span class="answer-label">{text.answerLabel}</span>
					<strong>{answer}</strong>
					<span class="verdict" class:wrong={!verdict.correct}
						>{verdict.correct ? text.correct : text.yourAnswer(verdict.guess)}</span
					>
				</p>
				<div class="after">
					{#if onnext}
						<button type="button" class="ink-button" onclick={onnext}>{text.nextProblem}</button>
					{/if}
					<button type="button" class="stroke-button" onclick={begin}>{text.again}</button>
					<button type="button" class="stroke-button" onclick={() => onwatch?.()}
						>{text.watchIt}</button
					>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Laid over the board's place; the paper shows through. */
	.drill {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		z-index: 2;
	}
	.centre {
		display: grid;
		justify-items: center;
		gap: 1.1rem;
		padding: 1rem;
		text-align: center;
	}

	/* The number on show: large, in the face every number on the page uses. */
	.number {
		font: 400 clamp(4rem, 13vw, 9.5rem) / 1 var(--mincho);
		color: var(--ink);
		font-variant-numeric: lining-nums;
		letter-spacing: 0.02em;
	}
	.number.minus {
		color: var(--shu);
	}

	.listening {
		width: 5.5rem;
		height: 5.5rem;
		opacity: 0.22;
		animation: breathe 3.2s ease-in-out infinite;
	}
	@keyframes breathe {
		50% {
			opacity: 0.38;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.listening {
			animation: none;
		}
	}
	.quiet-label {
		font: 400 0.95rem/1 var(--display);
		letter-spacing: 0.08em;
		color: var(--ink-ghost);
	}
	.warning {
		max-width: 26rem;
		margin: 0;
		font: 400 0.95rem/1.5 var(--mincho);
		color: var(--shu);
	}

	/* A broad stroke of ink to begin, as the page's other main actions. */
	.begin,
	.ink-button {
		border: 0;
		background: url('/ink/button-stroke.svg') center / 100% 100% no-repeat;
		color: var(--paper);
		font: 400 1.2rem/1 var(--display);
		letter-spacing: 0.03em;
		cursor: pointer;
		transition: opacity 0.2s ease;
	}
	.begin {
		padding: 0.9rem 2.6rem 0.95rem 2.2rem;
		font-size: 1.45rem;
	}
	.ink-button {
		padding: 0.55rem 1.35rem 0.6rem 1.05rem;
	}
	.stroke-button {
		padding: 0.2rem 0.1rem 0.5rem;
		border: 0;
		background: url('/ink/line-tab.svg') left bottom / 100% 6px no-repeat;
		font: 400 1.05rem/1 var(--display);
		letter-spacing: 0.04em;
		color: var(--ink);
		cursor: pointer;
	}
	.begin:hover,
	.ink-button:hover,
	.stroke-button:hover {
		opacity: 0.8;
	}
	.begin:focus-visible,
	.ink-button:focus-visible,
	.stroke-button:focus-visible {
		outline: 1px dotted var(--ink-faint);
		outline-offset: 4px;
	}

	.guess {
		display: grid;
		justify-items: center;
		gap: 0.6rem;
	}
	.guess label {
		font: 400 0.95rem/1.2 var(--display);
		letter-spacing: 0.04em;
		color: var(--ink-faint);
	}
	.guess-row {
		display: flex;
		align-items: center;
		gap: 0.9rem;
	}
	.guess input {
		width: 11rem;
		padding: 0.25rem 0 0.5rem;
		border: 0;
		border-radius: 0;
		background: url('/ink/line-wash.svg') left bottom / 100% 8px no-repeat;
		color: var(--ink);
		font: 500 2rem/1.2 var(--mincho);
		text-align: center;
	}
	.guess input:focus {
		outline: none;
	}

	.result {
		display: grid;
		justify-items: center;
		gap: 0.5rem;
		margin: 0;
	}
	.answer-label {
		font: 400 1rem/1 var(--display);
		letter-spacing: 0.04em;
		color: var(--ink-faint);
	}
	.result strong {
		font: 400 clamp(3rem, 9vw, 5.5rem) / 1 var(--mincho);
		color: var(--ink);
	}
	.verdict {
		font: 500 1.1rem/1.4 var(--mincho);
		color: var(--ink-soft);
	}
	.verdict.wrong {
		color: var(--shu);
	}
	.after {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 1rem 1.6rem;
		margin-top: 0.6rem;
	}
</style>
