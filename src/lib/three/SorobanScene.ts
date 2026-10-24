import {
	Box3,
	BoxGeometry,
	Color,
	CylinderGeometry,
	DirectionalLight,
	Group,
	HemisphereLight,
	DataUtils,
	EquirectangularReflectionMapping,
	type DataTexture,
	BackSide,
	MeshBasicMaterial,
	PlaneGeometry,
	RenderPipeline,
	ShadowNodeMaterial,
	InstancedMesh,
	MathUtils,
	Mesh,
	MeshStandardMaterial,
	NeutralToneMapping,
	Object3D,
	PCFShadowMap,
	PMREMGenerator,
	PerspectiveCamera,
	Scene,
	SRGBColorSpace,
	Vector3,
	WebGPURenderer,
	type BufferGeometry,
	type Material,
	type Texture
} from 'three/webgpu';
import { asset } from '$app/paths';
import {
	builtinAOContext,
	mrt,
	normalView,
	pass,
	positionWorld,
	screenUV,
	smoothstep,
	uniform
} from 'three/tsl';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { ao } from 'three/examples/jsm/tsl/display/GTAONode.js';
import { makeBeadGeometry } from './beadGeometry';
import * as woods from './woodMaterials';
import { isUnitPoint } from '../soroban/layout';
import { rodValue } from '../soroban/board';
import type { Board, Region } from '../soroban/types';

/** Physical proportions, loosely those of a real soroban in centimetres. */
const PITCH = 1.0;
const BEAD_R = 0.45;
const BEAD_H = 0.56;
const BEAD_BORE = 0.05;
const BEAD_RIM = 0.095;
const BEAM_T = 0.26;
const BEAM_D = 0.58;
const LOWER_DECK = 5.0 * BEAD_H;
const UPPER_DECK = 2.1 * BEAD_H;
const RAIL_T = 0.46;
const FRAME_D = 0.74;
const EDGE = 0.7;
const POST_W = 0.52;
const ROD_R = 0.058;

const BEAM_TOP = BEAM_T / 2;
const BEAM_BOTTOM = -BEAM_T / 2;
/** Top surface of the bottom rail — where unset earth beads rest. */
const DECK_FLOOR = BEAM_BOTTOM - LOWER_DECK;
/** Underside of the top rail — where unset heaven beads rest. */
const DECK_CEIL = BEAM_TOP + UPPER_DECK;
const BOTTOM_RAIL_Y = DECK_FLOOR - RAIL_T / 2;
const TOP_RAIL_Y = DECK_CEIL + RAIL_T / 2;

const BEADS_PER_ROD = 5;
const WHITE = new Color(1, 1, 1);

/** How far below the bottom rail the digit and region labels reach. */
const LABEL_DEPTH = 1.35;

/**
 * The orbit range: enough to feel the board's depth, never enough to lose it.
 * The camera distance is fitted against all of it (see fitDistance).
 */
const POLAR_MIN = MathUtils.degToRad(52);
const POLAR_MAX = MathUtils.degToRad(86);
const POLAR_DEFAULT = MathUtils.degToRad(72);
const AZIMUTH_RANGE = MathUtils.degToRad(38);

/** Ink for working rods, vermilion for where the answer is read. */
const REGION_COLORS: Record<Region['tone'], string> = {
	operand: '#3a3632',
	result: '#b7472a',
	work: '#9a9388'
};

/*
 * Bead motion, modelled on a finger flick rather than a smooth ease: the bead
 * gets up to speed quickly, travels, and stops hard against the beam or rail,
 * rebounding very slightly. Times are in milliseconds at playback speed 1.
 */
const RAMP = 0.3;
const ROD_STAGGER = 55;
const DECK_STAGGER = 80;
const REBOUND = 50;

/** Time to travel `distance`, longer moves taking proportionally a little longer. */
function travelTime(distance: number): number {
	return 60 + 110 * Math.sqrt(distance / BEAD_H);
}

/** Accelerate over the first part of the move, then carry on at full speed into the stop. */
function flick(t: number): number {
	return t < RAMP ? (t * t) / (2 * RAMP * (1 - RAMP / 2)) : (t - RAMP / 2) / (1 - RAMP / 2);
}

interface Motion {
	from: number;
	to: number;
	start: number;
	duration: number;
}

/** A group of beads arriving together — one finger's worth of movement. */
export interface BeadImpact {
	rod: number;
	deck: 'heaven' | 'earth';
	beads: number;
}

/**
 * The room the board's soft light comes from, used only to light it (never
 * drawn): warm plaster walls, a darker tatami floor, a wooden ceiling, and one
 * large shoji window on the left glowing with diffused daylight. Rough wood
 * picks up a room like this as gentle, directional falloff rather than the
 * flat even light of a studio.
 */
