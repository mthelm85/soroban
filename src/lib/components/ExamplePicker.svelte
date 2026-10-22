<!--
	The built-in examples, as a menu rather than a native select: a native
	option list cannot be styled, and drew in the system's own font and chrome.
	Each example shows its problem and a short hint beside it;
	the highlighted one sits on a pale wash of ink.
-->
<script lang="ts">
	import { tick } from 'svelte';

	interface Props {
		label: string;
		examples: readonly string[];
		/** One hint per example, in the same order. */
		hints: readonly string[];
		onpick: (example: string) => void;
	}

	let { label, examples, hints, onpick }: Props = $props();

	let open = $state(false);
	let active = $state(0);
	let root: HTMLDivElement | undefined = $state();
	let trigger: HTMLButtonElement | undefined = $state();
	let items: HTMLButtonElement[] = $state([]);

	const id = `examples-${Math.random().toString(36).slice(2, 8)}`;

	async function show(focus: number) {
		open = true;
		active = focus;
		await tick();
		items[active]?.focus();
	}

	function hide(refocus = true) {
		open = false;
		if (refocus) trigger?.focus();
	}

	function pick(example: string) {
		hide();
		onpick(example);
	}

	function move(to: number) {
		active = (to + examples.length) % examples.length;
		items[active]?.focus();
	}

	function onTriggerKey(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			void show(event.key === 'ArrowDown' ? 0 : examples.length - 1);
		}
	}

	function onMenuKey(event: KeyboardEvent) {
		const keys: Record<string, () => void> = {
			ArrowDown: () => move(active + 1),
			ArrowUp: () => move(active - 1),
			Home: () => move(0),
			End: () => move(examples.length - 1),
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
		<div class="menu" id={id} role="menu" aria-label={label} tabindex="-1" onkeydown={onMenuKey}>
			{#each examples as example, i (example)}
				<button
					type="button"
					role="menuitem"
					tabindex={i === active ? 0 : -1}
					class:active={i === active}
					bind:this={items[i]}
					onclick={() => pick(example)}
					onpointerenter={() => (active = i)}
					onfocus={() => (active = i)}
				>
					<span class="problem">{example}</span>
					<span class="hint">{hints[i]}</span>
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
		min-width: 19rem;
		padding: 0.6rem 0.4rem;
		background: var(--paper);
		border-radius: 3px;
		box-shadow:
			0 1px 2px rgb(28 26 24 / 0.08),
			0 14px 36px rgb(28 26 24 / 0.14);
		animation: unfold 0.18s ease-out;
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
		grid-template-columns: 7.5rem 1fr;
		align-items: baseline;
		gap: 1rem;
		padding: 0.5rem 0.75rem;
		border: 0;
		background: none;
		text-align: left;
		cursor: pointer;
	}
	.menu button:focus {
		outline: none;
	}
	.menu button.active {
		background: url('/ink/wash-band.svg') center / 100% 100% no-repeat;
	}
	.problem {
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
