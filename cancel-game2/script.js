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
        this.init();
    }

    init() {
        document.getElementById('continue-btn').addEventListener('click', () => this.startNewRound());
        this.startNewRound();
    }

    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // ── Problem generation ─────────────────────────

    generateProblem() {
        for (let tries = 0; tries < 120; tries++) {
            const subFirst = Math.random() < 0.5;
            const ops = subFirst ? ['-', '+'] : ['+', '-'];
            const a = this.randInt(20, 30);
            const bMax = subFirst ? Math.min(22, a - 1) : 22;
            if (bMax < 12) continue;
            const b = this.randInt(12, bMax);
            const cDelta = this.randInt(-2, 2);
            const c = b + cDelta;
            if (c < 10 || c > 24) continue;
            if (c === b) continue;
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
        document.getElementById('main-equation').innerHTML =
            `<span class="eq-num">${a}</span>` + signOp(op1) + signed(b, op1) + signOp(op2) + signed(c, op2) +
            `<span class="eq-op">=</span><span class="eq-tail">?</span>`;
    }

    // ── Rendering ──────────────────────────────────

    renderBoard() {
        const board = document.getElementById('board');
        board.innerHTML = '';
        // Only the smaller of the two operation piles is draggable — drag
        // the smaller onto the bigger to net them in one move.
        const opTerms = this.terms.filter(t => !t.isStart);
        let draggableTermId = null;
        if (opTerms.length === 2) {
            const [t1, t2] = opTerms;
            const a1 = this.activeBlocks(t1).length;
            const a2 = this.activeBlocks(t2).length;
            if (a1 > 0 && a2 > 0) {
                draggableTermId = a1 < a2 ? t1.id : t2.id;
            }
        }
        for (const term of this.terms) {
            board.appendChild(this.renderTerm(term, term.id === draggableTermId));
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

        const move = (ev) => {
            ghost.style.left = (ev.clientX - offsetX) + 'px';
            ghost.style.top  = (ev.clientY - offsetY) + 'px';
            const target = document.elementFromPoint(ev.clientX, ev.clientY);
            const overCard = target && target.closest('.term-card');
            for (const card of validTargets) {
                card.classList.toggle('drop-hot', card === overCard);
            }
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

        const up = (ev) => {
            cleanup();
            ghost.style.pointerEvents = 'none';
            const target = document.elementFromPoint(ev.clientX, ev.clientY);
            const overCard = target && target.closest('.term-card');
            const tid = overCard ? parseInt(overCard.dataset.termId, 10) : null;
            const targetTerm = tid != null ? this.terms.find(t => t.id === tid) : null;

            if (!targetTerm || targetTerm.sign === sourceTerm.sign || targetTerm.isStart || this.activeBlocks(targetTerm).length === 0) {
                snapBack();
                if (overCard) this.shake(overCard);
                return;
            }

            // Animate the ghost slamming onto the target body, then resolve.
            const targetCard = overCard;
            const targetBody = targetCard.querySelector('.term-body');
            const tRect = targetBody.getBoundingClientRect();
            ghost.classList.add('pile-land');
            ghost.style.left = tRect.left + 'px';
            ghost.style.top  = tRect.top + 'px';
            ghost.style.width = tRect.width + 'px';
            ghost.style.height = tRect.height + 'px';
            setTimeout(() => {
                ghost.remove();
                bodyEl.style.visibility = '';
                this.cancelPiles(sourceTerm, targetTerm);
            }, 280);
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
