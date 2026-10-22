# Methods used in this app

Soroban technique has real variation — several multiplication and division
layouts are taught, and online demonstrations disagree. This file records which
variant the app implements, why, and where it came from, so the engine can be
checked against a source rather than against memory.

**The app is aimed at building mental arithmetic (珠算式暗算), and that choice
decides nearly everything below.** Where a method had a beginner form and a form
that carries over to calculating in your head, the second one is implemented.
Section 4 sets out that reasoning.

Everything here lives in `src/lib/soroban/` and is covered by
`src/lib/soroban/soroban.test.ts`.

---

## Vocabulary

| Term | Reading | Meaning |
| --- | --- | --- |
| 算盤 / そろばん | soroban | the abacus |
| 梁 | hari | the beam dividing the two decks |
| 定位点 | teiiten | the unit-point marks on the beam, every third rod |
| 五玉 | godama | the heaven bead, worth 5 |
| 一玉 | ichidama | an earth bead, worth 1 |
| 実 | jitsu | the multiplicand / the dividend |
| 法 | hō | the multiplier / the divisor |
| 商 | shō | the quotient |
| 積 | seki | the product |
| 位取り | kuraidori | working out where the answer's ones digit lands |
| 定位法 | teiihō | the place-value rule for division |
| 払う | harau | to sweep a rod clear |
| 珠算式暗算 | shuzan-shiki anzan | mental arithmetic done by picturing the board |
| 両置き | ryōoki | both operands placed on the board |
| 片落とし | kataotoshi | one operand placed, the other held in mind |
| 両落とし | ryōotoshi | neither operand placed |
| 確商 | kakushō | settling a quotient digit mentally before placing it |
| 還元 / 戻し算 | kangen / modoshizan | placing a quotient digit, finding it too big, giving the difference back |

---

## 1. Addition and subtraction — 見取り算

Nothing about addition changes for mental work: the board already holds only a
running total, and the complements *are* the mental technique.

### Digit order

A multi-digit term is worked in **from its highest place down**, the opposite of
written arithmetic. This is the standard soroban order and the reason a soroban
can keep pace with numbers read aloud — you can start before you have heard the
end of the number.

### The four technique families

With `v` the rod's current value and `n` the digit being added or subtracted:

| Technique | When | Rule |
| --- | --- | --- |
| 直接 (direct) | enough beads are free | just move them |
| 五の合成 (go no gōsei) | adding `n ≤ 4`, too few earth beads free, five bead free | `+n ⇒ +5 −(5−n)` |
| 五の分解 (go no bunkai) | subtracting `n ≤ 4`, too few earth beads set | `−n ⇒ −5 +(5−n)` |
| 十の繰り上がり (jū no kuriagari) | `v + n ≥ 10` | `+n ⇒ +10 −(10−n)` |
| 十の繰り下がり (jū no kurisagari) | `v < n` | `−n ⇒ −10 +(10−n)` |

The ten-complement cases nest: the `−(10−n)` of a carry may itself need 五の分解,
which Japanese materials name as the combined case (十の繰り上がり＋五の分解).
A carry into a rod already showing 9 cascades, which the engine handles by
recursion (連続繰り上がり).

### Order within a carry

The ten goes onto the rod to the **left first**, then the complement comes off
the current rod — 「10をたして7をひく」. A borrow mirrors it. So 7 + 5 is:

1. `+1` on the tens rod
2. `−5` on the ones rod

