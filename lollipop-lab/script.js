class LollipopLab {
    constructor() {
        this.totalGames = 0;
        this.problem = null;
        this.phase = null;
        this.originalCount = 0;
        this.consumedOriginal = 0;
        this.addedCount = 0;
        this.consumedAdded = 0;
        this.targetAdd = 0;
        this.targetRemove = 0;
        this.removedSoFar = 0;
        this.currentInput = '';
        this.init();
    }

    init() {
        this.buildNumberPad();

        document.getElementById('start-btn').addEventListener('click', () => this.onStart());
        document.getElementById('phase-done-btn').addEventListener('click', () => this.onPhaseDone());
        document.getElementById('continue-btn').addEventListener('click', () => this.startSolvePhase());
        document.getElementById('solve-next-btn').addEventListener('click', () => this.startNewRound());

        this.attachDragSource(document.getElementById('supply-stack'), 5, 'supply');
        this.attachDragSource(document.getElementById('supply-single'), 1, 'supply');

        this.startNewRound();
    }

    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    generateProblem() {
        const a = this.randInt(8, 15);
        const b = this.randInt(12, 20);
        let c;
        do { c = b + this.randInt(-3, 3); } while (c === b || c < 1);
        const net = b - c;
        return { a, b, c, net };
    }

    startNewRound() {
        this.problem = this.generateProblem();
        this.originalCount = this.problem.a;
        this.consumedOriginal = 0;
        this.addedCount = 0;
        this.consumedAdded = 0;
        this.targetAdd = this.problem.b;
        this.targetRemove = this.problem.c;
        this.removedSoFar = 0;
        this.currentInput = '';

        const { a, b, c } = this.problem;
        document.getElementById('main-equation').innerHTML =
            `<span class="eq-part">${a}</span>` +
            `<span class="eq-part" id="eq-add">+ ${b}</span>` +
            `<span class="eq-part" id="eq-sub">− ${c}</span>` +
            `<span class="eq-part eq-tail">= ?</span>`;

        this.hide('settle-section');
        this.hide('solve-section');
        this.hide('solve-next-btn');
        this.show('number-pad');
        this.hide('phase-done-btn');
        this.hide('board');
        document.getElementById('phase-prompt').textContent = '';
        this.setActiveStep(null);

        const supplyCard = document.getElementById('supply-card');
        supplyCard.classList.remove('bin-mode');
        document.getElementById('supply-label').textContent = 'Supply';
        document.getElementById('supply-body').classList.remove('hidden');
        document.getElementById('bin').classList.add('hidden');

        this.renderAll();
        this.show('start-section');
    }

    onStart() {
        this.hide('start-section');
        this.show('board');
        this.startAddPhase();
    }

    // ── Rendering ──────────────────────────────────────

    renderAll() {
        const origTotal = this.originalCount + this.consumedOriginal;
        const addedTotal = this.addedCount + this.consumedAdded;
        this.renderStacks(document.getElementById('original-body'), origTotal, 'original', this.consumedOriginal);
        this.renderStacks(document.getElementById('added-body'), addedTotal, 'added', this.consumedAdded);
        document.getElementById('orig-count').textContent = this.originalCount;
        document.getElementById('added-count').textContent = this.addedCount;
        document.getElementById('added-compartment').classList.toggle('has-content', addedTotal > 0);
    }

    renderStacks(container, count, section, grayedCount = 0) {
        container.innerHTML = '';
        const fullStacks = Math.floor(count / 5);
        const rem = count % 5;
        const grayedStartIdx = count - grayedCount;
        let renderedIdx = 0;

        const flagsForStack = (size) => {
            const flags = [];
            for (let i = 0; i < size; i++) {
                flags.push(renderedIdx >= grayedStartIdx);
                renderedIdx++;
            }
            return flags;
        };

        for (let s = 0; s < fullStacks; s++) {
            container.appendChild(this.makeStack(5, section, true, flagsForStack(5)));
        }
        if (rem > 0) {
            container.appendChild(this.makeStack(rem, section, false, flagsForStack(rem)));
        }
    }

    makeStack(size, section, full, grayedFlags) {
        const stack = document.createElement('div');
        stack.className = 'stack';

        const hasGrayed = grayedFlags.some(g => g);

        // Stack-grab handle: only on full stacks of all-white lollipops in remove phase
        if (this.phase === 'remove' && full && !hasGrayed) {
            const grab = document.createElement('div');
            grab.className = 'stack-grab';
            grab.textContent = '⇡ 5';
            this.attachDragSource(grab, 5, section);
            stack.appendChild(grab);
        }

        for (let i = 0; i < size; i++) {
            const lp = document.createElement('span');
            lp.className = 'lp';
            lp.textContent = '🍭';
            if (grayedFlags[i]) {
                lp.classList.add('consumed');
            } else {
                lp.classList.add('appearing');
                setTimeout(() => lp.classList.remove('appearing'), 350);
                if (this.phase === 'remove') {
                    this.attachDragSource(lp, 1, section);
                }
            }
            stack.appendChild(lp);
        }
        return stack;
    }

    // ── Drag system ────────────────────────────────────

    attachDragSource(el, amount, sourceType) {
        el.addEventListener('pointerdown', (e) => this.startDrag(e, el, amount, sourceType));
    }

    startDrag(e, el, amount, sourceType) {
        if (this.phase === 'add' && sourceType !== 'supply') return;
        if (this.phase === 'remove' && sourceType === 'supply') return;
        if (this.phase !== 'add' && this.phase !== 'remove') return;

        e.preventDefault();
        e.stopPropagation();

        const ghost = el.cloneNode(true);
        ghost.classList.add('drag-ghost');
        const rect = el.getBoundingClientRect();
        ghost.style.width = rect.width + 'px';
        ghost.style.height = rect.height + 'px';
        ghost.style.left = rect.left + 'px';
        ghost.style.top = rect.top + 'px';
        document.body.appendChild(ghost);

        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        const dropSelector = (this.phase === 'add') ? '.pile-card' : '#bin';
        const dropEl = document.querySelector(dropSelector);

        const move = (ev) => {
            ghost.style.left = (ev.clientX - offsetX) + 'px';
            ghost.style.top  = (ev.clientY - offsetY) + 'px';
            const target = document.elementFromPoint(ev.clientX, ev.clientY);
            const overDrop = target && target.closest(dropSelector);
            dropEl.classList.toggle('drop-hot', !!overDrop);
        };

        const up = (ev) => {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', up);
            document.removeEventListener('pointercancel', up);
            dropEl.classList.remove('drop-hot');

            ghost.style.pointerEvents = 'none';
            const target = document.elementFromPoint(ev.clientX, ev.clientY);
            const overDrop = target && target.closest(dropSelector);

            const snapBack = () => {
                ghost.classList.add('snap-back');
                ghost.style.left = rect.left + 'px';
                ghost.style.top = rect.top + 'px';
                setTimeout(() => ghost.remove(), 260);
            };

            if (overDrop) {
                const accepted = this.handleDrop(amount, sourceType);
                if (accepted) {
                    ghost.remove();
                } else {
                    snapBack();
                    this.shake(el);
                }
            } else {
                snapBack();
            }
        };

        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
        document.addEventListener('pointercancel', up);
    }

    handleDrop(amount, sourceType) {
        if (this.phase === 'add') {
            const remaining = this.targetAdd - this.addedCount;
            if (amount > remaining) return false; // reject — would overshoot
            this.addedCount += amount;
            this.renderAll();
            this.checkAddDone();
            return true;
        } else if (this.phase === 'remove') {
            const remaining = this.targetRemove - this.removedSoFar;
            if (amount > remaining) return false; // reject — would overshoot
            let toRemove = amount;

            if (sourceType === 'added') {
                const fromAdded = Math.min(toRemove, this.addedCount);
                this.addedCount -= fromAdded;
                this.consumedAdded += fromAdded;
                this.removedSoFar += fromAdded;
                toRemove -= fromAdded;
                if (toRemove > 0) {
                    const fromOrig = Math.min(toRemove, this.originalCount);
                    this.originalCount -= fromOrig;
                    this.consumedOriginal += fromOrig;
                    this.removedSoFar += fromOrig;
                }
            } else if (sourceType === 'original') {
                const fromOrig = Math.min(toRemove, this.originalCount);
                this.originalCount -= fromOrig;
                this.consumedOriginal += fromOrig;
                this.removedSoFar += fromOrig;
                toRemove -= fromOrig;
                if (toRemove > 0) {
                    const fromAdded = Math.min(toRemove, this.addedCount);
                    this.addedCount -= fromAdded;
                    this.consumedAdded += fromAdded;
                    this.removedSoFar += fromAdded;
                }
            }

            this.renderAll();
            this.checkRemoveDone();
            return true;
        }
        return false;
    }

    // ── Phases ─────────────────────────────────────────

    setActiveStep(stepId) {
        document.querySelectorAll('.eq-part').forEach(el => el.classList.remove('active'));
        if (stepId) {
            const el = document.getElementById(stepId);
            if (el) el.classList.add('active');
        }
    }

    startAddPhase() {
        this.phase = 'add';
        const { b } = this.problem;
        document.getElementById('phase-prompt').innerHTML =
            `Drag <span class="num-active">${b}</span> lollipops into your pile`;
        this.setActiveStep('eq-add');
    }

    checkAddDone() {
        if (this.addedCount >= this.targetAdd) this.show('phase-done-btn');
        else this.hide('phase-done-btn');
    }

    startRemovePhase() {
        this.phase = 'remove';
        const { c } = this.problem;
        document.getElementById('phase-prompt').innerHTML =
            `Drag <span class="num-active">${c}</span> lollipops into the bin`;
        this.setActiveStep('eq-sub');
        const supplyCard = document.getElementById('supply-card');
        supplyCard.classList.add('bin-mode');
        document.getElementById('supply-label').textContent = 'Bin';
        document.getElementById('supply-body').classList.add('hidden');
        document.getElementById('bin').classList.remove('hidden');
        this.renderAll();
        this.hide('phase-done-btn');
    }

    checkRemoveDone() {
        if (this.removedSoFar >= this.targetRemove) this.show('phase-done-btn');
        else this.hide('phase-done-btn');
    }

    onPhaseDone() {
        if (this.phase === 'add') this.startRemovePhase();
        else if (this.phase === 'remove') this.startSettlePhase();
    }

    startSettlePhase() {
        this.phase = 'settle';
        document.getElementById('phase-prompt').textContent = '';
        this.setActiveStep(null);
        const { net } = this.problem;
        const msgEl = document.getElementById('settle-message');
        if (net > 0) {
            msgEl.innerHTML = `You ended up with <span class="gain">${net} more</span> lollipops than you started with! 🎉`;
        } else if (net < 0) {
            msgEl.innerHTML = `You ended up with <span class="loss">${Math.abs(net)} fewer</span> lollipops than you started with.`;
        } else {
            msgEl.innerHTML = `You ended up right where you started!`;
        }
        this.hide('phase-done-btn');
        this.show('settle-section');
    }

    // ── Solve ──────────────────────────────────────────

    startSolvePhase() {
        this.phase = 'solve';
        this.hide('settle-section');
        this.hide('board');
        document.getElementById('phase-prompt').textContent = 'How many lollipops do you have now?';

        const { a, net } = this.problem;
        const sign = net >= 0 ? '+' : '−';
        const cls  = net >= 0 ? 'add' : 'sub';
        const amount = Math.abs(net);
        const netHtml = net === 0 ? '' :
            ` <span class="${cls}">${sign} ${amount}</span>`;
        document.getElementById('solve-equation').innerHTML =
            `${a}${netHtml} = <span id="solve-answer">?</span>`;
        this.show('solve-section');
    }

    buildNumberPad() {
        const pad = document.getElementById('number-pad');
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, '⌫', 'GO'].forEach(val => {
            const btn = document.createElement('button');
            btn.className = 'pad-btn';
            if (val === 'GO') btn.classList.add('pad-go');
            if (val === '⌫') btn.classList.add('pad-back');
            btn.textContent = val;
            btn.addEventListener('click', () => {
                if (val === 'GO') this.handleInput('enter');
                else if (val === '⌫') this.handleInput('backspace');
                else this.handleInput(String(val));
            });
            pad.appendChild(btn);
        });
    }

    handleInput(value) {
        if (value === 'backspace') {
            this.currentInput = this.currentInput.slice(0, -1);
        } else if (value === 'enter') {
            if (this.currentInput.length > 0) this.checkSolve(parseInt(this.currentInput));
            return;
        } else {
            if (this.currentInput.length < 3) this.currentInput += value;
        }
        const ansEl = document.getElementById('solve-answer');
        if (ansEl) ansEl.textContent = this.currentInput || '?';
    }

    checkSolve(answer) {
        const { a, net } = this.problem;
        if (answer === a + net) {
            this.totalGames++;
            document.getElementById('total-count').textContent = this.totalGames;
            const ansEl = document.getElementById('solve-answer');
            ansEl.textContent = answer;
            ansEl.classList.add('correct');
            this.hide('number-pad');
            this.show('solve-next-btn');
            this.celebrate();
        } else {
            this.shake(document.getElementById('solve-answer'));
            this.currentInput = '';
            setTimeout(() => {
                const ansEl = document.getElementById('solve-answer');
                if (ansEl && !ansEl.classList.contains('correct')) ansEl.textContent = '?';
            }, 500);
        }
    }

    show(id) { document.getElementById(id).classList.remove('hidden'); }
    hide(id) { document.getElementById(id).classList.add('hidden'); }

    shake(el) {
        if (!el) return;
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 500);
    }

    celebrate() {
        const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9A3C'];
        for (let i = 0; i < 32; i++) {
            setTimeout(() => {
                const p = document.createElement('div');
                p.className = 'particle';
                p.style.left = Math.random() * 100 + 'vw';
                p.style.background = colors[Math.floor(Math.random() * colors.length)];
                p.style.color = colors[Math.floor(Math.random() * colors.length)];
                p.style.animationDuration = (2 + Math.random() * 2) + 's';
                p.style.animationDelay = Math.random() * 0.5 + 's';
                document.getElementById('particles-container').appendChild(p);
                setTimeout(() => p.remove(), 4000);
            }, i * 40);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => new LollipopLab());