function zenRoom(): Scene {
	const room = new Scene();
	const surface = (color: string, w: number, h: number) =>
		new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color, side: BackSide }));

	const walls = new Mesh(
		new BoxGeometry(32, 18, 32),
		new MeshBasicMaterial({ color: '#b9ad99', side: BackSide })
	);
	room.add(walls);

	const floor = surface('#6f6448', 32, 32);
	floor.rotation.x = Math.PI / 2;
	floor.position.y = -8.9;
	room.add(floor);

	const ceiling = surface('#4e3a28', 32, 32);
	ceiling.rotation.x = -Math.PI / 2;
	ceiling.position.y = 8.9;
	room.add(ceiling);

	// The shoji: brighter than anything else in the room, so it reads as light.
	const shoji = new Mesh(
		new PlaneGeometry(13, 9),
		new MeshBasicMaterial({ color: new Color('#fff4e2').multiplyScalar(5) })
	);
	shoji.position.set(-15.8, 1.5, 4);
	shoji.rotation.y = Math.PI / 2;
	room.add(shoji);

	return room;
}

/**
 * A photographed room to light the board with: "Lebombo" by Greg Zaal, from
 * Poly Haven (CC0) — an empty interior lit softly through a window, warm at
 * 4200 K. Used only for lighting; it is never drawn.
 */
const ENVIRONMENT_URL = asset('env/lebombo_1k.hdr');
const ENVIRONMENT_INTENSITY = 0.55;
/** Longest the board waits for the photographed lighting before showing anyway. */
const ENVIRONMENT_TIMEOUT = 8000;

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextFrames(count: number): Promise<void> {
	return new Promise((resolve) => {
		const step = (left: number) =>
			left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
		step(count);
	});
}

/**
 * Where the sun comes from: high on the left, in front of the board, falling
 * on it directly. The photographed room is turned so its window agrees.
 */
const SUN_FROM = new Vector3(-8, 9, 8);

/**
 * The horizontal angle, as atan2(z, x), of the brightest part of an
 * equirectangular image — in a room photographed indoors, its window.
 * Only the upper part of the image is measured, so a sunlit floor does not win.
 */
function brightestAzimuth(texture: DataTexture): number {
	const { data, width, height } = texture.image as {
		data: Uint16Array | Float32Array;
		width: number;
		height: number;
	};
	const value = (i: number) => (data instanceof Uint16Array ? DataUtils.fromHalfFloat(data[i]) : data[i]);
	const channels = data.length / (width * height);
	let best = 0;
	let bestColumn = 0;
	for (let x = 0; x < width; x++) {
		let sum = 0;
		for (let y = Math.floor(height * 0.15); y < Math.floor(height * 0.55); y++) {
			const i = (y * width + x) * channels;
			sum += 0.2126 * value(i) + 0.7152 * value(i + 1) + 0.0722 * value(i + 2);
		}
		if (sum > best) {
			best = sum;
			bestColumn = x;
		}
	}
	return ((bestColumn + 0.5) / width - 0.5) * Math.PI * 2;
}

/** A fixed pseudo-random value in [0, 1) for bead `i`, so each bead keeps its own look. */
function beadNoise(i: number, salt: number): number {
	const n = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
	return n - Math.floor(n);
}

/** Where a bead sits, given its slot on the rod and that rod's state. */
function beadY(slot: number, heaven: boolean, earth: number): number {
	if (slot === 0) {
		// Heaven bead: it counts when pushed *down* onto the beam.
		return heaven ? BEAM_TOP + BEAD_H / 2 : DECK_CEIL - BEAD_H / 2;
	}
	const i = slot - 1; // 0..3, counted from the top of the stack
	if (i < earth) {
		// Counted: pressed up against the underside of the beam.
		return BEAM_BOTTOM - BEAD_H * (i + 0.5);
	}
	// Not counted: resting on the bottom rail, keeping its stacking order.
	return DECK_FLOOR + BEAD_H * (3 - i + 0.5);
}

interface SharedMaterials {
	topRail: Material;
	bottomRail: Material;
	leftPost: Material;
	rightPost: Material;
	beam: Material;
	bead: Material;
	rod: Material;
	dot: Material;
	markers: Record<Region['tone'], Material>;
}

function markerMaterial(color: string): MeshStandardMaterial {
	return new MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 });
}

export interface SorobanSceneOptions {
	onReady?: () => void;
	/** Beads have just landed against the beam or rail. */
	onImpact?: (impact: BeadImpact) => void;
	/** The renderer could not start (no WebGPU and no WebGL2). */
	onError?: (message: string) => void;
}

export class SorobanScene {
	private renderer: WebGPURenderer;
	private pipeline?: RenderPipeline;
	private sun!: DirectionalLight;
	private shadowCatcher?: Mesh;
	/** The patch of paper the shadows fade out across: centre and half-size. */
	private shadowCentre = uniform(new Vector3());
	private shadowReach = uniform(new Vector3(1, 1, 1));
	private scene = new Scene();
	private camera: PerspectiveCamera;
	private controls: OrbitControls;
	private boardGroup = new Group();
	private labelLayer: HTMLDivElement;
	private digitLabels: HTMLDivElement[] = [];
	private regionLabels: HTMLDivElement[] = [];

