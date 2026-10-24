<script lang="ts">
	import type { AboutText } from '#lib/i18n/about.js';

	let { text }: { text: AboutText } = $props();
</script>

<!--
	Below the work, out of its way: what a soroban is and which methods the app
	teaches, in words a reader (or a search engine) can take away without
	running the board. One column, read like a short article.
-->
<section class="about" aria-labelledby="about-heading">
	<h2 id="about-heading">{text.heading}</h2>
	<p class="lead">{text.lead}</p>
	{#each text.faq as item (item.q)}
		<article>
			<h3>{item.q}</h3>
			<p>{item.a}</p>
		</article>
	{/each}
</section>

<style>
	.about {
		position: relative;
		max-width: 46rem;
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

	article {
		margin-top: 2.4rem;
	}

	/* Questions are sentences, so they are set in the text face, not the inscriptional capitals. */
	h3 {
		margin: 0 0 0.5rem;
		font: 500 1.12rem/1.5 var(--mincho);
		color: var(--ink);
	}
</style>