**Sources:** [まなぶてらす — 足し算](https://www.manatera.com/blog/abacus-addtion-method/),
[まなぶてらす — 引き算](https://www.manatera.com/blog/abacus-subtraction-method/),
[そろばんの教え方（5の繰り上がり繰り下がり編）](https://xn--d9jvb0eza4281cp0k.jp/soroban5kuriagarikurisagari/),
[10の繰り上がり繰り下がり完全ガイド](https://xn--d9jvb0eza4281cp0k.jp/soroban10kuriagarikurisagari/),
[いしど式 — そろばんの基礎ガイド](https://online.ishido-soroban.com/column/soroban/1491/).

---

## 2. Multiplication — 両落とし (破頭頭乗法)

Japanese sources name the two choices independently: 留頭乗法 starts from the
multiplicand's last digit (実の尾桁), 破頭乗法 from its first (実の首桁); 頭乗法
starts from the multiplier's first digit (法の首位数), 尾乗法 from its last.

The app implements **破頭 + 頭**: highest digit of the multiplicand, and for each
of those, highest digit of the multiplier. Neither factor is placed on the board
(両落とし) — both are held in mind while the rods carry nothing but the product.

### Procedure

1. **定位** — fix where the answer's ones digit will sit, on a 定位点. Nothing
   else is set up, because nothing else goes on the board.
2. Take the multiplicand's **highest** digit.
3. Run across the multiplier from **its** highest digit down, adding each 九九
   product where it falls.
4. Move to the next multiplicand digit down and repeat.

There is no 先払い (clearing a multiplicand digit before using it), because the
multiplicand was never placed.

### 位取り — add the place indices

A digit in place `k` of the multiplicand times a digit in place `j` of the
multiplier gives a product whose ones digit belongs `k + j` rods left of the
answer's ones rod, counting the ones place as 0.

That single rule is the whole of place value here. It is also why the digit
order can run highest-first: with no multiplicand on the rods, nothing can be
overwritten, so there is no need to work upwards from the ones digit the way the
board-based methods must.

### Worked example — 23 × 45

| Step | Placement | Board |
| --- | --- | --- |
| 定位 | fix the ones rod | — |
| 2 × 4 = 8 | 1 + 1 = 2 rods left | 800 |
| 2 × 5 = 10 | 1 + 0 = 1 rod left | 900 |
| 3 × 4 = 12 | 0 + 1 = 1 rod left | 1020 |
| 3 × 5 = 15 | 0 + 0 = on the ones rod | 1035 |

**Sources:** [珠算 — Wikipedia](https://ja.wikipedia.org/wiki/%E7%8F%A0%E7%AE%97)
(the 留頭/破頭 and 頭/尾 definitions),
[両落としと片落としの完全解説](https://kajitsu-soroban.com/archives/4373.html),
[そろばん掛け算のやり方｜両おき・両落とし・片落とし](https://kappakanjikanthari.com/soro-kake/),
[よみかきそろばんくらぶ](https://online-yomikakisoroban.com/column/?p=498),
[pico そろばん教室 — かけ算編](https://pico-soroban.com/abacus/%E3%81%9D%E3%82%8D%E3%81%B0%E3%82%93%E3%81%AE%E4%BD%BF%E3%81%84%E6%96%B9%EF%BD%9E%E3%81%8B%E3%81%91%E7%AE%97%E7%B7%A8%EF%BD%9E/).

---

## 3. Division — 商除法, 片落とし, with 確商

Modern Japanese teaching uses 商除法, in which the quotient is built up to the
left of the dividend and each quotient digit's product is subtracted from the
dividend in place. (The older 帰除法, with its own division chant, is no longer
taught.)

The divisor is **not placed** — 片落とし, which sources describe as how division
is actually taught. Only the dividend goes on the board.

### 定位法 (place value)

> 割る数が「整数」の場合は、もともとの一の位から、割る数の桁数に１を足した位置（左へ移動）

The quotient's ones digit sits `(digits of the divisor) + 1` rods to the **left**
of the dividend's ones rod.

### Where the first quotient digit goes

- Divisor **fits** into the dividend's leading `d` digits → **two rods** left of
  the dividend's leading digit.
- Divisor **does not fit** → one more dividend digit is taken in, and the digit
  goes **one rod** left.

Both follow from the 定位法 rule, so the engine derives the position from it
rather than special-casing them.

### 確商 — settle the digit before moving a bead

For a quotient digit on rod `p`, with a `d`-digit divisor:

1. Read the `d + 1` rods to the right of `p` — the segment to divide.
2. **確商**: find the largest multiple of the divisor that still fits inside that
   segment, in your head. The app shows both sides of the check — the multiple
   that fits and the next one, which does not.
3. Place that digit on rod `p`. It is right by construction, so there is never
   anything to undo.
4. For each divisor digit, **highest first**, subtract `quotient digit × divisor
   digit` with its ones digit on rod `p + (d + 1) − j`, where `j` is the divisor
   digit's place.
5. Move one rod right and repeat, until the dividend is used up or the requested
   number of decimal places is reached.

The beginner's alternative, **還元 / 戻し算** — place a digit, try to subtract,
discover it was too big, reduce it and give the difference back — is deliberately
not implemented. See section 4.

### Worked example — 4104 ÷ 76

41 < 76, so the first quotient digit goes one rod left of the dividend's leading
digit. The divisor has 2 digits, so the quotient's ones rod is 3 rods left of the
dividend's ones rod.

| Step | Action | Dividend becomes |
| --- | --- | --- |
| 1 | 確商: 76 × 5 = 380 fits in 410, 76 × 6 = 456 does not → 商 5 | |
| 2 | 5 × 7 = 35, subtract | 4104 − 3500 = 604 |
| 3 | 5 × 6 = 30, subtract | 604 − 300 = 304 |
| 4 | 確商: 76 × 4 = 304 fits in 304, 76 × 5 = 380 does not → 商 4 | |
| 5 | 4 × 7 = 28, subtract | 304 − 280 = 24 |
| 6 | 4 × 6 = 24, subtract | 24 − 24 = 0 |

Answer 54, exactly as the source works it.

**Sources:** [そろばん割り算のやり方｜位取り・片落とし・定位法](https://kappakanjikanthari.com/soro-wari/),
[まなぶてらす — 割り算](https://www.manatera.com/blog/abacus-division-method/),
[そろばんの割り算の位取り解説](http://xn--d9jvb4cyam1by940f.com/warizan/kuraidori/),
[割り戻し（還元）のやり方](https://to-z.net/blog/4227/),
[6級割り算のコツ](https://www.scratch1414.com/abacus_6class_division/).

---

## 4. Why these variants

The app teaches the forms that transfer to 珠算式暗算 rather than the easiest
ones to learn first. Three decisions follow from that.

**両落とし for multiplication.** Sources describing the path to mental
calculation are direct about it: 最終的に暗算が出来るようになりたいのなら、最初から
両落としで覚えた方が無駄がないですよ. A board that holds only the answer is a board
you can already picture; one cluttered with operands is not. A soroban teacher
also warns that switching 片落とし → 両落とし part-way causes 混乱して計算ミスや
スピード低下, which is an argument for committing to one form rather than
offering both.

**確商 rather than 還元 for division.** 確商 needs 暗算力 up front, but
戻す作業が減るため珠の動きや間違いが少なくなる. The deeper reason is that backtracking
is a board habit: you can undo beads you can see, but undoing a digit you are
only imagining is exactly what breaks down in 暗算. 還元 is what most classes
teach first and what 確商 replaces from around 六級, when divisors reach two
digits.

**Highest digit first, everywhere.** Addition already runs highest-place-first;
with 両落とし, multiplication can too, in both factors. That matches reading
order and the order a number is spoken, which is what 読み上げ暗算 (calculating
from dictation) demands.

The staged progression these sources describe — ①そろばんの操作を体に定着させる
②弾いた直後に頭の中で再現する ③実物なしでイメージだけで計算する — is not built yet.
The app currently covers stage ①.

**Sources:** [珠算式暗算の練習方法](https://kappakanjikanthari.com/syuzansiki-anzan/),
[いしど式 — 暗算とは](https://online.ishido-soroban.com/column/soroban/1442/),
[いしど式 — 暗算のコツと毎日の練習法](https://online.ishido-soroban.com/column/soroban/1444/),
[そろばんで暗算ができるコツ](https://to-z.net/blog/6776/).

---

## 5. Other choices worth knowing about

**Decimal place value.** Rather than encode the several conflicting rules sources
give for decimal operands (they disagree most for divisors below 1), the engine
lays digit strings out by the integer rules above and derives the decimal point
exactly, from the operands' decimal counts. This produces the same rod positions
the traditional rules do, without the edge cases.

**Negative results.** A soroban shows no negative numbers. Traditional practice
handles a negative running total with complement notation (補数), an advanced
topic; the app declines the problem and says so instead of faking it.

**九九 readings.** The chant readings in `src/lib/soroban/kuku.ts` follow the
standard table, including the euphonic forms (さざんがく, さぶろく, ごっく,
はっぱ, はっく …). Minor regional variants exist.

**Variation within 両落とし.** It is less standardised than the board methods.
One practitioner writes 両落としのやり方は、私が知っている限りでは3種類あります, with the
reference-point convention differing by school and grade. The index-sum rule is
shared; where the origin sits may not be.

**A caveat on sourcing.** The 日本そろばん資料館 glossary entry for 新頭乗法 — the
standard board method, which this app no longer uses — was read through a search
index; the page itself redirects to a note.com login.
