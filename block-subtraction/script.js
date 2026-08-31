/**
 * Block Subtraction — why 486 − 386 is 100.
 *
 * The digits hide the answer; hundred boards show it. Every number is drawn
 * on the same 10x10 board at the same cell size — full boards for the
 * hundreds, plus one partly-filled board for whatever is left over:
 *
 *     486   [100][100][100][100]  [ 86 ]
 *   − 386   [100][100][100]       [ 86 ]
 *
 * The partial board fills column by column from the floor up, so its eight
 * complete columns are eight tens rods and the six cells beside them are
 * six ones — place value, without the cells ever leaving the board.
 *
 * The two partial boards are visibly the same object, filled to the same
 * line, sitting in the same column. Three full boards match three full
 * boards. One board has nothing beneath it — and that board IS the answer.
 *
 * She doesn't touch the blocks. They're there to look at while she works the
 * problem, and once she answers they cancel off so the leftover hundred is
 * the last thing standing.
 *
 * This is the cancel-out / cancel-game2 idea (green pairs off against red,
 * the leftover is the answer) moved up into place value. Same punchline,
 * bigger numbers.
 *
 * Problems are "clean cancels" only: the last two digits always match, so
 * the partial boards are always identical and every answer is a whole
 * number of hundreds.
 */

class BlockSubtraction {
    constructor() {
        // Difference in hundreds, weighted hard toward 1 — "they're only one
        // hundred apart" is the case she's actually stuck on.
        this.diffWeights = [
            { diff: 1, weight: 56 },
            { diff: 2, weight: 26 },
            { diff: 3, weight: 18 },
        ];

        // Never draw more than this many flats in a row. Past four the unit
        // size has to shrink so far that a flat's 10×10 grid stops reading
        // as ten tens — which is the one thing it has to read as.
        this.MAX_HUNDREDS = 4;

        // Layout constants, in multiples of --u (one ones-cube edge).
        this.PIECE_GAP  = 0.30;   // between any two boards in a row
        this.LABEL_W    = 5.60;
        this.ROW_GAP    = 1.40;
        this.U_MIN      = 10;
        this.U_MAX      = 34;

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

    generateProblem() {
        for (let tries = 0; tries < 200; tries++) {
            const diff = this.weightedDiff();
            const h2 = this.randInt(1, this.MAX_HUNDREDS - diff);
            const h1 = h2 + diff;
            if (h1 > this.MAX_HUNDREDS) continue;

            // Both digits non-zero most of the time — a visible pile of tens
            // AND ones is what makes "all of that cancelled" land. Now and
            // then one place is empty so the picture doesn't get stale.
            const bothNonZero = Math.random() < 0.8;
            const t = bothNonZero ? this.randInt(1, 9) : this.randInt(0, 9);
            const o = bothNonZero ? this.randInt(1, 9) : this.randInt(0, 9);
            if (t === 0 && o === 0) continue;

            const top = h1 * 100 + t * 10 + o;
            const bottom = h2 * 100 + t * 10 + o;
            if (this.problem && this.problem.top === top && this.problem.bottom === bottom) continue;

            return { h1, h2, rem: t * 10 + o, diff, top, bottom, answer: diff * 100 };
        }
        return { h1: 2, h2: 1, rem: 93, diff: 1, top: 293, bottom: 193, answer: 100 };
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

    // Cancel the places smallest-first, narrating each one, then let the
    // leftover hundreds stand alone. Right or wrong, she sees the same
    // explanation — the picture is the teaching, not the score.
    runReveal() {
        const { rem, h1, h2, diff, top, bottom, answer } = this.problem;
        const caption = document.getElementById('caption');
        const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

        let at = 500;
        const step = (delay, fn) => {
            this.timers.push(setTimeout(fn, delay));
        };

        step(at, () => {
            caption.textContent = `Same ${rem} on both. ${rem} − ${rem} = 0`;
            this.cancelPlace('r');
        });
        at += 1400;

        step(at, () => {
            caption.textContent =
                `${plural(h1, 'hundred')} − ${plural(h2, 'hundred')} = ${plural(diff, 'hundred')}`;
            this.cancelPlace('h');
        });
        at += 1200;

        step(at, () => {
            caption.classList.add('final');
            caption.textContent = `${top} − ${bottom} = ${answer}`;
            const box = document.getElementById('eq-answer-box');
            if (box) {
                box.classList.remove('right', 'wrong');
                box.classList.add('revealed');
                box.textContent = String(answer);
            }
        });
        at += 700;

        step(at, () => this.show('continue-btn'));
    }

    // Grey out every piece in a place that has a partner in the other row.
    // In the hundreds, the unpartnered flats instead start glowing.
    cancelPlace(place) {
        const tops = [...document.querySelectorAll(`#row-top .piece[data-place="${place}"]`)];
        const bots = [...document.querySelectorAll(`#row-bottom .piece[data-place="${place}"]`)];
        const pairs = Math.min(tops.length, bots.length);

        for (let i = 0; i < pairs; i++) {
            const delay = i * 70;
            this.timers.push(setTimeout(() => {
                tops[i].classList.add('gone');
                bots[i].classList.add('gone');
            }, delay));
        }
        for (let i = pairs; i < tops.length; i++) {
            this.timers.push(setTimeout(() => {
                tops[i].classList.add('leftover');
            }, pairs * 70 + 260));
        }
    }

    clearTimers() {
        this.timers.forEach(clearTimeout);
        this.timers = [];
    }

    // ── Rendering ──────────────────────────────────

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

    renderBoard() {
        const { h1, h2, rem } = this.problem;
        this.buildRow('row-top',    'top',    h1, rem, String(this.problem.top));
        this.buildRow('row-bottom', 'bottom', h2, rem, `− ${this.problem.bottom}`);
    }

    buildRow(rowId, side, hundreds, rem, labelText) {
        const row = document.getElementById(rowId);
        row.innerHTML = '';

        const label = document.createElement('div');
        label.className = 'row-label';
        label.textContent = labelText;
        row.appendChild(label);

        // Hundreds: full boards, all 100 cells filled.
        const hGroup = document.createElement('div');
        hGroup.className = 'place-group';
        for (let i = 0; i < hundreds; i++) {
            const board = document.createElement('div');
            board.className = `piece filled ${side}`;
            board.dataset.place = 'h';
            hGroup.appendChild(board);
        }
        row.appendChild(hGroup);

        // Remainder: the same board, filled only part way up.
        const rGroup = document.createElement('div');
        rGroup.className = 'place-group';
        rGroup.appendChild(this.buildPartialBoard(rem, side));
        row.appendChild(rGroup);
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

        let points;
        if (r === 0)      points = `0,0 ${c},0 ${c},10 0,10`;
        else if (c === 0) points = `0,${10 - r} 1,${10 - r} 1,10 0,10`;
        else              points = `0,0 ${c},0 ${c},${10 - r} ${c + 1},${10 - r} ${c + 1},10 0,10`;

        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('class', 'board-outline');
        svg.setAttribute('viewBox', '0 0 10 10');
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
        const { h1 } = this.problem;
        const board = document.getElementById('board');
        const availW = board.clientWidth;
        const availH = board.clientHeight;
        if (availW <= 0 || availH <= 0) return;

        // Hundreds group is h1 boards wide; the remainder column is always
        // exactly one board, whatever it holds. Every gap in the row is the
        // same, so the remainder board sits no further off than the hundreds
        // do from each other — one continuous quantity.
        const whUnits = h1 * 10 + (h1 - 1) * this.PIECE_GAP;
        const wrUnits = 10;

        const unitsWide = this.LABEL_W + whUnits + wrUnits + 2 * this.PIECE_GAP;
        const unitsTall = 10 + this.ROW_GAP + 10 + 2 * this.ROW_GAP;

        let u = Math.min(availW / unitsWide, availH / unitsTall);
        u = Math.max(this.U_MIN, Math.min(this.U_MAX, Math.floor(u)));

        // Recompute the column widths from the *rounded* pixel gap, so the
        // declared widths match what the boards actually occupy.
        const pgap = Math.max(2, Math.round(this.PIECE_GAP * u));

        const root = document.documentElement.style;
        root.setProperty('--u', `${u}px`);
        root.setProperty('--pgap', `${pgap}px`);
        root.setProperty('--labelw', `${Math.round(this.LABEL_W * u)}px`);
        root.setProperty('--wh', `${h1 * 10 * u + (h1 - 1) * pgap}px`);
        root.setProperty('--wr', `${10 * u}px`);
    }

    show(id) { document.getElementById(id).classList.remove('hidden'); }
    hide(id) { document.getElementById(id).classList.add('hidden'); }
}

document.addEventListener('DOMContentLoaded', () => {
    // Exposed so a problem can be forced from the console while tuning layout.
    window.game = new BlockSubtraction();
});
