"""
Generate static/enso.svg, the brushed circle (円相, ensō) shown while the board
is prepared.

An ensō is one unbroken stroke, made in a single breath. Like the dry-brush
lines (see ink-strokes.py) it is built from individual bristle marks: the
brush is pressed down hard at the start, carried round in a slightly uneven
circle, and lifted before it closes, the ink running out on the way so the
last stretch breaks into separate streaks (かすれ, kasure).

The stroke starts at the lower left and runs clockwise. The page reveals it
with a mask that sweeps round from the same point (START_CSS below), so it
appears to be painted.

Run from the project root:  python scripts/enso.py
"""
import math
import random

INK = '#141210'
SIZE = 200
RADIUS = 72
WIDTH = 21
BRISTLES = 30
SWEEP = 322  # degrees; an open ensō stops short of closing
START = 128  # degrees, 0 = right, clockwise on screen
STEP_DEG = 1.6
SEED = 5

# Where the page's reveal mask starts, in CSS conic-gradient terms (0 = up).
START_CSS = START + 90


def thickness(t: float) -> float:
    """Pressed on hard, carried, then lifted off: width along the stroke."""
    if t < 0.035:
        return 0.7 + 0.5 * (t / 0.035)
    if t < 0.12:
        return 1.2 - 0.2 * (t - 0.035) / 0.085
    if t > 0.86:
        return max(0.1, 0.78 * (1 - (t - 0.86) / 0.14) + 0.1)
    return 1 - 0.22 * (t - 0.12) + 0.07 * math.sin(t * 11)


def runs(rng: random.Random) -> list[list[tuple[float, float]]]:
    wobble = rng.uniform(0, math.tau)
    drift = rng.uniform(-3, 3)
    cx, cy = SIZE / 2, SIZE / 2
    out = []
    for b in range(BRISTLES):
        u = (b + 0.5) / BRISTLES - 0.5
        edge = abs(u) * 2
        # Each bristle carries its own ink. It runs low along the stroke — the
        # outer bristles, and the outside of the curve, sooner — and wavers as
        # it does, so a bristle that runs dry leaves a long pale streak rather
        # than a dotted line.
        ink = rng.uniform(0.95, 1.25) - 0.3 * edge ** 1.5 - 0.12 * max(0.0, u) * 2
        waver = [(rng.uniform(2, 7), rng.uniform(0, math.tau), rng.uniform(0.05, 0.16)) for _ in range(3)]
        run: list[tuple[float, float]] = []
        deg = rng.uniform(0, 4) * edge  # outer bristles touch down a little late
        while deg <= SWEEP:
            t = deg / SWEEP
            a = math.radians(START + deg)
            # A hand-drawn circle: the radius breathes, and drifts as the arm moves.
            r = RADIUS * (1 + 0.025 * math.sin(t * math.tau * 1.4 + wobble)) + drift * t
            across = u * WIDTH * thickness(t)
            x = cx + (r + across) * math.cos(a)
            y = cy + (r + across) * math.sin(a)
            left = ink - 1.3 * t ** 1.5 + sum(amp * math.sin(f * t * math.tau + ph) for f, ph, amp in waver)
            if left < 0.12:
                if len(run) > 1:
                    out.append(run)
                run = []
            else:
                run.append((x, y))
            deg += STEP_DEG
        if len(run) > 1:
            out.append(run)
    return out


def main() -> None:
    rng = random.Random(SEED)
    bristle = WIDTH / BRISTLES * 1.9
    paths = []
    for run in runs(rng):
        d = f'M{run[0][0]:.1f} {run[0][1]:.1f}' + ''.join(f'L{x:.1f} {y:.1f}' for x, y in run[1:])
        paths.append(
            f'<path d="{d}" stroke-width="{bristle * rng.uniform(0.8, 1.25):.2f}" '
            f'stroke-opacity="{rng.uniform(0.72, 0.95):.2f}"/>'
        )
    text = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}" fill="none" '
        f'stroke="{INK}" stroke-linecap="round" stroke-linejoin="round">\n'
        + '\n'.join(paths)
        + '\n</svg>\n'
    )
    with open('static/enso.svg', 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'static/enso.svg: {len(paths)} bristle runs, {len(text) // 1024} KB; '
          f'reveal mask starts at {START_CSS}deg')


main()
