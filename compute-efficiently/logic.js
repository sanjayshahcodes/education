/**
 * Compute Efficiently — the expression model and the efficiency judgement.
 *
 * Kept free of the DOM so it can be exercised directly against the six
 * problems from the worksheet.
 *
 * An expression is a list of items at the top level. An item is either a
 * number carrying a sign, or a parenthesised group carrying a sign and two
 * signed numbers of its own:
 *
 *     85 − (12 + 25)
 *       → [ {num, +, 85}, {group, −, [ {+,12}, {+,25} ]} ]
 */

// ── Scoring a result ───────────────────────────────
//
// How good an intermediate value is to be left holding. Round numbers are
// the prize, and a pair that nearly cancels is just as good — 51 − 16 + 17
// is really 51 + 1.
function scoreValue(v) {
    const n = Math.abs(v);
    // Landing on a round number is the trick, and a ten is as round as a
    // hundred — 54 − 44 = 10 is no worse a move than 65 + 35 = 100, and in
    // 54 + 65 + 35 − 44 they are the two halves of the same answer. Ranking
    // the hundred above the ten had the game refusing one of its own pairs.
    if (n % 10 === 0) return 100;
    // The other half of the lesson: a pair that all but cancels.
    // − 16 + 17 is really + 1.
    if (n <= 2) return 100;
    return 0;
}

// A move is allowed if it's within this of the best move available. Slack
// enough that a sensible-but-not-ideal pairing isn't rejected, tight enough
// that plain left-to-right is.
const SLACK = 15;

// ── Expression helpers ─────────────────────────────

const num = (sign, value) => ({ kind: 'num', sign, value });
const group = (sign, inner) => ({ kind: 'group', sign, inner });

const signed = (item) => (item.sign === '-' ? -item.value : item.value);

// Every pair of numbers that could legally be combined right now, each with
// the value it would produce. Numbers inside parentheses can only meet each
// other — reaching one from outside means taking the parentheses off first.
function availablePairs(items) {
    const pairs = [];

    const tops = [];
    items.forEach((it, i) => { if (it.kind === 'num') tops.push(i); });
    for (let x = 0; x < tops.length; x++) {
        for (let y = x + 1; y < tops.length; y++) {
            const a = items[tops[x]], b = items[tops[y]];
            pairs.push({ where: 'top', i: tops[x], j: tops[y], value: signed(a) + signed(b) });
        }
    }

    items.forEach((it, gi) => {
        if (it.kind !== 'group') return;
        const [a, b] = it.inner;
        pairs.push({ where: 'group', gi, i: 0, j: 1, value: signed(a) + signed(b) });
    });

    return pairs;
}

// Taking the parentheses off: each inner term joins the top level, flipping
// sign if the group was being subtracted.
function expandGroup(item) {
    const flip = item.sign === '-';
    return item.inner.map(t => {
        const positive = (t.sign === '+') !== flip;
        return num(positive ? '+' : '-', t.value);
    });
}

function withoutParens(items) {
    const out = [];
    for (const it of items) {
        if (it.kind === 'group') out.push(...expandGroup(it));
        else out.push(it);
    }
    return out;
}

// Carrying out a move: the result takes the place of the leftmost of the two,
// and a bracket holding a single number stops being a bracket.
function applyPair(items, pair) {
    const out = [...items];
    if (pair.where === 'top') {
        const keep = Math.min(pair.i, pair.j), drop = Math.max(pair.i, pair.j);
        out[keep] = num(pair.value < 0 ? '-' : '+', Math.abs(pair.value));
        out.splice(drop, 1);
    } else {
        const g = items[pair.gi];
        const v = (g.sign === '-' ? -1 : 1) * pair.value;
        out[pair.gi] = num(v < 0 ? '-' : '+', Math.abs(v));
    }
    return out;
}

// Every state the problem can actually get into, following only the moves
// she'd be allowed to make. Small — four terms give a couple of dozen.
function reachableStates(items, depth = 0, out = []) {
    out.push(items);
    if (depth > 3) return out;
    const j = judge(items);
    for (const p of availablePairs(items)) {
        if (j.pairOK(p)) reachableStates(applyPair(items, p), depth + 1, out);
    }
    if (j.removalOK) reachableStates(withoutParens(items), depth + 1, out);
    return out;
}