	private beads?: InstancedMesh;
	private beadGeometry: BufferGeometry;
	/**
	 * Materials live for the whole scene, not per board: rebuilding them on
	 * every new problem would recompile the wood shader, which is expensive.
	 */
	private shared: SharedMaterials;
	/** Geometry belonging to the current board, freed when it is rebuilt. */
	private buildGeometries: BufferGeometry[] = [];
	private markerGeometries: BufferGeometry[] = [];
	private envTexture?: Texture;

	private rodCount = 0;
	private currentY = new Float32Array(0);
	private targetY = new Float32Array(0);
	private motions: (Motion | null)[] = [];
	private impacts: (BeadImpact & { at: number })[] = [];
	private speed = 1;
	private reducedMotion = false;
	private onImpact?: (impact: BeadImpact) => void;
	private currentTint = new Float32Array(0);
	private targetTint = new Float32Array(0);
	/** Small fixed per-bead shade, so a rod of beads is not perfectly uniform. */
	private grainTint = new Float32Array(0);
	private rodDigits: number[] = [];
	private activeRods = new Set<number>();
	private unitRod = -1;
	private regions: Region[] = [];

	private lastFrame = 0;
	private resizeObserver: ResizeObserver;
	private disposed = false;
	private dummy = new Object3D();
	private tintColor = new Color();

	constructor(
		private host: HTMLElement,
		options: SorobanSceneOptions = {}
	) {
		// WebGPURenderer is required by the node-based wood material. It falls back
		// to a WebGL2 backend wherever WebGPU is unavailable.
		this.renderer = new WebGPURenderer({ antialias: true, alpha: true });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.outputColorSpace = SRGBColorSpace;
		// A neutral curve rolls the sunlit highlights off gently without the
		// heavy contrast of a filmic one.
		this.renderer.toneMapping = NeutralToneMapping;
		this.renderer.toneMappingExposure = 1.12;
		this.renderer.setClearAlpha(0);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = PCFShadowMap;
		this.renderer.domElement.style.display = 'block';
		this.renderer.domElement.style.width = '100%';
		this.renderer.domElement.style.height = '100%';
		host.appendChild(this.renderer.domElement);

		this.labelLayer = document.createElement('div');
		this.labelLayer.className = 'soroban-labels';
		host.appendChild(this.labelLayer);

		this.camera = new PerspectiveCamera(32, 1, 0.1, 400);
		this.camera.position.set(0, 4, 18);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.08;
		this.controls.minPolarAngle = POLAR_MIN;
		this.controls.maxPolarAngle = POLAR_MAX;
		this.controls.minAzimuthAngle = -AZIMUTH_RANGE;
		this.controls.maxAzimuthAngle = AZIMUTH_RANGE;
		this.controls.enablePan = false;
		// The board sits full-bleed in a page that scrolls, so the wheel has to
		// belong to the page. Dragging still orbits.
		this.controls.enableZoom = false;

		this.beadGeometry = makeBeadGeometry({
			radius: BEAD_R,
			height: BEAD_H,
			bore: BEAD_BORE,
			rim: BEAD_RIM
		});
		// Each frame piece gets its own phase, as if cut from a different plank.
		this.shared = {
			topRail: woods.frameRail(0),
			bottomRail: woods.frameRail(0.37),
			leftPost: woods.framePost(0.11),
			rightPost: woods.framePost(0.53),
			beam: woods.beam(),
			bead: woods.bead(),
			rod: new MeshStandardMaterial({ color: '#5c4a2f', roughness: 0.92, metalness: 0 }),
			dot: new MeshStandardMaterial({ color: '#d8ccb0', roughness: 0.9, metalness: 0 }),
			markers: {
				operand: markerMaterial(REGION_COLORS.operand),
				result: markerMaterial(REGION_COLORS.result),
				work: markerMaterial(REGION_COLORS.work)
			}
		};

		this.setupLights();
		this.scene.add(this.boardGroup);

		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(host);
		this.resize();

		if (import.meta.env.DEV) {
			(window as unknown as Record<string, unknown>).__soroban = this;
		}
		this.onImpact = options.onImpact;
		this.reducedMotion =
			typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
		void this.start(options);
	}

	/** Playback speed; bead moves scale with it so fast playback stays legible. */
	setSpeed(speed: number) {
		this.speed = Math.max(0.1, speed);
	}

	/**
	 * WebGPURenderer initialises asynchronously. The board can be built before
	 * then; only the environment map and the render loop have to wait.
	 */
	private async start(options: SorobanSceneOptions) {
		const t0 = performance.now();
		const mark = (phase: string) => {
			if (import.meta.env.DEV) {
				const w = window as unknown as { __sorobanTimings?: Record<string, number> };
				(w.__sorobanTimings ??= {})[phase] = Math.round(performance.now() - t0);
			}
		};
		try {
			await this.renderer.init();
			mark('init');
		} catch (error) {
			options.onError?.(error instanceof Error ? error.message : String(error));
			return;
		}
		if (this.disposed) return;

		// Ready means the board as it will actually look: the photographed
		// lighting in place, every shader compiled, and real frames drawn.
		// Revealing earlier shows the lighting change and the first-use stutter.
		const environment = this.setupEnvironment();
		this.setupPipeline();
		await Promise.race([environment, wait(ENVIRONMENT_TIMEOUT)]);
		mark('environment');
		if (this.disposed) return;
		try {
			await this.renderer.compileAsync(this.scene, this.camera);
		} catch {
			// Compiling ahead is only an optimisation; the first frames will do it.
		}
		mark('compile');
		if (this.disposed) return;
		this.lastFrame = performance.now();
		await this.renderer.setAnimationLoop(this.loop);
		await nextFrames(3);
		mark('frames');
		if (this.disposed) return;
		options.onReady?.();
	}

