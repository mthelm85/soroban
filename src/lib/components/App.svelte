<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { page } from '$app/state';
	import Soroban3D from '#lib/components/Soroban3D.svelte';
	import StepList from '#lib/components/StepList.svelte';
	import InkMenu from '#lib/components/InkMenu.svelte';
	import Drill, { type DrillProblem, type DrillText } from '#lib/components/Drill.svelte';
	import {
		LEVELS,
		dealProblem,
		dealsChains,
		nextLevel,
		type LevelId
	} from '#lib/soroban/practice.js';
	import { UI } from '#lib/i18n/ui.js';
	import {
		decToString,
		formatSpan,
		messagesFor,
		parseProblem,
		solve,
		TECHNIQUES,
		type Board,
		type Locale,
		type Step,
		type Solution
	} from '#lib/soroban/index.js';

	let { locale }: { locale: Locale } = $props();

	const ui = $derived(UI[locale]);

	// A first problem anyone can follow: a chain with a carry and a borrow.
	const DEFAULT_PROBLEM = '123 + 456 − 78';
	const DEFAULT_DECIMALS = 4;
	const PANEL_KEY = 'soroban:panel';
	const SOUND_KEY = 'soroban:sound';
	const PRACTICE_KEY = 'soroban:practice';
	/** How many recent results per level are kept, and how many decide moving up. */
	const KEPT = 10;
	const STREAK = 5;

	function attempt(
		text: string,
		decimals: number,
		lang: Locale
	): { solution: Solution | null; error: string | null } {
		try {
			return { solution: solve(text, { maxDecimals: decimals, locale: lang }), error: null };
		} catch (error) {
			return {
				solution: null,
				error: error instanceof Error ? error.message : UI[lang].failed
			};
		}
	}

	// A problem can arrive in the URL, which is how the language switch keeps it.
	const startingProblem = page.url.searchParams.get('q')?.trim() || DEFAULT_PROBLEM;
	// Each language route mounts its own App, so the locale is fixed for its lifetime.
	const first = attempt(startingProblem, DEFAULT_DECIMALS, untrack(() => locale));

	let input = $state(startingProblem);
	let maxDecimals = $state(DEFAULT_DECIMALS);
	let speed = $state(1);
	let playing = $state(false);
	let index = $state(-1);
	let solution = $state<Solution | null>(first.solution);
	let error = $state<string | null>(first.error);
	let panelOpen = $state(false);
	let soundOn = $state(true);
	let tab = $state<'steps' | 'method'>('steps');
	let board3d: Soroban3D | undefined = $state();

	/*
	 * Recall — stage ② of the path to 暗算. Having watched a problem worked, the
	 * learner works the same problem again with the beads hidden, picturing
	 * each move and revealing it to check. Every step carries the board before
	 * and after it, so each one can be checked exactly, not just the answer.
	 */
	/*
	 * Stage ③: flash. The beads are gone entirely; the problem is flashed where
	 * the board stood and worked on the soroban in the mind alone — a chain
	 * number by number, a × or ÷ whole.
	 */
	type Mode = 'watch' | 'recall' | 'flash';
	let mode = $state<Mode>('watch');
	/** Steps the learner has revealed while recalling. */
	const revealed = new SvelteSet<number>();
	let guess = $state('');
	/** Set once the answer typed from memory has been checked. */
	let verdict = $state<{ correct: boolean; guess: string } | null>(null);

	/*
	 * Practice: problems dealt at a level, graded by the moves they need (see
	 * soroban/practice.ts). Answers given from memory are kept per level in
	 * this browser, and five in a row suggests moving up.
	 */
	type Recorded = 'recall' | 'flash';
	interface Result {
		correct: boolean;
		revealed: number;
		total: number;
		/** How the answer was reached; results saved before the drills were recall. */
		mode?: Recorded;
	}
	let practiceLevel = $state<LevelId | null>(null);
	let results = $state<Partial<Record<LevelId, Result[]>>>({});
	/** How many numbers a practice chain has in the drills (口数). */
	let chainCount = $state(5);
	const CHAIN_COUNTS = [3, 5, 10, 15];

	/** Which results the practice bar speaks for: watching counts as recall's. */
	const recordedAs = $derived<Recorded>(mode === 'watch' ? 'recall' : mode);
	const recent = $derived(
		practiceLevel
			? (results[practiceLevel] ?? [])
					.filter((r) => (r.mode ?? 'recall') === recordedAs)
					.slice(-STREAK)
			: []
	);
	const following = $derived(practiceLevel ? nextLevel(practiceLevel) : null);
	/** Five answers in a row from memory, each right with at most one step revealed. */
	const readyToMoveUp = $derived(
		following !== null &&
			recent.length === STREAK &&
			recent.every((r) => r.correct && r.revealed <= 1)
	);

	const steps = $derived(solution?.steps ?? []);
	const step = $derived(index >= 0 ? (steps[index] ?? null) : null);
	const atEnd = $derived(index >= steps.length - 1);
	const recall = $derived(mode === 'recall');
	const drill = $derived(mode === 'flash');
	/**
	 * Whether the current step is in view: always when watching, once revealed
	 * when recalling, and never in a drill, where there is no board at all.
	 */
	const shown = $derived(
		mode === 'watch' || (recall && (verdict !== null || (index >= 0 && revealed.has(index))))
	);
	/**
	 * A hidden step holds the board as it was before its move, so revealing it
	 * plays the move in front of the learner — beads, sound and all.
	 */
	const board = $derived(
		step ? (shown ? step.after : step.before) : (solution?.initial ?? [])
	);
	const activeRods = $derived(step?.rods ?? []);
	/**
	 * The board's labels, as they stand on the board shown: a hidden step
	 * keeps the labels from before its move, which would otherwise give it away.
	 */
	const regions = $derived.by(() => {
		const from = shown ? step : (steps[index - 1] ?? null);
		return from?.regions ?? solution?.regions ?? [];
	});

	function readAnswer(rods: Board): string {
		if (!solution) return '';
		return formatSpan(rods, solution.answerSpan[0], solution.answerSpan[1], solution.unitRod);
	}

	/**
	 * The answer, written large once the last step is reached and in view.
	 * While the steps play, the board and the digits under its rods already show
	 * where things stand, so nothing is repeated beside them.
	 */
	const answer = $derived(solution && board.length && atEnd && shown ? readAnswer(board) : null);
	const finalAnswer = $derived(steps.length ? readAnswer(steps[steps.length - 1].after) : '');
	/** At the last step, still hidden: time to give the answer from memory. */
	const asking = $derived(recall && !shown && index >= 0 && index === steps.length - 1);

	/** Compare answers as numbers, so "54", "54.0" and full-width "５４" all agree. */
	function sameNumber(a: string, b: string): boolean {
		const clean = (text: string) =>
			text
				.normalize('NFKC')
				.replace(/[\s,]/g, '')
				.replace(/−/g, '-');
		const x = clean(a);
		const y = clean(b);
		return x === y || (x !== '' && Number(x) === Number(y) && !Number.isNaN(Number(x)));
	}

	function startOver() {
		playing = false;
		index = -1;
		revealed.clear();
		guess = '';
		verdict = null;
	}

	function setMode(next: Mode) {
		if (next === mode) return;
		const wasDrill = drill;
		mode = next;
		startOver();
		// Entering a drill while practising deals a chain of the chosen length.
		if (!wasDrill && drill && practiceLevel && dealsChains(practiceLevel)) deal();
	}

	/** The problem as the drills present it: a chain of signed numbers, or a whole × or ÷. */
	const drillProblem = $derived.by<DrillProblem | null>(() => {
		if (!solution) return null;
		const parsed = parseProblem(solution.problem, messagesFor(locale));
		if (parsed.kind === 'addsub') {
			return {
				kind: 'chain',
				terms: parsed.terms.map((t) => ({ op: t.op, text: decToString(t.value) }))
			};
		}
		return {
			kind: 'whole',
			a: decToString(parsed.a),
			op: parsed.kind === 'multiply' ? '×' : '÷',
			b: decToString(parsed.b)
		};
	});
	const whole = $derived(drillProblem?.kind === 'whole');

	const drillText = $derived<DrillText>({
		begin: ui.begin,
		again: ui.again,
		check: ui.check,
		correct: ui.correct,
		yourAnswer: ui.yourAnswer,
		answerLabel: ui.answer,
		recallAnswer: ui.recallAnswer,
		watchIt: ui.watchIt,
		nextProblem: ui.nextProblem
	});

	/** Keep a practice result, under the way it was reached. */
	function record(correct: boolean, peeked: number, how: Recorded) {
		if (!practiceLevel) return;
		const kept = [
			...(results[practiceLevel] ?? []),
			{ correct, revealed: peeked, total: steps.length, mode: how }
		].slice(-KEPT);
		results = { ...results, [practiceLevel]: kept };
		remember(PRACTICE_KEY, JSON.stringify(results));
	}

	function reveal() {
		if (index < 0) return;
		playing = false;
		revealed.add(index);
	}

	/**
	 * Whether an answer given from memory is right. For a division that does
	 * not come out, the board stops at its decimal places (0.6666…), so any
	 * answer within one unit of the last place of the true value counts:
	 * the truncated 0.6666, the rounded 0.6667, or one worked further, 0.66666.
	 */
	function matchesAnswer(given: string): boolean {
		const g = given.normalize('NFKC').replace(/…|\.\.\.$/g, '').trim();
		if (sameNumber(g, finalAnswer)) return true;
		if (!solution?.continues) return false;
		const value = Number(g.replace(/[\s,]/g, '').replace(/−/g, '-'));
		if (g === '' || Number.isNaN(value)) return false;
		const parsed = parseProblem(solution.problem, messagesFor(locale));
		const exact = Number(decToString(parsed.a)) / Number(decToString(parsed.b));
		const places = (finalAnswer.split('.')[1] ?? '').length;
		return Math.abs(value - exact) < 10 ** -places + 1e-12;
	}

	function check() {
		if (!guess.trim()) return;
		verdict = { correct: matchesAnswer(guess), guess: guess.trim() };
		record(verdict.correct, revealed.size, 'recall');
	}

	/** Deal a fresh problem at the current level, never the one just worked. */
	function deal() {
		if (!practiceLevel) return;
		const count = drill && dealsChains(practiceLevel) ? chainCount : undefined;
		const problem = dealProblem(practiceLevel, Math.random, solution?.problem, count);
		input = problem;
		run(problem);
	}

	function practise(level: LevelId) {
		practiceLevel = level;
		deal();
	}

	/** A level's recent results, all ways of working counted together. */
	function recordHint(level: LevelId): string {
		const kept = (results[level] ?? []).slice(-STREAK);
		return kept.length ? ui.recordHint(kept.filter((r) => r.correct).length, kept.length) : '';
	}

	function clearRecord() {
		if (!practiceLevel) return;
		if (!confirm(ui.clearConfirm(ui.levels[practiceLevel].name))) return;
		results = { ...results, [practiceLevel]: [] };
		remember(PRACTICE_KEY, JSON.stringify(results));
	}

	/** Problems typed in or picked from the examples end a practice run. */
	function solveOwn(text = input) {
		practiceLevel = null;
		run(text);
	}

	/** Show the group's reasoning once, on the first step that belongs to it. */
	function opensGroup(i: number): boolean {
		return steps[i].groupWhy !== '' && steps[i - 1]?.group !== steps[i].group;
	}

	/** The phase a step belongs to, when it is a different technique from the step's own. */
	function phaseOf(s: Step) {
		return s.phaseTechnique && s.phaseTechnique !== s.technique ? TECHNIQUES[s.phaseTechnique] : null;
	}

	/**
	 * Which explanation is in view. Every one is laid out in the same place and
	 * only this one is shown, so the area keeps the height of the tallest and
	 * nothing below it moves as the steps play.
	 */
	const pane = $derived<'start' | 'prompt' | number>(
		index < 0 ? 'start' : recall && !shown ? 'prompt' : index
	);

	const switchHref = $derived(`${ui.switchPath}?q=${encodeURIComponent(input)}`);

	function run(text = input) {
		const result = attempt(text, maxDecimals, locale);
		playing = false;
		if (result.error) {
			error = result.error;
			return;
		}
		error = null;
		solution = result.solution;
		startOver();
	}

	function go(next: number) {
		if (!solution) return;
		index = Math.max(-1, Math.min(steps.length - 1, next));
	}

	function toggle() {
		if (!solution) return;
		if (atEnd) {
			if (recall) startOver();
			else index = -1;
		}
		playing = !playing;
	}

	/*
	 * A long chain ("345 + 87 − 120 + 456 − 33") is wider than the problem's
	 * line. Rather than cut it off, its type steps down just enough to fit,
	 * and goes back to full size for short problems. The line's height is
	 * fixed, so a smaller size never moves anything below it.
	 */
	const PROBLEM_SIZE = 1.55;
	const SMALLEST = 0.6;
	let problemField: HTMLInputElement | undefined = $state();
	let problemScale = $state(1);
	let measure: CanvasRenderingContext2D | null = null;

	/** Size the problem's type to its line, measuring the line as it is now. */
	function fitProblem(text: string) {
		const field = problemField;
		const width = field?.clientWidth ?? 0;
		if (!field || !width) return;
		measure ??= document.createElement('canvas').getContext('2d');
		if (!measure) return;
		const style = getComputedStyle(field);
		const px = PROBLEM_SIZE * parseFloat(getComputedStyle(document.documentElement).fontSize);
		measure.font = `${style.fontWeight} ${px}px ${style.fontFamily}`;
		const sample = text || DEFAULT_PROBLEM;
		// Canvas leaves out letter-spacing (0.04em), so it is added back here.
		const needed = measure.measureText(sample).width + sample.length * 0.04 * px;
		problemScale = Math.max(SMALLEST, Math.min(1, (width - 4) / needed));
	}

	// Refit whenever the problem changes…
	$effect(() => {
		fitProblem(input);
	});

	// …and whenever its line changes width, or the web fonts arrive (until
	// then every width is a fallback font's).
	$effect(() => {
		const field = problemField;
		if (!field) return;
		const refit = () => fitProblem(untrack(() => input));
		const observer = new ResizeObserver(refit);
		observer.observe(field);
		void document.fonts.ready.then(refit);
		return () => observer.disconnect();
	});

	function remember(key: string, value: string) {
		try {
			localStorage.setItem(key, value);
		} catch {
			// Storage can be unavailable; the choice just will not be remembered.
		}
	}

	function setPanel(open: boolean) {
		panelOpen = open;
		remember(PANEL_KEY, open ? 'open' : 'closed');
	}

	function setSound(on: boolean) {
		soundOn = on;
		remember(SOUND_KEY, on ? 'on' : 'off');
	}

	onMount(() => {
		try {
			panelOpen = localStorage.getItem(PANEL_KEY) === 'open';
			soundOn = localStorage.getItem(SOUND_KEY) !== 'off';
			const saved = localStorage.getItem(PRACTICE_KEY);
			if (saved) results = JSON.parse(saved);
		} catch {
			panelOpen = false;
		}
	});

	// Keep <html lang> right across client-side navigation between languages.
	$effect(() => {
		document.documentElement.lang = ui.lang;
	});

	// Advance while playing. Re-runs on every index change, scheduling the next.
	$effect(() => {
		if (!playing || !solution) return;
		if (index >= steps.length - 1) {
			playing = false;
			return;
		}
		const timer = setTimeout(() => (index += 1), 980 / speed);
		return () => clearTimeout(timer);
	});

	function onkeydown(event: KeyboardEvent) {
		const target = event.target as HTMLElement | null;
		if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
		if (drill && event.key !== 'Escape') return;
		if (event.key === 'ArrowRight') {
			playing = false;
			go(index + 1);
		} else if (event.key === 'ArrowLeft') {
			playing = false;
			go(index - 1);
		} else if (event.key === ' ') {
			event.preventDefault();
			toggle();
		} else if (event.key === 'Home') {
			playing = false;
			index = -1;
		} else if (event.key === 'End') {
			playing = false;
			index = steps.length - 1;
		} else if (event.key === 'Escape' && panelOpen) {
			setPanel(false);
		}
	}
