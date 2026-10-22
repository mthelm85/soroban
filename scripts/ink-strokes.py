"""
Generate the brushwork used for the page's lines and controls, in static/ink/.

  line-divider.svg  the divider under the controls: dark ink (濃墨), dry tail
  line-wash.svg     the problem input's underline: watered ink (淡墨)
  line-tab.svg      the active tab's mark: a short stroke, tapered both ends
  line-track.svg    the sliders' track: the palest wash
  line-edge.svg     the side panel's edge: a vertical wash
  icon-*.svg        transport, close and slider-thumb marks (used as masks)

A sumi-e stroke is not a solid shape. It is many bristle marks laid side by
side, so every stroke here is built bristle by bristle. Each bristle carries
its own ink and runs low along the stroke, the outer ones sooner; a bristle that
runs dry leaves a long pale streak — the dry-brush break-up called かすれ
(kasure). Watered ink (淡墨, tanboku) is drawn differently: pale, with a soft,
ragged edge and a darker rim where the pigment gathers as the water dries.

Lines are drawn at their display height, in pixels, so their bristles keep
their weight; the page stretches them only along their length.

Run from the project root:  python scripts/ink-strokes.py
"""
import math
import os
import random

INK = '#141210'
OUT = 'static/ink'


# ── the brush ───────────────────────────────────────────────────────────────


def bristles(path, width, *, count, seed, dry=0.0, power=2.0, late=0.03, samples=320):
    """
    Bristle runs along `path`, a function t → (x, y) for t in 0…1. `width(t)`
    is the stroke's full width there. `dry` is how far the ink runs down by the
    end of the stroke; 0 keeps every bristle loaded throughout.
    Returns (points, edge) pairs; edge is 0 at the middle bristle, 1 outermost.
    """
    rng = random.Random(seed)
    out = []
    for b in range(count):
        u = (b + 0.5) / count - 0.5
        edge = abs(u) * 2
        ink = rng.uniform(0.95, 1.25) - 0.3 * edge ** 1.5
        waver = [(rng.uniform(2, 7), rng.uniform(0, math.tau), rng.uniform(0.05, 0.15)) for _ in range(3)]
        start = rng.uniform(0, late) * edge  # outer bristles touch down late
        run = []
        for i in range(samples + 1):
            t = i / samples
            if t < start:
                continue
            x, y = path(t)
            # The normal, from a small step along the path.
            x2, y2 = path(min(1, t + 1e-3))
            x1, y1 = path(max(0, t - 1e-3))
            dx, dy = x2 - x1, y2 - y1
            n = math.hypot(dx, dy) or 1
            nx, ny = -dy / n, dx / n
            w = width(t)
            px, py = x + nx * u * w, y + ny * u * w
            left = ink - dry * t ** power + sum(a * math.sin(f * t * math.tau + p) for f, p, a in waver)
            if left < 0.12:
                if len(run) > 1:
                    out.append((run, edge))
                run = []
            else:
                run.append((px, py))
        if len(run) > 1:
            out.append((run, edge))
    return out


def d(points):
    return f'M{points[0][0]:.2f} {points[0][1]:.2f}' + ''.join(
        f'L{x:.2f} {y:.2f}' for x, y in points[1:]
    )


def ink_paths(runs, bristle, seed, opacity=(0.72, 0.95)):
    """Dark ink: each bristle its own path, at its own strength."""
    rng = random.Random(seed)
    return [
        f'<path d="{d(pts)}" stroke-width="{bristle * rng.uniform(0.8, 1.25):.2f}" '
        f'stroke-opacity="{rng.uniform(*opacity):.2f}"/>'
        for pts, _ in runs
    ]


