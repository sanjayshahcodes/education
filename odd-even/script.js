/**
 * Odd and Even — why odd + odd comes out even.
 *
 * Every number is laid out two across and counted, top to bottom. An even
 * number fills its rectangle exactly. An odd number leaves a notch at the
 * bottom right, and the block sitting alone beside that notch is the whole
 * point: it is the one with no partner.
 *
 *        7              5
 *      ┌──┬──┐       ┌──┬──┐
 *      │ 1│ 2│       │ 1│ 2│
 *      │ 3│ 4│       │ 3│ 4│
 *      │ 5│ 6│       │ 5│  ▒     ▒ = nobody to pair with
 *      │ 7│ ▒│       └──┴──┘
 *      └──┴──┘
 *
 * She calls the answer odd or even, and then the second number's blocks move
 * across and keep the count going. The 8 lands next to the lone 7 — the two
 * leftovers pair off — and everything from there fills whole rows:
 *
 *        12
 *      ┌──┬──┐
 *      │ 1│ 2│
 *      │ 3│ 4│
 *      │ 5│ 6│
 *      │ 7│ 8│   ← the two leftovers, now a pair
 *      │ 9│10│
 *      │11│12│
 *      └──┴──┘
 *
 * All three rules are one rule — count the leftovers:
 *
 *   odd  + odd   two leftovers, they pair off       → even
 *   even + even  no leftovers at all                → even
 *   odd  + even  one leftover, nothing to pair with → odd
 *
 * Which is worth more than the three facts memorised, because it also
 * answers odd + odd + odd, and the last cell reads the total besides.
 */

class OddEven {
    constructor() {
        // One entry per rule, so each gets a third of the problems. odd+even
        // and even+odd are the same rule, so 'mixed' covers both and turns up
        // either way round.
        this.CASES = ['oddodd', 'eveneven', 'mixed'];

        this.MIN_TERM = 2;
        this.MAX_TERM = 13;
        // Two across, so the tallest a sum can be is half of it. Past twenty
        // the rows get too short to read the numbers inside them.
        this.MAX_SUM = 20;

        this.U_MIN = 26;
        this.U_MAX = 62;

        this.totalGames = 0;
        this.correctCount = 0;
        this.problem = null;
        this.answered = false;
        this.timers = [];

        this.init();
    }

