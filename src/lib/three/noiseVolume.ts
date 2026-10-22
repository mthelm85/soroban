import {
	Data3DTexture,
	DataUtils,
	HalfFloatType,
	LinearFilter,
	RGBAFormat,
	RepeatWrapping
} from 'three/webgpu';

/**
 * Perlin noise baked into a small tiling 3D texture, for the wood shader.
 *
 * Computing gradient noise inside a shader is expensive to *compile*: the wood
 * calls it about a dozen times, and on Windows turning that into GPU code took
 * several seconds per shader. Sampling a texture compiles almost instantly, and
 * since the noise never changes it is computed once here instead.
 *
 * Each channel is an independent noise field, already mapped from −1…1 to
 * 0…1: red stands in for a scalar noise, green/blue/alpha for a vector one.
 */

/** Lattice cells per tile; the field repeats every this many noise units. */
export const NOISE_PERIOD = 12;
/** Texels per lattice cell. Four keeps trilinear filtering visually smooth. */
const TEXELS_PER_CELL = 4;
const SIZE = NOISE_PERIOD * TEXELS_PER_CELL;

/** A seeded shuffle of 0…NOISE_PERIOD−1, doubled to skip a wrap in lookups. */
function permutation(seed: number): Uint8Array {
	let state = seed >>> 0 || 1;
	const random = () => {
		// xorshift32: deterministic, so the wood looks the same every load.
		state ^= state << 13;
		state ^= state >>> 17;
		state ^= state << 5;
		return (state >>> 0) / 4294967296;
	};
	const p = Array.from({ length: NOISE_PERIOD }, (_, i) => i);
	for (let i = p.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[p[i], p[j]] = [p[j], p[i]];
	}
	return Uint8Array.from([...p, ...p]);
}

// The twelve edge directions of a cube, as in Perlin's improved noise.
const GRADIENTS = [
	[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
	[1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
	[0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
];

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Improved Perlin noise, tiling with period NOISE_PERIOD on every axis. */
function perlin(perm: Uint8Array, x: number, y: number, z: number): number {
	const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
	const xf = x - xi, yf = y - yi, zf = z - zi;
	const X = ((xi % NOISE_PERIOD) + NOISE_PERIOD) % NOISE_PERIOD;
	const Y = ((yi % NOISE_PERIOD) + NOISE_PERIOD) % NOISE_PERIOD;
	const Z = ((zi % NOISE_PERIOD) + NOISE_PERIOD) % NOISE_PERIOD;
	const corner = (dx: number, dy: number, dz: number) => {
		const h = perm[perm[perm[X + dx] + Y + dy] + Z + dz] % 12;
		const g = GRADIENTS[h];
		return g[0] * (xf - dx) + g[1] * (yf - dy) + g[2] * (zf - dz);
	};
	const u = fade(xf), v = fade(yf), w = fade(zf);
	return lerp(
		lerp(lerp(corner(0, 0, 0), corner(1, 0, 0), u), lerp(corner(0, 1, 0), corner(1, 1, 0), u), v),
		lerp(lerp(corner(0, 0, 1), corner(1, 0, 1), u), lerp(corner(0, 1, 1), corner(1, 1, 1), u), v),
		w
	);
}

let cached: Data3DTexture | undefined;

/** The shared noise volume, built on first use (a few tens of milliseconds). */
export function noiseVolume(): Data3DTexture {
	if (cached) return cached;
	const perms = [11, 23, 37, 53].map(permutation);
	const data = new Uint16Array(SIZE * SIZE * SIZE * 4);
	let i = 0;
	for (let z = 0; z < SIZE; z++) {
		for (let y = 0; y < SIZE; y++) {
			for (let x = 0; x < SIZE; x++) {
				const px = x / TEXELS_PER_CELL, py = y / TEXELS_PER_CELL, pz = z / TEXELS_PER_CELL;
				for (const perm of perms) {
					data[i++] = DataUtils.toHalfFloat(perlin(perm, px, py, pz) * 0.5 + 0.5);
				}
			}
		}
	}
	const texture = new Data3DTexture(data, SIZE, SIZE, SIZE);
	texture.format = RGBAFormat;
	texture.type = HalfFloatType;
	texture.minFilter = texture.magFilter = LinearFilter;
	texture.wrapS = texture.wrapT = texture.wrapR = RepeatWrapping;
	texture.generateMipmaps = false;
	texture.unpackAlignment = 1;
	texture.needsUpdate = true;
	cached = texture;
	return texture;
}
