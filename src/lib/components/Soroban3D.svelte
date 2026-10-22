<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { BeadSound } from '#lib/audio/beadSound.js';
	import { SorobanScene } from '#lib/three/SorobanScene.js';
	import type { Board, Region } from '#lib/soroban/index.js';

	interface Props {
		board: Board;
		rodCount: number;
		activeRods?: number[];
		regions?: Region[];
		unitRod?: number;
		/** Playback speed; bead moves scale with it. */
		speed?: number;
		muted?: boolean;
		/** Text beside the ensō while the board is being prepared. */
		loadingLabel?: string;
		/** Hide the beads and their digits, as when working from memory. */
		veiled?: boolean;
		/** Written on the blank sheet that stands in for the board. */
		veilLabel?: string;
	}

	let {
		board,
		rodCount,
		activeRods = [],
		regions = [],
		unitRod = -1,
		speed = 1,
		muted = false,
		loadingLabel = '',
		veiled = false,
		veilLabel = ''
	}: Props = $props();

	let host: HTMLDivElement;
	let scene: SorobanScene | null = null;
	const sound = new BeadSound();
	let failure = $state<string | null>(null);
	let ready = $state(false);

	onMount(() => {
		try {
			scene = new SorobanScene(host, {
				onReady: () => (ready = true),
				onError: (message) => (failure = message),
				onImpact: (impact) => sound.click(impact)
			});
		} catch (error) {
			failure =
				error instanceof Error
					? error.message
					: 'This browser could not start WebGL, so the 3D board cannot be shown.';
			return;
		}

		// Audio may only start after the user interacts with the page.
		const unlock = () => sound.unlock();
		window.addEventListener('pointerdown', unlock);
		window.addEventListener('keydown', unlock);

		return () => {
			window.removeEventListener('pointerdown', unlock);
			window.removeEventListener('keydown', unlock);
			scene?.dispose();
			scene = null;
			sound.dispose();
		};
	});

	// Structure: rebuild only when the board size or the labelled regions change.
	// Reading the board here unguarded would rerun this on every step and snap
	// the beads into place instead of letting them move.
	$effect(() => {
		const count = rodCount;
		const spans = regions;
		const unit = unitRod;
		untrack(() => {
			if (!scene) return;
			scene.setRodCount(count);
			scene.setRegions(spans, unit);
			scene.setBoard(board, activeRods);
			scene.snap();
		});
	});

	// Beads: animate on every step.
	$effect(() => {
		scene?.setBoard(board, activeRods);
	});

	$effect(() => {
		scene?.setSpeed(speed);
	});

	$effect(() => {
		sound.muted = muted;
	});

	export function resetView() {
		scene?.resetView();
	}
</script>

<div class="frame">
	<div class="stage" bind:this={host} class:ready class:veiled aria-hidden={veiled}></div>

	{#if veiled && ready}
		<!-- The board is in the mind now: an empty circle where it stood. -->
		<div class="veil">
			<img src="/enso.svg" alt="" />
			<span>{veilLabel}</span>
		</div>
	{/if}

	{#if failure}
		<p class="failure">{failure}</p>
	{:else if !ready}
		<!-- An ensō, brushed again and again while the board is prepared. -->
		<div class="loading" role="status" aria-live="polite">
			<img class="enso" src="/enso.svg" alt="" />
			<span>{loadingLabel}</span>
		</div>
	{/if}
</div>

<style>
	.frame {
		position: relative;
		width: 100%;
		height: 100%;
	}

	/* No background: the board floats on the paper itself. */
	.stage {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 320px;
		overflow: hidden;
		opacity: 0;
		transition: opacity 0.6s ease;
	}
	.stage.ready {
		opacity: 1;
	}
	/* Hidden quickly, so a move is never glimpsed; revealed more slowly. */
	.stage.ready.veiled {
		opacity: 0;
		transition-duration: 0.2s;
	}

	.veil {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 0.9rem;
		pointer-events: none;
		animation: settle 0.5s ease-out;
	}
	.veil img {
		width: 5.5rem;
		height: 5.5rem;
		opacity: 0.16;
	}
	.veil span {
		font: 400 0.95rem/1 var(--display);
		letter-spacing: 0.08em;
		color: var(--ink-ghost);
	}
	@keyframes settle {
		from {
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.veil {
			animation: none;
		}
	}

	.loading {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 0.9rem;
		pointer-events: none;
	}
	.loading span {
		font: 400 1.05rem/1 var(--display);
		color: var(--ink-faint);
	}
	/*
	 * The ensō (scripts/enso.py) is one dry-brush stroke, starting at the lower
	 * left and running clockwise. A mask sweeps round from the same point, so
	 * the circle appears to be painted; it is then held, and lifted away.
	 */
	@property --enso-sweep {
		syntax: '<angle>';
		inherits: false;
		initial-value: 0deg;
	}
	.enso {
		width: 4.75rem;
		height: 4.75rem;
		opacity: 1;
		--enso-mask: conic-gradient(
			from 212deg,
			#000 calc(var(--enso-sweep) - 6deg),
			transparent var(--enso-sweep)
		);
		-webkit-mask-image: var(--enso-mask);
		mask-image: var(--enso-mask);
		animation: paint 2.8s infinite;
	}
	@keyframes paint {
		0% {
			--enso-sweep: 0deg;
			opacity: 1;
			animation-timing-function: cubic-bezier(0.4, 0.1, 0.55, 0.95);
		}
		55% {
			--enso-sweep: 366deg;
			opacity: 1;
		}
		82% {
			--enso-sweep: 366deg;
			opacity: 1;
		}
		100% {
			--enso-sweep: 366deg;
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.enso {
			animation: none;
			--enso-sweep: 366deg;
		}
	}

	.failure {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
		margin: 0;
		padding: 2rem;
		text-align: center;
		font: 400 1.05rem/1.6 var(--mincho);
		color: var(--ink-faint);
	}

	/* The scene builds and positions these itself, so they have to be global. */
	.stage :global(.soroban-labels) {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.stage :global(.soroban-digit) {
		position: absolute;
		top: 0;
		left: 0;
		font: 400 1.05rem/1 var(--mincho);
		color: var(--ink-soft);
		transition:
			color 0.25s ease,
			opacity 0.25s ease;
	}
	.stage :global(.soroban-digit.is-zero) {
		color: var(--ink-ghost);
	}
	.stage :global(.soroban-digit.is-active) {
		color: var(--shu);
	}
	.stage :global(.soroban-digit.is-unit)::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: -0.4rem;
		width: 0.24rem;
		height: 0.24rem;
		border-radius: 50%;
		transform: translateX(-50%);
		background: var(--shu);
	}

	.stage :global(.soroban-region) {
		position: absolute;
		top: 0;
		left: 0;
		white-space: nowrap;
		font: 400 1.05rem/1 var(--display);
		letter-spacing: 0.02em;
	}
	.stage :global(.soroban-region[data-tone='operand']) {
		color: var(--ink-soft);
	}
	.stage :global(.soroban-region[data-tone='result']) {
		color: var(--shu);
	}
	.stage :global(.soroban-region[data-tone='work']) {
		color: var(--ink-faint);
	}
</style>
