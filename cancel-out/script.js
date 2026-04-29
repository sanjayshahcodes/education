/**
 * Cancel Out — first pass.
 *
 * Show an equation like  25 − 18 + 17 = ?  as three groups of colored
 * blocks: green for additive (+) terms, red for subtractive (−) terms.
 * The leading number is implicitly +.
 *
 * The user drags blocks (or whole stacks) from one term onto a term of
 * the opposite color to cancel pairs. min(source, target) blocks vanish
 * from each side. When only one color remains, the round is solved and
 * the count of remaining blocks is the answer.
 *
 * The point: instead of executing operations sequentially (lollipop-lab),
 * the user pairs off equal-and-opposite contributions. The leftover IS
 * the answer — netting-out made tactile.
 */

class CancelGame {
    constructor() {
        this.totalGames = 0;
        this.problem = null;
        this.terms = [];          // [{ id, sign: '+'|'-', value, blocks: [{id}] }]
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
        // Three-term equations: a [op1] b [op2] c. The starting amount `a`
        // is the dominant number; the two operations are smaller increments
        // applied to it. Mirrors lollipop-lab's typical shape (start big,
        // do smaller +/- operations).
        // Patterns `a + b − c` or `a − b + c`. The two operation piles (b and c)
        // are kept within 2 of each other so most of them cancel and only a
        // small leftover remains to combine with the start.
        // Pick the sign pattern first, then constrain values to it. Otherwise
        // the value ranges bias the distribution toward whichever pattern
        // happens to be satisfied more often by random a/b picks.
        for (let tries = 0; tries < 120; tries++) {
            const subFirst = Math.random() < 0.5;
            const ops = subFirst ? ['-', '+'] : ['+', '-'];
            const a = this.randInt(20, 30);
            // For a − b + c we need b < a; for a + b − c, b is unconstrained
            // by a (only by its own range).
            const bMax = subFirst ? Math.min(22, a - 1) : 22;
            if (bMax < 12) continue;
            const b = this.randInt(12, bMax);
            const cDelta = this.randInt(-2, 2);
            const c = b + cDelta;
            if (c < 10 || c > 24) continue;
            if (c === b) continue;  // skip trivial b == c (everything cancels to start)
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

        // Build terms: leading term always positive, then ops applied.
        const [a, b, c] = this.problem.values;
        const [op1, op2] = this.problem.ops;
        const signs = ['+', op1, op2];
        const values = [a, b, c];
        for (let i = 0; i < 3; i++) {
            const term = this.makeTerm(signs[i], values[i], /*fresh*/ true);
            if (i === 0) term.isStart = true;  // starting pile — drag from, never drop into
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
        for (const term of this.terms) {
            board.appendChild(this.renderTerm(term));
        }
    }

    columnIndexFor(term, blockId) {
        // Which 5-per-column group contains this block? 0 = leftmost.
        const idx = term.blocks.findIndex(b => b.id === blockId);
        return idx < 0 ? 0 : Math.floor(idx / 5);
    }

    renderTerm(term) {
        const card = document.createElement('section');
        card.className = `term-card ${term.sign === '+' ? 'pos' : 'neg'}`;
        card.dataset.termId = String(term.id);
        if (term.blocks.length === 0) card.classList.add('depleted');

        const label = document.createElement('div');
        label.className = 'term-label';
        // For operation piles, label tracks the count of *active* (non-
        // cancelled) blocks so it updates live as cancellations happen.
        const shown = term.isStart ? term.value : this.activeBlocks(term).length;
        label.textContent = term.isStart
            ? `${shown}`
            : `${term.sign === '+' ? '+' : '−'}${shown}`;
        card.appendChild(label);

        if (term.isStart) {
            // Starting pile is just a number — no blocks, no cancellation.
            card.classList.add('start');
            return card;
        }

        const body = document.createElement('div');
        body.className = 'term-body';
        // Layout blocks in 5-per-column stacks (like lollipop-lab) so larger
        // counts read as groups-of-5.
        for (let i = 0; i < term.blocks.length; i += 5) {
            body.appendChild(this.renderStack(term, term.blocks.slice(i, i + 5)));
        }
        card.appendChild(body);
        return card;
    }

    renderStack(term, blockGroup) {
        const stack = document.createElement('div');
        stack.className = 'stack';

        const activeInGroup = blockGroup.filter(b => !b.cancelled);
        const colIndex = blockGroup.length ? this.columnIndexFor(term, blockGroup[0].id) : 0;
        if (activeInGroup.length > 0 && !term.isStart) {
            const grab = document.createElement('div');
            grab.className = 'stack-grab';
            grab.textContent = '⇡';
            this.attachDragSource(grab, {
                termId: term.id,
                blockIds: activeInGroup.map(b => b.id),
                columnIndex: colIndex,
            });
            stack.appendChild(grab);
        }

        for (const block of blockGroup) {
            const el = document.createElement('div');
            el.className = `block ${term.sign === '+' ? 'green' : 'red'}`;
            if (block.cancelled) el.classList.add('cancelled');
            el.dataset.blockId = String(block.id);
            if (this.freshBlocks.has(block.id)) {
                el.classList.add('appearing');
                setTimeout(() => el.classList.remove('appearing'), 360);
            }
            if (!term.isStart && !block.cancelled) {
                this.attachDragSource(el, {
                    termId: term.id,
                    blockIds: [block.id],
                });
            }
            stack.appendChild(el);
        }
        this.freshBlocks.clear();
        return stack;
    }

    // ── Drag system ────────────────────────────────

    attachDragSource(el, payload) {
        el.addEventListener('pointerdown', (e) => this.startDrag(e, el, payload));
    }

    startDrag(e, el, payload) {
        if (this.solved) return;
        e.preventDefault();
        e.stopPropagation();

        const sourceTerm = this.terms.find(t => t.id === payload.termId);
        if (!sourceTerm || this.activeBlocks(sourceTerm).length === 0) return;

        // Validate ids still active in source term (could be stale after re-render)
        const validIds = payload.blockIds.filter(id =>
            sourceTerm.blocks.some(b => b.id === id && !b.cancelled));
        if (validIds.length === 0) return;
        const dragPayload = { termId: sourceTerm.id, blockIds: validIds };

        // Build ghost — chevron drag clones the column; single-block drag clones the block.
        const isChevron = el.classList.contains('stack-grab');
        let ghost, rect;
        if (isChevron) {
            const chevronRect = el.getBoundingClientRect();
            ghost = el.parentElement.cloneNode(true);
            ghost.classList.add('drag-ghost');
            ghost.querySelectorAll('.stack-grab').forEach(n => n.remove());
            ghost.style.minHeight = '0';
            ghost.style.paddingTop = '0';
            document.body.appendChild(ghost);
            const w = ghost.offsetWidth;
            const h = ghost.offsetHeight;
            rect = {
                left: chevronRect.left + chevronRect.width / 2 - w / 2,
                top: chevronRect.top,
                width: w, height: h,
            };
            ghost.style.left = rect.left + 'px';
            ghost.style.top  = rect.top + 'px';
        } else {
            ghost = el.cloneNode(true);
            ghost.classList.add('drag-ghost');
            rect = el.getBoundingClientRect();
            ghost.style.width = rect.width + 'px';
            ghost.style.height = rect.height + 'px';
            ghost.style.left = rect.left + 'px';
            ghost.style.top  = rect.top + 'px';
            document.body.appendChild(ghost);
        }

        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        // Highlight valid drop targets: cards of opposite sign with blocks remaining.
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
            setTimeout(() => ghost.remove(), 280);
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

            ghost.remove();
            this.cancel(dragPayload, targetTerm);
        };

        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
        document.addEventListener('pointercancel', up);
    }

    // ── Cancellation ───────────────────────────────

    cancel(payload, targetTerm) {
        const sourceTerm = this.terms.find(t => t.id === payload.termId);
        if (!sourceTerm) return;
        const sourceActiveIds = payload.blockIds.filter(id =>
            sourceTerm.blocks.some(b => b.id === id && !b.cancelled));
        const targetActive = targetTerm.blocks.filter(b => !b.cancelled);
        const cancelCount = Math.min(sourceActiveIds.length, targetActive.length);
        if (cancelCount <= 0) return;

        const sourceVanishIds = new Set(sourceActiveIds.slice(0, cancelCount));

        // Mirror cancelling by absolute block index: each block has a
        // position 0..N-1 within its term. For every source index being
        // cancelled, cancel the block at the same index on the target.
        // If the target doesn't have a block (or it's already cancelled)
        // at that index, fall back to the next leftmost active block.
        const sourceIndices = [...sourceVanishIds].map(id =>
            sourceTerm.blocks.findIndex(b => b.id === id));
        const targetVanishIds = new Set();
        for (const idx of sourceIndices) {
            const b = targetTerm.blocks[idx];
            if (b && !b.cancelled && !targetVanishIds.has(b.id)) {
                targetVanishIds.add(b.id);
            }
        }
        // Fill any shortfall with leftmost remaining active blocks.
        for (const b of targetTerm.blocks) {
            if (targetVanishIds.size >= cancelCount) break;
            if (!b.cancelled && !targetVanishIds.has(b.id)) targetVanishIds.add(b.id);
        }

        // Brief flash animation on the cancelling blocks; afterwards they
        // re-render in the muted "cancelled" state.
        const flash = (vanishSet) => {
            vanishSet.forEach(id => {
                const el = document.querySelector(`.block[data-block-id="${id}"]`);
                if (el) el.classList.add('canceling');
            });
        };
        flash(sourceVanishIds);
        flash(targetVanishIds);

        setTimeout(() => {
            for (const b of sourceTerm.blocks) if (sourceVanishIds.has(b.id)) b.cancelled = true;
            for (const b of targetTerm.blocks) if (targetVanishIds.has(b.id)) b.cancelled = true;
            this.renderBoard();
            this.checkSolved();
        }, 420);
    }

    checkSolved() {
        if (this.solved) return;
        // The starting pile is static. The round is solved when the two
        // operation terms can no longer cancel against each other — i.e. at
        // least one of them is empty. Whatever remains is then applied to
        // the starting pile to get the answer.
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
        // After cancelling, the original equation collapses to start ± leftover.
        // Show that single, simplified equation.
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
            // Everything cancelled — show "start + 0 = start" so the
            // settle still reads as an equation, parallel to the other cases.
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
