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
	<h2 id="about-heading">{text.heading}</h2>
	<p class="lead">{text.lead}</p>
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
	.about {
		margin-top: 6rem;
		padding-top: 2.6rem;
		background: url('/ink/line-divider.svg') center top / 100% 10px no-repeat;
	}

	h2 {
		margin: 0 0 1rem;
		font: 400 1.35rem/1.3 var(--display);
		letter-spacing: 0.04em;
		color: var(--ink-soft);
	}

	.lead {
		max-width: 66ch;
		margin: 0;
		font: 400 1.08rem/1.8 var(--mincho);
		color: var(--ink-soft);
	}

	.faq {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 24rem), 1fr));
		gap: 2rem 4rem;
		margin-top: 2.6rem;
	}

	h3 {
		margin: 0 0 0.45rem;
		font: 400 1.1rem/1.4 var(--display);
		color: var(--ink);
	}

	article p {
		margin: 0;
		font: 400 1rem/1.75 var(--mincho);
		color: var(--ink-faint);
	}
</style>