	private setupEnvironment(): Promise<void> {
		// The drawn zen room lights the board straight away, and stays as the
		// fallback if the photographed room cannot be loaded.
		const pmrem = new PMREMGenerator(this.renderer);
		const room = zenRoom();
		this.envTexture = pmrem.fromScene(room, 0.02).texture;
		this.scene.environment = this.envTexture;
		this.scene.environmentIntensity = 0.75;
		room.traverse((object) => {
			if (object instanceof Mesh) {
				object.geometry.dispose();
				(object.material as Material).dispose();
			}
		});

		return new HDRLoader()
			.loadAsync(ENVIRONMENT_URL)
			.then((hdr) => {
				if (this.disposed) {
					hdr.dispose();
					return;
				}
				hdr.mapping = EquirectangularReflectionMapping;
				// Turn the photographed window round to the key light's side, so
				// the two sources of light agree.
				const window = brightestAzimuth(hdr);
				const key = Math.atan2(SUN_FROM.z, SUN_FROM.x);
				this.scene.environmentRotation.set(0, key - window, 0);

				const env = pmrem.fromEquirectangular(hdr).texture;
				hdr.dispose();
				this.envTexture?.dispose();
				this.envTexture = env;
				this.scene.environment = env;
				this.scene.environmentIntensity = ENVIRONMENT_INTENSITY;
			})
			.catch(() => {
				// Offline or missing: the drawn room carries on lighting the board.
			})
			.finally(() => pmrem.dispose());
	}

	/**
	 * Ground-truth ambient occlusion: wherever surfaces meet — bead against
	 * bead, rod into frame, under the beam — less ambient light gets in. Its
	 * absence is the strongest sign that a scene is computer-generated. A first
	 * pass captures normals and depth; the occlusion is then fed into the
	 * lighting itself, so it darkens only indirect light, as real occlusion does.
	 */
	private setupPipeline() {
		// Single-sampled: the AO shader gathers from the depth texture, which a
		// multisampled depth target cannot provide. The scene pass below keeps
		// multisampling for antialiasing.
		const prePass = pass(this.scene, this.camera, { samples: 0 });
		prePass.setMRT(mrt({ output: normalView }));
		const aoPass = ao(prePass.getTextureNode('depth'), prePass.getTextureNode(), this.camera);
		aoPass.radius.value = 0.4;
		aoPass.resolutionScale = 0.75;

		const scenePass = pass(this.scene, this.camera, { samples: 4 });
		scenePass.contextNode = builtinAOContext(aoPass.getTextureNode().sample(screenUV).r);

		this.pipeline = new RenderPipeline(this.renderer);
		this.pipeline.outputNode = scenePass;
	}

	/**
	 * Late-morning sun falling straight on the board: one warm, bright light
	 * from high on the left, whose shadows are crisp enough to show each bead;
	 * and the cooler light of the sky filling the shade, so the shadows are
	 * blue-grey rather than black — the contrast of real daylight.
	 */
	private setupLights() {
		this.scene.add(new HemisphereLight('#dfe7ee', '#6b5848', 0.5));

		const sun = new DirectionalLight('#fff0da', 3.1);
		sun.castShadow = true;
		sun.shadow.mapSize.set(4096, 4096);
		sun.shadow.bias = -0.0005;
		sun.shadow.normalBias = 0.012;
		// The sun is small: soft-edged, not blurred.
		sun.shadow.radius = 4;
		sun.shadow.intensity = 0.82;
		this.scene.add(sun);
		this.scene.add(sun.target);
		this.sun = sun;

		// The board's shadow on the page, as if it hovers just above it. Only
		// the shadow is drawn, and it fades out well inside the canvas, so it
		// is never cut off at the canvas's edge.
		const catcher = new ShadowNodeMaterial({ color: '#2a2420' });
		const offset = positionWorld.sub(this.shadowCentre).div(this.shadowReach);
		catcher.opacityNode = smoothstep(1, 0.55, offset.xy.length()).mul(0.19);
		const plane = new Mesh(new PlaneGeometry(120, 80), catcher);
		plane.position.z = -FRAME_D / 2 - 1.1;
		plane.receiveShadow = true;
		this.scene.add(plane);
		this.shadowCatcher = plane;
	}

