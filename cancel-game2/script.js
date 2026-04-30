/**
 * Cancel Out 2 — overlay-drag variant.
 *
 * Same equation form as cancel-out (a + b − c or a − b + c), but a different
 * interaction model: you drag the *whole* +b or −c pile onto the other in a
 * single gesture. On drop, the dragged pile overlays the target — pairs that
 * line up cancel (flash → grey), and any leftover of the larger pile sticks
 * out in full color. One drag = one netting act.
 *
 * The point: the netting is the visual punchline. She doesn't grind through
 * column-by-column cancels; she sees pairing-and-leftover all at once.
 */

class CancelGame {
    constructor() {
        this.totalGames = 0;
        this.problem = null;
        this.terms = [];
        this.nextBlockId = 0;
        this.nextTermId = 0;
        this.freshBlocks = new Set();
        this.solved = false;
        // Mode (URL ?mode=1|2|3|learn):
        //   1     — a + b − c only           (default)
        //   2     — a + b − c and a − b + c
        //   3     — same as 2, but |b − c| up to 3 (wider leftover range)
        //   learn — fixed cycle of teaching problems with same a,b
        const params = new URLSearchParams(window.location.search);
        const rawMode = params.get('mode');
        if (rawMode === 'learn') {
            this.mode = 'learn';
            this.learnIndex = 0;
            // Same a=25, b=16, varying c to show: full cancel, +1 leftover,
            // -1 leftover, +2, -2.
            this.learnCycle = [
                { values: [25, 16, 16], ops: ['+', '-'] },
                { values: [25, 16, 15], ops: ['+', '-'] },
                { values: [25, 16, 17], ops: ['+', '-'] },
                { values: [25, 16, 14], ops: ['+', '-'] },
                { values: [25, 16, 18], ops: ['+', '-'] },
            ];
        } else {
            const m = parseInt(rawMode, 10);
            this.mode = (m === 2 || m === 3) ? m : 1;
        }
        // Solve level (URL ?solve=0|1|2):
        //   0 — drag-only, no answer input          (default)
        //   1 — numpad first, blocks reveal after submit
        //   2 — blocks visible + numpad together; drag enabled after submit
        // Always 0 in learn mode (demonstration only).
        const rawSolve = parseInt(params.get('solve'), 10);
        this.solveLevel = (this.mode === 'learn') ? 0
            : (rawSolve === 1 || rawSolve === 2) ? rawSolve : 0;
        // Backwards-compat: ?solve=true → level 1
        if (params.get('solve') === 'true' && this.mode !== 'learn') this.solveLevel = 1;
        this.solveMode = this.solveLevel > 0;
        this.dragEnabled = this.solveLevel !== 2;
        this.solveInput = '';
        this.init();
    }

    init() {
        document.getElementById('continue-btn').addEventListener('click', () => this.startNewRound());
        // Numpad keys
        document.querySelectorAll('#numpad .numkey').forEach(btn => {
            btn.addEventListener('click', () => this.handleNumKey(btn.dataset.key));
        });
        this.startNewRound();
    }

    handleNumKey(key) {
        if (key === 'back') {
            this.solveInput = this.solveInput.slice(0, -1);
            this.renderSolveInput();
            return;
        }
        if (key === 'enter') {
            this.checkSolveAnswer();
            return;
        }
        if (this.solveInput.length >= 2) return;
        this.solveInput += key;
        this.renderSolveInput();
    }

    renderSolveInput() {
        const el = document.getElementById('eq-answer-box');
        if (!el) return;
        if (this.solveInput.length === 0) {
            el.textContent = '';
            el.classList.add('empty');
        } else {
            el.textContent = this.solveInput;
            el.classList.remove('empty');
        }
    }

    checkSolveAnswer() {
        if (this.solveInput.length === 0) return;
        // The equation's answer slot already shows her guess (live updated).
        // No right/wrong feedback — she discovers the verdict by dragging.
        this.revealBoardAfterSolve();
    }

    revealBoardAfterSolve() {
        this.hide('numpad');
        this.show('board');
        // In level 2 the board was already visible but inert; flip on
        // dragging now that she's committed her answer.
        if (this.solveLevel === 2) {
            this.dragEnabled = true;
            this.renderBoard();
        }
    }

    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // ── Problem generation ─────────────────────────

