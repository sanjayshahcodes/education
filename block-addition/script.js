/**
 * Block Addition — why 70 + 90 is 160, by way of 7 + 9.
 *
 * Ten fits in the frame. The first number fills part of it and the second
 * stands loose beside it, so the question on screen is always the same one:
 * how much of that pile does it take to finish the ten, and what's left?
 *
 *       7 + 9 = [   ]
 *     ─────────────────────────────────
 *          7                 9
 *     ▪▪▪▪▪▪▪□□□          ▪▪▪▪▪▪▪▪▪
 *
 * Three cross over, the frame is full, six are left: ten and six, 16.
 *
 * Then the very next problem is the same fact one place up. A unit stops
 * being a single cell and becomes a column of ten, so the frame of ten
 * units is a hundred board:
 *
 *       70 + 90 = [   ]
 *     ─────────────────────────────────
 *         70                90
 *     |||||||□□□          |||||||||
 *
 * Three columns cross over, the board is full, six columns are left: a
 * hundred and sixty. Same frame, same three, same move — which is the whole
 * point of showing them back to back rather than side by side. Seeing
 * 7 + 9 = 16 sitting next to it would only teach "add a zero".
 *
 * Problems always bridge: a + b is over ten, so the frame always fills and
 * something is always left over.
 *
 * She doesn't touch the blocks — same as block-subtraction. They're there
 * to look at while she works it out, and after she answers, the units that
 * are needed travel across and the two parts name themselves.
 */

