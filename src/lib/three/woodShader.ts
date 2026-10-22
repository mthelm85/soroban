/**
 * The typed side of the board's wood: its parameters and the material. The
 * shader graph itself is in woodShader.graph.js.
 */
import { Color, Matrix4, MeshPhysicalNodeMaterial } from 'three/webgpu';
import { woodColor, woodNormal, woodRoughness } from './woodShader.graph.js';

/** The grain parameters; names follow three's WoodNodeMaterial. */
export interface WoodGrain {
	transformationMatrix: Matrix4;
	centerSize: number;
	largeWarpScale: number;
	largeGrainStretch: number;
	smallWarpStrength: number;
	smallWarpScale: number;
	fineWarpStrength: number;
	fineWarpScale: number;
	ringThickness: number;
	ringBias: number;
	ringSizeVariance: number;
	ringVarianceScale: number;
	barkThickness: number;
	splotchScale: number;
	splotchIntensity: number;
	darkGrainColor: Color;
	lightGrainColor: Color;
	/** How strongly the pores show, 0…1. */
	pores: number;
	/** How far roughness swings between earlywood and latewood. */
	sheen: number;
	/** Height of the grain's relief, in screen-slope units. */
	bump: number;
}

export interface WoodFinish {
	roughness: number;
	/** How far roughness swings between earlywood and latewood. */
	sheen: number;
	clearcoat: number;
	clearcoatRoughness: number;
}

export class WoodMaterial extends MeshPhysicalNodeMaterial {
	/** Read by the shader's uniforms each time an object with this material draws. */
	grain: WoodGrain;

	constructor(grain: WoodGrain, finish: WoodFinish) {
		super();
		this.grain = grain;
		this.colorNode = woodColor;
		this.roughnessNode = woodRoughness;
		this.normalNode = woodNormal;
		this.roughness = finish.roughness;
		this.clearcoat = finish.clearcoat;
		this.clearcoatRoughness = finish.clearcoatRoughness;
	}
}