	/**
	 * Fit the shadow camera tightly round the board and the patch of paper its
	 * shadow falls on. A loose fit spreads the shadow map so thin that beads
	 * cast only vague smudges on each other.
	 */
	private fitShadow() {
		const outer = this.innerHalfWidth + POST_W;
		const box = new Box3(
			new Vector3(-outer - 1, BOTTOM_RAIL_Y - RAIL_T - 2, -FRAME_D / 2 - 1.2),
			new Vector3(outer + 1, TOP_RAIL_Y + RAIL_T, FRAME_D / 2 + 0.2)
		);
		const center = box.getCenter(new Vector3());

		// Shadows on the page fade out a little beyond the board.
		const size = box.getSize(new Vector3());
		this.shadowCentre.value.set(center.x, center.y - 0.6, 0);
		this.shadowReach.value.set(size.x / 2 + 2.2, size.y / 2 + 1.8, 1);


		const light = this.sun;
		light.target.position.copy(center);
		light.position.copy(center).add(SUN_FROM);
		light.updateMatrixWorld();
		light.target.updateMatrixWorld();

		const cam = light.shadow.camera;
		cam.position.copy(light.position);
		cam.lookAt(center);
		cam.updateMatrixWorld();
		const inverse = cam.matrixWorldInverse;
		const bounds = new Box3();
		for (const x of [box.min.x, box.max.x]) {
			for (const y of [box.min.y, box.max.y]) {
				for (const z of [box.min.z, box.max.z]) {
					bounds.expandByPoint(new Vector3(x, y, z).applyMatrix4(inverse));
				}
			}
		}
		cam.left = bounds.min.x;
		cam.right = bounds.max.x;
		cam.bottom = bounds.min.y;
		cam.top = bounds.max.y;
		cam.near = Math.max(0.1, -bounds.max.z);
		cam.far = -bounds.min.z;
		cam.updateProjectionMatrix();
	}

	/** Rebuild the frame, rods and beads for a board of `rodCount` rods. */
	setRodCount(rodCount: number) {
		if (rodCount === this.rodCount) return;
		this.rodCount = rodCount;
		this.clearGroup();
		this.buildBoard();
		this.buildLabels();
		this.fitShadow();
		this.frameBoard();
	}

	private clearGroup() {
		this.boardGroup.clear();
		for (const geometry of this.buildGeometries) geometry.dispose();
		for (const geometry of this.markerGeometries) geometry.dispose();
		this.buildGeometries = [];
		this.markerGeometries = [];
		this.beads = undefined;
	}

	private get innerHalfWidth(): number {
		return ((this.rodCount - 1) * PITCH) / 2 + EDGE;
	}

	private rodX(rod: number): number {
		return (rod - (this.rodCount - 1) / 2) * PITCH;
	}

	private buildBoard() {
		const inner = this.innerHalfWidth;
		const outer = inner + POST_W;
		const m = this.shared;

		const addBox = (
			w: number,
			h: number,
			d: number,
			x: number,
			y: number,
			material: Material
		) => {
			// Softened edges: a real frame's edges are eased, and catch a thin line
			// of light that a knife-edged box never does.
			const radius = Math.min(0.07, Math.min(w, h, d) * 0.22);
			const geometry = new RoundedBoxGeometry(w, h, d, 4, radius);
			// A one-instance instanced mesh with a white tint, so the frame uses
			// exactly the beads' shader: the wood then compiles once, not twice.
			const mesh = new InstancedMesh(geometry, material, 1);
			this.dummy.position.set(x, y, 0);
			this.dummy.rotation.set(0, 0, 0);
			this.dummy.updateMatrix();
			mesh.setMatrixAt(0, this.dummy.matrix);
			mesh.setColorAt(0, WHITE);
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			this.boardGroup.add(mesh);
			this.buildGeometries.push(geometry);
		};

		// Frame: two rails and two posts.
		addBox(outer * 2, RAIL_T, FRAME_D, 0, TOP_RAIL_Y, m.topRail);
		addBox(outer * 2, RAIL_T, FRAME_D, 0, BOTTOM_RAIL_Y, m.bottomRail);
		const postH = DECK_CEIL - DECK_FLOOR;
		const postY = (DECK_CEIL + DECK_FLOOR) / 2;
		addBox(POST_W, postH, FRAME_D, -(inner + POST_W / 2), postY, m.leftPost);
		addBox(POST_W, postH, FRAME_D, inner + POST_W / 2, postY, m.rightPost);

		// The beam spans the inside of the frame.
		addBox(inner * 2, BEAM_T, BEAM_D, 0, 0, m.beam);

		// Unit points: inlaid dots on the face of the beam.
		const dotGeometry = new CylinderGeometry(0.055, 0.055, 0.03, 20);
		dotGeometry.rotateX(Math.PI / 2);
		this.buildGeometries.push(dotGeometry);
		for (let rod = 0; rod < this.rodCount; rod++) {
			if (!isUnitPoint(rod, this.rodCount)) continue;
			const dot = new Mesh(dotGeometry, m.dot);
			dot.position.set(this.rodX(rod), 0, BEAM_D / 2 + 0.008);
			this.boardGroup.add(dot);
		}

		// Rods, running the full inside height.
		const rodGeometry = new CylinderGeometry(ROD_R, ROD_R, postH, 12);
		this.buildGeometries.push(rodGeometry);
		for (let rod = 0; rod < this.rodCount; rod++) {
			const mesh = new Mesh(rodGeometry, m.rod);
			mesh.position.set(this.rodX(rod), postY, 0);
			mesh.receiveShadow = true;
			this.boardGroup.add(mesh);
		}

		// Region markers on the front face of the bottom rail.
		this.buildRegionMarkers();

		// Beads, as one instanced mesh.
		const count = this.rodCount * BEADS_PER_ROD;
		const beads = new InstancedMesh(this.beadGeometry, m.bead, count);
		beads.castShadow = true;
		beads.receiveShadow = true;
		this.boardGroup.add(beads);
		this.beads = beads;

		this.currentY = new Float32Array(count);
		this.targetY = new Float32Array(count);
		this.motions = new Array(count).fill(null);
		this.impacts = [];
		this.grainTint = new Float32Array(count);
		for (let i = 0; i < count; i++) {
			const n = Math.sin(i * 12.9898) * 43758.5453;
			this.grainTint[i] = 0.93 + (n - Math.floor(n)) * 0.14;
		}
		this.currentTint = Float32Array.from(this.grainTint);
		this.targetTint = Float32Array.from(this.grainTint);
		for (let rod = 0; rod < this.rodCount; rod++) {
			for (let slot = 0; slot < BEADS_PER_ROD; slot++) {
				const i = rod * BEADS_PER_ROD + slot;
				this.currentY[i] = this.targetY[i] = beadY(slot, false, 0);
			}
		}
		this.writeInstances();
	}

