/**
 * Compute Efficiently — pick the pairing that makes the sum easy.
 *
 * She drags one number onto another to combine them. The move only goes
 * through if it's as good as anything else on offer; otherwise it springs
 * back and says so. Parentheses have to be taken off before a number inside
 * can meet one outside, and taking them off means choosing what the signs
 * become — which is the step the worksheet is really testing.
 *
 *     63 − 48 + 27      drag 27 onto 63  →  90 − 48  →  42
 *     85 − (12 + 25)    remove brackets  →  85 − 12 − 25  →  60 − 12  →  48
 *     54 + (47 − 32)    nothing outside beats the inside, so start there
 *
 * The judgement itself lives in logic.js, kept clear of the DOM so it can be
 * run against the worksheet directly.
 */

// Reached through the namespace rather than destructured: logic.js declares
// these at script scope, so pulling the same names out here would collide.
const L = window.LOGIC;

class ComputeEfficiently {
    constructor() {
        this.solved = 0;
        this.clean = 0;

        this.items = [];
        this.history = [];
        this.pending = null;      // the pair she's working out
        this.sign = '+';
        this.entry = '';
        this.slipped = false;     // took an inefficient turn on this problem
        this.done = false;

        this.drag = null;
        this.timers = [];

        this.init();
    }

    init() {
        document.getElementById('continue-btn')
            .addEventListener('click', () => this.newProblem());
        document.getElementById('remove-parens')
            .addEventListener('click', () => this.onRemoveParens());
        document.getElementById('work-cancel')
            .addEventListener('click', () => this.cancelWork());

        document.querySelectorAll('.sign-btn').forEach(b => {
            b.addEventListener('click', () => this.setSign(b.dataset.sign));
        });
        document.querySelectorAll('#numpad .numkey').forEach(b => {
            b.addEventListener('click', () => this.onKey(b.dataset.key));
        });

        document.addEventListener('keydown', (e) => {
            if (!this.pending) return;
            if (e.key >= '0' && e.key <= '9') this.onKey(e.key);
            else if (e.key === 'Backspace') this.onKey('back');
            else if (e.key === 'Enter') this.onKey('enter');
        });

        this.newProblem();
    }

    clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; }
    later(ms, fn) { this.timers.push(setTimeout(fn, ms)); }

    // ── Round lifecycle ────────────────────────────

    newProblem() {
        this.clearTimers();
        const p = L.generate();
        this.items = p.items;
        this.answer = p.answer;
        this.history = [this.asText(this.items)];
        this.pending = null;
        this.slipped = false;
        this.done = false;

        this.say('Drag a number onto another one.', 'hint');
        this.cancelWork();
        document.getElementById('paren-options').classList.add('hidden');
        document.getElementById('continue-btn').classList.remove('shown');
        this.render();
    }

    finish() {
        this.done = true;
        this.solved++;
        if (!this.slipped) this.clean++;
        document.getElementById('total-count').textContent = this.solved;
        document.getElementById('clean-count').textContent = this.clean;
        this.say(this.slipped ? `${this.answer}. Got there.` : `${this.answer}. Nicely done.`, 'good');
        document.getElementById('continue-btn').classList.add('shown');
        this.render();
    }

    say(text, tone) {
        const el = document.getElementById('message');
        el.textContent = text;
        el.className = tone || '';
    }

    // Anything that isn't the efficient route costs her the clean mark, and
    // says so rather than just refusing.
    scold(text) {
        this.slipped = true;
        this.say(text, 'scold');
        this.later(2200, () => { if (!this.done) this.say(''); });
    }

    // ── Combining a pair ───────────────────────────

    // `where` is 'top' for two loose numbers, or a group index for two inside
    // the same brackets.
    tryCombine(aRef, bRef) {
        const sameLevel = aRef.where === bRef.where &&
                          (aRef.where === 'top' || aRef.gi === bRef.gi);
        if (!sameLevel) {
            this.scold('Take the brackets off first.');
            return;
        }
        const j = L.judge(this.items);
        const pair = L.availablePairs(this.items).find(p =>
            (p.where === 'top' && aRef.where === 'top' &&
             ((p.i === aRef.i && p.j === bRef.i) || (p.i === bRef.i && p.j === aRef.i))) ||
            (p.where === 'group' && aRef.where !== 'top' && p.gi === aRef.gi));
        if (!pair) return;

        if (!j.pairOK(pair)) {
            this.scold('Not the most efficient way.');
            return;
        }

        const a = this.itemAt(aRef), b = this.itemAt(bRef);
        // Read left to right, so the pair shows the way she'd write it.
        const [first, second] = aRef.order <= bRef.order ? [a, b] : [b, a];
        this.pending = { pair, aRef, bRef, first, second, value: pair.value };
        this.sign = '+';
        this.entry = '';
        this.openWork();
    }

    itemAt(ref) {
        return ref.where === 'top' ? this.items[ref.i] : this.items[ref.gi].inner[ref.i];
    }

    openWork() {
        const { first, second } = this.pending;
        const text = `${first.sign === '-' ? '−' : ''}${first.value} ` +
                     `${second.sign === '-' ? '−' : '+'} ${second.value}`;
        document.getElementById('work-pair').textContent = text;
        // Once only one number is left, its sign isn't a question — it's the
        // answer, and the answer is what it is.
        this.say('');
        const lastStep = this.countNumbers() === 2;
        document.getElementById('work-signs').classList.toggle('hidden', lastStep);
        this.setSign('+');
        this.renderEntry();
        document.getElementById('work').classList.remove('hidden');
        document.getElementById('remove-parens').classList.add('hidden');
        this.render();
    }

    cancelWork() {
        this.pending = null;
        this.entry = '';
        document.getElementById('work').classList.add('hidden');
        document.getElementById('work-value').classList.remove('wrong');
        this.render();
    }

    countNumbers() {
        return this.items.reduce((n, it) => n + (it.kind === 'num' ? 1 : it.inner.length), 0);
    }

    setSign(s) {
        this.sign = s;
        document.querySelectorAll('.sign-btn').forEach(b =>
            b.classList.toggle('on', b.dataset.sign === s));
    }

    onKey(key) {
        if (!this.pending) return;
        if (key === 'back') { this.entry = this.entry.slice(0, -1); this.renderEntry(); return; }
        if (key === 'enter') { this.submit(); return; }
        if (this.entry.length >= 3) return;
        // A pair can legitimately come to nothing — 39 − 39 is the whole point
        // of a problem like 39 + (48 − 39) — so a bare 0 has to be typeable.
        // Only a leading zero in front of another digit is refused.
        if (this.entry === '0') this.entry = key;
        else this.entry += key;
        this.renderEntry();
    }

    renderEntry() {
        document.getElementById('work-value').textContent = this.entry;
    }

    submit() {
        if (this.entry === '') return;
        const lastStep = this.countNumbers() === 2;
        const typed = parseInt(this.entry, 10);
        const wanted = this.pending.value;
        const got = lastStep ? typed : (this.sign === '-' ? -typed : typed);

        if (got !== wanted) {
            const box = document.getElementById('work-value');
            box.classList.add('wrong');
            this.later(700, () => { box.classList.remove('wrong'); this.entry = ''; this.renderEntry(); });
            return;
        }

        this.applyCombine();
    }

    applyCombine() {
        // The result takes the leftmost of the two places, and brackets left
        // holding a single number stop being brackets — same rule the
        // efficiency search walks the problem with.
        this.items = L.applyPair(this.items, this.pending.pair);

        this.pending = null;
        this.entry = '';
        document.getElementById('work').classList.add('hidden');
        this.history.push(this.asText(this.items));
        this.say('');


        if (this.items.length === 1 && this.items[0].kind === 'num') this.finish();
        else this.render();
    }

    // ── Taking the brackets off ────────────────────

    onRemoveParens() {
        const j = L.judge(this.items);
        if (!j.removalOK) {
            this.scold('Not the most efficient way.');
            return;
        }
        this.showParenOptions();
    }

    // Every combination of signs the two inner numbers could take, listed the
    // way the worksheet lists them. Only one of them is the same expression.
    showParenOptions() {
        const gi = this.items.findIndex(it => it.kind === 'group');
        const g = this.items[gi];
        const truth = L.withoutParens(this.items);

        const box = document.getElementById('paren-options');
        box.innerHTML = '';
        for (const s1 of ['-', '+']) {
            for (const s2 of ['-', '+']) {
                const candidate = this.items.flatMap((it, i) =>
                    i !== gi ? [it] : [L.num(s1, g.inner[0].value), L.num(s2, g.inner[1].value)]);
                const btn = document.createElement('button');
                btn.className = 'paren-option';
                btn.textContent = this.asText(candidate);
                btn.addEventListener('click', () => this.chooseParenOption(candidate, truth, btn));
                box.appendChild(btn);
            }
        }
        box.classList.remove('hidden');
        document.getElementById('remove-parens').classList.add('hidden');
        this.say('Which one says the same thing?');
    }

    chooseParenOption(candidate, truth, btn) {
        const same = candidate.length === truth.length &&
            candidate.every((it, i) => it.sign === truth[i].sign && it.value === truth[i].value);
        if (!same) {
            btn.classList.add('wrong');
            this.slipped = true;
            this.later(700, () => btn.classList.remove('wrong'));
            return;
        }
        this.items = candidate;
        document.getElementById('paren-options').classList.add('hidden');
        this.history.push(this.asText(this.items));
        this.say('');
        this.render();
    }

    // ── Rendering ──────────────────────────────────

    asText(items) {
        const piece = (it, first) => {
            if (it.kind === 'num') {
                const s = it.sign === '-' ? '−' : '+';
                return first ? (it.sign === '-' ? `−${it.value}` : `${it.value}`) : `${s} ${it.value}`;
            }
            const inner = it.inner.map((t, k) => piece(t, k === 0)).join(' ');
            const s = it.sign === '-' ? '−' : '+';
            return `${first ? '' : s + ' '}(${inner})`;
        };
        return items.map((it, i) => piece(it, i === 0)).join(' ');
    }

    render() {
        const hist = document.getElementById('history');
        hist.innerHTML = '';
        this.history.slice(0, -1).forEach(line => {
            const el = document.createElement('div');
            el.textContent = line;
            hist.appendChild(el);
        });

        const expr = document.getElementById('expression');
        expr.innerHTML = '';
        let order = 0;

        // A term is its sign and its number together. The leading term shows
        // a sign only when it has one to show.
        const termFor = (it, ref, showSign) => {
            const el = document.createElement('span');
            el.className = 'term';
            if (showSign) {
                const sg = document.createElement('span');
                sg.className = 'tsign';
                sg.textContent = it.sign === '-' ? '−' : '+';
                el.appendChild(sg);
            }
            const v = document.createElement('span');
            v.textContent = it.value;
            el.appendChild(v);

            if (this.done) el.classList.add('settled');
            ref.order = order++;
            el.__ref = ref;
            if (!this.done && !this.pending) this.makeDraggable(el, ref);
            return el;
        };
        const punct = (text, cls) => {
            const el = document.createElement('span');
            el.className = cls ? `paren ${cls}` : 'paren';
            el.textContent = text;
            return el;
        };

        this.items.forEach((it, i) => {
            if (it.kind === 'num') {
                expr.appendChild(termFor(it, { where: 'top', i }, i > 0 || it.sign === '-'));
                return;
            }
            // The bracket's own sign isn't a term — it belongs to the group.
            if (i > 0 || it.sign === '-') expr.appendChild(punct(it.sign === '-' ? '−' : '+'));
            expr.appendChild(punct('(', 'open'));
            it.inner.forEach((t, k) => {
                expr.appendChild(termFor(t, { where: 'group', gi: i, i: k }, k > 0 || t.sign === '-'));
            });
            expr.appendChild(punct(')', 'close'));
        });

        const hasGroup = this.items.some(it => it.kind === 'group');
        document.getElementById('remove-parens')
            .classList.toggle('hidden', !hasGroup || this.done || !!this.pending ||
                              !document.getElementById('paren-options').classList.contains('hidden'));
    }

    // ── Dragging one number onto another ───────────

    makeDraggable(chip, ref) {
        chip.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            const rect = chip.getBoundingClientRect();
            const ghost = document.createElement('div');
            ghost.id = 'ghost';
            ghost.innerHTML = chip.innerHTML;   // sign and all
            document.body.appendChild(ghost);

            this.drag = { chip, ref, ghost,
                          dx: e.clientX - rect.left, dy: e.clientY - rect.top, target: null };
            chip.classList.add('held');
            this.moveGhost(e);

            const onMove = (ev) => this.moveGhost(ev);
            const onUp = (ev) => {
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                this.endDrag(ev);
            };
            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
        });
    }

    moveGhost(e) {
        const d = this.drag;
        if (!d) return;
        // Lifted clear of the finger, so the term she's about to land on stays
        // visible underneath it.
        d.ghost.style.left = `${e.clientX - d.dx}px`;
        d.ghost.style.top = `${e.clientY - d.dy - 30}px`;

        const over = [...document.querySelectorAll('.term')].find(c => {
            if (c === d.chip) return false;
            const r = c.getBoundingClientRect();
            return e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top && e.clientY <= r.bottom;
        });
        if (over !== d.target) {
            if (d.target) d.target.classList.remove('target');
            if (over) over.classList.add('target');
            d.target = over || null;
        }
    }

    endDrag(e) {
        const d = this.drag;
        if (!d) return;
        d.ghost.remove();
        d.chip.classList.remove('held');
        if (d.target) d.target.classList.remove('target');
        this.drag = null;

        if (!d.target) return;
        const targetRef = d.target.__ref;
        if (targetRef) this.tryCombine(d.ref, targetRef);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new ComputeEfficiently();
});
