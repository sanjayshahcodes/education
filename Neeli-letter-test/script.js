/**
 * Neeli Letter Test — a letter-recognition check, scored by the grown-up.
 *
 * Pick Uppercase or Lowercase, then the whole alphabet goes past one letter
 * at a time in random order, each letter exactly once. She reads it out; you
 * tap Right or Wrong.
 *
 * The point is to find out how many letters she actually knows, which only
 * works if she can't tell how she's doing. So:
 *
 *   • The two buttons are identical — same size, same colour, same border.
 *     Nothing about them but the word differs.
 *   • Nothing happens when you tap. No flash, no tick, no cross. The next
 *     letter just comes up.
 *   • The tally is kept but never shown until the end. A running score on
 *     screen would tell her the answer she isn't supposed to be given.
 *
 * At the end you get the count and, more usefully, exactly which letters
 * she missed — then a one-tap jump to the other case, so upper and lower
 * can be compared in one sitting.
 */

class LetterTest {
    constructor() {
        this.MODES = {
            upper: { name: 'Uppercase', letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
            lower: { name: 'Lowercase', letters: 'abcdefghijklmnopqrstuvwxyz' },
        };

        // Handwriting rules are on by default; ?lines=off strips them, so the
        // same deck can be run both ways to see whether they move the score.
        this.showRules =
            new URLSearchParams(window.location.search).get('lines') !== 'off';

        // SVG user units. Fonts are measured at REF_SIZE; RISE is how far the
        // sky line sits above the grass line, and each mode's glyph size is
        // then solved so that mode's tallest letter reaches it exactly.
        this.REF_SIZE = 300;
        this.RISE = 220;
        this.RULE_W = 760;
        this.PAD = 34;

        // Filled in by layoutRules(): the glyph size each mode needs.
        this.sizeFor = {};

        this.mode = null;
        this.queue = [];
        this.index = 0;
        this.missed = [];

        this.init();
    }

    init() {
        // Wait for the handwriting face before measuring it, or the rules get
        // placed off the fallback's metrics and sit wrong.
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => this.layoutRules());
        }
        this.layoutRules();

        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.start(btn.dataset.mode));
        });
        document.querySelectorAll('.score-btn').forEach(btn => {
            btn.addEventListener('click', () => this.score(btn.dataset.score === 'right'));
        });
        document.getElementById('restart-btn')
            .addEventListener('click', () => this.showScreen('start-screen'));
        document.getElementById('other-mode-btn')
            .addEventListener('click', () => this.start(this.mode === 'upper' ? 'lower' : 'upper'));

        // Keyboard for scoring on a desktop: r = right, w = wrong.
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('test-screen').classList.contains('hidden')) return;
            const k = e.key.toLowerCase();
            if (k === 'r') this.score(true);
            else if (k === 'w') this.score(false);
        });
    }

    // Place the rules once, then solve a glyph size per mode.
    //
    // The paper is the same for both modes — sky and grass never move — and
    // each mode's letters are scaled so its tallest one reaches the sky line,
    // exactly as capitals and tall lowercase both reach the top line on real
    // handwriting paper. Uppercase ends up a few percent larger because the
    // tallest capital is shorter than the tallest ascender: in this face H is
    // 203 against f at 220.
    //
    // The grass line is the one doing the real work — it's what tells d from
    // q and b from p. The dashed plane line goes midway between, the way it
    // does on her paper; it deliberately isn't at the x-height, because paper
    // assumes lowercase is half the height of capitals and no real face
    // agrees (this one is 0.74).
    layoutRules() {
        const svg = document.getElementById('letter-svg');
        const text = document.getElementById('letter');
        const family = getComputedStyle(text).fontFamily;

        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = `${this.REF_SIZE}px ${family}`;
        const spanOf = (letters, key) => Math.max(
            ...letters.split('').map(ch => ctx.measureText(ch)[key]).filter(Number.isFinite));

        // How far below the grass line any mode reaches once scaled up. The
        // viewBox has to hold the deepest of them, or the box would resize
        // between modes and shift the rules on screen.
        let deepest = 0;
        for (const [name, mode] of Object.entries(this.MODES)) {
            const rise = spanOf(mode.letters, 'actualBoundingBoxAscent') || this.REF_SIZE * 0.7;
            const scale = this.RISE / rise;
            this.sizeFor[name] = this.REF_SIZE * scale;
            const drop = (spanOf(mode.letters, 'actualBoundingBoxDescent') || 0) * scale;
            deepest = Math.max(deepest, drop);
        }

        const baseline = this.PAD + this.RISE;
        const height = baseline + deepest + this.PAD;

        svg.setAttribute('viewBox', `0 0 ${this.RULE_W} ${height}`);
        text.setAttribute('x', this.RULE_W / 2);
        text.setAttribute('y', baseline);

        const place = (id, y) => {
            const line = document.getElementById(id);
            line.setAttribute('x1', 0);
            line.setAttribute('x2', this.RULE_W);
            line.setAttribute('y1', y);
            line.setAttribute('y2', y);
            line.classList.toggle('hidden', !this.showRules);
        };
        place('rule-sky', baseline - this.RISE);
        place('rule-plane', baseline - this.RISE / 2);
        place('rule-grass', baseline);

        if (this.mode) this.applyGlyphSize();
    }

    applyGlyphSize() {
        const size = this.sizeFor[this.mode] || this.REF_SIZE;
        document.getElementById('letter').setAttribute('font-size', size);
    }

    // Fisher-Yates: the whole alphabet, once each, in a fresh order every run.
    shuffle(list) {
        const out = [...list];
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    }

    start(mode) {
        this.mode = mode;
        this.queue = this.shuffle(this.MODES[mode].letters.split(''));
        this.index = 0;
        this.missed = [];
        this.applyGlyphSize();
        this.showScreen('test-screen');
        this.showLetter();
    }

    showLetter() {
        document.getElementById('progress').textContent =
            `${this.index + 1} / ${this.queue.length}`;
        document.getElementById('letter').textContent = this.queue[this.index];
    }

    // No feedback of any kind here — just move on.
    score(wasRight) {
        if (!wasRight) this.missed.push(this.queue[this.index]);
        this.index++;
        if (this.index >= this.queue.length) this.finish();
        else this.showLetter();
    }

    finish() {
        const total = this.queue.length;
        const known = total - this.missed.length;

        document.getElementById('results-mode').textContent = this.MODES[this.mode].name;
        document.getElementById('results-score').textContent = `${known} / ${total}`;

        // The letters she missed are the actual finding — spell them out,
        // in alphabetical order rather than the order they happened to come up.
        const missed = document.getElementById('results-missed');
        if (this.missed.length === 0) {
            missed.textContent = 'Every letter.';
        } else {
            const sorted = [...this.missed].sort((a, b) =>
                a.localeCompare(b, undefined, { sensitivity: 'base' }));
            missed.innerHTML =
                `Missed ${this.missed.length}:` +
                `<span class="missed-letters">${sorted.join(' ')}</span>`;
        }

        const other = this.mode === 'upper' ? 'lower' : 'upper';
        document.getElementById('other-mode-btn').textContent =
            `Test ${this.MODES[other].name.toLowerCase()}`;

        this.showScreen('results-screen');
    }

    showScreen(id) {
        ['start-screen', 'test-screen', 'results-screen'].forEach(s => {
            document.getElementById(s).classList.toggle('hidden', s !== id);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.test = new LetterTest();
});