    init() {
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.addEventListener('click', () => this.answer(btn.dataset.choice, btn));
        });
        document.getElementById('continue-btn')
            .addEventListener('click', () => this.startNewRound());

        document.addEventListener('keydown', (e) => {
            const k = e.key.toLowerCase();
            if (this.answered && (k === 'enter' || k === ' ')) this.startNewRound();
            else if (k === 'o') document.querySelector('.choice-btn[data-choice="odd"]').click();
            else if (k === 'e') document.querySelector('.choice-btn[data-choice="even"]').click();
        });

        window.addEventListener('resize', () => this.fitUnit());
        window.addEventListener('orientationchange', () => setTimeout(() => this.fitUnit(), 250));

        this.startNewRound();
    }

    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // ── Problem generation ─────────────────────────

    generateProblem() {
        // Pick the rule first, then hunt for a pair that fits it. Re-rolling
        // the rule inside the loop would instead accept whatever agreed by
        // chance, which quietly favours odd+even — half of all random pairs.
        const wanted = this.CASES[Math.floor(Math.random() * this.CASES.length)];

        for (let tries = 0; tries < 300; tries++) {
            const a = this.randInt(this.MIN_TERM, this.MAX_TERM);
            const b = this.randInt(this.MIN_TERM, this.MAX_TERM);
            if (a + b > this.MAX_SUM) continue;

            const aOdd = a % 2 === 1, bOdd = b % 2 === 1;
            const kind = aOdd && bOdd ? 'oddodd'
                       : !aOdd && !bOdd ? 'eveneven'
                       : 'mixed';
            if (kind !== wanted) continue;

            // On a mixed problem the even number goes first, so the odd one
            // is the one that travels. That way both shapes survive into the
            // result: the even number's rectangle stays whole on top, and the
            // odd number stacks under it intact, bringing its own leftover.
            // The other way round, the odd number's notch swallows the first
            // block of the even one and tears its rectangle apart.
            //
            // Odd + odd has to break, but that's the point there — the two
            // leftovers finding each other is the whole lesson.
            const [first, second] = (kind === 'mixed' && aOdd) ? [b, a] : [a, b];
            if (this.problem && this.problem.a === first && this.problem.b === second) continue;

            const sum = first + second;
            return {
                a: first, b: second, sum, kind,
                aOdd: first % 2 === 1, bOdd: second % 2 === 1,
                sumOdd: sum % 2 === 1,
                rows: Math.ceil(sum / 2),
            };
        }
        return { a: 7, b: 5, sum: 12, kind: 'oddodd', aOdd: true, bOdd: true,
                 sumOdd: false, rows: 6 };
    }

    // ── Round lifecycle ────────────────────────────

    startNewRound() {
        this.clearTimers();
        this.problem = this.generateProblem();
        this.answered = false;

        document.getElementById('caption').textContent = '';
        document.querySelectorAll('.choice-btn').forEach(b => {
            b.classList.remove('right', 'wrong');
        });
        this.show('choice-buttons');
        this.hide('continue-btn');

        this.renderEquation();
        this.renderBoard();
        this.fitUnit();
    }

    answer(choice, btn) {
        if (this.answered) return;
        this.answered = true;

        const correct = (choice === 'odd') === this.problem.sumOdd;
        this.totalGames++;
        if (correct) this.correctCount++;
        document.getElementById('total-count').textContent = this.totalGames;
        document.getElementById('correct-count').textContent = this.correctCount;
        btn.classList.add(correct ? 'right' : 'wrong');

        this.runReveal();
    }

    // The second number's blocks move over and carry on the count. Whether a
    // leftover finds a partner is the thing to watch, so it happens in one
    // moment and the rule it demonstrates is named underneath.
    runReveal() {
        const { a, b, sum, kind, sumOdd } = this.problem;
        const step = (delay, fn) => this.timers.push(setTimeout(fn, delay));

        step(400, () => {
            this.joinBlocks();

            // The first number's pile is now the whole sum; the second is spent.
            const labelA = document.getElementById('label-a');
            labelA.textContent = String(sum);
            labelA.classList.add('settled');

            const parityA = document.getElementById('parity-a');
            parityA.textContent = sumOdd ? 'Odd' : 'Even';
            parityA.classList.add('settled');
            document.getElementById('term-b').classList.add('spent');
            document.getElementById('op').classList.add('faded');
        });

        step(1300, () => {
            // Named in the order they're shown, which for mixed is always
            // even first now that the odd number is the one that moves.
            const words = { oddodd: 'odd + odd', eveneven: 'even + even', mixed: 'even + odd' };
            document.getElementById('caption').textContent =
                `${words[kind]} = ${sumOdd ? 'odd' : 'even'}`;
            document.getElementById('main-equation').innerHTML =
                `<span class="eq-a">${a}</span>` +
                `<span class="eq-op">+</span>` +
                `<span class="eq-b">${b}</span>` +
                `<span class="eq-op">=</span>` +
                `<span class="eq-sum">${sum}</span>`;
            this.hide('choice-buttons');
            this.show('continue-btn');
        });
    }

    // Move each of the second number's blocks onto the waiting slot in the
    // first number's grid, renumbering as it goes: the 5 blocks of 5 become
    // 8 through 12. Nothing reflows — they travel by transform onto slots
    // that were holding the space all along.
    joinBlocks() {
        const { a } = this.problem;
        const slots = [...document.querySelectorAll('#grid-a .cell.slot')];
        const movers = [...document.querySelectorAll('#grid-b .cell')];

        movers.forEach((cell, i) => {
            const slot = slots[i];
            if (!slot) return;
            const from = cell.getBoundingClientRect();
            const to = slot.getBoundingClientRect();
            cell.classList.add('moving');
            cell.textContent = String(a + i + 1);
            cell.style.transform =
                `translate(${to.left - from.left}px, ${to.top - from.top}px)`;
        });
    }

    clearTimers() {
        this.timers.forEach(clearTimeout);
        this.timers = [];
    }

    // ── Rendering ──────────────────────────────────

    renderEquation() {
        const { a, b } = this.problem;
        document.getElementById('main-equation').innerHTML =
            `<span class="eq-a">${a}</span>` +
            `<span class="eq-op">+</span>` +
            `<span class="eq-b">${b}</span>`;
    }

    renderBoard() {
        const { a, b } = this.problem;
        const row = document.getElementById('sum-row');
        row.innerHTML = '';

        // The first number, plus a hidden slot for every block still to come,
        // so the grid is already its final height and nothing jumps later.
        row.appendChild(this.buildTerm('a', 'label-a', 'grid-a', a, a + b, 'a', 1));

        const op = document.createElement('div');
        op.className = 'op';
        op.id = 'op';
        op.textContent = '+';
        row.appendChild(op);

        row.appendChild(this.buildTerm('b', 'label-b', 'grid-b', b, b, 'b', 1));
    }

    // `filled` cells get numbers and colour; anything up to `total` after that
    // is an invisible slot. Laid out two across, counted top to bottom.
    buildTerm(side, labelId, gridId, filled, total, cellClass, startAt) {
        const term = document.createElement('div');
        term.className = `term side-${side}`;
        term.id = `term-${side}`;

        const parity = document.createElement('div');
        parity.className = 'term-parity';
        parity.id = `parity-${side}`;
        parity.textContent = filled % 2 === 1 ? 'Odd' : 'Even';
        term.appendChild(parity);

        const label = document.createElement('div');
        label.className = 'term-label';
        label.id = labelId;
        label.textContent = String(filled);
        term.appendChild(label);

        const rule = document.createElement('div');
        rule.className = 'term-rule';
        term.appendChild(rule);

        const pairs = document.createElement('div');
        pairs.className = 'pairs';
        pairs.id = gridId;

        let rowEl = null;
        for (let i = 0; i < total; i++) {
            if (i % 2 === 0) {
                rowEl = document.createElement('div');
                rowEl.className = 'row';
                pairs.appendChild(rowEl);
            }
            const cell = document.createElement('div');
            if (i < filled) {
                cell.className = `cell ${cellClass}`;
                cell.textContent = String(startAt + i);
            } else {
                cell.className = 'cell slot';
            }
            rowEl.appendChild(cell);
        }

        term.appendChild(pairs);
        return term;
    }

    // Two across means height is what runs out first: the taller of the two
    // grids sets the cell size.
    fitUnit() {
        if (!this.problem) return;
        const { rows } = this.problem;
        const board = document.getElementById('board');
        const availW = board.clientWidth;
        const availH = board.clientHeight;
        if (availW <= 0 || availH <= 0) return;

        // Numeral, rule, the rows themselves, plus a little air.
        const unitsTall = 0.55 + 1.15 + 0.5 + rows + 0.6;
        // Two grids two cells wide, the operator, and the gaps between.
        const unitsWide = 2 + 2 + 1.2 + 1.8;

        let u = Math.min(availW / unitsWide, availH / unitsTall);
        u = Math.max(this.U_MIN, Math.min(this.U_MAX, Math.floor(u)));
        document.documentElement.style.setProperty('--u', `${u}px`);
    }

    show(id) { document.getElementById(id).classList.remove('hidden'); }
    hide(id) { document.getElementById(id).classList.add('hidden'); }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new OddEven();
});