// A pairing that comes to nothing. Equal and opposite terms score as highly
// as anything can, so it would always be the move being recommended — and
// taking 41 from 41 teaches nothing about choosing a route.
function reachesZero(items) {
    return reachableStates(items)
        .some(st => availablePairs(st).some(p => p.value === 0));
}

// A pairing that starts from a takeaway and comes out an addition:
// − 27 + 57 = 30. Reading that needs negative numbers — took away 27, put
// back 57, so now you've added 30 — and the same pair written the other way
// round, 57 − 27, is just a subtraction. Written the other way round is how
// it should arrive.
//
// A pair that starts negative and stays negative is fine, and is the one
// case she does follow without negative numbers: − 15 + 14 is taking away
// one more than you put back, and − 22 − 48 is two takeaways together.
function flipsToPositive(items) {
    return reachableStates(items).some(st => {
        const j = judge(st);
        return availablePairs(st).some(p => {
            if (!j.pairOK(p) || p.value <= 0) return false;
            const left = p.where === 'top' ? st[Math.min(p.i, p.j)] : st[p.gi].inner[0];
            return left.sign === '-';
        });
    });
}

// A state that opens with a negative number. 21 − 61 + 55 starts innocently
// enough, but pairing the first two is the efficient move and leaves
// −40 + 55. She hasn't met negative numbers, and shouldn't meet them here.
function leadsNegative(items) {
    return reachableStates(items)
        .some(st => st[0].kind === 'num' && st[0].sign === '-');
}

const bestScore = (items) => {
    const pairs = availablePairs(items);
    return pairs.length ? Math.max(...pairs.map(p => scoreValue(p.value))) : 0;
};

// ── The judgement ──────────────────────────────────
//
// Nothing is efficient in itself; a move is efficient if it's as good as
// anything else on offer. That's what makes 54 + (47 − 32) work: removing
// the parentheses there opens up nothing better than the 47 − 32 already
// sitting inside, so the inside is where to start. In 85 − (12 + 25) it
// opens up 85 − 25 = 60, so it isn't.
function judge(items) {
    const pairs = availablePairs(items);
    const hasGroup = items.some(it => it.kind === 'group');

    let removalScore = -1;
    if (hasGroup) removalScore = bestScore(withoutParens(items));

    const best = Math.max(
        pairs.length ? Math.max(...pairs.map(p => scoreValue(p.value))) : 0,
        removalScore);

    return {
        best,
        pairOK: (p) => scoreValue(p.value) >= best - SLACK,
        removalOK: hasGroup && removalScore >= best - SLACK,
        scoreOf: (p) => scoreValue(p.value),
    };
}

// ── Generating problems ────────────────────────────
//
// Five shapes, each one a problem from question 5 of the worksheet. Each is
// built so a shortcut exists, then checked against judge() before it's handed
// out.
//
// Deliberately absent: a − b − c, pairing the two takeaways. That form is on
// the worksheet, but in question 4 — the one about order of operations — not
// in question 5. It still turns up mid-problem, since 85 − (12 + 25) expands
// straight into it, but there the move is 85 − 25 rather than the pairing.

const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// A value in range whose last digit is the one that makes the pair land on a
// ten. Built rather than hunted for, so a shape never burns its attempts.
function pickWithLastDigit(lo, hi, digit) {
    const options = [];
    for (let v = lo; v <= hi; v++) if (v % 10 === digit) options.push(v);
    return options.length ? pick(options) : null;
}

const total = (items) => withoutParens(items).reduce((t, it) => t + signed(it), 0);

