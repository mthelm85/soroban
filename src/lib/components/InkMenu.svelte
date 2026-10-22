<!--
	A menu on a sheet of paper, used for the examples and the practice levels.
	It replaces a native select, whose option list cannot be styled and drew in
	the system's own font and chrome. Each row shows a title and a short hint
	beside it; the highlighted one sits on a pale wash of ink.
-->
<script module lang="ts">
	export interface MenuItem {
		value: string;
		title: string;
		hint: string;
	}
</script>

<script lang="ts">
	import { tick } from 'svelte';

	interface Props {
		label: string;
		items: readonly MenuItem[];
		onpick: (value: string) => void;
		/** Which edge of the trigger the sheet lines up with; "end" opens leftwards. */
		align?: 'start' | 'end';
	}

	let { label, items: entries, onpick, align = 'start' }: Props = $props();

	let open = $state(false);
	let active = $state(0);
	let root: HTMLDivElement | undefined = $state();
	let trigger: HTMLButtonElement | undefined = $state();
	let items: HTMLButtonElement[] = $state([]);
	let sheet: HTMLDivElement | undefined = $state();
	/** Sideways nudge that keeps the sheet inside the window on narrow screens. */
	let nudge = $state(0);
	const MARGIN = 12;

	const id = `menu-${Math.random().toString(36).slice(2, 8)}`;

	async function show(focus: number) {
		open = true;
		active = focus;
		nudge = 0;
		await tick();
		if (sheet) {
			const box = sheet.getBoundingClientRect();
			if (box.left < MARGIN) nudge = MARGIN - box.left;
			else if (box.right > window.innerWidth - MARGIN) nudge = window.innerWidth - MARGIN - box.right;
		}
		items[active]?.focus();
	}

	function hide(refocus = true) {
		open = false;
		if (refocus) trigger?.focus();
	}

	function pick(value: string) {
		hide();
		onpick(value);
	}

	function move(to: number) {
		active = (to + entries.length) % entries.length;
		items[active]?.focus();
	}

	function onTriggerKey(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			void show(event.key === 'ArrowDown' ? 0 : entries.length - 1);
		}
	}

	function onMenuKey(event: KeyboardEvent) {
		const keys: Record<string, () => void> = {
			ArrowDown: () => move(active + 1),
			ArrowUp: () => move(active - 1),
			Home: () => move(0),
			End: () => move(entries.length - 1),
			Escape: () => hide()
		};
		const action = keys[event.key];
		if (action) {
			event.preventDefault();
			action();
		} else if (event.key === 'Tab') {
			hide(false);
		}
	}

	// Close when anything outside the menu is pressed.
	$effect(() => {
		if (!open) return;
		const away = (event: PointerEvent) => {
			if (root && !root.contains(event.target as Node)) hide(false);
		};
		window.addEventListener('pointerdown', away);
		return () => window.removeEventListener('pointerdown', away);
	});
</script>

<div class="picker" bind:this={root}>
	<button
		type="button"
		class="trigger"
		bind:this={trigger}
		aria-haspopup="menu"
		aria-expanded={open}
		aria-controls={id}
		onclick={() => (open ? hide() : show(0))}
		onkeydown={onTriggerKey}
	>
		{label}<span class="caret" aria-hidden="true"></span>
	</button>

	{#if open}
		<div
			class="menu"
			class:end={align === 'end'}
			bind:this={sheet}
			style:translate="{nudge}px 0"
			id={id}
			role="menu"
			aria-label={label}
			tabindex="-1"
			onkeydown={onMenuKey}
		>
			{#each entries as entry, i (entry.value)}
				<button
					type="button"
					role="menuitem"
					tabindex={i === active ? 0 : -1}
					class:active={i === active}
					bind:this={items[i]}
					onclick={() => pick(entry.value)}
					onpointerenter={() => (active = i)}
					onfocus={() => (active = i)}
				>
					<span class="title">{entry.title}</span>
					<span class="hint">{entry.hint}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.picker {
		position: relative;
		flex: none;
	}

	.trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.2rem 0;
		border: 0;
		background: none;
		font: 400 1.1rem/1 var(--display);
		color: var(--ink-faint);
		cursor: pointer;
		transition: color 0.2s ease;
	}
	.trigger:hover,
	.trigger[aria-expanded='true'] {
		color: var(--ink);
	}
	.trigger:focus-visible {
		outline: 1px dotted var(--ink-faint);
		outline-offset: 4px;
	}
	.caret {
		width: 0.7em;
		height: 0.7em;
		background: currentColor;
		-webkit-mask: url('/ink/icon-down.svg') center / contain no-repeat;
		mask: url('/ink/icon-down.svg') center / contain no-repeat;
		transition: transform 0.25s ease;
	}
	.trigger[aria-expanded='true'] .caret {
		transform: rotate(180deg);
	}

	/* A sheet of the same paper, lifted a little off the page. */
	.menu {
		position: absolute;
		top: calc(100% + 0.7rem);
		left: -1.1rem;
		z-index: 30;
		display: grid;
		/* Titles and hints line up in two columns across every row. */
		grid-template-columns: auto 1fr;
		column-gap: 1.6rem;
		width: max-content;
		max-width: min(34rem, calc(100vw - 2rem));
		padding: 0.6rem 0.4rem;
		background: var(--paper);
		border-radius: 3px;
		box-shadow:
			0 1px 2px rgb(28 26 24 / 0.08),
			0 14px 36px rgb(28 26 24 / 0.14);
		animation: unfold 0.18s ease-out;
	}
	.menu.end {
		left: auto;
		right: -1.1rem;
	}
	@keyframes unfold {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.menu {
			animation: none;
		}
	}

	.menu button {
		display: grid;
		grid-column: 1 / -1;
		grid-template-columns: subgrid;
		align-items: baseline;
		padding: 0.5rem 0.75rem;
		border: 0;
		background: none;
		text-align: left;
		cursor: pointer;
	}
	/* Narrow screens: each hint goes under its title rather than beside it. */
	@media (max-width: 640px) {
		.menu {
			grid-template-columns: 1fr;
		}
		.menu button {
			row-gap: 0.15rem;
		}
	}

	.menu button:focus {
		outline: none;
	}
	.menu button.active {
		background: url('/ink/wash-band.svg') center / 100% 100% no-repeat;
	}
	.title {
		font: 500 1.15rem/1.2 var(--mincho);
		color: var(--ink);
		white-space: nowrap;
	}
	.hint {
		font: 400 0.92rem/1.4 var(--mincho);
		color: var(--ink-faint);
	}
	.active .hint {
		color: var(--ink-soft);
	}
</style>
