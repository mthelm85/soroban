import type { BeadImpact } from '../three/SorobanScene';

/**
 * The click of soroban beads, synthesised with the Web Audio API rather than
 * played from a recording, so there are no audio assets to ship.
 *
 * A bead landing is two sounds at once: the crack of hard wood meeting wood —
 * a noise transient through a resonant band — and the bead's own body, a short
 * damped knock. Every click varies a little in pitch and level, so a run of
 * them never sounds machine-identical.
 */
export class BeadSound {
	muted = false;

	private context: AudioContext | null = null;
	private master: GainNode | null = null;
	private noise: AudioBuffer | null = null;

	/**
	 * Browsers only let audio start after the user has interacted with the
	 * page, so this is called from input handlers.
	 */
	unlock(): void {
		if (!this.muted) this.ensure();
	}

	click({ deck, beads }: BeadImpact): void {
		if (this.muted) return;
		const ctx = this.ensure();
		if (!ctx || !this.master || !this.noise || ctx.state !== 'running') return;

		const t = ctx.currentTime;
		// The heaven bead travels further and lands a touch lower; a block of
		// earth beads lands a touch louder than one.
		const pitch = (deck === 'heaven' ? 0.88 : 1) * (0.93 + Math.random() * 0.14);
		const level = Math.min(1, 0.55 + 0.12 * beads) * (0.85 + Math.random() * 0.3);

		// The crack.
		const source = ctx.createBufferSource();
		source.buffer = this.noise;
		const band = ctx.createBiquadFilter();
		band.type = 'bandpass';
		band.frequency.value = 2900 * pitch;
		band.Q.value = 5;
		const crack = ctx.createGain();
		crack.gain.setValueAtTime(0.0001, t);
		crack.gain.exponentialRampToValueAtTime(0.9 * level, t + 0.0015);
		crack.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
		source.connect(band).connect(crack).connect(this.master);
		source.start(t);
		source.stop(t + 0.06);

		// The knock.
		const knock = ctx.createOscillator();
		knock.type = 'sine';
		knock.frequency.setValueAtTime(1150 * pitch, t);
		knock.frequency.exponentialRampToValueAtTime(900 * pitch, t + 0.04);
		const body = ctx.createGain();
		body.gain.setValueAtTime(0.0001, t);
		body.gain.exponentialRampToValueAtTime(0.35 * level, t + 0.002);
		body.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
		knock.connect(body).connect(this.master);
		knock.start(t);
		knock.stop(t + 0.07);
	}

	dispose(): void {
		void this.context?.close();
		this.context = null;
	}

	private ensure(): AudioContext | null {
		if (typeof window === 'undefined') return null;
		if (!this.context) {
			const Context =
				window.AudioContext ??
				(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
			if (!Context) return null;
			this.context = new Context();
			this.master = this.context.createGain();
			this.master.gain.value = 0.5;
			this.master.connect(this.context.destination);
			// 60 ms of white noise, shared by every click.
			const length = Math.ceil(this.context.sampleRate * 0.06);
			this.noise = this.context.createBuffer(1, length, this.context.sampleRate);
			const data = this.noise.getChannelData(0);
			for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
		}
		if (this.context.state === 'suspended') void this.context.resume();
		return this.context;
	}
}