def wash_group(runs, bristle, seed, tone, rim, rough, pool="0.006 0.4"):
    """
    Watered ink: the bristles merge into one pale body (drawn opaque, then the
    whole group made translucent, so overlaps don't darken), roughened at the
    edge by a displacement filter, with the outermost bristles drawn again on
    top as the darker rim of pigment.
    """
    rng = random.Random(seed)
    body = ''.join(f'<path d="{d(pts)}" stroke-width="{bristle * 1.4:.2f}"/>' for pts, _ in runs)
    rims = ''.join(
        f'<path d="{d(pts)}" stroke-width="{bristle * 0.7:.2f}" stroke-opacity="{rng.uniform(0.5, 0.9):.2f}"/>'
        for pts, edge in runs
        if edge > 0.8
    )
    # Watered ink never lies evenly: it pools in places and thins in others.
    # A long, slow noise along the stroke modulates its strength.
    filt = (
        f'<filter id="bleed" x="-5%" y="-60%" width="110%" height="220%">'
        f'<feTurbulence type="fractalNoise" baseFrequency="0.35 0.9" numOctaves="2" seed="{seed}" result="grain"/>'
        f'<feDisplacementMap in="SourceGraphic" in2="grain" scale="{rough}" result="ragged"/>'
        f'<feTurbulence type="fractalNoise" baseFrequency="{pool}" numOctaves="3" seed="{seed + 9}"/>'
        f'<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -0.55" result="pools"/>'
        f'<feComposite in="ragged" in2="pools" operator="in"/>'
        f'<feGaussianBlur stdDeviation="0.3"/></filter>'
    )
    return (
        filt
        + f'<g filter="url(#bleed)"><g opacity="{tone}">{body}</g>'
        + f'<g opacity="{rim}">{rims}</g></g>'
    )


def write(name, w, h, inner, stretch=True):
    aspect = ' preserveAspectRatio="none"' if stretch else ''
    text = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}"{aspect} fill="none" '
        f'stroke="{INK}" stroke-linecap="round" stroke-linejoin="round">\n'
        + (inner if isinstance(inner, str) else '\n'.join(inner))
        + '\n</svg>\n'
    )
    with open(f'{OUT}/{name}.svg', 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'{OUT}/{name}.svg  {len(text) // 1024} KB')


# ── profiles: how hard the brush is pressed along a stroke ──────────────────


def pressed(peak, body_end=0.75, lift=0.14, floor=0.12, wobble=0.06, phase=0.0):
    """Pressed on firmly, eased off a little, then lifted away to a point."""

    def width(t):
        if t < 0.03:
            w = 0.6 + 0.4 * t / 0.03
        elif t > 1 - lift:
            w = body_end * max(floor, 1 - (t - (1 - lift)) / lift)
        else:
            w = 1 - (1 - body_end) * (t - 0.03) / (1 - lift - 0.03)
        return peak * w * (1 + wobble * math.sin(t * 13 + phase))

    return width


def tapered(peak):
    """Touched down to a point, swelling, lifted to a point: 起筆 to 収筆."""
    return lambda t: peak * (0.15 + 0.85 * math.sin(math.pi * min(1, t * 1.08)) ** 0.7)


def wedge(peak):
    """Pressed down hard, then dragged off while lifting: a brushed triangle."""
    return lambda t: peak * max(0.04, 1 - t) * (0.85 + 0.15 * min(1, t / 0.08))


def line(length, depth, sway=0.6, drift=0.4, seed=0):
    rng = random.Random(seed)
    phase = rng.uniform(0, math.tau)
    return lambda t: (
        4 + t * (length - 8),
        depth / 2 + sway * math.sin(t * math.pi * 1.2 + phase) + drift * (t - 0.5),
    )


def seg(x0, y0, x1, y1, bow=0.0):
    """A straight stroke, bowed slightly to one side as a hand draws it."""

    def path(t):
        x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        n = math.hypot(x1 - x0, y1 - y0) or 1
        k = bow * math.sin(math.pi * t)
        return x - (y1 - y0) / n * k, y + (x1 - x0) / n * k

    return path


# ── lines ───────────────────────────────────────────────────────────────────

L = 1200

# The divider: thin, dark, carried firmly and running dry at the end.
runs = bristles(line(L, 10, sway=0.7, seed=3), pressed(4.2, body_end=0.7, lift=0.1), count=14, seed=3, dry=1.15, power=2.4, late=0.02, samples=600)
write('line-divider', L, 10, ink_paths(runs, 4.2 / 14 * 2.0, 3))

# The input's underline: watered ink, laid on lightly and evenly.
runs = bristles(line(L, 8, sway=0.5, seed=11), pressed(2.6, body_end=0.85, lift=0.08, wobble=0.12, phase=1), count=10, seed=11, dry=0.6, power=3, samples=500)
write('line-wash', L, 8, wash_group(runs, 2.6 / 10 * 2.0, 11, tone=0.5, rim=0.3, rough=1.6))

# The active tab: a short, quick stroke.
runs = bristles(line(240, 7, sway=0.4, seed=5), tapered(3.0), count=10, seed=5, dry=0.5, power=3, samples=160)
write('line-tab', 240, 7, ink_paths(runs, 3.0 / 10 * 2.0, 5))