    generateProblem() {
        if (this.mode === 'learn') {
            const entry = this.learnCycle[this.learnIndex % this.learnCycle.length];
            this.learnIndex += 1;
            const [a, b, c] = entry.values;
            const [op1, op2] = entry.ops;
            const apply = (acc, op, n) => op === '+' ? acc + n : acc - n;
            const result = apply(apply(a, op1, b), op2, c);
            return { values: entry.values, ops: entry.ops, result };
        }
        const allowSubFirst = this.mode === 2 || this.mode === 3;
        const deltaRange = this.mode === 3 ? 3 : 2;
        for (let tries = 0; tries < 120; tries++) {
            const subFirst = allowSubFirst && Math.random() < 0.5;
            const ops = subFirst ? ['-', '+'] : ['+', '-'];
            const a = this.randInt(20, 30);
            const bMax = subFirst ? Math.min(22, a - 1) : 22;
            if (bMax < 12) continue;
            const b = this.randInt(12, bMax);
            const cDelta = this.randInt(-deltaRange, deltaRange);
            // In solve mode there must always be a leftover — b == c trivializes
            // the answer (it's just the start number).
            if (this.solveMode && cDelta === 0) continue;
            const c = b + cDelta;
            const cMin = 12 - deltaRange;
            const cMax = 22 + deltaRange;
            if (c < cMin || c > cMax) continue;
            const apply = (acc, op, n) => op === '+' ? acc + n : acc - n;
            let result = apply(a, ops[0], b);
            if (result < 1) continue;
            result = apply(result, ops[1], c);
            if (result < 1 || result > 30) continue;
            return { values: [a, b, c], ops, result };
        }
        return { values: [25, 8, 7], ops: ['+', '-'], result: 26 };
    }

    // ── Round lifecycle ────────────────────────────

    startNewRound() {
        this.problem = this.generateProblem();
        this.terms = [];
        this.solved = false;
        this.freshBlocks.clear();

        const [a, b, c] = this.problem.values;
        const [op1, op2] = this.problem.ops;
        const signs = ['+', op1, op2];
        const values = [a, b, c];
        for (let i = 0; i < 3; i++) {
            const term = this.makeTerm(signs[i], values[i], /*fresh*/ true);
            if (i === 0) term.isStart = true;
            this.terms.push(term);
        }

        this.renderEquation();
        this.hide('settle-section');
        this.hide('continue-btn');
        this.renderBoard();

        if (this.solveLevel === 1) {
            this.solveInput = '';
            this.renderSolveInput();
            this.hide('board');
            this.show('numpad');
        } else if (this.solveLevel === 2) {
            this.solveInput = '';
            this.renderSolveInput();
            this.dragEnabled = false;
            this.renderBoard();          // re-render to drop drag handlers
            this.show('board');
            this.show('numpad');
        } else {
            this.hide('numpad');
            this.show('board');
        }
    }

    makeTerm(sign, value, fresh) {
        const blocks = [];
        for (let i = 0; i < value; i++) {
            const block = { id: this.nextBlockId++, cancelled: false };
            if (fresh) this.freshBlocks.add(block.id);
            blocks.push(block);
        }
        return { id: this.nextTermId++, sign, value, blocks };
    }

    activeBlocks(term) {
        return term.blocks.filter(b => !b.cancelled);
    }

    renderEquation() {
        const { values, ops } = this.problem;
        const [a, b, c] = values;
        const [op1, op2] = ops;
        const signed = (n, sign) => `<span class="eq-num ${sign === '+' ? 'pos' : 'neg'}">${n}</span>`;
        const signOp = (op) => `<span class="eq-op">${op === '+' ? '+' : '−'}</span>`;
        // In solve mode the answer slot is a box that fills as she types,
        // followed by a "?" to mark it as her claim awaiting verification.
        const tail = this.solveMode
            ? `<span class="eq-answer-box empty" id="eq-answer-box"></span><span class="eq-tail">?</span>`
            : `<span class="eq-tail">?</span>`;
        document.getElementById('main-equation').innerHTML =
            `<span class="eq-num">${a}</span>` + signOp(op1) + signed(b, op1) + signOp(op2) + signed(c, op2) +
            `<span class="eq-op">=</span>` + tail;
    }

    // ── Rendering ──────────────────────────────────

    renderBoard() {
        const board = document.getElementById('board');
        board.innerHTML = '';
        // The smaller of the two operation piles is draggable. When they're
        // equal, both are draggable (either one can land on the other).
        const opTerms = this.terms.filter(t => !t.isStart);
        const draggableIds = new Set();
        if (this.dragEnabled && opTerms.length === 2) {
            const [t1, t2] = opTerms;
            const a1 = this.activeBlocks(t1).length;
            const a2 = this.activeBlocks(t2).length;
            if (a1 > 0 && a2 > 0) {
                if (a1 < a2) draggableIds.add(t1.id);
                else if (a2 < a1) draggableIds.add(t2.id);
                else { draggableIds.add(t1.id); draggableIds.add(t2.id); }
            }
        }
        for (const term of this.terms) {
            board.appendChild(this.renderTerm(term, draggableIds.has(term.id)));
        }
    }

