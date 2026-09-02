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

        this.mode = null;
        this.queue = [];
        this.index = 0;
        this.missed = [];

        this.init();
    }

    init() {
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