# The slider track: the palest wash, barely there.
runs = bristles(line(400, 6, sway=0.3, seed=17), pressed(2.0, body_end=0.9, lift=0.06, wobble=0.15), count=8, seed=17, dry=0.4, power=3, samples=260)
write('line-track', 400, 6, wash_group(runs, 2.0 / 8 * 2.0, 17, tone=0.38, rim=0.2, rough=1.2, pool="0.02 0.4"))

# The panel's edge: a vertical wash, drawn top to bottom.
edge_path = lambda t: (5 + 0.6 * math.sin(t * math.pi * 1.3 + 0.4), 6 + t * (L - 12))
runs = bristles(edge_path, pressed(3.0, body_end=0.8, lift=0.12, wobble=0.1), count=10, seed=7, dry=0.9, power=2.4, samples=600)
write('line-edge', 10, L, wash_group(runs, 3.0 / 10 * 2.0, 7, tone=0.55, rim=0.3, rough=1.6, pool="0.4 0.006"))


# ── marks: icons, drawn at 24 × 24 and used as masks ────────────────────────


def mark(name, strokes):
    paths = []
    for i, (path, width, peak, dry) in enumerate(strokes):
        runs = bristles(path, width, count=26, seed=sum(map(ord, name)) + i, dry=dry, power=1.5, late=0.08, samples=90)
        paths += ink_paths(runs, peak / 26 * 2.3, i + 1, opacity=(0.88, 1))
    write(name, 24, 24, paths, stretch=False)


# Play: the brush pressed down at the left and drawn off to a point.
mark('icon-play', [(seg(6.5, 12, 20, 12.3), wedge(14), 14, 1.25)])
mark('icon-pause', [
    (seg(8.6, 5, 8.2, 19, bow=0.3), pressed(4.0, body_end=0.8, lift=0.3), 4.0, 0.8),
    (seg(15.8, 5.2, 15.4, 19, bow=-0.3), pressed(4.0, body_end=0.8, lift=0.3), 4.0, 0.9),
])
mark('icon-next', [(seg(7, 12, 17.5, 12.2), wedge(11), 11, 1.25)])
mark('icon-back', [(seg(17, 12, 6.5, 12.2), wedge(11), 11, 1.25)])
mark('icon-end', [
    (seg(4.5, 12, 14.5, 12.2), wedge(11), 11, 1.25),
    (seg(18.2, 6, 18, 18.2, bow=0.2), pressed(3.2, body_end=0.8, lift=0.3), 3.2, 0.7),
])
mark('icon-start', [
    (seg(19.5, 12, 9.5, 12.2), wedge(11), 11, 1.25),
    (seg(5.8, 6, 6, 18.2, bow=-0.2), pressed(3.2, body_end=0.8, lift=0.3), 3.2, 0.7),
])
mark('icon-close', [
    (seg(5.5, 5.5, 18.5, 18.5, bow=0.6), tapered(3.0), 3.0, 0.6),
    (seg(18.5, 5.5, 5.5, 18.5, bow=-0.5), tapered(3.0), 3.0, 0.8),
])
# The slider's thumb: a single dab of the brush, 点 (ten).
mark('icon-dot', [(seg(8, 8.5, 16, 15.5, bow=0.8), lambda t: 9.5 * (0.55 + 0.45 * math.sin(math.pi * min(1, t * 1.15))), 9.5, 0.3)])
# The examples menu's caret: a small stroke pressed down and drawn off to a point.
mark('icon-down', [(seg(12, 6.5, 12.2, 19), wedge(12), 12, 1.2)])


# ── broad strokes, behind text ──────────────────────────────────────────────

# The menu's highlight: one broad, pale sweep of watered ink.
runs = bristles(line(400, 40, sway=1.2, seed=23), pressed(26, body_end=0.8, lift=0.2, wobble=0.08), count=22, seed=23, dry=0.7, power=2.5, late=0.04, samples=300)
write('wash-band', 400, 40, wash_group(runs, 26 / 22 * 1.8, 23, tone=0.16, rim=0.1, rough=2.2, pool="0.012 0.2"))

# The Solve button: a short, loaded stroke of dark ink for the label to sit on.
runs = bristles(line(240, 64, sway=1.5, seed=29), pressed(46, body_end=0.82, lift=0.12, wobble=0.05), count=30, seed=29, dry=0.75, power=3.2, late=0.05, samples=260)
write('button-stroke', 240, 64, ink_paths(runs, 46 / 30 * 2.0, 29, opacity=(0.85, 1)))