class BlockAddition {
    constructor() {
        // A unit is one cell at the ones place and a column of ten at the
        // tens place. Everything else about the two is identical.
        this.PLACES = {
            ones: { unit: 1,  unitH: 1  },
            tens: { unit: 10, unitH: 10 },
        };

        // Problems come in pairs: the small fact, then the same fact one
        // place up, back to back.
        this.pairStep = 0;
        this.fact = null;

        this.PAIR_GAP = 1.0;   // between a term and the operator, in cells
        this.OP_W     = 2.2;
        this.U_MIN    = 12;
        this.U_MAX    = 40;

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

    // Both addends have to be big enough to matter and their sum has to
    // cross ten, so the frame always fills and something is always left.
    newFact() {
        for (let tries = 0; tries < 200; tries++) {
            const a = this.randInt(2, 9);
            const b = this.randInt(2, 9);
            if (a + b <= 10) continue;
            if (this.fact && this.fact.a === a && this.fact.b === b) continue;
            return { a, b };
        }
        return { a: 7, b: 9 };
    }

    generateProblem() {
        // Step 0 is a new fact at the ones place; step 1 is that same fact
        // at the tens place, immediately after.
        if (this.pairStep === 0) this.fact = this.newFact();
        const name = this.pairStep === 0 ? 'ones' : 'tens';
        this.pairStep = 1 - this.pairStep;

        const place = this.PLACES[name];
        const { a, b } = this.fact;

        // How many units it takes to finish the frame, and what survives.
        const moved = 10 - a;
        const left = b - moved;

        return {
            place: name, unitH: place.unitH,
            a, b, moved, left,
            top: a * place.unit,
            addend: b * place.unit,
            answer: (a + b) * place.unit,
        };
    }

    // ── Round lifecycle ────────────────────────────

    startNewRound() {
        this.clearTimers();
        this.problem = this.generateProblem();
        this.input = '';
        this.revealed = false;

        document.getElementById('caption').textContent = '';
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

    // The units the frame is short of travel across, all together. As they
    // land, the two parts say what they're worth and the equation completes:
    // a full frame and whatever stayed behind.
    runReveal() {
        const { top, addend, answer, place, moved, left, unitH } = this.problem;
        const caption = document.getElementById('caption');
        const step = (delay, fn) => this.timers.push(setTimeout(fn, delay));

        step(400, () => this.flyUnitsIn());

        step(1150, () => {
            const whole = place === 'ones' ? 10 : 100;
            document.getElementById('frame-label').textContent = String(whole);
            document.getElementById('frame-label').classList.add('show');

            const rest = left * (place === 'ones' ? 1 : 10);
            const looseLabel = document.getElementById('loose-label');
            looseLabel.textContent = String(rest);
            looseLabel.classList.add('show');

            caption.textContent = `${top} + ${addend} = ${answer}`;

            const box = document.getElementById('eq-answer-box');
            if (box) {
                box.classList.remove('right', 'wrong');
                box.classList.add('revealed');
                box.textContent = String(answer);
            }
        });

        step(2000, () => this.show('continue-btn'));
    }

    // Translate the leading units of the loose pile onto the frame's empty
    // slots. They keep their own colour, so the finished frame visibly shows
    // which part came from which number. The gap they leave behind is what
    // separates the whole from the remainder.
    flyUnitsIn() {
        const { moved } = this.problem;
        const slots = [...document.querySelectorAll('#frame .slot')];
        const loose = [...document.querySelectorAll('#loose .unit')];

        for (let i = 0; i < moved; i++) {
            const unit = loose[i];
            const slot = slots[i];
            if (!unit || !slot) continue;
            const from = unit.getBoundingClientRect();
            const to = slot.getBoundingClientRect();
            unit.classList.add('moving');
            unit.style.transform =
                `translate(${to.left - from.left}px, ${to.top - from.top}px)`;
        }
    }

    clearTimers() {
        this.timers.forEach(clearTimeout);
        this.timers = [];
    }

    // ── Rendering ──────────────────────────────────

    renderEquation() {
        const { top, addend } = this.problem;
        document.getElementById('main-equation').innerHTML =
            `<span class="eq-num-a">${top}</span>` +
            `<span class="eq-op">+</span>` +
            `<span class="eq-num-b">${addend}</span>` +
            `<span class="eq-op">=</span>` +
            `<span class="eq-answer-box" id="eq-answer-box"></span>`;
        this.renderInput();
    }

    renderInput() {
        const box = document.getElementById('eq-answer-box');
        if (box) box.textContent = this.input;
    }

    renderBoard() {
        const { a, b, top, addend, unitH, moved } = this.problem;
        const root = document.documentElement.style;
        root.setProperty('--uh', unitH);
        root.setProperty('--moved', moved);

        const row = document.getElementById('sum-row');
        row.innerHTML = '';

        // The frame: ten places, the first `a` of them already filled.
        const frame = document.createElement('div');
        frame.className = 'frame';
        frame.id = 'frame';
        for (let i = 0; i < 10; i++) {
            const cell = document.createElement('div');
            cell.className = i < a ? 'unit a' : 'slot';
            frame.appendChild(cell);
        }
        row.appendChild(this.buildTerm('side-a', top, frame, 'frame-label'));

        const op = document.createElement('div');
        op.className = 'op';
        op.textContent = '+';
        row.appendChild(op);

        // The loose pile, standing beside it.
        const loose = document.createElement('div');
        loose.className = 'loose';
        loose.id = 'loose';
        for (let i = 0; i < b; i++) {
            const unit = document.createElement('div');
            unit.className = 'unit b';
            loose.appendChild(unit);
        }
        row.appendChild(this.buildTerm('side-b', addend, loose, 'loose-label'));
    }

    buildTerm(sideClass, value, blocks, labelId) {
        const term = document.createElement('div');
        term.className = `term ${sideClass}`;

        const label = document.createElement('div');
        label.className = 'term-label';
        label.textContent = String(value);
        term.appendChild(label);

        const rule = document.createElement('div');
        rule.className = 'term-rule';
        term.appendChild(rule);

        term.appendChild(blocks);

        // Filled in on the reveal with what this part turned out to be worth.
        const part = document.createElement('div');
        part.className = 'part-label';
        part.id = labelId;
        term.appendChild(part);

        return term;
    }

    // Pick the largest --u at which the whole row still fits. The frame is
    // ten units across at both places, so it comes out nearly the same size
    // either way — which is what makes the two problems look like one move.
    fitUnit() {
        if (!this.problem) return;
        const { b, unitH } = this.problem;
        const board = document.getElementById('board');
        const availW = board.clientWidth;
        const availH = board.clientHeight;
        if (availW <= 0 || availH <= 0) return;

        const PGAP = 0.18;
        const frameUnits = 10;                     // contiguous, no gaps
        const looseUnits = b + (b - 1) * PGAP;
        const unitsWide = frameUnits + looseUnits + this.OP_W + 2 * this.PAIR_GAP;
        // Numeral, rule, the blocks themselves, then the part label.
        const unitsTall = 2.4 + 1.0 + unitH + 2.4 + 1.2;

        let u = Math.min(availW / unitsWide, availH / unitsTall);
        u = Math.max(this.U_MIN, Math.min(this.U_MAX, Math.floor(u)));

        const root = document.documentElement.style;
        root.setProperty('--u', `${u}px`);
        root.setProperty('--pgap', `${Math.max(2, Math.round(PGAP * u))}px`);
    }

    show(id) { document.getElementById(id).classList.remove('hidden'); }
    hide(id) { document.getElementById(id).classList.add('hidden'); }
}

document.addEventListener('DOMContentLoaded', () => {
    // Exposed so a problem can be forced from the console while tuning.
    window.game = new BlockAddition();
});
