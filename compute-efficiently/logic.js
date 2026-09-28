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
// Six shapes, all taken from the worksheet. Each is built so a shortcut
// exists, then checked against judge() before it's handed out.

const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const total = (items) => withoutParens(items).reduce((t, it) => t + signed(it), 0);

const SHAPES = {
    // 63 − 48 + 27 : the ends make ninety
    endsMakeRound() {
        const a = randInt(41, 78);
        const c = randInt(12, 39);
        if ((a + c) % 10 !== 0) return null;
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

    // 100 − 13 − 27 : the two takeaways make forty between them
    negativesMakeRound() {
        const b = randInt(11, 48);
        const c = randInt(11, 48);
        if ((b + c) % 10 !== 0) return null;
        const a = randInt(b + c + 8, 99);
        return [num('+', a), num('-', b), num('-', c)];
    },

    // 85 − (12 + 25) : take the brackets off and one of them pairs
    bracketsHideRound() {
        const a = pick([randInt(60, 99), randInt(120, 399)]);
        const c = randInt(11, 58);
        if ((a - c) % 10 !== 0 && (a - c) % 100 !== 0) return null;
        const b = randInt(11, 48);
        if (a - b - c < 5) return null;
        return [num('+', a), group('-', [num('+', b), num('+', c)])];
    },

    // 54 + (47 − 32) : nothing better outside, so start inside
    insideFirst() {
        const b = randInt(35, 68);
        const c = randInt(21, b - 8);
        const a = randInt(21, 68);
        return [num('+', a), group('+', [num('+', b), num('-', c)])];
    },

    // 45 + 38 − 25 + 22 : two separate pairs, one each way
    twoPairs() {
        const a = randInt(31, 69);
        const c = randInt(11, a - 10);
        if ((a - c) % 10 !== 0) return null;
        const b = randInt(21, 58);
        const d = randInt(11, 48);
        if ((b + d) % 10 !== 0) return null;
        return [num('+', a), num('+', b), num('-', c), num('+', d)];
    },
};

const SHAPE_NAMES = Object.keys(SHAPES);

function generate(wantedShape) {
    for (let tries = 0; tries < 400; tries++) {
        const name = wantedShape || pick(SHAPE_NAMES);
        const items = SHAPES[name]();
        if (!items) continue;

        const answer = total(items);
        if (answer < 1 || answer > 400) continue;

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
                generate, total, SHAPE_NAMES };

if (typeof module !== 'undefined') module.exports = LOGIC;
if (typeof window !== 'undefined') window.LOGIC = LOGIC;