	private buildRegionMarkers() {
		const z = FRAME_D / 2 + 0.012;
		for (const region of this.regions) {
			const from = Math.max(0, region.from);
			const to = Math.min(this.rodCount - 1, region.to);
			if (to < from) continue;
			const width = (to - from) * PITCH + PITCH * 0.72;
			const geometry = new BoxGeometry(width, 0.11, 0.025);
			const mesh = new Mesh(geometry, this.shared.markers[region.tone]);
			mesh.position.set((this.rodX(from) + this.rodX(to)) / 2, BOTTOM_RAIL_Y, z);
			mesh.name = 'region-marker';
			this.boardGroup.add(mesh);
			this.markerGeometries.push(geometry);
		}
	}

	private buildLabels() {
		this.labelLayer.replaceChildren();
		this.digitLabels = [];
		for (let rod = 0; rod < this.rodCount; rod++) {
			const label = document.createElement('div');
			label.className = 'soroban-digit';
			label.textContent = '0';
			this.labelLayer.appendChild(label);
			this.digitLabels.push(label);
		}
		this.buildRegionLabels();
	}

	private buildRegionLabels() {
		for (const label of this.regionLabels) label.remove();
		this.regionLabels = this.regions.map((region) => {
			const label = document.createElement('div');
			label.className = 'soroban-region';
			label.dataset.tone = region.tone;
			label.textContent = region.label;
			if (region.labelJa !== region.label) label.title = region.labelJa;
			this.labelLayer.appendChild(label);
			return label;
		});
	}

	/** Set the labelled spans drawn under the board. */
	setRegions(regions: Region[], unitRod: number) {
		// Compared by content: a division hands over fresh labels every step,
		// and most of them are the same as the last.
		if (unitRod === this.unitRod && JSON.stringify(regions) === JSON.stringify(this.regions)) return;
		this.regions = regions;
		this.unitRod = unitRod;
		for (const child of [...this.boardGroup.children]) {
			if (child.name === 'region-marker') this.boardGroup.remove(child);
		}
		for (const geometry of this.markerGeometries) geometry.dispose();
		this.markerGeometries = [];
		if (this.rodCount > 0) {
			this.buildRegionMarkers();
			this.buildRegionLabels();
		}
	}

	/** Move the beads to match `board`, highlighting `activeRods`. */
	setBoard(board: Board, activeRods: number[] = []) {
		if (!this.beads || board.length !== this.rodCount) return;
		this.activeRods = new Set(activeRods);
		this.rodDigits = board.map(rodValue);
		const now = performance.now();
		const pace = this.reducedMotion ? 0.5 : 1 / this.speed;
		let movingRods = 0;

		for (let rod = 0; rod < this.rodCount; rod++) {
			const { heaven, earth } = board[rod];
			const hot = this.activeRods.has(rod);
			const moved: number[] = [];
			for (let slot = 0; slot < BEADS_PER_ROD; slot++) {
				const i = rod * BEADS_PER_ROD + slot;
				this.targetTint[i] = this.grainTint[i] * (hot ? 1.8 : 1);
				const to = beadY(slot, heaven, earth);
				if (Math.abs(to - this.targetY[i]) < 1e-6) continue;
				this.targetY[i] = to;
				moved.push(slot);
			}
			if (moved.length === 0) continue;

			// Rods that change together (setting a whole number) go left to right,
			// the order the digits are placed in.
			let start = now + movingRods * ROD_STAGGER * pace;
			movingRods++;

			// The heaven bead first; if the earth beads move too, the second
			// finger follows a beat later.
			const decks: [BeadImpact['deck'], number[]][] = [
				['heaven', moved.filter((slot) => slot === 0)],
				['earth', moved.filter((slot) => slot > 0)]
			];
			for (const [deck, slots] of decks) {
				if (slots.length === 0) continue;
				let distance = 0;
				for (const slot of slots) {
					const i = rod * BEADS_PER_ROD + slot;
					distance = Math.max(distance, Math.abs(this.targetY[i] - this.currentY[i]));
				}
				const duration = travelTime(distance) * pace;
				for (const slot of slots) {
					const i = rod * BEADS_PER_ROD + slot;
					this.motions[i] = { from: this.currentY[i], to: this.targetY[i], start, duration };
				}
				this.impacts.push({ at: start + duration, rod, deck, beads: slots.length });
				start += DECK_STAGGER * pace;
			}
		}
		this.updateDigitLabels();
	}

