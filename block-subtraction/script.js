/**
 * Block Subtraction — why 486 − 386 is 100, and why 73 − 23 is 50.
 *
 * The digits hide the answer; hundred boards show it. Every number is drawn
 * on the same 10x10 board at the same cell size — full boards for the
 * hundreds, plus one partly-filled board for whatever is left over. Each
 * number sits directly above its own blocks, and the two terms stand side
 * by side as a written equation:
 *
 *              273 − 173 = [   ]
 *     ─────────────────────────────────────
 *        273                 173
 *     ───────────    −    ─────────
 *     [100][100][73]      [100][73]
 *
 * The partial board fills column by column from the floor up, so its seven
 * complete columns are seven tens rods and the three cells beside them are
 * three ones — place value, without the cells ever leaving the board.
 *
 * The two partial boards are visibly the same object, filled to the same
 * line. One full board matches one full board. What has no match on the
 * other side IS the answer.
 *
 * She doesn't touch the blocks. They're there to look at while she works the
 * problem, and once she answers they cancel off so the leftover hundred is
 * the last thing standing.
 *
 * This is the cancel-out / cancel-game2 idea (green pairs off against red,
 * the leftover is the answer) moved up into place value. Same punchline,
 * bigger numbers.
 *
 * Problems are "clean cancels" only: everything below the leading place
 * always matches, so the partial groups are identical and every answer is
 * a whole number of hundreds.
 *
 * By default problems mix the two places. ?mode=hundreds or ?mode=tens pins
 * one of them. At the tens place hundred boards don't exist; the largest
 * unit is a stack of ten, and the partial group holds the ones:
 *
 *               73 − 23 = [   ]
 *     ─────────────────────────────────
 *          73                23
 *     ───────────        ─────────
 *     ||||||| ▪          || ▪
 *
 * Seven stacks against two, the same 3 on both, five stacks left over.
 * Identical code — only how much one full group is worth, and how wide it
 * is drawn, differ between the modes.
 */

class BlockSubtraction {
    constructor() {
        // Difference in leading units, weighted hard toward 1 — "they're only
        // one apart" is the case she's actually stuck on. Same weights in
        // both modes: the lesson is the same, one place down.
        this.diffWeights = [
            { diff: 1, weight: 56 },
            { diff: 2, weight: 26 },
            { diff: 3, weight: 18 },
        ];

        // The same game at two places. All that differs is what one full
        // group is worth and how many cells wide it gets drawn.
        this.PLACES = {
            // Side by side, both numbers' groups share one line, so the
            // widest problem sets the cell size for all of them. Four boards
            // is the limit before a board stops reading as ten tens.
            hundreds: { unit: 100, groupW: 10, maxGroups: 4, maxValue: 450 },
            // A stack is one cell wide, so width stops mattering here.
            tens:     { unit: 10,  groupW: 1,  maxGroups: 9, maxValue: 100 },
        };

        // ?mode=hundreds or ?mode=tens pins one place; the default mixes
        // them, so she has to notice which size she's looking at rather
        // than settling into "the answer is always a hundred-something".
        const raw = new URLSearchParams(window.location.search).get('mode');
        this.mode = (raw === 'tens' || raw === 'hundreds') ? raw : 'mixed';
        this.lastPlace = null;
        this.placeRun = 0;

        // Layout constants, in multiples of --u (one ones-cube edge).
        this.PIECE_GAP  = 0.30;   // between any two boards in a term
        this.U_MIN      = 10;
        this.U_MAX      = 42;

        this.totalGames = 0;
        this.correctCount = 0;
        this.problem = null;
        this.input = '';
        this.revealed = false;
        this.timers = [];

        this.init();
    }

