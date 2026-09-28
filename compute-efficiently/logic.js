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
    if (n % 100 === 0) return 100;   // 356 − 56 = 300
    if (n <= 2)        return 90;    // −16 + 17 = 1
    if (n % 10 === 0)  return 60;    // 63 + 27 = 90
    if (n <= 5)        return 50;
    if (n <= 10)       return 30;
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

// Whether any pairing anywhere down the problem comes to nothing. A pair of
// equal-and-opposite terms scores as highly as anything can, so it would
// always be the move being recommended — and "take 41 from 41" teaches
// nothing about choosing an efficient route.
function reachesZero(items, depth = 0) {
    if (depth > 3) return false;
    const pairs = availablePairs(items);
    if (pairs.some(p => p.value === 0)) return true;
    for (const p of pairs) if (reachesZero(applyPair(items, p), depth + 1)) return true;
    if (items.some(it => it.kind === 'group') &&
        reachesZero(withoutParens(items), depth + 1)) return true;
    return false;
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
    // 63 − 48 + 27 : the ends make ninety
    endsMakeRound() {
        const a = randInt(41, 78);
        const c = pickWithLastDigit(12, 39, (10 - a % 10) % 10);
        if (c === null) return null;
        const b = randInt(11, a - 5);
        return [num('+', a), num('-', b), num('+', c)];
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

function generate(wantedShape) {
    // The shape is chosen once, before trying. Choosing it inside the loop
    // would let the shapes that satisfy their conditions most easily crowd out
    // the ones that don't — which had endsMakeRound and bracketsHideRound, the
    // two most characteristic problems on the worksheet, down at 3% each.
    const name = wantedShape || pick(SHAPE_NAMES);

    for (let tries = 0; tries < 400; tries++) {
        const items = SHAPES[name]();
        if (!items) continue;

        const answer = total(items);
        if (answer < 1 || answer > 400) continue;
        if (reachesZero(items)) continue;

        // It has to actually be worth doing cleverly, except for the shape
        // whose whole point is that the brackets come first.
        const j = judge(items);
        if (name !== 'insideFirst' && j.best < 50) continue;

        return { name, items, answer };
    }
    return { name: 'endsMakeRound',
             items: [num('+', 63), num('-', 48), num('+', 27)], answer: 42 };
}

const LOGIC = { num, group, signed, availablePairs, withoutParens,
                expandGroup, scoreValue, judge, bestScore, SLACK,
                generate, total, SHAPE_NAMES, applyPair, reachesZero };

if (typeof module !== 'undefined') module.exports = LOGIC;
if (typeof window !== 'undefined') window.LOGIC = LOGIC;
