import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// A fully static site (both pages prerendered), so it can be served by
			// GitHub Pages. Pages serves a project site under /<repo>/, so the
			// deploy sets BASE_PATH=/soroban; locally the base is empty.
			adapter: adapter(),
			paths: {
				base: (process.env.BASE_PATH ?? '') as '' | `/${string}`,
				// Absolute (/soroban/ink/…), not page-relative: the icon masks pass
				// their url() through a CSS variable, which resolves it against the
				// stylesheet rather than the page.
				relative: false
			}
		})
	]
});
