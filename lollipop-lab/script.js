class LollipopLab {
    constructor() {
        // Mode 1 (default): always add-then-subtract.
        // Mode 2 (?mode=2): each round is randomly add-first or subtract-first.
        const params = new URLSearchParams(location.search);
        this.mode = params.get('mode') === '2' ? 2 : 1;

        this.totalGames = 0;
        this.problem = null;
        this.phase = null;
        this.phaseQueue = [];      // remaining phases for the current round
        this.originalSlots = [];   // [{id, state: 'active'|'consumed'}]
        this.addedSlots = [];
        this.targetAdd = 0;
        this.targetRemove = 0;
        this.removedSoFar = 0;
        this.addedSoFar = 0;
        this.currentInput = '';
        this.nextSlotId = 0;
        this.freshSlots = new Set();      // slot ids that should pop-in on next render
        this.freshConsumed = new Set();   // slot ids that should gray-animate on next render
        this.freshRestored = new Set();   // slot ids that should ungray-animate on next render
        this.init();
    }

    init() {
        document.getElementById('start-btn').addEventListener('click', () => this.onStart());
        document.getElementById('continue-btn').addEventListener('click', () => this.startNewRound());

        this.attachDragSource(document.getElementById('supply-stack'), { amount: 5 }, 'supply');
        this.attachDragSource(document.getElementById('supply-single'), { amount: 1 }, 'supply');

        this.startNewRound();
    }

    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    generateProblem() {
        const addFirst = this.mode === 2 ? Math.random() < 0.5 : true;
        const b = this.randInt(12, 20);
        let c;
        do { c = b + this.randInt(-2, 2); } while (c === b || c < 1);

        let a;
        if (addFirst) {
            a = this.randInt(8, 15);
        } else {
            // Subtract-first: pick a so that (a - c) is a multiple of 5. The
            // post-subtract actives form clean columns ("how many are left?"
            // reads as N×5 at a glance), and the grays read naturally as
            // groups-of-5-plus-remainder — both trainable by counting by 5s.
            const gap = this.randInt(1, 2) * 5;  // 5 or 10
            a = c + gap;
        }

        const net = b - c;
        return { a, b, c, addFirst, net };
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
        this.addedSoFar = 0;
        this.currentInput = '';
        // Don't pop-in animate the starting pile
        this.freshSlots.clear();
        this.freshConsumed.clear();
        this.freshRestored.clear();

        const { a, b, c, addFirst } = this.problem;
        const addSpan = `<span class="eq-part" id="eq-add">+ ${b}</span>`;
        const subSpan = `<span class="eq-part" id="eq-sub">− ${c}</span>`;
        document.getElementById('main-equation').innerHTML =
            `<span class="eq-part">${a}</span>` +
            (addFirst ? addSpan + subSpan : subSpan + addSpan) +
            `<span class="eq-part eq-tail">= ?</span>`;

        // Mark phase-prompt so CSS can flip step order to match equation order
        document.getElementById('phase-prompt').classList.toggle('sub-first', !addFirst);

        this.hide('settle-section');
        this.hide('continue-btn');
        this.hide('board');
        this.hide('add-tally');
        this.resetPromptSteps();
        this.setActiveStep(null);

        const supplyCard = document.getElementById('supply-card');
        supplyCard.classList.remove('bin-mode');
        document.getElementById('supply-body').classList.remove('hidden');
        document.getElementById('bin').classList.add('hidden');

        this.renderAll();
        this.show('start-section');
    }

    onStart() {
        this.hide('start-section');
        this.show('board');
        this.phaseQueue = this.problem.addFirst ? ['add', 'remove'] : ['remove', 'add'];
        this.advancePhase();
    }

    advancePhase() {
        const next = this.phaseQueue.shift();
        if (next === 'add') this.startAddPhase();
        else if (next === 'remove') this.startRemovePhase();
    }

    // ── Rendering ──────────────────────────────────────

    renderAll(consolidate = true) {
        this.renderSection(document.getElementById('original-body'), this.originalSlots, 'original', consolidate);
        this.renderSection(document.getElementById('added-body'), this.addedSlots, 'added', consolidate);
        document.getElementById('orig-count').textContent = this.activeCount(this.originalSlots);
        document.getElementById('added-count').textContent = this.activeCount(this.addedSlots);
        document.getElementById('added-compartment').classList.toggle('has-content', this.addedSlots.length > 0);

        // Clear fresh markers — anything fresh has now been rendered with its animation
        this.freshSlots.clear();
        this.freshConsumed.clear();
        this.freshRestored.clear();
    }

    renderSection(container, slots, section, consolidate) {
        container.innerHTML = '';
        // Original pile only becomes interactive once added is fully consumed.
        const sectionInteractive = this.phase === 'remove' && (
            section === 'added' || this.activeCount(this.addedSlots) === 0
        );
        const renderGroup = (group) => {
            for (let i = 0; i < group.length; i += 5) {
                container.appendChild(this.makeColumn(group.slice(i, i + 5), section, sectionInteractive));
            }
        };
        if (consolidate) {
            // Actives flow first, consumed flow after — chunked into columns of 5.
            // A partial column at the boundary shows actives on the bottom, consumed on top.
            const actives = slots.filter(s => s.state === 'active');
            const consumed = slots.filter(s => s.state === 'consumed');
            renderGroup([...actives, ...consumed]);
        } else {
            // Literal layout — slots stay in their original positions (used for the
            // moment a drag is consumed so the gray-out animation plays in place).
            renderGroup(slots);
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
                } else if (this.freshRestored.has(slot.id)) {
                    lp.classList.add('restoring');
                    setTimeout(() => lp.classList.remove('restoring'), 400);
                }
                // Persistent marker for "I just put this back" — survives
                // re-renders during the add phase, cleared at end of round.
                if (slot.restored) lp.classList.add('restored');
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

        // For chevron drags, the ghost is the column of active lollipops being
        // lifted (chevron + consumed stripped). For single-lollipop drags and
        // supply drags, the ghost is just a clone of the source element.
        const isChevron = el.classList.contains('stack-grab');

        let ghost;
        let rect;

        if (isChevron) {
            const chevronRect = el.getBoundingClientRect();
            ghost = el.parentElement.cloneNode(true);
            ghost.classList.add('drag-ghost');
            ghost.querySelectorAll('.stack-grab, .lp.consumed').forEach(n => n.remove());
            // Tight-fit the ghost to its lollipops, ignoring stack min-height/padding
            ghost.style.minHeight = '0';
            ghost.style.paddingTop = '0';
            document.body.appendChild(ghost);

            // Anchor the ghost so its top sits at the chevron — lollipops hang
            // from where the user's finger grabbed.
            const w = ghost.offsetWidth;
            const h = ghost.offsetHeight;
            rect = {
                left: chevronRect.left + chevronRect.width / 2 - w / 2,
                top: chevronRect.top,
                width: w,
                height: h,
            };
            ghost.style.left = rect.left + 'px';
            ghost.style.top = rect.top + 'px';
        } else {
            ghost = el.cloneNode(true);
            ghost.classList.add('drag-ghost');
            rect = el.getBoundingClientRect();
            ghost.style.width = rect.width + 'px';
            ghost.style.height = rect.height + 'px';
            ghost.style.left = rect.left + 'px';
            ghost.style.top = rect.top + 'px';
            document.body.appendChild(ghost);
        }

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
            let amount = payload.amount;
            const remaining = this.targetAdd - this.addedSoFar;
            if (amount > remaining) return false;

            // In sub-first mode, additions first restore consumed slots in the
            // original pile, in reading order (top-down, left-to-right after
            // the post-subtract consolidate). Each restored slot keeps a
            // persistent `restored` marker so the user can visually count
            // exactly how many lollipops she's "put back" — reinforcing that
            // addition undoes subtraction. The marker is cleared at end of
            // round.
            if (!this.problem.addFirst) {
                const consumed = this.originalSlots.filter(s => s.state === 'consumed');
                const restoreCount = Math.min(amount, consumed.length);
                if (restoreCount > 0) {
                    const toRestore = consumed.slice(0, restoreCount);
                    for (const slot of toRestore) {
                        slot.state = 'active';
                        slot.restored = true;
                        this.freshRestored.add(slot.id);
                    }
                    this.addedSoFar += restoreCount;
                    amount -= restoreCount;
                }
            }

            for (let i = 0; i < amount; i++) {
                const slot = this.makeSlot();
                // In sub-first rounds, every "added" lollipop glows — both the
                // ones that restored grays in the original pile and the
                // overflow that lands here. In add-first the added pile is
                // structurally separate so it doesn't need the marker.
                if (!this.problem.addFirst) slot.restored = true;
                this.addedSlots.push(slot);
            }
            this.addedSoFar += amount;

            // Render literally so original-pile positions don't shift between
            // drops — restored slots ungray in place, the leftover grays stay
            // where they were. The pile only consolidates at end-of-round.
            this.renderAll(false);
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
            // Literal layout — dragged lollipops gray out in place. No rearranging
            // happens until the whole subtract step is finished.
            this.renderAll(false);
            this.checkRemoveDone();
            return true;
        }
        return false;
    }

    consolidateOriginalSlots() {
        // Reorder originalSlots in place: actives first, consumed after.
        // After this, literal renders (renderAll(false)) match the consolidated
        // layout, and subsequent state changes (restoring a consumed slot)
        // don't shift any other slot's position.
        const actives = this.originalSlots.filter(s => s.state === 'active');
        const consumed = this.originalSlots.filter(s => s.state === 'consumed');
        this.originalSlots = [...actives, ...consumed];
    }

    settleAndFlip() {
        // Capture current positions of every .lp keyed by slot id
        const before = new Map();
        document.querySelectorAll('.lp[data-slot]').forEach(lp => {
            before.set(lp.dataset.slot, lp.getBoundingClientRect());
        });

        // Re-render in consolidated layout: actives on the left, consumed on the right.
        this.renderAll(true);

        // FLIP: for each lollipop that moved, start at its old position and transition to new.
        document.querySelectorAll('.lp[data-slot]').forEach(lp => {
            const prev = before.get(lp.dataset.slot);
            if (!prev) return;
            const now = lp.getBoundingClientRect();
            const dx = prev.left - now.left;
            const dy = prev.top - now.top;
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
            lp.style.transition = 'none';
            lp.style.transform = `translate(${dx}px, ${dy}px)`;
            // next frame, transition back to identity
            requestAnimationFrame(() => {
                lp.style.transition = 'transform 0.35s ease';
                lp.style.transform = '';
            });
        });
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
        this.addedSoFar = 0;
        // Switch supply card out of bin mode (in case we just came from remove).
        const supplyCard = document.getElementById('supply-card');
        supplyCard.classList.remove('bin-mode');
        document.getElementById('supply-body').classList.remove('hidden');
        document.getElementById('bin').classList.add('hidden');

        const { b } = this.problem;
        const stepAdd = document.getElementById('step-add');
        stepAdd.classList.remove('hidden');
        stepAdd.classList.add('appearing');
        this.setStepText(stepAdd, 'Add', b);
        this.setActiveStep('eq-add');

        // (The +N tally pill that previously lived on the pile card was
        // removed — the persistent yellow glow on restored lollipops + clean
        // active columns from a-c being a multiple of 5 are enough for the
        // user to track what she's added back. The element is still in the
        // DOM but kept hidden via CSS for now in case we want to revive it.)

        // Sub-first: keep the literal gray layout from the subtract phase so
        // the user adds back into the columns she just emptied — no shuffle.
        this.renderAll(this.problem.addFirst);
    }

    checkAddDone() {
        if (this.addedSoFar >= this.targetAdd) {
            this.markStepDone(document.getElementById('step-add'));
            this.phase = 'transition';
            this.hide('add-tally');
            if (this.phaseQueue.length > 0) {
                setTimeout(() => this.advancePhase(), 500);
            } else {
                setTimeout(() => this.settleAndFlip(), 350);
                setTimeout(() => this.startSettlePhase(), 1100);
            }
        }
    }

    startRemovePhase() {
        this.phase = 'remove';
        // Reset removed counter — fresh subtract phase starts at 0.
        this.removedSoFar = 0;
        const { c } = this.problem;
        const stepRemove = document.getElementById('step-remove');
        stepRemove.classList.remove('hidden');
        stepRemove.classList.add('appearing');
        this.setStepText(stepRemove, 'Subtract', c);
        this.setActiveStep('eq-sub');
        const supplyCard = document.getElementById('supply-card');
        supplyCard.classList.add('bin-mode');
        document.getElementById('supply-body').classList.add('hidden');
        document.getElementById('bin').classList.remove('hidden');
        this.renderAll();
    }

    checkRemoveDone() {
        if (this.removedSoFar >= this.targetRemove) {
            this.markStepDone(document.getElementById('step-remove'));
            this.phase = 'transition';
            if (this.phaseQueue.length > 0) {
                // Sub-first round: consolidate the pile (actives left, grays
                // right) so the user has a clean gray block to add back into.
                // We reorder the underlying array so subsequent literal renders
                // preserve this layout — restored slots ungray in place, no
                // further shuffle during the add phase.
                setTimeout(() => {
                    this.consolidateOriginalSlots();
                    this.settleAndFlip();
                }, 350);
                setTimeout(() => this.advancePhase(), 1100);
            } else {
                // End of round (add-first): consolidate then settle.
                setTimeout(() => this.settleAndFlip(), 350);
                setTimeout(() => this.startSettlePhase(), 1100);
            }
        }
    }

    startSettlePhase() {
        this.phase = 'settle';
        this.setActiveStep(null);
        const { a, net } = this.problem;
        const total = a + net;
        const msgEl = document.getElementById('settle-message');
        if (net > 0) {
            msgEl.innerHTML = `You ended up with <span class="gain">${net} more</span> lollipops than you started with! 🎉`;
        } else if (net < 0) {
            msgEl.innerHTML = `You ended up with <span class="loss">${Math.abs(net)} fewer</span> lollipops than you started with.`;
        } else {
            msgEl.innerHTML = `You ended up right where you started!`;
        }

        const sign = net >= 0 ? '+' : '−';
        const cls  = net >= 0 ? 'add' : 'sub';
        const amount = Math.abs(net);
        const eqEl = document.getElementById('settle-equation');
        if (net === 0) {
            eqEl.innerHTML = `${a} = <span class="answer">${total}</span>`;
        } else {
            eqEl.innerHTML = `${a} <span class="${cls}">${sign} ${amount}</span> = <span class="answer">${total}</span>`;
        }

        this.totalGames++;
        document.getElementById('total-count').textContent = this.totalGames;
        this.show('settle-section');
        this.show('continue-btn');
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
