<script lang="ts">
	import { TECHNIQUES, type Solution, type Step } from '#lib/soroban/index.js';

	interface Props {
		solution: Solution;
		current: number;
		onselect: (index: number) => void;
		/**
		 * When working from memory: whether a step's move is still hidden. A
		 * hidden step shows only its number, and a group heading stays hidden
		 * until its first step is revealed, as headings name the arithmetic.
		 */
		concealed?: ((index: number) => boolean) | null;
	}

	let { solution, current, onselect, concealed = null }: Props = $props();

	type Row =
		| { kind: 'section'; text: string }
		| { kind: 'group'; text: string; first: number }
		| { kind: 'step'; step: Step };

	function buildRows(steps: Step[]): Row[] {
		const rows: Row[] = [];
		let section = '';
		let group = '';
		for (const step of steps) {
			if (step.section !== section) {
				section = step.section;
				group = '';
				rows.push({ kind: 'section', text: section });
			}
			if (step.group !== group) {
				group = step.group;
				// A group that only restates its section adds nothing to the list.
				if (group !== section) rows.push({ kind: 'group', text: group, first: step.index });
			}
			rows.push({ kind: 'step', step });
		}
		return rows;
	}

	const rows = $derived(buildRows(solution.steps));
	let list: HTMLOListElement | undefined = $state();

	/** Room left at the top for the sticky section heading. */
	const STICKY_ALLOWANCE = 36;

	// Keep the current step in view by scrolling the list itself — never the
	// page. scrollIntoView would also scroll every scrollable ancestor, which
	// during playback drags the board out of sight.
	$effect(() => {
		if (!list || current < 0) return;
		const active = list.querySelector<HTMLElement>(`[data-index="${current}"]`);
		if (!active) return;
		const box = list.getBoundingClientRect();
		const item = active.getBoundingClientRect();
		if (item.top < box.top + STICKY_ALLOWANCE) {
			list.scrollTop -= box.top + STICKY_ALLOWANCE - item.top;
		} else if (item.bottom > box.bottom) {
			list.scrollTop += item.bottom - box.bottom;
		}
	});
</script>

<ol class="steps" bind:this={list}>
	{#each rows as row, i (i)}
		{#if row.kind === 'section'}
			<li class="section">{row.text}</li>
		{:else if row.kind === 'group'}
			{#if !concealed?.(row.first)}
				<li class="group">{row.text}</li>
			{/if}
		{:else}
			<li>
				<button
					type="button"
					data-index={row.step.index}
					class="step"
					class:is-current={row.step.index === current}
					class:is-done={row.step.index < current}
					onclick={() => onselect(row.step.index)}
				>
					<span class="n">{row.step.index + 1}</span>
					{#if concealed?.(row.step.index)}
						<span class="formula hidden" aria-label="?">· · ·</span>
					{:else}
						<span class="formula">{row.step.formula}</span>
						<span class="technique">{TECHNIQUES[row.step.technique].ja}</span>
					{/if}
				</button>
			</li>
		{/if}
	{/each}
</ol>

<style>
	.steps {
		margin: 0;
		padding: 0 0 2rem;
		list-style: none;
		overflow-y: auto;
		flex: 1;
		min-height: 0;
		scrollbar-width: thin;
	}

	.section {
		position: sticky;
		top: 0;
		z-index: 1;
		padding: 1rem 1.75rem 0.4rem;
		background: linear-gradient(var(--paper) 70%, transparent);
		font: 400 1.1rem/1.4 var(--display);
		color: var(--ink);
	}

	.group {
		padding: 0.45rem 1.75rem 0.2rem;
		font: 400 0.98rem/1.5 var(--mincho);
		color: var(--ink-faint);
	}

	.step {
		display: grid;
		grid-template-columns: 1.7rem 1fr auto;
		align-items: baseline;
		gap: 0.7rem;
		width: 100%;
		padding: 0.24rem 1.75rem;
		border: 0;
		border-left: 2px solid transparent;
		background: none;
		font: inherit;
		text-align: left;
		color: var(--ink-soft);
		cursor: pointer;
		transition: color 0.15s ease;
	}
	.step:hover {
		color: var(--ink);
	}
	.step.is-done {
		color: var(--ink-faint);
	}
	/* Vermilion marks where you are, as it does on the board. */
	.step.is-current {
		border-left-color: var(--shu);
		color: var(--ink);
	}

	.n {
		font: 400 0.9rem/1.5 var(--mincho);
		color: var(--ink-ghost);
		text-align: right;
	}
	.step.is-current .n {
		color: var(--shu);
	}

	.formula {
		font: 500 1.05rem/1.5 var(--mincho);
		white-space: nowrap;
	}

	.formula.hidden {
		color: var(--ink-ghost);
		letter-spacing: 0.1em;
	}

	.technique {
		font: 400 1rem/1.5 var(--display);
		color: var(--ink-faint);
	}
</style>