</script>

<svelte:window {onkeydown} />

<svelte:head>
	<title>{ui.title}</title>
	<meta name="description" content={ui.description} />
</svelte:head>

<!-- A rough edge for the seal, as if stamped rather than printed. -->
<svg class="defs" aria-hidden="true" focusable="false">
	<filter id="stamp" x="-10%" y="-10%" width="120%" height="120%">
		<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
		<feDisplacementMap in="SourceGraphic" scale="1.6" />
	</filter>
</svg>

<div class="app" class:panel-open={panelOpen}>
	<div class="main">
		<header>
			<h1 class="masthead">
				<a class="brand" href={locale === 'en' ? '/' : '/ja'} lang="ja" aria-label="算盤">
					<span class="logo">算盤</span>
					<span class="seal" aria-hidden="true">珠</span>
				</a>
			</h1>

			<form
				onsubmit={(event) => {
					event.preventDefault();
					solveOwn();
				}}
			>
				<div class="entry">
					<input
						type="text"
						class="problem"
						bind:this={problemField}
						bind:value={input}
						style:font-size="{PROBLEM_SIZE * problemScale}rem"
						spellcheck="false"
						autocomplete="off"
						aria-label={ui.problemLabel}
						placeholder={DEFAULT_PROBLEM}
					/>
					<button type="submit" class="solve">{ui.solve}</button>
				</div>
				<InkMenu
					label={ui.practice}
					items={LEVELS.map((level) => ({
						value: level.id,
						title: ui.levels[level.id].name,
						hint: [ui.levels[level.id].hint, recordHint(level.id)].filter(Boolean).join(' · ')
					}))}
					onpick={(level) => practise(level as LevelId)}
				/>
			</form>

			<nav class="tools">
				<a class="quiet" href={switchHref} hreflang={locale === 'en' ? 'ja' : 'en'}
					>{ui.switchLabel}</a
				>
				<button
					type="button"
					class="quiet"
					aria-expanded={panelOpen}
					aria-controls="panel"
					onclick={() => setPanel(!panelOpen)}>{ui.panelOpen}</button
				>
			</nav>
		</header>

		{#if error}
			<!-- The board below still holds the last problem that worked; say so. -->
			<p class="error" role="alert">
				{error}
				{#if solution}<span class="stale-note">{ui.staleNote(solution.problem)}</span>{/if}
			</p>
		{/if}

		{#if practiceLevel}
			<div class="practice" aria-live="polite">
				<span class="practice-label">{ui.practice}</span>
				<span class="level-name">{ui.levels[practiceLevel].name}</span>
				<span class="record">
					{#if readyToMoveUp && following}
						{ui.readyToMoveUp(ui.levels[following.id].name)}
					{:else if recent.length}
						{@const right = recent.filter((r) => r.correct).length}
						{recordedAs === 'flash'
							? ui.recordFlash(right, recent.length)
							: ui.practiceRecord(right, recent.length)}
					{:else}
						{drill ? ui.practiceStartDrill : ui.practiceStart}
					{/if}
				</span>
				{#if drill && dealsChains(practiceLevel)}
					<span class="counts" role="radiogroup" aria-label={ui.numbersLabel}>
						<span class="counts-label">{ui.numbersLabel}</span>
						{#each CHAIN_COUNTS as count (count)}
							<button
								type="button"
								role="radio"
								aria-checked={chainCount === count}
								class:active={chainCount === count}
								onclick={() => {
									chainCount = count;
									deal();
								}}>{count}</button
							>
						{/each}
					</span>
				{/if}
				<span class="spacer"></span>
				{#if readyToMoveUp && following}
					<button type="button" class="reveal" onclick={() => following && practise(following.id)}
						>{ui.moveUp}</button
					>
				{/if}
				<button type="button" class="solve" onclick={deal}>{ui.nextProblem}</button>
				{#if results[practiceLevel]?.length}
					<button type="button" class="quiet" onclick={clearRecord}>{ui.clearRecord}</button>
				{/if}
				<button type="button" class="quiet" onclick={() => (practiceLevel = null)}
					>{ui.endPractice}</button
				>
			</div>
		{/if}

		{#if solution}
			<div class="board" class:stale={!!error}>
				<Soroban3D
					bind:this={board3d}
					{board}
					rodCount={solution.rodCount}
					{activeRods}
					{regions}
					unitRod={solution.unitRod}
					{speed}
					muted={!soundOn || !shown}
					veiled={!shown}
					veilLabel={drill ? '' : ui.modeRecall}
					loadingLabel={ui.loading}
				/>
				{#if drill && drillProblem}
					<Drill
						problem={drillProblem}
						answer={finalAnswer}
						continues={solution.continues ?? false}
						pace={speed}
						text={drillText}
						same={(given) => matchesAnswer(given)}
						onresult={(correct) => record(correct, 0, 'flash')}
						onwatch={() => setMode('watch')}
						onnext={practiceLevel ? deal : null}
					/>
				{/if}
			</div>

			<div class="controls" class:stale={!!error}>
				<div class="controls-row">
				<div class="modes" role="radiogroup" aria-label={ui.modeLabel}>
					<button
						type="button"
						role="radio"
						aria-checked={mode === 'watch'}
						class:active={mode === 'watch'}
						onclick={() => setMode('watch')}>{ui.modeWatch}</button
					>
					<button
						type="button"
						role="radio"
						aria-checked={recall}
						class:active={recall}
						onclick={() => setMode('recall')}>{ui.modeRecall}</button
					>
					<button
						type="button"
						role="radio"
						aria-checked={mode === 'flash'}
						class:active={mode === 'flash'}
						onclick={() => setMode('flash')}>{ui.modeFlash}</button
					>
				</div>

				<span class="spacer"></span>

				<button
					type="button"
					class="quiet sound"
					class:off={!soundOn}
					title={ui.soundTitle}
					aria-pressed={soundOn}
					onclick={() => setSound(!soundOn)}>{ui.sound}</button
				>
				<button type="button" class="quiet" onclick={() => board3d?.resetView()}
					>{ui.resetView}</button
				>
				</div>

				<div class="controls-row">
				{#if !drill}
				<div class="transport">
					<button
						type="button"
						title={ui.start}
						aria-label={ui.start}
						onclick={() => {
							playing = false;
							index = -1;
						}}><span class="mark" style:--mark="url(/ink/icon-start.svg)"></span></button
					>
					<button
						type="button"
						title={ui.back}
						aria-label={ui.back}
						onclick={() => {
							playing = false;
							go(index - 1);
						}}><span class="mark" style:--mark="url(/ink/icon-back.svg)"></span></button
					>
					<button
						type="button"
						class="play"
						title={ui.playPause}
						aria-label={ui.playPause}
						onclick={toggle}
						><span
							class="mark"
							style:--mark={playing ? 'url(/ink/icon-pause.svg)' : 'url(/ink/icon-play.svg)'}
						></span></button
					>
					<button
						type="button"
						title={ui.forward}
						aria-label={ui.forward}
						onclick={() => {
							playing = false;
							go(index + 1);
						}}><span class="mark" style:--mark="url(/ink/icon-next.svg)"></span></button
					>
					<button
						type="button"
						title={ui.end}
						aria-label={ui.end}
						onclick={() => {
							playing = false;
							index = steps.length - 1;
						}}><span class="mark" style:--mark="url(/ink/icon-end.svg)"></span></button
					>
				</div>

				<span class="tally">{index + 1}<span class="of">/</span>{steps.length}</span>
				{/if}

				<label class="dial" title={ui.speed}>
					<span class="dial-label">{ui.speedLabel}</span>
					<input
						type="range"
						min="0.4"
						max="3"
						step="0.2"
						aria-label={ui.speed}
						bind:value={speed}
					/>
					<span
						>{mode === 'flash'
							? whole
								? ui.perProblem(Math.round(30 / speed) / 10)
								: ui.perNumber(Math.round(15 / speed) / 10)
							: ui.speedValue(Math.round(speed * 10) / 10)}</span
					>
				</label>

				{#if solution.operation === 'divide'}
					<label class="dial" title={ui.decimals}>
						<span class="dial-label">{ui.decimalsLabel}</span>
						<input
							type="range"
							min="0"
							max="6"
							step="1"
							aria-label={ui.decimals}
							bind:value={maxDecimals}
							onchange={() => run()}
						/>
						<span>{ui.decimalsValue(maxDecimals)}</span>
					</label>
				{/if}
				</div>
			</div>

			<div class="stroke" aria-hidden="true"></div>

			<section class="reading" class:stale={!!error}>
				<div class="explain" aria-live="polite">
					<div class="pane" class:current={pane === 'start'}>
						<p class="action resting">
							{mode === 'flash'
								? whole
									? ui.flashIntroWhole
									: ui.flashIntro
								: recall
										? ui.recallReady(solution.problem)
										: ui.resting}
						</p>
					</div>

					{#if recall}
						<!-- Working from memory: where you are, the prompt, and the way to check. -->
						<div class="pane" class:current={pane === 'prompt'}>
							<p class="recall-section">{step?.section ?? ''}</p>
							<p class="action resting">{ui.recallPrompt}</p>
							<div class="recall-actions">
								<button type="button" class="reveal" onclick={reveal}>{ui.reveal}</button>
							</div>
							<!-- Held in place at every step, so asking for the answer moves nothing. -->
							<form
								class="guess"
								class:held={!asking}
								onsubmit={(event) => {
									event.preventDefault();
									check();
								}}
							>
								<label for="guess">{ui.recallAnswer}</label>
								<div class="guess-row">
									<input
										id="guess"
										type="text"
										inputmode="decimal"
										autocomplete="off"
										spellcheck="false"
										bind:value={guess}
									/>
									<button type="submit" class="solve">{ui.check}</button>
								</div>
							</form>
						</div>
					{/if}

					{#each steps as s, i (i)}
						{@const technique = TECHNIQUES[s.technique]}
						{@const phase = phaseOf(s)}
						<div class="pane" class:current={pane === i}>
							<p class="action">
								<span class="formula">{s.formula}</span>
								{s.text}
							</p>

							{#if opensGroup(i)}
								<p class="group">
									<span class="group-name">{s.group}</span>
									{s.groupWhy}
								</p>
							{/if}

							<p class="why"><span class="why-mark">{ui.why}</span>{s.why}</p>

							<p class="technique">
								<span class="term" lang="ja" title={technique.romaji}>{technique.ja}</span>
								{#if locale === 'en'}<span class="gloss">{technique.en}</span>{/if}
								{#if phase}
									<span class="term phase" lang="ja" title={phase.romaji}>{phase.ja}</span>
									<span class="rule">{phase.rule}</span>
								{/if}
							</p>
						</div>
					{/each}
				</div>

				<!--
					The answer's column is held from the first step, so the text beside it
					keeps one width and never re-wraps when the answer arrives.
				-->
				<p class="answer" class:held={answer === null}>
					<span class="answer-label">{ui.answer}</span>
					<!-- A division cut off at its decimal places goes on: 0.1111… -->
				<strong>{answer ?? finalAnswer}{solution.continues ? '…' : ''}</strong>
					{#if recall}
						<span class="verdict" class:wrong={verdict && !verdict.correct} class:held={!verdict}
							>{verdict
								? verdict.correct
									? ui.correct
									: ui.yourAnswer(verdict.guess)
								: ui.correct}</span
						>
						<span class="peeks">{ui.peeks(revealed.size, steps.length)}</span>
					{/if}
					<!-- The path to 暗算: watch it, then recall it, then the beads go. -->
					{#if mode === 'watch'}
						<button type="button" class="reveal next-stage" onclick={() => setMode('recall')}
							>{ui.tryFromMemory}</button
						>
					{:else if recall && verdict}
						<button type="button" class="reveal next-stage" onclick={() => setMode('flash')}
							>{ui.tryFlash}</button
						>
					{/if}
				</p>
			</section>
		{/if}
	</div>

	{#if panelOpen}
		<button
			type="button"
			class="scrim"
			aria-label={ui.panelClose}
			onclick={() => setPanel(false)}
		></button>
	{/if}

	<aside id="panel" class="panel" aria-label={ui.panelOpen} hidden={!panelOpen}>
		<div class="panel-head">
			<div class="tabs" role="tablist">
				<button
					type="button"
					role="tab"
					aria-selected={tab === 'steps'}
					class:active={tab === 'steps'}
					onclick={() => (tab = 'steps')}>{ui.tabSteps}</button
				>
				<button
					type="button"
					role="tab"
					aria-selected={tab === 'method'}
					class:active={tab === 'method'}
					onclick={() => (tab = 'method')}>{ui.tabMethod}</button
				>
			</div>
			<button type="button" class="close" aria-label={ui.panelClose} onclick={() => setPanel(false)}
				><span class="mark" style:--mark="url(/ink/icon-close.svg)"></span></button
			>
		</div>

		{#if solution}
			<div class="panel-body">
				{#if tab === 'steps'}
					<StepList
						{solution}
						current={index}
						concealed={recall && verdict === null ? (i) => !revealed.has(i) : null}
						onselect={(i) => {
							playing = false;
							index = i;
						}}
					/>
				{:else}
					<div class="notes">
						{#each solution.notes as note (note.heading)}
							<article>
								<h3>
									{note.heading}
									{#if note.headingJa && note.headingJa !== note.heading}
										<span lang="ja">{note.headingJa}</span>
									{/if}
								</h3>
								<p>{note.body}</p>
							</article>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</aside>
</div>

<style>
	.defs {
		position: absolute;
		width: 0;
		height: 0;
	}

	.app {
		--gutter: clamp(1.25rem, 4vw, 4.5rem);
		--panel-width: 24rem;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		min-height: 100vh;
		min-height: 100dvh;
	}
	.app.panel-open {
		grid-template-columns: minmax(0, 1fr) var(--panel-width);
	}

	.main {
		min-width: 0;
		padding: 0 var(--gutter) 4rem;
	}

	button {
		font: inherit;
	}

	/* ── header ─────────────────────────────────────────── */

	header {
		display: flex;
		align-items: center;
		gap: 1rem 2.5rem;
		padding: 2.2rem 0 0.5rem;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		flex: none;
		text-decoration: none;
	}
	.logo {
		font: 400 2.3rem/1 var(--display);
		letter-spacing: 0.06em;
		color: var(--ink);
		-webkit-text-stroke: 0.025em var(--ink);
		text-shadow: 0 0 0.015em rgb(20 18 16 / 0.45);
	}
	/* 朱印 — the one place the red is used at full strength. */
	.seal {
		display: grid;
		place-items: center;
		width: 1.55rem;
		height: 1.55rem;
		border-radius: 2px;
		background: var(--shu);
		color: var(--paper);
		font: 400 1.05rem/1 var(--display);
		transform: rotate(-3deg) translateY(-0.35rem);
		filter: url(#stamp);
		opacity: 0.92;
	}

	header form {
		display: flex;
		align-items: center;
		gap: 1.25rem 2rem;
		flex: 1;
		min-width: 0;
		max-width: 40rem;
	}

	/* The problem, and the stroke of ink that sets it on the board. */
	.entry {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		flex: 1;
		min-width: 0;
	}

	input[type='text'] {
		flex: 1;
		min-width: 0;
		padding: 0.25rem 0;
		padding-bottom: 0.5rem;
		border: 0;
		border-radius: 0;
		background: url('/ink/line-wash.svg') left bottom / 100% 8px no-repeat;
		color: var(--ink);
		font: 500 1.55rem/1.3 var(--mincho);
		letter-spacing: 0.04em;
		transition: border-color 0.3s ease;
	}
	input.problem {
		height: 2.8rem;
	}
	input[type='text']::placeholder {
		color: var(--ink-ghost);
	}
	input[type='text']:focus {
		outline: none;
	}

	.solve {
		flex: none;
		padding: 0.55rem 1.35rem 0.6rem 1.05rem;
		border: 0;
		background: url('/ink/button-stroke.svg') center / 100% 100% no-repeat;
		color: var(--paper);
		font: 400 1.2rem/1 var(--display);
		letter-spacing: 0.02em;
		cursor: pointer;
		transition:
			opacity 0.2s ease,
			transform 0.15s ease;
	}
	.solve:hover {
		opacity: 0.86;
	}
	.solve:active {
		transform: translateY(1px);
	}
	.solve:focus-visible {
		outline: 1px dotted var(--ink-faint);
		outline-offset: 4px;
	}

	.tools {
		display: flex;
		align-items: baseline;
		gap: 1.8rem;
		margin-left: auto;
	}

	.quiet {
		padding: 0;
		border: 0;
		background: none;
		font: 400 1.1rem/1 var(--display);
		color: var(--ink-faint);
		text-decoration: none;
		cursor: pointer;
		transition: color 0.2s ease;
	}
	.quiet:hover,
	.quiet[aria-expanded='true'] {
		color: var(--ink);
	}

	.error {
		margin: 0.75rem 0 0;
		font: 400 1rem/1.6 var(--mincho);
		color: var(--shu);
	}

	/* ── practice ───────────────────────────────────────── */

	.practice {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem 1.4rem;
		margin-top: 1.4rem;
		padding: 0.7rem 0 0.8rem;
		background: url('/ink/line-track.svg') left bottom / 100% 6px no-repeat;
	}
	.practice-label {
		font: 400 0.9rem/1 var(--display);
		letter-spacing: 0.08em;
		color: var(--shu);
	}
	.level-name {
		font: 400 1.1rem/1.2 var(--display);
		letter-spacing: 0.03em;
		color: var(--ink);
	}
	/* 口数: how many numbers in a drilled chain. */
	.counts {
		display: inline-flex;
		align-items: baseline;
		gap: 0.7rem;
	}
	.counts-label {
		font: 400 0.9rem/1 var(--display);
		letter-spacing: 0.04em;
		color: var(--ink-faint);
	}
	.counts button {
		padding: 0.15rem 0.1rem 0.4rem;
		border: 0;
		background: none;
		font: 400 1rem/1 var(--mincho);
		color: var(--ink-faint);
		cursor: pointer;
	}
	.counts button.active {
		color: var(--ink);
		background: url('/ink/line-tab.svg') left bottom / 100% 5px no-repeat;
	}

	.record {
		font: 400 0.95rem/1.4 var(--mincho);
		color: var(--ink-faint);
	}

	/* ── board ──────────────────────────────────────────── */

	/*
	 * The board's own proportions, capped by the viewport's height: on narrow
	 * screens it hugs the board, on wide ones the height cap takes over and the
	 * camera fit (which includes the labels) does the rest.
	 */
	.board {
		position: relative;
		aspect-ratio: 2.3;
		max-height: 64vh;
		min-height: 17rem;
		margin: 0 calc(var(--gutter) * -1);
	}

	/* ── controls ───────────────────────────────────────── */

	/* Two rows: how to work the problem, then the playback itself. */
	.controls {
		display: grid;
		gap: 0.7rem;
		padding: 0 0 0.9rem;
	}
	.controls-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem 1.8rem;
	}

	/* After an error, what is still on the board belongs to the last problem. */
	.stale {
		opacity: 0.35;
		transition: opacity 0.3s ease;
	}
	.stale-note {
		display: block;
		margin-top: 0.2rem;
		color: var(--ink-faint);
	}

	.masthead {
		display: flex;
		flex: none;
		margin: 0;
		font: inherit;
	}

	.next-stage {
		margin-top: 0.9rem;
	}

	/*
	 * Brush marks drawn by scripts/ink-strokes.py, used as masks so they take
	 * the button's colour: faint ink at rest, full ink on hover.
	 */
	.mark {
		display: block;
		width: 1em;
		height: 1em;
		background: currentColor;
		-webkit-mask: var(--mark) center / contain no-repeat;
		mask: var(--mark) center / contain no-repeat;
	}

	/* Watch, or work it from memory: the active way is underlined in ink. */
	.modes {
		display: flex;
		align-items: center;
		gap: 1.2rem;
	}
	.modes button {
		padding: 0.2rem 0 0.45rem;
		border: 0;
		background: none;
		font: 400 0.95rem/1 var(--display);
		letter-spacing: 0.04em;
		color: var(--ink-faint);
		cursor: pointer;
		transition: color 0.2s ease;
	}
	.modes button:hover {
		color: var(--ink);
	}
	.modes button.active {
		color: var(--ink);
		background: url('/ink/line-tab.svg') left bottom / 100% 6px no-repeat;
	}
	.modes button:focus-visible {
		outline: 1px dotted var(--ink-faint);
		outline-offset: 4px;
	}

	.transport {
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}
	.transport button {
		display: grid;
		place-items: center;
		padding: 0.25rem;
		border: 0;
		background: none;
		color: var(--ink-faint);
		font-size: 1rem;
		line-height: 1;
		cursor: pointer;
		transition: color 0.2s ease;
	}
	.transport button:hover {
		color: var(--ink);
	}
	.transport button.play {
		font-size: 1.6rem;
		color: var(--ink);
	}

	/* Figures of one width, and room for three digits, so nothing beside it shifts. */
	.tally {
		min-width: 4.8em;
		font: 400 1.05rem/1 var(--mincho);
		font-variant-numeric: tabular-nums;
		color: var(--ink-faint);
	}
	.tally .of {
		margin: 0 0.3rem;
		color: var(--ink-ghost);
	}

	.dial {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.dial-label {
		font: 400 0.9rem/1 var(--display);
		letter-spacing: 0.04em;
		color: var(--ink-faint);
	}
	/* A pale wash for the track, a single dab of the brush for the thumb. */
	.dial input[type='range'] {
		width: 5.5rem;
		height: 1.1rem;
		margin: 0;
		background: url('/ink/line-track.svg') center / 100% 6px no-repeat;
		cursor: pointer;
		-webkit-appearance: none;
		appearance: none;
	}
	.dial input[type='range']::-webkit-slider-runnable-track {
		height: 1.1rem;
		background: none;
	}
	.dial input[type='range']::-moz-range-track {
		height: 1.1rem;
		background: none;
	}
	.dial input[type='range']::-webkit-slider-thumb {
		width: 1.3rem;
		height: 1.3rem;
		border: 0;
		background: url('/ink/icon-dot.svg') center / contain no-repeat;
		-webkit-appearance: none;
		appearance: none;
	}
	.dial input[type='range']::-moz-range-thumb {
		width: 1.3rem;
		height: 1.3rem;
		border: 0;
		border-radius: 0;
		background: url('/ink/icon-dot.svg') center / contain no-repeat;
	}
	.dial input[type='range']:focus {
		outline: none;
	}
	.dial input[type='range']:focus-visible {
		outline: 1px dotted var(--ink-faint);
		outline-offset: 3px;
	}
	.dial span {
		font: 400 0.98rem/1 var(--mincho);
		color: var(--ink-faint);
	}

	.spacer {
		flex: 1;
	}

	/* Struck through with a quick stroke of the brush. */
	.sound.off {
		background: url('/ink/line-tab.svg') center 55% / 100% 5px no-repeat;
	}

	/* A thin dry-brush stroke in place of a ruled line (scripts/ink-strokes.py). */
	.stroke {
		height: 10px;
		background: url('/ink/line-divider.svg') center / 100% 100% no-repeat;
	}

	/* ── the current step ───────────────────────────────── */

	.reading {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 2rem 5rem;
		padding-top: 2rem;
		min-height: 13rem;
	}

	.explain {
		display: grid;
		max-width: 66ch;
	}
	/* Every pane in the one cell; only the current one is seen. */
	.pane {
		grid-area: 1 / 1;
		visibility: hidden;
	}
	.pane.current {
		visibility: visible;
	}
	/* Holds its space without being seen, heard or reached. */
	.held {
		visibility: hidden;
	}

	.action {
		margin: 0;
		font: 500 1.28rem/1.65 var(--mincho);
		color: var(--ink);
	}
	.action.resting {
		color: var(--ink-faint);
	}
	/* The numbers that matter are written with the brush. */
	.formula {
		margin-right: 1rem;
		font: 500 1.7rem/1 var(--mincho);
		color: var(--ink);
		vertical-align: -0.05em;
	}

	/* Working from memory: where you are, the prompt, and the way to check. */
	.recall-section {
		margin: 0 0 0.8rem;
		font: 400 0.95rem/1.2 var(--display);
		letter-spacing: 0.06em;
		color: var(--ink-faint);
	}
	.recall-actions {
		margin-top: 1.3rem;
	}
	.reveal {
		padding: 0.2rem 0.1rem 0.5rem;
		border: 0;
		background: url('/ink/line-tab.svg') left bottom / 100% 6px no-repeat;
		font: 400 1.05rem/1 var(--display);
		letter-spacing: 0.04em;
		color: var(--ink);
		cursor: pointer;
		transition: opacity 0.2s ease;
	}
	.reveal:hover {
		opacity: 0.75;
	}
	.reveal:focus-visible {
		outline: 1px dotted var(--ink-faint);
		outline-offset: 4px;
	}
	.guess {
		margin-top: 2.2rem;
		max-width: 24rem;
	}
	.guess label {
		display: block;
		margin-bottom: 0.4rem;
		font: 400 0.95rem/1.2 var(--display);
		letter-spacing: 0.04em;
		color: var(--ink-faint);
	}
	.guess-row {
		display: flex;
		align-items: center;
		gap: 0.9rem;
	}

	.verdict {
		font: 500 1.05rem/1.4 var(--mincho);
		color: var(--ink-soft);
	}
	.verdict.wrong {
		color: var(--shu);
	}
	.peeks {
		font: 400 0.92rem/1.4 var(--mincho);
		color: var(--ink-faint);
	}

	.group {
		margin: 1.1rem 0 0;
		font: 400 1.02rem/1.7 var(--mincho);
		color: var(--ink-faint);
	}
	.group-name {
		display: block;
		font: 400 1.12rem/1.6 var(--display);
		color: var(--ink-soft);
	}

	.why {
		margin: 1.1rem 0 0;
		font: 400 1.08rem/1.8 var(--mincho);
		color: var(--ink-soft);
	}
	.why-mark {
		margin-right: 0.8rem;
		font: 400 1.15rem/1 var(--display);
		color: var(--shu);
	}
	:global(:root[lang='ja']) .why-mark {
		font: 400 1.1rem/1 var(--display);
	}

	.technique {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.3rem 0.8rem;
		margin: 1.4rem 0 0;
	}
	.term {
		font: 400 1.15rem/1.4 var(--display);
		color: var(--ink);
	}
	.term.phase {
		margin-left: 0.8rem;
		color: var(--ink-soft);
	}
	.gloss {
		font: 400 0.98rem/1.4 var(--mincho);
		color: var(--ink-faint);
	}
	.rule {
		font: 400 0.98rem/1.4 var(--mincho);
		color: var(--ink-faint);
	}

	.answer {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.5rem;
		margin: 0;
		text-align: right;
		transition: opacity 0.6s ease;
	}
	/* Held answers fade in where they already stood: nothing moves to make room. */
	.answer.held {
		opacity: 0;
		transition: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.answer {
			transition: none;
		}
	}
	.answer-label {
		font: 400 1.1rem/1 var(--display);
		color: var(--ink-faint);
	}
	.answer strong {
		font: 400 4.4rem/1 var(--mincho);
		color: var(--ink);
		overflow-wrap: anywhere;
	}

	/* ── side panel ─────────────────────────────────────── */

	.panel {
		position: sticky;
		top: 0;
		display: flex;
		flex-direction: column;
		height: 100vh;
		height: 100dvh;
		background: url('/ink/line-edge.svg') left center / 10px 94% no-repeat;
	}
	.panel[hidden] {
		display: none;
	}

	.panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 2.3rem 1.75rem 1rem;
	}
	.tabs {
		display: flex;
		gap: 1.6rem;
	}
	.tabs button {
		padding: 0 0 0.45rem;
		border: 0;
		background: none;
		font: 400 1.15rem/1 var(--display);
		color: var(--ink-faint);
		cursor: pointer;
	}
	.tabs button.active {
		color: var(--ink);
		background: url('/ink/line-tab.svg') left bottom / 100% 7px no-repeat;
	}
	.close {
		padding: 0.2rem;
		border: 0;
		background: none;
		font-size: 1.05rem;
		color: var(--ink-faint);
		cursor: pointer;
	}
	.close:hover {
		color: var(--ink);
	}

	.panel-body {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.notes {
		overflow-y: auto;
		padding: 0.5rem 1.75rem 2.5rem;
	}
	.notes article + article {
		margin-top: 1.6rem;
	}
	.notes h3 {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin: 0 0 0.4rem;
		font: 400 1.2rem/1.3 var(--display);
		color: var(--ink);
	}
	.notes h3 span {
		font: 400 1.05rem/1.3 var(--display);
		color: var(--ink-soft);
	}
	.notes p {
		margin: 0;
		font: 400 1rem/1.75 var(--mincho);
		color: var(--ink-soft);
	}

	.scrim {
		display: none;
	}

	/* Narrow screens: the panel becomes a drawer over the page. */
	@media (max-width: 960px) {
		.app.panel-open {
			grid-template-columns: minmax(0, 1fr);
		}
		.panel {
			position: fixed;
			top: 0;
			right: 0;
			bottom: 0;
			z-index: 20;
			width: min(var(--panel-width), 88vw);
			background: url('/ink/line-edge.svg') left center / 10px 94% no-repeat var(--paper);
			box-shadow: -18px 0 48px rgb(28 26 24 / 0.1);
		}
		.scrim {
			display: block;
			position: fixed;
			inset: 0;
			z-index: 19;
			border: 0;
			background: rgb(28 26 24 / 0.14);
			cursor: pointer;
		}
		.reading {
			grid-template-columns: minmax(0, 1fr);
		}
		.answer {
			align-items: flex-start;
			text-align: left;
		}
	}

	@media (max-width: 640px) {
		header {
			flex-wrap: wrap;
			padding-top: 1.5rem;
		}
		.tools {
			margin-left: 0;
		}
		header form {
			flex: 1 1 100%;
			flex-wrap: wrap;
			order: 3;
		}
		.entry {
			flex-basis: 100%;
		}
		.board {
			aspect-ratio: 1.6;
		}
	}
</style>
