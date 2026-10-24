<script lang="ts">
	import type { AboutText } from '#lib/i18n/about.js';

	let { text }: { text: AboutText } = $props();
</script>

<!--
	Below the work, out of its way: what a soroban is and which methods the app
	teaches, in words a reader (or a search engine) can take away without
	running the board.
-->
<section class="about" aria-labelledby="about-heading">
	<div class="intro">
		<h2 id="about-heading">{text.heading}</h2>
		<p>{text.lead}</p>
	</div>
	<div class="faq">
		{#each text.faq as item (item.q)}
			<article>
				<h3>{item.q}</h3>
				<p>{item.a}</p>
			</article>
		{/each}
	</div>
</section>

<style>
	/*
	 * As wide as the app above it. The width is shared out rather than filled
	 * by long lines: the introduction in a narrow column of its own, and the
	 * questions flowing down two newspaper columns beside it, so every line
	 * stays a comfortable length and the columns end level.
	 */
	.about {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
		gap: 2.4rem 5rem;
		margin-top: 7rem;
		padding-top: 3rem;
	}
	/* The same dry-brush stroke as above the reading, at half strength: a pause, not a wall. */
	.about::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 8px;
		background: url('/ink/line-divider.svg') center / 100% 100% no-repeat;
		opacity: 0.45;
	}

	h2 {
		margin: 0 0 1.1rem;
		font: 400 1.3rem/1.3 var(--display);
		letter-spacing: 0.04em;
		color: var(--ink);
	}

	p {
		margin: 0;
		font: 400 1.05rem/1.85 var(--mincho);
		color: var(--ink-soft);
	}

	.faq {
		columns: 2;
		column-gap: 4rem;
	}

	article {
		break-inside: avoid;
		margin-bottom: 2.4rem;
	}
	article:last-child {
		margin-bottom: 0;
	}

	/* Questions are sentences, so they are set in the text face, not the inscriptional capitals. */
	h3 {
		margin: 0 0 0.5rem;
		font: 500 1.12rem/1.5 var(--mincho);
		color: var(--ink);
	}

	/* Mid widths: the introduction goes on top, the two columns of questions below it. */
	@media (max-width: 1100px) {
		.about {
			grid-template-columns: minmax(0, 1fr);
		}
		.intro {
			max-width: 46rem;
		}
	}
	@media (max-width: 760px) {
		.faq {
			columns: 1;
		}
	}
</style>