    init() {
        document.querySelectorAll('#numpad .numkey').forEach(btn => {
            btn.addEventListener('click', () => this.handleNumKey(btn.dataset.key));
        });
        document.getElementById('continue-btn')
            .addEventListener('click', () => this.startNewRound());

        // Hardware keyboard, for testing on a desktop browser.
        document.addEventListener('keydown', (e) => {
            if (e.key >= '0' && e.key <= '9') this.handleNumKey(e.key);
            else if (e.key === 'Backspace') this.handleNumKey('back');
            else if (e.key === 'Enter') {
                if (this.revealed) this.startNewRound();
                else this.handleNumKey('enter');
            }
        });

        window.addEventListener('resize', () => this.fitUnit());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.fitUnit(), 250);
        });

        this.startNewRound();
    }

    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // ── Problem generation ─────────────────────────

    weightedDiff() {
        const total = this.diffWeights.reduce((s, d) => s + d.weight, 0);
        let r = Math.random() * total;
        for (const d of this.diffWeights) {
            r -= d.weight;
            if (r <= 0) return d.diff;
        }
        return 1;
    }

    // In mixed mode, keep it genuinely varied but never let one place run
    // more than twice — a long streak turns back into a single-place drill.
    pickPlace() {
        if (this.mode !== 'mixed') return this.mode;
        if (this.placeRun >= 2) {
            return this.lastPlace === 'tens' ? 'hundreds' : 'tens';
        }
        return Math.random() < 0.5 ? 'hundreds' : 'tens';
    }

    // The remainder is everything below the leading place: a two-digit tail
    // for hundreds, a single digit for tens. Never zero — there is always a
    // partial group, and it is always the same on both sides.
    randomRemainder(place) {
        if (place.unit === 10) return this.randInt(1, 9);
        // A visible pile of tens AND ones is what makes "all of that
        // cancelled" land, so favour both digits being non-zero.
        const bothNonZero = Math.random() < 0.8;
        const t = bothNonZero ? this.randInt(1, 9) : this.randInt(0, 9);
        const o = bothNonZero ? this.randInt(1, 9) : this.randInt(0, 9);
        return t * 10 + o;
    }

    generateProblem() {
        const name = this.pickPlace();
        const place = this.PLACES[name];

        this.placeRun = (name === this.lastPlace) ? this.placeRun + 1 : 1;
        this.lastPlace = name;

        const shape = { place: name, unit: place.unit, groupW: place.groupW };

        for (let tries = 0; tries < 200; tries++) {
            const diff = this.weightedDiff();
            const g2 = this.randInt(1, place.maxGroups - diff);
            const g1 = g2 + diff;
            if (g1 > place.maxGroups) continue;

            const rem = this.randomRemainder(place);
            if (rem === 0) continue;

            const top = g1 * place.unit + rem;
            const bottom = g2 * place.unit + rem;
            if (top >= place.maxValue) continue;
            if (this.problem && this.problem.top === top && this.problem.bottom === bottom) continue;

            return { ...shape, g1, g2, rem, diff, top, bottom, answer: diff * place.unit };
        }
        return name === 'tens'
            ? { ...shape, g1: 7, g2: 2, rem: 3,  diff: 5, top: 73,  bottom: 23,  answer: 50 }
            : { ...shape, g1: 2, g2: 1, rem: 93, diff: 1, top: 293, bottom: 193, answer: 100 };
    }

    // ── Round lifecycle ────────────────────────────

    startNewRound() {
        this.clearTimers();
        this.problem = this.generateProblem();
        this.input = '';
        this.revealed = false;

        document.getElementById('caption').textContent = '';
        document.getElementById('caption').classList.remove('final');
        this.show('numpad');
        this.hide('continue-btn');

        this.renderEquation();
        this.renderBoard();
        this.fitUnit();
    }

    handleNumKey(key) {
        if (this.revealed) return;
        if (key === 'back') {
            this.input = this.input.slice(0, -1);
            this.renderInput();
            return;
        }
        if (key === 'enter') {
            if (this.input.length === 0) return;
            this.submit();
            return;
        }
        if (this.input.length >= 3) return;
        if (this.input.length === 0 && key === '0') return;   // no leading zero
        this.input += key;
        this.renderInput();
    }

    submit() {
        const correct = parseInt(this.input, 10) === this.problem.answer;
        this.totalGames++;
        if (correct) this.correctCount++;
        document.getElementById('total-count').textContent = this.totalGames;
        document.getElementById('correct-count').textContent = this.correctCount;

        const box = document.getElementById('eq-answer-box');
        if (box) box.classList.add(correct ? 'right' : 'wrong');

        this.revealed = true;
        this.hide('numpad');
        this.runReveal();
    }

    // Everything that has a match goes grey in one moment, and the boards
    // with no match light up in that same moment. One fade, one event: the
    // whole of 273 cancels, and what's left over is the answer.
    runReveal() {
        const { top, bottom, answer } = this.problem;
        const caption = document.getElementById('caption');
        const step = (delay, fn) => this.timers.push(setTimeout(fn, delay));

        step(500, () => {
            caption.textContent = `${bottom} − ${bottom} = 0`;
            const { matched, leftover } = this.splitByMatch();
            matched.forEach(el => el.classList.add('gone'));
            leftover.forEach(el => el.classList.add('leftover'));
        });

        step(2000, () => {
            caption.classList.add('final');
            caption.textContent = `${top} − ${bottom} = ${answer}`;
            const box = document.getElementById('eq-answer-box');
            if (box) {
                box.classList.remove('right', 'wrong');
                box.classList.add('revealed');
                box.textContent = String(answer);
            }
        });

        step(2700, () => this.show('continue-btn'));
    }

    // Split every board into the ones that have a partner in the other term
    // and the ones that don't. Pairing runs from the right, so the boards
    // that survive are the ones at the FRONT of the number — the leftover
    // hundred is where she starts reading, not stranded at the end.
    splitByMatch() {
        const matched = [];
        const leftover = [];

        for (const place of ['h', 'r']) {
            const tops = [...document.querySelectorAll(`#row-top .piece[data-place="${place}"]`)];
            const bots = [...document.querySelectorAll(`#row-bottom .piece[data-place="${place}"]`)];
            const pairs = Math.min(tops.length, bots.length);
            const topStart = tops.length - pairs;
            const botStart = bots.length - pairs;

            leftover.push(...tops.slice(0, topStart));
            matched.push(...tops.slice(topStart), ...bots.slice(botStart));
        }
        return { matched, leftover };
    }

    clearTimers() {
        this.timers.forEach(clearTimeout);
        this.timers = [];
    }

    // ── Rendering ──────────────────────────────────

    // The whole equation is one row: term, minus, term, equals, answer box.
    renderBoard() {
        const { g1, g2, rem, top, bottom } = this.problem;
        document.documentElement.style.setProperty('--gw', this.problem.groupW);

        const row = document.getElementById('equation-row');
        row.innerHTML = '';
        row.appendChild(this.buildTerm('row-top', 'top', top, g1, rem));
        row.appendChild(this.buildOp('−'));
        row.appendChild(this.buildTerm('row-bottom', 'bottom', bottom, g2, rem));

    }

    // The problem as she'd meet it on a worksheet, above the model of it.
    renderEquation() {
        const { top, bottom } = this.problem;
        document.getElementById('main-equation').innerHTML =
            `<span class="eq-num-top">${top}</span>` +
            `<span class="eq-op">−</span>` +
            `<span class="eq-num-bot">${bottom}</span>` +
            `<span class="eq-op">=</span>` +
            `<span class="eq-answer-box" id="eq-answer-box"></span>`;
        this.renderInput();
    }

    renderInput() {
        const box = document.getElementById('eq-answer-box');
        if (box) box.textContent = this.input;
    }

    buildOp(glyph) {
        const op = document.createElement('div');
        op.className = 'op';
        op.textContent = glyph;
        return op;
    }

    // One term: the numeral, a rule, and the blocks it names — stacked, so
    // the digits and the quantity read as the same thing.
    buildTerm(blocksId, side, value, groups, rem) {
        const term = document.createElement('div');
        term.className = `term side-${side}`;

        const label = document.createElement('div');
        label.className = 'term-label';
        label.textContent = String(value);
        term.appendChild(label);

        const rule = document.createElement('div');
        rule.className = 'term-rule';
        term.appendChild(rule);

        const blocks = document.createElement('div');
        blocks.className = 'term-blocks';
        blocks.id = blocksId;
        for (let i = 0; i < groups; i++) {
            const full = document.createElement('div');
            full.className = `piece filled ${side}`;
            full.dataset.place = 'h';
            blocks.appendChild(full);
        }
        blocks.appendChild(this.buildPartialBoard(rem, side));
        term.appendChild(blocks);

        return term;
    }

    // A 10x10 board holding `rem` cells, filled column by column and each
    // column from the floor up: complete columns of ten first, then the
    // leftover cells standing at the bottom of the next column along.
    // Every full column is ten cells tall, so 93 reads as nine tens and
    // three ones — the tens rods are just drawn inside the hundred board
    // instead of being broken out of it.
    buildPartialBoard(rem, side) {
        const board = document.createElement('div');
        board.className = `piece board ${side}`;
        board.dataset.place = 'r';

        const fullcols = Math.floor(rem / 10);
        const rest = rem % 10;
        board.style.setProperty('--fullcols', fullcols);
        board.style.setProperty('--rest', rest);

        if (fullcols > 0) {
            const cols = document.createElement('div');
            cols.className = 'board-cols filled';
            board.appendChild(cols);
        }
        if (rest > 0) {
            const part = document.createElement('div');
            part.className = 'board-part filled';
            board.appendChild(part);
        }
        board.appendChild(this.buildOutline(fullcols, rest));
        return board;
    }

    // One stroke around the outside of the whole filled shape — an L when
    // there's a part-column, a plain rectangle otherwise. Drawn in board
    // cells (viewBox 0 0 10 10) so it scales with --u; non-scaling-stroke
    // keeps the line the same weight at any board size.
    buildOutline(fullcols, rest) {
        const SVG_NS = 'http://www.w3.org/2000/svg';
        const c = fullcols;
        const r = rest;
        const w = this.problem.groupW;

        let points;
        if (r === 0)      points = `0,0 ${c},0 ${c},10 0,10`;
        else if (c === 0) points = `0,${10 - r} 1,${10 - r} 1,10 0,10`;
        else              points = `0,0 ${c},0 ${c},${10 - r} ${c + 1},${10 - r} ${c + 1},10 0,10`;

        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('class', 'board-outline');
        svg.setAttribute('viewBox', `0 0 ${w} 10`);
        svg.setAttribute('preserveAspectRatio', 'none');

        const poly = document.createElementNS(SVG_NS, 'polygon');
        poly.setAttribute('points', points);
        poly.setAttribute('vector-effect', 'non-scaling-stroke');
        svg.appendChild(poly);
        return svg;
    }

    // Pick the largest --u at which the whole board still fits, then push the
    // resulting column widths back into CSS so both rows share them.
    fitUnit() {
        if (!this.problem) return;
        const { g1, g2, groupW } = this.problem;
        const board = document.getElementById('board');
        const availW = board.clientWidth;
        const availH = board.clientHeight;
        if (availW <= 0 || availH <= 0) return;

        // A term is its full groups plus one partial group, each groupW
        // cells wide, with a gap between each. Both terms share one line, so
        // the row's total width sets the cell size.
        const termUnits = (g) => (g + 1) * groupW + g * this.PIECE_GAP;
        const OP_W = 2.2;
        const GAP = 1.0;

        // Only the terms and the minus share the line; the answer sits below.
        const unitsWide = termUnits(g1) + termUnits(g2) + OP_W + 2 * GAP;
        // Numeral, rule, one board tall, plus air.
        const unitsTall = 2.4 + 1.0 + 10 + 1.6;

        let u = Math.min(availW / unitsWide, availH / unitsTall);
        u = Math.max(this.U_MIN, Math.min(this.U_MAX, Math.floor(u)));

        const root = document.documentElement.style;
        root.setProperty('--u', `${u}px`);
        root.setProperty('--pgap', `${Math.max(2, Math.round(this.PIECE_GAP * u))}px`);
    }

    show(id) { document.getElementById(id).classList.remove('hidden'); }
    hide(id) { document.getElementById(id).classList.add('hidden'); }
}

document.addEventListener('DOMContentLoaded', () => {
    // Exposed so a problem can be forced from the console while tuning layout.
    window.game = new BlockSubtraction();
});
