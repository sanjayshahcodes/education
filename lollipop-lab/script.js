class LollipopLab {
    constructor() {
        this.totalGames = 0;
        this.problem = null;
        this.phase = null;
        this.originalSlots = [];   // [{id, state: 'active'|'consumed'}]
        this.addedSlots = [];
        this.targetAdd = 0;
        this.targetRemove = 0;
        this.removedSoFar = 0;
        this.currentInput = '';
        this.nextSlotId = 0;
        this.freshSlots = new Set();      // slot ids that should pop-in on next render
        this.freshConsumed = new Set();   // slot ids that should gray-animate on next render
        this.init();
    }

    init() {
        this.buildNumberPad();

        document.getElementById('start-btn').addEventListener('click', () => this.onStart());
        document.getElementById('continue-btn').addEventListener('click', () => this.startSolvePhase());
        document.getElementById('solve-next-btn').addEventListener('click', () => this.startNewRound());

        this.attachDragSource(document.getElementById('supply-stack'), { amount: 5 }, 'supply');
        this.attachDragSource(document.getElementById('supply-single'), { amount: 1 }, 'supply');

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

    // ── Slot helpers ────────────────────────────────────

    makeSlot() {
        const slot = { id: this.nextSlotId++, state: 'active' };
        this.freshSlots.add(slot.id);
        return slot;
    }

    activeCount(slots) {
        return slots.reduce((n, s) => n + (s.state === 'active' ? 1 : 0), 0);
    }

    startNewRound() {
        this.problem = this.generateProblem();
        this.originalSlots = [];
        for (let i = 0; i < this.problem.a; i++) this.originalSlots.push(this.makeSlot());
        this.addedSlots = [];
        this.targetAdd = this.problem.b;
        this.targetRemove = this.problem.c;
        this.removedSoFar = 0;
        this.currentInput = '';
        // Don't pop-in animate the starting pile
        this.freshSlots.clear();
        this.freshConsumed.clear();

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
        this.hide('board');
        this.resetPromptSteps();
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
        this.renderSection(document.getElementById('original-body'), this.originalSlots, 'original');
        this.renderSection(document.getElementById('added-body'), this.addedSlots, 'added');
        document.getElementById('orig-count').textContent = this.activeCount(this.originalSlots);
        document.getElementById('added-count').textContent = this.activeCount(this.addedSlots);
        document.getElementById('added-compartment').classList.toggle('has-content', this.addedSlots.length > 0);

        // Clear fresh markers — anything fresh has now been rendered with its animation
        this.freshSlots.clear();
        this.freshConsumed.clear();
    }

    renderSection(container, slots, section) {
        container.innerHTML = '';
        // Original pile only becomes interactive once added is fully consumed.
        const sectionInteractive = this.phase === 'remove' && (
            section === 'added' || this.activeCount(this.addedSlots) === 0
        );
        for (let i = 0; i < slots.length; i += 5) {
            const colSlots = slots.slice(i, i + 5);
            container.appendChild(this.makeColumn(colSlots, section, sectionInteractive));
        }
    }

    makeColumn(colSlots, section, interactive) {
        const stack = document.createElement('div');
        stack.className = 'stack';

        const activeSlots = colSlots.filter(s => s.state === 'active');

        if (interactive && activeSlots.length > 0) {
            const grab = document.createElement('div');
            grab.className = 'stack-grab';
            grab.textContent = '⇡';
            this.attachDragSource(grab, { slotIds: activeSlots.map(s => s.id) }, section);
            stack.appendChild(grab);
        }

        for (const slot of colSlots) {
            const lp = document.createElement('span');
            lp.className = 'lp';
            lp.dataset.slot = String(slot.id);
            lp.textContent = '🍭';

            if (slot.state === 'consumed') {
                lp.classList.add('consumed');
                if (!this.freshConsumed.has(slot.id)) {
                    lp.classList.add('no-anim');
                }
            } else {
                if (this.freshSlots.has(slot.id)) {
                    lp.classList.add('appearing');
                    setTimeout(() => lp.classList.remove('appearing'), 350);
                }
                if (interactive) {
                    this.attachDragSource(lp, { slotIds: [slot.id] }, section);
                }
            }
            stack.appendChild(lp);
        }
        return stack;
    }

    // ── Drag system ────────────────────────────────────

    attachDragSource(el, payload, sourceType) {
        el.addEventListener('pointerdown', (e) => this.startDrag(e, el, payload, sourceType));
    }

    startDrag(e, el, payload, sourceType) {
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
                const accepted = this.handleDrop(payload, sourceType);
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

    handleDrop(payload, sourceType) {
        if (this.phase === 'add') {
            const amount = payload.amount;
            const remaining = this.targetAdd - this.activeCount(this.addedSlots);
            if (amount > remaining) return false;
            for (let i = 0; i < amount; i++) this.addedSlots.push(this.makeSlot());
            this.renderAll();
            this.checkAddDone();
            return true;
        } else if (this.phase === 'remove') {
            const ids = payload.slotIds || [];
            const remaining = this.targetRemove - this.removedSoFar;
            if (ids.length === 0 || ids.length > remaining) return false;
            const slots = sourceType === 'original' ? this.originalSlots : this.addedSlots;
            const idSet = new Set(ids);
            let consumed = 0;
            for (const slot of slots) {
                if (idSet.has(slot.id) && slot.state === 'active') {
                    slot.state = 'consumed';
                    this.freshConsumed.add(slot.id);
                    consumed++;
                }
            }
            this.removedSoFar += consumed;
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

    resetPromptSteps() {
        const stepAdd = document.getElementById('step-add');
        const stepRemove = document.getElementById('step-remove');
        stepAdd.innerHTML = '';
        stepRemove.innerHTML = '';
        stepAdd.classList.add('hidden');
        stepRemove.classList.add('hidden');
        stepAdd.classList.remove('done', 'appearing');
        stepRemove.classList.remove('done', 'appearing');
    }

    setStepText(stepEl, verb, num) {
        stepEl.innerHTML =
            `<span class="step-text">${verb} <span class="num-active">${num}</span> lollipops</span>`;
    }

    markStepDone(stepEl) {
        stepEl.classList.add('done');
        const check = document.createElement('span');
        check.className = 'check';
        check.textContent = '✓';
        stepEl.appendChild(check);
    }

    startAddPhase() {
        this.phase = 'add';
        const { b } = this.problem;
        const stepAdd = document.getElementById('step-add');
        stepAdd.classList.remove('hidden');
        stepAdd.classList.add('appearing');
        this.setStepText(stepAdd, 'Add', b);
        this.setActiveStep('eq-add');
    }

    checkAddDone() {
        if (this.activeCount(this.addedSlots) >= this.targetAdd) {
            this.markStepDone(document.getElementById('step-add'));
            this.phase = 'transition';
            setTimeout(() => this.startRemovePhase(), 500);
        }
    }

    startRemovePhase() {
        this.phase = 'remove';
        const { c } = this.problem;
        const stepRemove = document.getElementById('step-remove');
        stepRemove.classList.remove('hidden');
        stepRemove.classList.add('appearing');
        this.setStepText(stepRemove, 'Subtract', c);
        this.setActiveStep('eq-sub');
        const supplyCard = document.getElementById('supply-card');
        supplyCard.classList.add('bin-mode');
        document.getElementById('supply-label').textContent = 'Bin';
        document.getElementById('supply-body').classList.add('hidden');
        document.getElementById('bin').classList.remove('hidden');
        this.renderAll();
    }

    checkRemoveDone() {
        if (this.removedSoFar >= this.targetRemove) {
            this.markStepDone(document.getElementById('step-remove'));
            this.phase = 'transition';
            setTimeout(() => this.startSettlePhase(), 600);
        }
    }

    startSettlePhase() {
        this.phase = 'settle';
        this.resetPromptSteps();
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
        this.show('settle-section');
    }

    // ── Solve ──────────────────────────────────────────

    startSolvePhase() {
        this.phase = 'solve';
        this.hide('settle-section');
        this.hide('board');
        const stepAdd = document.getElementById('step-add');
        stepAdd.classList.remove('hidden', 'done');
        stepAdd.innerHTML = 'How many lollipops do you have now?';

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