	/** Jump the beads straight to their targets, with no animation. */
	snap() {
		this.motions.fill(null);
		this.impacts = [];
		this.currentY.set(this.targetY);
		this.currentTint.set(this.targetTint);
		this.writeInstances();
	}

	private updateDigitLabels() {
		for (let rod = 0; rod < this.digitLabels.length; rod++) {
			const label = this.digitLabels[rod];
			const digit = this.rodDigits[rod] ?? 0;
			label.textContent = String(digit);
			label.classList.toggle('is-zero', digit === 0);
			label.classList.toggle('is-active', this.activeRods.has(rod));
			label.classList.toggle('is-unit', rod === this.unitRod);
		}
	}

	private writeInstances() {
		const beads = this.beads;
		if (!beads) return;
		for (let rod = 0; rod < this.rodCount; rod++) {
			const x = this.rodX(rod);
			for (let slot = 0; slot < BEADS_PER_ROD; slot++) {
				const i = rod * BEADS_PER_ROD + slot;
				this.dummy.position.set(x, this.currentY[i], 0);
				// Each bead turned its own way round the rod, so each shows a
				// different face of its grain.
				this.dummy.rotation.y = beadNoise(i, 1) * Math.PI * 2;
				this.dummy.updateMatrix();
				beads.setMatrixAt(i, this.dummy.matrix);
				const t = this.currentTint[i];
				this.tintColor.setRGB(t, t * 0.97, t * 0.94);
				beads.setColorAt(i, this.tintColor);
			}
		}
		beads.instanceMatrix.needsUpdate = true;
		if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
	}

	/** Everything that has to stay on screen: the frame and the labels beneath it. */
	private viewBox(): Box3 {
		const outer = this.innerHalfWidth + POST_W;
		return new Box3(
			new Vector3(-outer, BOTTOM_RAIL_Y - RAIL_T / 2 - LABEL_DEPTH, -FRAME_D / 2),
			new Vector3(outer, TOP_RAIL_Y + RAIL_T / 2, FRAME_D / 2)
		);
	}

	/**
	 * The camera distance at which the whole view box stays on screen from
	 * every angle the orbit controls allow, at the canvas's actual shape — so
	 * neither a wide screen nor dragging the board about can push the labels
	 * out of frame. The extremes and midpoints of the allowed range are
	 * checked; the box's extent changes smoothly between them.
	 */
	private fitDistance(box: Box3, center: Vector3): number {
		const tanY = Math.tan(MathUtils.degToRad(this.camera.fov) / 2);
		const tanX = tanY * this.camera.aspect;
		const corners: Vector3[] = [];
		for (const x of [box.min.x, box.max.x]) {
			for (const y of [box.min.y, box.max.y]) {
				for (const z of [box.min.z, box.max.z]) corners.push(new Vector3(x, y, z).sub(center));
			}
		}

		const up = new Vector3(0, 1, 0);
		const toCamera = new Vector3();
		const right = new Vector3();
		const cameraUp = new Vector3();
		let need = 0;
		for (const polar of [POLAR_MIN, (POLAR_MIN + POLAR_MAX) / 2, POLAR_MAX]) {
			for (const azimuth of [-AZIMUTH_RANGE, 0, AZIMUTH_RANGE]) {
				toCamera.setFromSphericalCoords(1, polar, azimuth);
				right.crossVectors(up, toCamera).normalize();
				cameraUp.crossVectors(toCamera, right);
				for (const corner of corners) {
					// On screen while its offset across the view is within the
					// frustum's half-width at its depth.
					const depth = corner.dot(toCamera);
					need = Math.max(
						need,
						depth + Math.abs(corner.dot(right)) / tanX,
						depth + Math.abs(corner.dot(cameraUp)) / tanY
					);
				}
			}
		}
		return need * 1.06;
	}

