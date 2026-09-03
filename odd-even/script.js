/**
 * Odd and Even — why odd + odd comes out even.
 *
 * Every number is laid out two across and counted, top to bottom. An even
 * number fills its rectangle exactly. An odd number leaves a notch at the
 * bottom right, and the block sitting alone beside that notch is the whole
 * point: it is the one with no partner.
 *
 * She calls the answer odd or even, and the sum then appears as a third
 * term, drawn the same way, so all three are on screen together:
 *
 *      ODD          ODD             EVEN
 *       7      +     5       =       12
 *    ┌──┬──┐      ┌──┬──┐         ┌──┬──┐
 *    │ 1│ 2│      │ 1│ 2│         │ 1│ 2│
 *    │ 3│ 4│      │ 3│ 4│         │ 3│ 4│
 *    │ 5│ 6│      │ 5│  ▒         │ 5│ 6│
 *    │ 7│  ▒      └──┴──┘         │ 7│ 8│  ← the two leftovers, paired
 *    └──┴──┘                      │ 9│10│
 *                                 │11│12│
 *                                 └──┴──┘
 *
 * The sum keeps both numbers' colours, so it's visible which blocks came
 * from where — and that the lone 7 is now sitting beside the 8. Two notches
 * on the left, none on the right.
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
        this.MAX_TERM = 25;
        // Two across, so a sum of forty is twenty rows tall — which is what
        // sets the smallest the cells can get.
        this.MAX_SUM = 40;

        this.U_MIN = 16;
        this.U_MAX = 60;

        this.totalGames = 0;
        this.correctCount = 0;
        this.problem = null;
        this.answered = false;
        // Which addends she has named so far. The answer's choice stays shut
        // until both are in.
        this.named = { a: false, b: false };
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
            if (this.problem && this.problem.a === a && this.problem.b === b) continue;

            // Which number's blocks get counted first inside the sum. On a
            // mixed problem it's the EVEN one, whichever side it's written,
            // so the block left over at the bottom belongs to the odd number.
            // Count the odd one first instead and its leftover gets partnered,
            // leaving a block from the even number standing at the end — the
            // picture then says the even number caused the odd result, which
            // is backwards.
            const leadSide = (kind === 'mixed' && aOdd) ? 'b' : 'a';

            const sum = a + b;
            return {
                a, b, sum, kind, leadSide,
                aOdd, bOdd,
                sumOdd: sum % 2 === 1,
                rows: Math.ceil(sum / 2),
            };
        }
        return { a: 7, b: 5, sum: 12, kind: 'oddodd', leadSide: 'a',
                 aOdd: true, bOdd: true, sumOdd: false, rows: 6 };
    }

    // ── Round lifecycle ────────────────────────────

    startNewRound() {
        this.clearTimers();
        this.problem = this.generateProblem();
        this.answered = false;

        this.named = { a: false, b: false };
        document.querySelectorAll('.choice-btn').forEach(b => {
            b.classList.remove('right', 'wrong');
        });
        document.getElementById('choice-buttons').classList.remove('faded', 'ready');
        document.getElementById('answer-term').classList.remove('shown');
        document.getElementById('continue-btn').classList.remove('shown');

        this.renderBoard();
        this.fitUnit();
    }

    answer(choice, btn) {
        if (this.answered) return;
        if (!this.named.a || !this.named.b) return;
        this.answered = true;

        const correct = (choice === 'odd') === this.problem.sumOdd;
        this.totalGames++;
        if (correct) this.correctCount++;
        document.getElementById('total-count').textContent = this.totalGames;
        document.getElementById('correct-count').textContent = this.correctCount;
        btn.classList.add(correct ? 'right' : 'wrong');

        this.reveal();
    }

    // The sum takes the choices' place, drawn like the other two terms. Both
    // addends stay put, so the two notches on the left can be compared
    // against whatever the answer turned out to be.
    reveal() {
        this.timers.push(setTimeout(() => {
            document.getElementById('choice-buttons').classList.add('faded');
            document.getElementById('answer-term').classList.add('shown');

            document.getElementById('continue-btn').classList.add('shown');
        }, 350));
    }

    clearTimers() {
        this.timers.forEach(clearTimeout);
        this.timers = [];
    }

    // ── Rendering ──────────────────────────────────

    renderBoard() {
        const { a, b, sum, leadSide } = this.problem;

        const terms = document.getElementById('terms');
        terms.innerHTML = '';
        terms.appendChild(this.buildTerm('a', a, () => 'a', true));

        const op = document.createElement('div');
        op.className = 'op';
        op.textContent = '+';
        terms.appendChild(op);

        terms.appendChild(this.buildTerm('b', b, () => 'b', true));

        // The sum, in both numbers' colours: the lead number's blocks first,
        // then the other's. Where the colour changes shows what each
        // contributed, and whose block is the one left over.
        const leadCount = leadSide === 'a' ? a : b;
        const otherSide = leadSide === 'a' ? 'b' : 'a';
        const answer = document.getElementById('answer-term');
        answer.innerHTML = '';
        answer.appendChild(
            this.buildTerm('sum', sum, (i) => i < leadCount ? leadSide : otherSide, false));
    }

    // The settled pill: what a number is, stated.
    buildPill(value) {
        const pill = document.createElement('div');
        pill.className = 'term-parity';
        pill.textContent = value % 2 === 1 ? 'Odd' : 'Even';
        return pill;
    }

    // The unsettled one: what a number is, asked. She reads it off the blocks
    // underneath and says so; the answer's choice stays shut until both
    // addends have been named.
    buildChooser(side, value) {
        const wrap = document.createElement('div');
        wrap.className = 'parity-pick-wrap';

        const pick = document.createElement('select');
        pick.className = 'parity-pick';
        pick.innerHTML =
            '<option value="">?</option>' +
            '<option value="odd">Odd</option>' +
            '<option value="even">Even</option>';

        pick.addEventListener('change', () => {
            const want = value % 2 === 1 ? 'odd' : 'even';
            if (pick.value === want) {
                pick.classList.remove('wrong');
                pick.classList.add('locked');
                wrap.classList.add('locked');
                pick.disabled = true;
                this.named[side] = true;
                if (this.named.a && this.named.b) {
                    document.getElementById('choice-buttons').classList.add('ready');
                }
            } else {
                // Wrong: say so, and put the question back for another go.
                pick.classList.add('wrong');
                this.timers.push(setTimeout(() => {
                    pick.classList.remove('wrong');
                    pick.value = '';
                }, 550));
            }
        });

        wrap.appendChild(pick);
        return wrap;
    }

    // Two across, counted 1, 2, 3... top to bottom. An even number comes out a
    // perfect rectangle; an odd one leaves a notch at the bottom right.
    buildTerm(side, value, colourOf, chooser) {
        const term = document.createElement('div');
        term.className = `term side-${side}`;
        term.appendChild(chooser ? this.buildChooser(side, value) : this.buildPill(value));

        const label = document.createElement('div');
        label.className = 'term-label';
        label.textContent = String(value);
        term.appendChild(label);

        const rule = document.createElement('div');
        rule.className = 'term-rule';
        term.appendChild(rule);

        const pairs = document.createElement('div');
        pairs.className = 'pairs';

        let rowEl = null;
        for (let i = 0; i < value; i++) {
            if (i % 2 === 0) {
                rowEl = document.createElement('div');
                rowEl.className = 'row';
                pairs.appendChild(rowEl);
            }
            const cell = document.createElement('div');
            cell.className = `cell ${colourOf(i)}`;
            cell.textContent = String(i + 1);
            rowEl.appendChild(cell);
        }

        term.appendChild(pairs);
        return term;
    }

    // Two across means height is what runs out first: the sum is the tallest
    // pile, so it sets the cell size.
    fitUnit() {
        if (!this.problem) return;
        const { rows } = this.problem;
        const board = document.getElementById('board');
        const row = document.getElementById('sum-row');
        const availW = board.clientWidth;
        // The row sits a fixed distance below the header, so that gap isn't
        // available to the piles.
        const availH = board.clientHeight - parseFloat(getComputedStyle(row).marginTop);
        if (availW <= 0 || availH <= 0) return;

        // Parity pill, numeral, rule, the rows themselves, plus a little air.
        const unitsTall = 0.68 + 1.15 + 0.5 + rows + 0.6;

        // Take what the height allows, then measure and back off if the line
        // is too wide. Guessing the width in --u means guessing how wide the
        // rule sentence and the buttons render, which is how this ended up
        // needlessly small; everything on the line scales with --u, so one
        // measurement gives the right answer.
        const setU = (u) => document.documentElement.style.setProperty('--u', `${u}px`);
        const clamp = (u) => Math.max(this.U_MIN, Math.min(this.U_MAX, Math.floor(u)));

        let u = clamp(availH / unitsTall);
        setU(u);

        // The buttons hang outside the row's box on both sides, so measure the
        // widest thing actually drawn rather than the row alone.
        const rowBox = row.getBoundingClientRect();
        const btns = document.getElementById('choice-buttons').getBoundingClientRect();
        const drawnW = Math.max(rowBox.right, btns.right) - Math.min(rowBox.left, btns.left);
        if (drawnW > availW) setU(clamp(u * (availW / drawnW)));
    }

    show(id) { document.getElementById(id).classList.remove('hidden'); }
    hide(id) { document.getElementById(id).classList.add('hidden'); }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new OddEven();
});
