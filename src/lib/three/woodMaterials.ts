import { Color, Matrix4 } from 'three/webgpu';
import { GetWoodPreset, type WoodGenus } from 'three/examples/jsm/materials/WoodNodeMaterial.js';
import { WoodMaterial, type WoodFinish } from './woodShader';

/**
 * The board's woods. The grain is solid — computed through the volume from
 * position, not painted onto UVs — so it reads correctly on a lathed bead,
 * which a flat texture never can. The shader itself is in woodShader.graph.js.
 *
 * The shader models a log whose trunk runs along its z axis, with growth rings
 * around it, tuned for objects about one unit across. Each part of the board
 * therefore gets a transform that turns the trunk to run along the part's
 * length, shrinks the board's units into wood units, and moves the trunk's
 * centre well away from the surface, so the rings meet the face as long
 * parallel grain lines rather than a bullseye.
 */

/** Which axis of the part the grain runs along. */
type GrainAxis = 'x' | 'y';

/**
 * A matrix taking a part's own space into wood space. The grain axis becomes
 * wood z (along the trunk); the face's other in-plane axis becomes the radial
 * direction, so rings cross the visible face as straight lines.
 */
function grainMatrix(axis: GrainAxis, scale: number, offset: number, phase: number): Matrix4 {
	const m = new Matrix4();
	if (axis === 'x') {
		// wood.x = s·z + phase, wood.y = s·y + offset, wood.z = s·x
		m.set(0, 0, scale, phase, 0, scale, 0, offset, scale, 0, 0, 0, 0, 0, 0, 1);
	} else {
		// wood.x = s·z + phase, wood.y = s·x + offset, wood.z = s·y
		m.set(0, 0, scale, phase, scale, 0, 0, offset, 0, scale, 0, 0, 0, 0, 0, 1);
	}
	return m;
}

interface WoodSpec {
	genus: WoodGenus;
	dark: string;
	light: string;
	axis: GrainAxis;
	/** Part units → wood units. Smaller means wider-spaced grain. */
	scale: number;
	/** Distance of the face from the trunk, in wood units. */
	offset: number;
	/** Shift along the rings, so parts cut from "different planks" differ. */
	phase?: number;
	finish: WoodFinish;
	/** Pore visibility, 0…1; open-grained woods like walnut show more. */
	pores: number;
	/** Height of the grain's relief. */
	bump: number;
}

/*
 * The shader is tuned for objects about a unit across viewed close up. At this
 * board's scale its default ring spacing comes out a few pixels wide on screen,
 * which antialiasing averages away, so each part's `scale` is kept low to make
 * the grain coarse enough to resolve.
 */

/*
 * Matte, not glossy: no clearcoat, which puts a smooth specular band along
 * every bead and reads as lacquer or plastic. What sheen there is comes from
 * the base roughness, and the shader breaks it up along the grain, so it reads
 * as wood that has been handled rather than as a coating.
 */
const FRAME: WoodFinish = { roughness: 0.62, sheen: 0.22, clearcoat: 0, clearcoatRoughness: 1 };
/** Beads are handled constantly, and polished by it: smoother, still not glossy. */
const BEAD: WoodFinish = { roughness: 0.5, sheen: 0.18, clearcoat: 0, clearcoatRoughness: 1 };

function wood(spec: WoodSpec): WoodMaterial {
	const preset = GetWoodPreset(spec.genus, 'raw');
	return new WoodMaterial(
		{
			centerSize: preset.centerSize,
			largeWarpScale: preset.largeWarpScale,
			largeGrainStretch: preset.largeGrainStretch,
			smallWarpStrength: preset.smallWarpStrength,
			smallWarpScale: preset.smallWarpScale,
			fineWarpStrength: preset.fineWarpStrength,
			fineWarpScale: preset.fineWarpScale,
			ringThickness: preset.ringThickness,
			ringBias: preset.ringBias,
			ringSizeVariance: preset.ringSizeVariance,
			ringVarianceScale: preset.ringVarianceScale,
			barkThickness: preset.barkThickness,
			splotchScale: preset.splotchScale,
			splotchIntensity: preset.splotchIntensity,
			darkGrainColor: new Color(spec.dark),
			lightGrainColor: new Color(spec.light),
			pores: spec.pores,
			sheen: spec.finish.sheen,
			bump: spec.bump,
			transformationMatrix: grainMatrix(spec.axis, spec.scale, spec.offset, spec.phase ?? 0)
		},
		spec.finish
	);
}

/** Dark walnut for the frame: rails grain along x, posts along y. */
export function frameRail(phase: number): WoodMaterial {
	return wood({
		genus: 'walnut',
		finish: FRAME,
		dark: '#0a0503',
		light: '#3f2716',
		pores: 0.9,
		bump: 1.2,
		axis: 'x',
		scale: 0.22,
		offset: 1.6,
		phase
	});
}

export function framePost(phase: number): WoodMaterial {
	return wood({
		genus: 'walnut',
		finish: FRAME,
		dark: '#0a0503',
		light: '#3f2716',
		pores: 0.9,
		bump: 1.2,
		axis: 'y',
		scale: 0.22,
		offset: 1.6,
		phase
	});
}

/** Near-black, close-grained wood for the beam, like ebony. */
export function beam(): WoodMaterial {
	return wood({
		genus: 'walnut',
		finish: FRAME,
		dark: '#070403',
		light: '#3a281b',
		pores: 0.5,
		bump: 0.8,
		axis: 'x',
		scale: 0.35,
		offset: 2.2
	});
}

/**
 * Dark, aged red-brown beads — warm, but browner than new mahogany, like wood
 * that has been handled for years. The grain runs along the rod and is fixed to
 * each bead, which is turned its own way round the rod so no two look alike.
 */
export function bead(): WoodMaterial {
	return wood({
		genus: 'mahogany',
		finish: BEAD,
		dark: '#260d07',
		light: '#4c2014',
		pores: 0.45,
		bump: 0.7,
		axis: 'y',
		scale: 0.14,
		offset: 3
	});
}
