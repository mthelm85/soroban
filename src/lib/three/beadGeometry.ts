import { LatheGeometry, Vector2 } from 'three';

export interface BeadShape {
	radius: number;
	height: number;
	/** Radius of the bore the rod passes through. */
	bore: number;
	/** Radius of the small flat around the bore, top and bottom. */
	rim: number;
	/** Convexity of the flank: 1 is a straight cone, below 1 bulges outward. */
	flank?: number;
	radialSegments?: number;
	flankSegments?: number;
}

/**
 * A soroban bead (珠) is a sharp-edged bicone — two shallow cones meeting at a
 * crisp equator, with a small flat around the bore where it meets the rod.
 *
 * The profile is a **closed** loop: out across the top flat, down the flank to
 * the equator, down to the bottom flat, in to the bore, then back up the inside
 * of the bore to the start. Leaving it open lathes a bead with no inner wall
 * and no caps, and you can then see straight through the bore to whatever is
 * behind it.
 */
export function makeBeadGeometry(shape: BeadShape): LatheGeometry {
	const {
		radius,
		height,
		bore,
		rim,
		flank = 0.78,
		radialSegments = 48,
		flankSegments = 12
	} = shape;

	const half = height / 2;
	const points: Vector2[] = [];

	// Top: from the bore outwards across the flat, then down the flank.
	points.push(new Vector2(bore, half));
	points.push(new Vector2(rim, half));
	for (let i = 1; i <= flankSegments; i++) {
		const t = i / flankSegments;
		points.push(new Vector2(rim + (radius - rim) * Math.pow(t, flank), half * (1 - t)));
	}
	// Bottom: mirror of the flank, excluding the equator point just added.
	for (let i = flankSegments - 1; i >= 1; i--) {
		const t = i / flankSegments;
		points.push(new Vector2(rim + (radius - rim) * Math.pow(t, flank), -half * (1 - t)));
	}
	points.push(new Vector2(rim, -half));
	points.push(new Vector2(bore, -half));
	// The inner wall of the bore, closing the shell.
	points.push(new Vector2(bore, half));

	// LatheGeometry winds its faces assuming the profile runs bottom to top.
	// Built top to bottom as above, every face points inward: the near half of
	// the bead is culled and you see the inside of the far half, with the rod
	// in front of it. Reversing the loop turns the faces outward.
	points.reverse();

	const geometry = new LatheGeometry(points, radialSegments);
	geometry.computeVertexNormals();
	return geometry;
}
