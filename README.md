# Soroban

A 3D Japanese abacus that works a problem out bead by bead, using the methods
that build toward calculating in your head (珠算式暗算).

Type an addition, subtraction, multiplication or division problem and step
through the solution. Each step names the traditional technique it uses — 五の合成,
十の繰り上がり, 両落とし, 確商 — says which beads move, and explains **why** that
move is the one the method calls for.

## Running it

```bash
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm run test` | engine test suite |
| `npm run check` | type check |

## What it does

- **Addition and subtraction** (見取り算), chained: `123 + 456 − 78 + 9`
- **Multiplication** (両落とし): `23 × 45` — neither factor is placed on the
  board, both are held in mind, and products are positioned by adding the two
  digits' place indices
- **Division** (商除法, 片落とし): `4104 ÷ 76` — the divisor is held in mind, and
  each quotient digit is settled by 確商 before a bead moves

Decimals are accepted throughout. `*` `x` `/` `:` work as well as `×` `÷`.

Each problem can be worked three ways, switched beside the playback controls:

- **Watch** (見る): the method played out bead by bead, with the reasoning for
  every move.
- **From memory** (思い出す): stage ② of the usual path to 暗算 — having watched
  a problem, work it again with the beads hidden. Only the current section is
  named; each move is pictured, then revealed to check (the reveal plays the
  move on the board). The bead sound, the rod digits and the step list stay
  hidden too, since each would give the moves away. At the last step the
  answer is typed from memory and checked, with a count of the steps revealed.

- **Flash** (フラッシュ): stage ③, with no beads at all. A chain's numbers
  appear one at a time where the board stood, each followed by a moment of
  blank paper; subtractions show in red. A multiplication or division appears
  once, whole, and vanishes. The total is kept on the soroban in the mind and
  typed in to be checked. The speed slider sets the pace.

Type any problem into the header, or use **Practice** (練習), which deals
fresh problems at a chosen level, graded the way
soroban schools grade them: direct moves only, then five-complements, then
carries and borrows, then more digits and longer chains, then multiplication
and division. Every dealt problem is solved by the engine first and kept only
if its moves fit the level, so a "Fives" problem always needs a
five-complement and never a carry (`src/lib/soroban/practice.ts`). Answers
given from memory or by flash are recorded per level and per mode in the
browser; five in a row (from memory: each with at most one step revealed)
suggests moving up. In Flash, an addition and subtraction level
can deal chains of 3, 5, 10 or 15 numbers (口数) while keeping to its moves.

The site is in English at `/` and Japanese at `/ja`. The language link in the
header carries the current problem across.

Keyboard: `→` / `←` step, `Space` play/pause, `Home` / `End` jump. Drag to orbit
the board.

## How it is put together

```
src/lib/soroban/     the method engine — no rendering, no framework
  messages/en.ts       every English string the engine produces
  messages/ja.ts       every Japanese string — the one file to review
  arithmetic.ts        the named digit techniques (五の合成, 十の繰り上がり …)
  addsub.ts            見取り算
  multiply.ts          両落とし (破頭頭乗法)
  divide.ts            商除法 / 片落とし, with 確商
  kuku.ts              the 九九 times-table chant
  layout.ts            rod counts and 定位点 placement
src/lib/three/       the 3D board (three.js WebGPURenderer, WebGL2 fallback)
  SorobanScene.ts      frame, beam, rods, instanced beads, lighting, labels
  beadGeometry.ts      the lathed bicone bead
  woodMaterials.ts     solid procedural wood (three's WoodNodeMaterial)
src/lib/i18n/ui.ts   interface text for both languages
src/lib/components/  Svelte components; App.svelte is the page for both routes
docs/METHODS.md      which traditional variant is used, and the sources
```

The engine is a pure function from a problem string to a list of steps, each
holding a full before/after snapshot of every rod plus the reasoning behind the
move. The 3D layer only animates between snapshots, so the method and the
rendering can be reasoned about — and tested — separately.

`npm run test` checks the named techniques, the worked examples from the Japanese
sources, and about 1,100 fuzzed problems against exact arithmetic — including
that every step is a physically valid bead movement and that every step can
explain itself. It also checks that both languages move exactly the same beads,
that English prose contains no Japanese, and that the Japanese version contains
no English.

## Japanese review

The Japanese was written to match the vocabulary of Japanese soroban teaching
sites, but it has not been checked by a native speaker. Every Japanese string on
the site is in `src/lib/soroban/messages/ja.ts` and `src/lib/i18n/ui.ts`, so one
review covers all of it — ideally by someone who teaches soroban.

## Method sources

See [docs/METHODS.md](docs/METHODS.md). Soroban technique varies, and online
demonstrations disagree; that file records which variant is implemented, why, and
where it came from. The short version: where a method has a beginner form and a
form that carries over to mental arithmetic, this app implements the second.

Built with SvelteKit and three.js.