    renderTerm(term, isDraggable) {
        const card = document.createElement('section');
        card.className = `term-card ${term.sign === '+' ? 'pos' : 'neg'}`;
        card.dataset.termId = String(term.id);
        if (term.blocks.length === 0) card.classList.add('depleted');

        const label = document.createElement('div');
        label.className = 'term-label';
        const shown = term.isStart ? term.value : this.activeBlocks(term).length;
        label.textContent = term.isStart
            ? `${shown}`
            : `${term.sign === '+' ? '+' : '−'}${shown}`;
        card.appendChild(label);

        if (term.isStart) {
            card.classList.add('start');
            return card;
        }

        const body = document.createElement('div');
        body.className = 'term-body';
        for (let i = 0; i < term.blocks.length; i += 5) {
            body.appendChild(this.renderStack(term, term.blocks.slice(i, i + 5)));
        }
        card.appendChild(body);

        // Only the smaller pile is draggable — she picks it up and drops
        // it onto the bigger pile to net in one gesture.
        if (isDraggable && !this.solved) {
            this.attachPileDrag(body, term);
        }
        return card;
    }

    renderStack(term, blockGroup) {
        const stack = document.createElement('div');
        stack.className = 'stack';

        for (const block of blockGroup) {
            const el = document.createElement('div');
            el.className = `block ${term.sign === '+' ? 'green' : 'red'}`;
            if (block.cancelled) el.classList.add('cancelled');
            el.dataset.blockId = String(block.id);
            if (this.freshBlocks.has(block.id)) {
                el.classList.add('appearing');
                setTimeout(() => el.classList.remove('appearing'), 360);
            }
            stack.appendChild(el);
        }
        this.freshBlocks.clear();
        return stack;
    }

    // ── Whole-pile drag ────────────────────────────

    attachPileDrag(bodyEl, term) {
        bodyEl.style.cursor = 'grab';
        bodyEl.addEventListener('pointerdown', (e) => this.startPileDrag(e, bodyEl, term));
    }

    startPileDrag(e, bodyEl, sourceTerm) {
        if (this.solved) return;
        if (this.activeBlocks(sourceTerm).length === 0) return;
        e.preventDefault();
        e.stopPropagation();

        const rect = bodyEl.getBoundingClientRect();

        // Build ghost: clone the body so the user sees the whole pile lift off.
        const ghost = bodyEl.cloneNode(true);
        ghost.classList.add('drag-ghost', 'pile-ghost');
        ghost.style.width = rect.width + 'px';
        ghost.style.height = rect.height + 'px';
        ghost.style.left = rect.left + 'px';
        ghost.style.top  = rect.top + 'px';
        document.body.appendChild(ghost);

        // Hide the original blocks while dragging so it's clear the pile lifted.
        bodyEl.style.visibility = 'hidden';

        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        const validTargets = [];
        document.querySelectorAll('.term-card').forEach(card => {
            const tid = parseInt(card.dataset.termId, 10);
            const t = this.terms.find(x => x.id === tid);
            if (!t || this.activeBlocks(t).length === 0) return;
            if (t.sign === sourceTerm.sign || t.isStart) {
                card.classList.add('drop-invalid');
            } else {
                validTargets.push(card);
            }
        });

        // Alignment-based drop: release commits only if the ghost is
        // aligned over a valid target's pile area. Reinforces 1-for-1
        // pairing — she physically positions her blocks over their
        // counterparts before letting go.
        const ALIGN_TOLERANCE = 28;  // pixels, generous leeway
        let committed = false;

        // Track each valid target's bottom-center anchor. Blocks are
        // center-justified inside the body, so comparing centers (not left
        // edges) matches what she sees when she lines up the visible piles.
        const guides = [];
        for (const card of validTargets) {
            const targetBody = card.querySelector('.term-body');
            const tRect = targetBody.getBoundingClientRect();
            guides.push({
                card,
                anchorCenterX: tRect.left + tRect.width / 2,
                anchorBottom: tRect.bottom,
            });
        }

        const checkAlignment = () => {
            const ghostRect = ghost.getBoundingClientRect();
            const ghostCenterX = ghostRect.left + ghostRect.width / 2;
            for (const g of guides) {
                const dx = Math.abs(ghostCenterX - g.anchorCenterX);
                const dy = Math.abs(ghostRect.bottom - g.anchorBottom);
                if (dx <= ALIGN_TOLERANCE && dy <= ALIGN_TOLERANCE) return g;
            }
            return null;
        };

        const move = (ev) => {
            if (committed) return;
            ghost.style.left = (ev.clientX - offsetX) + 'px';
            ghost.style.top  = (ev.clientY - offsetY) + 'px';
        };

        const cleanup = () => {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', up);
            document.removeEventListener('pointercancel', up);
            document.querySelectorAll('.term-card').forEach(card => {
                card.classList.remove('drop-invalid', 'drop-hot');
            });
        };

        const snapBack = () => {
            ghost.classList.add('snap-back');
            ghost.style.left = rect.left + 'px';
            ghost.style.top  = rect.top + 'px';
            setTimeout(() => {
                ghost.remove();
                bodyEl.style.visibility = '';
            }, 280);
        };

        const commit = (g) => {
            if (committed) return;
            committed = true;
            cleanup();
            ghost.style.pointerEvents = 'none';

            // No slide — fade the ghost out where it was released and let
            // the cancel-flash on the underlying blocks do the visual work.
            const targetCard = g.card;
            const tid = parseInt(targetCard.dataset.termId, 10);
            const targetTerm = this.terms.find(t => t.id === tid);

            ghost.style.transition = 'opacity 0.18s ease';
            ghost.style.opacity = '0';
            setTimeout(() => {
                ghost.remove();
                bodyEl.style.visibility = '';
                this.cancelPiles(sourceTerm, targetTerm);
            }, 180);
        };

        const up = () => {
            if (committed) return;
            const aligned = checkAlignment();
            if (aligned) {
                commit(aligned);
            } else {
                cleanup();
                snapBack();
            }
        };

        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
        document.addEventListener('pointercancel', up);
    }

