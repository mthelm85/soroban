// @ts-nocheck — ported from three.js's untyped WoodNodeMaterial.js. Typing every
// node argument as a tuple adds a great deal of ceremony and no safety here; the
// typed surface is WoodMaterial in woodShader.ts.

/**
 * Procedural wood, trimmed from three.js's WoodNodeMaterial
 * (three/examples/jsm/materials/WoodNodeMaterial.js — MIT licence, © the
 * three.js authors; its helpers are in turn ported from Blender).
 *
 * Changes from the original, all for this board:
 *
 *  - Noise comes from a baked texture instead of being computed per pixel,
 *    for the same reason: compile time (see noiseVolume.ts).
 *  - The voronoi pore cells are gone. They are far too fine to see at this
 *    viewing distance, and they made the wood the slowest shader on the page
 *    to compile by a wide margin. The cells' average effect on tone is kept.
 *  - Grain is sampled from each object's own geometry (positionGeometry), so
 *    it is fixed to the object and never slides as a bead moves.
 *  - The preset finishes' darkening is dropped; the original computes it once
 *    at module load from the default preset, so it never varied anyway.
 *
 * Every wood material shares this one colour node, with its parameters read as
 * uniforms from `material.grain`, so all the wood on the board compiles to the
 * same shader code — compiled once, not once per part.
 */
import { Color, Matrix4 } from 'three/webgpu';
import * as TSL from 'three/tsl';
import { NOISE_PERIOD, noiseVolume } from './noiseVolume';

const mapRange = TSL.Fn(([x, fromMin, fromMax, toMin, toMax, clamped]) => {
	const factor = x.sub(fromMin).div(fromMax.sub(fromMin));
	const result = toMin.add(factor.mul(toMax.sub(toMin)));
	return TSL.select(clamped, TSL.max(TSL.min(result, toMax), toMin), result);
});

const softLightMix = TSL.Fn(([t, col1, col2]) => {
	const tm = TSL.float(1.0).sub(t);
	const one = TSL.vec3(1.0);
	const screen = one.sub(one.sub(col2).mul(one.sub(col1)));
	return tm.mul(col1).add(t.mul(one.sub(col1).mul(col2).mul(col1).add(col1.mul(screen))));
});

// Noise is read from a baked volume (see noiseVolume.ts) rather than computed:
// the original's MaterialX noise made this shader take seconds to compile.
const noise = TSL.texture3D(noiseVolume());
const sampleNoise = (p) => noise.sample(p.div(NOISE_PERIOD));
const noise1Norm = (p) => sampleNoise(p).x;
const noise3Norm = (p) => sampleNoise(p).yzw;

const woodCenter = TSL.Fn(([p, centerSize]) => {
	const pxyCenter = p.mul(TSL.vec3(1, 1, 0)).length();
	return mapRange(pxyCenter, 0, 1, 0, centerSize, true);
});

const spaceWarp = TSL.Fn(([p, warpStrength, xyScale, zScale]) => {
	const combinedXyz = TSL.vec3(xyScale, xyScale, zScale).mul(p);
	const noise = noise3Norm(combinedXyz.mul(1.6 * 1.5)).sub(0.5).mul(warpStrength);
	const pXy = p.mul(TSL.vec3(1, 1, 0));
	return noise.mul(pXy.normalize()).add(pXy);
});

const woodRings = TSL.Fn(
	([w, ringThickness, ringBias, ringSizeVariance, ringVarianceScale, barkThickness]) => {
		const rings = noise1Norm(w.mul(ringVarianceScale))
			.mul(ringSizeVariance)
			.add(w)
			.mul(ringThickness)
			.fract()
			.mul(barkThickness);
		const sharpRings = TSL.min(
			mapRange(rings, 0, ringBias, 0, 1, TSL.bool(true)),
			mapRange(rings, ringBias, 1, 1, 0, TSL.bool(true))
		);
		// Antialias by how fast the rings change across one pixel. (The original
		// blurred by camera distance instead, which at this board's distance
		// squeezed the rings into a quarter of their range: no visible grain.)
		const blur = TSL.max(TSL.fwidth(sharpRings), 0.04);
		return TSL.smoothstep(blur.negate(), blur, sharpRings.sub(0.5)).mul(0.5).add(0.5);
	}
);

const woodDetail = TSL.Fn(([warp, p, y, splotchScale]) => {
	const radialCoords = TSL.clamp(TSL.atan(warp.y, warp.x).div(TSL.PI2).add(0.5), 0, 1).mul(
		TSL.PI2.mul(3)
	);
	const combinedXyz = TSL.vec3(radialCoords.sin(), y, radialCoords.cos().mul(p.z));
	const scaled = TSL.vec3(0.1, 1.19, 0.05).mul(combinedXyz);
	return noise1Norm(scaled.mul(splotchScale));
});

