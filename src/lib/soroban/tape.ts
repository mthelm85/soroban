import { blankBoard, cloneBoard } from './board';
import type { Messages } from './messages';
import type { Board, Rod, Step, StepRole, TechniqueId } from './types';

/**
 * Records a solution as an ordered list of bead movements. Every step carries a
 * full snapshot of the board before and after, which is what the 3D view
 * animates between.
 */
export class Tape {
	board: Board;
	steps: Step[] = [];
	readonly initial: Board;

	private section = '';
	private group = '';
	private groupWhy = '';
	private phase = '';
	private phaseTechnique: TechniqueId | null = null;

	constructor(
		readonly rodCount: number,
		/** Rod holding the ones place, used for narration like "the tens rod". */
		public unitRod: number,
		/** The locale every step is narrated in. */
		readonly m: Messages
	) {
		this.board = blankBoard(rodCount);
		this.initial = cloneBoard(this.board);
	}

	setSection(section: string): void {
		this.section = section;
	}

	setGroup(group: string, groupWhy = ''): void {
		this.group = group;
		this.groupWhy = groupWhy;
	}

	setPhase(phase: string, technique: TechniqueId | null = null): void {
		this.phase = phase;
		this.phaseTechnique = technique;
	}

	currentPhase(): [string, TechniqueId | null] {
		return [this.phase, this.phaseTechnique];
	}

	/** Snapshot the board, apply `mutate`, and record the difference as a step. */
	commit(
		opts: {
			rods: number[];
			technique: TechniqueId;
			role: StepRole;
			formula: string;
			text: string;
			why: string;
		},
		mutate: (board: Board) => void
	): void {
		const before = cloneBoard(this.board);
		mutate(this.board);
		this.steps.push({
			index: this.steps.length,
			section: this.section,
			group: this.group,
			groupWhy: this.groupWhy,
			phase: this.phase,
			phaseTechnique: this.phaseTechnique,
			technique: opts.technique,
			role: opts.role,
			formula: opts.formula,
			text: opts.text,
			why: opts.why,
			rods: opts.rods,
			before,
			after: cloneBoard(this.board)
		});
	}

	/** Name of a rod's place, relative to the unit rod. */
	place(rod: number): string {
		return this.m.place(this.unitRod - rod);
	}

	/** Replace a single rod wholesale. */
	writeRod(rod: number, next: Rod): void {
		this.board[rod] = { ...next };
	}
}