    // ── Cancellation (whole-pile overlay) ──────────

    cancelPiles(sourceTerm, targetTerm) {
        const sourceActive = this.activeBlocks(sourceTerm);
        const targetActive = this.activeBlocks(targetTerm);
        const pairs = Math.min(sourceActive.length, targetActive.length);
        if (pairs <= 0) return;

        // Mirror by absolute index: the i-th active block of source pairs
        // with the i-th active block of target. Both flash and grey.
        const sourceVanish = new Set(sourceActive.slice(0, pairs).map(b => b.id));
        const targetVanish = new Set(targetActive.slice(0, pairs).map(b => b.id));

        const flash = (vanishSet) => {
            vanishSet.forEach(id => {
                const el = document.querySelector(`.block[data-block-id="${id}"]`);
                if (el) el.classList.add('canceling');
            });
        };
        flash(sourceVanish);
        flash(targetVanish);

        setTimeout(() => {
            for (const b of sourceTerm.blocks) if (sourceVanish.has(b.id)) b.cancelled = true;
            for (const b of targetTerm.blocks) if (targetVanish.has(b.id)) b.cancelled = true;
            this.renderBoard();
            this.checkSolved();
        }, 420);
    }

    checkSolved() {
        if (this.solved) return;
        const opTerms = this.terms.filter(t => !t.isStart);
        const hasPos = opTerms.some(t => t.sign === '+' && this.activeBlocks(t).length > 0);
        const hasNeg = opTerms.some(t => t.sign === '-' && this.activeBlocks(t).length > 0);
        if (!(hasPos && hasNeg)) {
            this.solved = true;
            setTimeout(() => this.startSettle(), 350);
        }
    }

    // ── Settle ─────────────────────────────────────

    startSettle() {
        const opTerms = this.terms.filter(t => !t.isStart);
        const leftoverPos = opTerms.filter(t => t.sign === '+').reduce((n, t) => n + this.activeBlocks(t).length, 0);
        const leftoverNeg = opTerms.filter(t => t.sign === '-').reduce((n, t) => n + this.activeBlocks(t).length, 0);
        const start = this.terms.find(t => t.isStart).value;

        let eq;
        if (leftoverPos > 0 && leftoverNeg === 0) {
            eq = `${start} <span class="pos">+ ${leftoverPos}</span> = <span class="answer">${start + leftoverPos}</span>`;
        } else if (leftoverNeg > 0 && leftoverPos === 0) {
            eq = `${start} <span class="neg">− ${leftoverNeg}</span> = <span class="answer">${start - leftoverNeg}</span>`;
        } else {
            eq = `${start} + 0 = <span class="answer">${start}</span>`;
        }
        document.getElementById('settle-equation').innerHTML = eq;
        document.getElementById('settle-message').innerHTML = '';

        this.totalGames++;
        document.getElementById('total-count').textContent = this.totalGames;
        this.show('settle-section');
        this.show('continue-btn');
        this.celebrate();
    }

    // ── Helpers ────────────────────────────────────

    show(id) { document.getElementById(id).classList.remove('hidden'); }
    hide(id) { document.getElementById(id).classList.add('hidden'); }

    shake(el) {
        if (!el) return;
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 460);
    }

    celebrate() {
        const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9A3C'];
        for (let i = 0; i < 28; i++) {
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
            }, i * 45);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => new CancelGame());