	/** Fit the camera to the board, keeping the current viewing angle unless `reset`. */
	frameBoard(reset = true) {
		const box = this.viewBox();
		const center = box.getCenter(new Vector3());
		const distance = this.fitDistance(box, center);

		this.controls.target.copy(center);
		// Zoom is off, so the distance is simply fixed at the fitted one.
		this.controls.minDistance = distance;
		this.controls.maxDistance = distance;

		if (reset) {
			this.camera.position
				.copy(center)
				.add(new Vector3().setFromSphericalCoords(distance, POLAR_DEFAULT, 0));
		} else {
			const direction = this.camera.position.clone().sub(center);
			const current = direction.length() || 1;
			this.camera.position.copy(center).add(direction.multiplyScalar(distance / current));
		}
		this.camera.lookAt(center);
		this.controls.update();
	}

	resetView() {
		this.frameBoard(true);
	}

	private resize() {
		const width = this.host.clientWidth;
		const height = this.host.clientHeight;
		if (width === 0 || height === 0) return;
		this.renderer.setSize(width, height, false);
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		if (this.rodCount > 0) this.frameBoard(false);
	}

	private projected = new Vector3();

	private positionLabels() {
		const width = this.host.clientWidth;
		const height = this.host.clientHeight;
		if (width === 0 || height === 0) return;

		const place = (element: HTMLElement, x: number, y: number, z: number) => {
			this.projected.set(x, y, z).project(this.camera);
			const sx = (this.projected.x * 0.5 + 0.5) * width;
			const sy = (-this.projected.y * 0.5 + 0.5) * height;
			element.style.transform = `translate(-50%, -50%) translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
			element.style.opacity = this.projected.z > 1 ? '0' : '1';
		};

		const digitY = BOTTOM_RAIL_Y - RAIL_T / 2 - 0.42;
		for (let rod = 0; rod < this.digitLabels.length; rod++) {
			place(this.digitLabels[rod], this.rodX(rod), digitY, FRAME_D / 2);
		}
		const regionY = digitY - 0.62;
		this.regionLabels.forEach((label, i) => {
			const region = this.regions[i];
			const from = Math.max(0, region.from);
			const to = Math.min(this.rodCount - 1, region.to);
			place(label, (this.rodX(from) + this.rodX(to)) / 2, regionY, FRAME_D / 2);
		});
	}

	private loop = () => {
		if (this.disposed) return;
		const now = performance.now();
		const dt = Math.min((now - this.lastFrame) / 1000, 0.1);
		this.lastFrame = now;

		let moving = false;
		const pace = this.reducedMotion ? 0.5 : 1 / this.speed;
		for (let i = 0; i < this.currentY.length; i++) {
			const motion = this.motions[i];
			if (motion) {
				moving = true;
				const t = (now - motion.start) / motion.duration;
				if (t < 0) continue;
				if (t < 1) {
					this.currentY[i] = motion.from + (motion.to - motion.from) * flick(t);
					continue;
				}
				// Landed: a single small rebound off whatever it hit, then rest.
				const since = now - motion.start - motion.duration;
				const rebound = REBOUND * pace;
				if (!this.reducedMotion && since < rebound) {
					const travel = motion.to - motion.from;
					const height = Math.min(0.035, 0.06 * Math.abs(travel));
					this.currentY[i] = motion.to - Math.sign(travel) * height * Math.sin((Math.PI * since) / rebound);
				} else {
					this.currentY[i] = motion.to;
					this.motions[i] = null;
				}
			}
		}

		// The highlight still eases, which is right for light rather than wood.
		const k = 1 - Math.exp(-dt * 18);
		for (let i = 0; i < this.currentTint.length; i++) {
			const dTint = this.targetTint[i] - this.currentTint[i];
			if (Math.abs(dTint) > 1e-3) {
				this.currentTint[i] += dTint * k;
				moving = true;
			}
		}
		if (moving) this.writeInstances();

		if (this.impacts.length) {
			const due = this.impacts.filter((impact) => impact.at <= now);
			if (due.length) {
				this.impacts = this.impacts.filter((impact) => impact.at > now);
				for (const { rod, deck, beads } of due) this.onImpact?.({ rod, deck, beads });
			}
		}

		this.controls.update();
		this.positionLabels();
		if (this.pipeline) this.pipeline.render();
		else this.renderer.render(this.scene, this.camera);
	};

	dispose() {
		this.disposed = true;
		void this.renderer.setAnimationLoop(null);
		this.resizeObserver.disconnect();
		this.controls.dispose();
		this.clearGroup();
		const m = this.shared;
		for (const material of [
			m.topRail,
			m.bottomRail,
			m.leftPost,
			m.rightPost,
			m.beam,
			m.bead,
			m.rod,
			m.dot,
			...Object.values(m.markers)
		]) {
			material.dispose();
		}
		this.beadGeometry.dispose();
		this.envTexture?.dispose();
		this.pipeline?.dispose();
		if (this.shadowCatcher) {
			this.shadowCatcher.geometry.dispose();
			(this.shadowCatcher.material as Material).dispose();
		}
		this.renderer.dispose();
		this.renderer.domElement.remove();
		this.labelLayer.remove();
	}
}