/**
 * The grain of the object being drawn. Read from the object's own material, not
 * the one drawing it: the shadow pass draws with a stand-in material of its own.
 */
const grainOf = (object) => object.material.grain;

/** A uniform that reads one grain parameter from whichever object is drawing. */
function param(key) {
	return TSL.uniform(0).onObjectUpdate(({ object }) => grainOf(object)[key]);
}

function colour(key) {
	return TSL.uniform(new Color()).onObjectUpdate(({ object }, self) =>
		self.value.copy(grainOf(object)[key])
	);
}

const transformationMatrix = TSL.uniform(new Matrix4()).onObjectUpdate(
	({ object }) => grainOf(object).transformationMatrix
);

/**
 * The pores: open vessels cut lengthways, so they show as fine dark streaks
 * running with the grain. Noise stretched hard along the trunk (wood z) and
 * squeezed across it, following the warped grain so the streaks bend with it.
 */
const pores = TSL.Fn(([warp, p]) => {
	const q = TSL.vec3(warp.x.mul(26), warp.y.mul(26), p.z.mul(0.9));
	const n = noise1Norm(q);
	// Antialiased threshold: only the deepest parts of the noise open as pores.
	const edge = TSL.max(TSL.fwidth(n), 0.03);
	return TSL.smoothstep(TSL.float(0.6).sub(edge), TSL.float(0.6).add(edge), n);
});

/**
 * Everything about the grain at this point: rings (0 dark … 1 light), the
 * broad splotchy tone, and the pores. Computed once and shared by the colour,
 * roughness and normal below.
 */
const grain = TSL.Fn(() => {
	const p = transformationMatrix.mul(TSL.vec4(TSL.positionGeometry, 1)).xyz;
	const center = woodCenter(p, param('centerSize'));
	const mainWarp = spaceWarp(
		spaceWarp(p, center, param('largeWarpScale'), param('largeGrainStretch')),
		param('smallWarpStrength'),
		param('smallWarpScale'),
		0.17
	);
	const detailWarp = spaceWarp(mainWarp, param('fineWarpStrength'), param('fineWarpScale'), 0.17);
	const rings = woodRings(
		detailWarp.length(),
		TSL.float(1).div(param('ringThickness')),
		param('ringBias'),
		param('ringSizeVariance'),
		param('ringVarianceScale'),
		param('barkThickness')
	);
	const detail = woodDetail(detailWarp, p, detailWarp.length(), param('splotchScale'));
	return TSL.vec3(rings, detail, pores(detailWarp, p).mul(param('pores')));
})().toVar('woodGrain');

/** @type {import('three/webgpu').Node<'vec3'>} */
export const woodColor = TSL.Fn(() => {
	const base = TSL.mix(colour('darkGrainColor'), colour('lightGrainColor'), grain.x);
	const toned = softLightMix(0.407, base, TSL.vec3(1));
	const splotched = softLightMix(param('splotchIntensity'), toned, grain.y);
	// Pores hold dirt and shadow: darker, and darker still in the light wood.
	return splotched.mul(TSL.float(1).sub(grain.z.mul(0.55)));
})();

/**
 * Roughness follows the grain: the dense, dark latewood takes a little more
 * polish from handling than the soft earlywood, and the pores none at all.
 * Uneven sheen like this is much of what tells wood from painted plastic.
 */
/** @type {import('three/webgpu').Node<'float'>} */
export const woodRoughness = TSL.Fn(() =>
	TSL.materialRoughness
		.add(grain.x.sub(0.5).mul(param('sheen')))
		.add(grain.z.mul(0.15))
		.clamp(0.05, 1)
)();

/**
 * Surface relief from the grain, as a bump: worn earlywood sits a fraction
 * lower than the latewood, and the pores are open. The normal is perturbed by
 * the height's screen-space slope (Mikkelsen's method, as three's bumpMap).
 */
/** @type {import('three/webgpu').Node<'vec3'>} */
export const woodNormal = TSL.Fn(() => {
	const height = grain.x.mul(0.35).sub(grain.z).mul(param('bump'));
	const dHdxy = TSL.vec2(TSL.dFdx(height), TSL.dFdy(height));
	const vSigmaX = TSL.positionView.dFdx().normalize();
	const vSigmaY = TSL.positionView.dFdy().normalize();
	const vN = TSL.normalViewGeometry;
	const R1 = vSigmaY.cross(vN);
	const R2 = vN.cross(vSigmaX);
	const fDet = vSigmaX.dot(R1).mul(TSL.faceDirection);
	const vGrad = fDet.sign().mul(dHdxy.x.mul(R1).add(dHdxy.y.mul(R2)));
	return fDet.abs().mul(vN).sub(vGrad).normalize();
})();