const SHAPES = {
    // 63 − 48 + 27 : two of the three make a round number.
    //
    // Which two is not fixed — it can be the ends, the first two or the last
    // two — and the signs are free, so 26 + 34 + 51 is as much a pairing
    // problem as 63 − 48 + 27. Only the leading term has to be positive,
    // because a problem doesn't open with a minus.
    onePair() {
        const [i, j] = pick([[0, 1], [0, 2], [1, 2]]);
        const signs = ['+', pick(['+', '-']), pick(['+', '-'])];
        const sgn = (k) => (signs[k] === '-' ? -1 : 1);

        const vi = randInt(21, 69);
        // The partner's last digit is whatever makes the two land on a ten,
        // which depends on how the pair is signed: agreeing signs need the
        // digits to complement, opposing signs need them to match.
        const want = ((-sgn(i) * sgn(j) * vi) % 10 + 10) % 10;
        const vj = pickWithLastDigit(12, 69, want);
        if (vj === null) return null;
        if (sgn(i) * vi + sgn(j) * vj === 0) return null;

        const k = [0, 1, 2].find(x => x !== i && x !== j);
        const values = [];
        values[i] = vi; values[j] = vj; values[k] = randInt(12, 58);

        return values.map((v, x) => num(signs[x], v));
    },

    // 51 − 16 + 17 : the middle two all but cancel
    middleCancels() {
        const b = randInt(13, 48);
        const c = b + pick([1, 2, -1, -2]);
        const a = randInt(Math.max(b + 6, 30), 95);
        return [num('+', a), num('-', b), num('+', c)];
    },

    // 85 − (12 + 25) : take the brackets off and one of them pairs
    bracketsHideRound() {
        const a = pick([randInt(60, 99), randInt(120, 399)]);
        const c = pickWithLastDigit(11, 58, a % 10);
        if (c === null) return null;
        const b = randInt(11, Math.min(48, a - c - 5));
        if (b < 11) return null;
        return [num('+', a), group('-', [num('+', b), num('+', c)])];
    },

    // 54 + (47 − 32) : nothing better outside, so start inside
    insideFirst() {
        const b = randInt(35, 68);
        const c = randInt(21, b - 8);
        const a = randInt(21, 68);
        return [num('+', a), group('+', [num('+', b), num('-', c)])];
    },

    // 45 + 38 − 25 + 22 : two separate pairs, each landing on a ten.
    //
    // Both pairs are built to agree mod ten rather than hunted for, so this
    // never runs out of attempts. Each pair is independently a sum or a
    // difference, so a problem can carry two subtractions, one, or none —
    // 45 + 25 + 38 + 22 is as much a pairing problem as 45 + 38 − 25 + 22.
    twoPairs() {
        const makePair = () => {
            const v1 = randInt(21, 69);
            const minus = Math.random() < 0.5;
            // The partner has to agree mod ten: same last digit to subtract,
            // complementary last digit to add.
            const want = minus ? v1 % 10 : (10 - v1 % 10) % 10;
            const options = [];
            for (let v = 12; v <= 58; v++) if (v % 10 === want) options.push(v);
            if (!options.length) return null;
            return [num('+', v1), num(minus ? '-' : '+', pick(options))];
        };

        const A = makePair(), B = makePair();
        if (!A || !B) return null;

        // Interleaved, so the two halves of a pair aren't sitting together.
        return pick([
            [A[0], B[0], A[1], B[1]],
            [A[0], B[0], B[1], A[1]],
            [B[0], A[0], A[1], B[1]],
        ]);
    },
};

const SHAPE_NAMES = Object.keys(SHAPES);

// Brackets are a separate skill — taking them off and getting the signs
// right — so by default they're left out and the game is purely about
// choosing a pairing. ?mode=parens brings them in alongside the rest.
const MODES = {
    plain:  ['onePair', 'middleCancels', 'twoPairs'],
    parens: ['onePair', 'middleCancels', 'twoPairs', 'bracketsHideRound', 'insideFirst'],
};

function generate(mode, wantedShape) {
    const pool = MODES[mode] || MODES.plain;
    // The shape is chosen once, before trying. Choosing it inside the loop
    // would let the shapes that satisfy their conditions most easily crowd out
    // the ones that don't — which had onePair and bracketsHideRound, the two
    // most characteristic problems on the worksheet, down at 3% each.
    const name = wantedShape || pick(pool);

    for (let tries = 0; tries < 400; tries++) {
        const items = SHAPES[name]();
        if (!items) continue;

        const answer = total(items);
        if (answer < 1 || answer > 400) continue;
        if (reachesZero(items)) continue;
        if (leadsNegative(items)) continue;
        if (flipsToPositive(items)) continue;

        // It has to actually be worth doing cleverly, except for the shape
        // whose whole point is that the brackets come first.
        const j = judge(items);
        if (name !== 'insideFirst' && j.best < 50) continue;

        return { name, items, answer };
    }
    return { name: 'onePair',
             items: [num('+', 63), num('-', 48), num('+', 27)], answer: 42 };
}

const LOGIC = { num, group, signed, availablePairs, withoutParens,
                expandGroup, scoreValue, judge, bestScore, SLACK,
                generate, total, SHAPE_NAMES, MODES, applyPair, reachesZero,
                leadsNegative, flipsToPositive, reachableStates };

if (typeof module !== 'undefined') module.exports = LOGIC;
if (typeof window !== 'undefined') window.LOGIC = LOGIC;
