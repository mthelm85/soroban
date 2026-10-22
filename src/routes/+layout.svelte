<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
	/*
	 * Sumi-e: ink on gasenshi paper, with vermilion kept for the seal (朱印) and
	 * for marking where you are. Everything else is ink at different strengths,
	 * the way a sumi-e painter dilutes one ink rather than reaching for colours.
	 */
	:global(:root) {
		--paper: #f1ece1;
		--ink: #141210;
		--ink-soft: #2b2723;
		--ink-faint: #6e675d;
		--ink-ghost: #b4ab9c;
		--shu: #b7472a;

		/*
		 * Two voices. The display face writes the labels and headings: Cinzel's
		 * capitals for Latin — drawn from Roman inscriptions, carved rather than
		 * handwritten — and Yuji Syuku's brush for Japanese. Shippori Mincho
		 * sets the prose and every number on the page, from a digit in a
		 * sentence to the answer itself: its figures are unambiguous, where
		 * inscriptional ones turn 1 into I and 0 into O. Nothing is italic.
		 */
		--display: 'Cinzel', 'Yuji Syuku', 'Shippori Mincho', serif;
		--mincho: 'Shippori Mincho', 'Hiragino Mincho ProN', 'Yu Mincho', serif;

		color-scheme: light;
	}

	:global(*),
	:global(*::before),
	:global(*::after) {
		box-sizing: border-box;
	}

	:global(html),
	:global(body) {
		height: 100%;
	}

	:global(body) {
		margin: 0;
		color: var(--ink);
		font-family: var(--mincho);
		font-size: 17px;
		-webkit-font-smoothing: antialiased;
		/* Never fake italics or bold: a browser-skewed kanji is a typographic error. */
		font-synthesis: none;
		background-color: var(--paper);
		background-image:
			/* the faintest ink wash, bled in from two corners */
			radial-gradient(ellipse 55% 45% at 100% 0%, rgb(20 18 16 / 0.035), transparent 70%),
			radial-gradient(ellipse 45% 40% at 0% 100%, rgb(20 18 16 / 0.022), transparent 70%),
			/*
			 * Handmade paper, kept at the edge of notice: the soft, cloudy
			 * unevenness of a matted sheet at two scales, and a whisper of grain.
			 * Drawn fibres were tried and read as scratches, so there are none.
			 */
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.11 0 0 0 0 0.1 0 0 0 0 0.09 0 0 0 0.6 -0.2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.022'/%3E%3C/svg%3E"),
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='640'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.011' numOctaves='4' seed='5' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.24 0 0 0 0 0.21 0 0 0 0 0.16 0 0 0 1.5 -0.62'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)' opacity='0.045'/%3E%3C/svg%3E"),
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1000' height='1000'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.0032' numOctaves='4' seed='14' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.24 0 0 0 0 0.21 0 0 0 0 0.16 0 0 0 1.5 -0.62'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)' opacity='0.055'/%3E%3C/svg%3E");
		background-attachment: fixed;
	}

	:global(button) {
		font-family: inherit;
		color: inherit;
	}

	:global(::selection) {
		background: rgb(183 71 42 / 0.16);
	}

	:global(::-webkit-scrollbar) {
		width: 8px;
		height: 8px;
	}
	:global(::-webkit-scrollbar-thumb) {
		background: var(--ink-ghost);
		border-radius: 4px;
	}
	:global(::-webkit-scrollbar-track) {
		background: transparent;
	}

	:global(:focus-visible) {
		outline: 1px solid var(--ink-faint);
		outline-offset: 3px;
	}
</style>
