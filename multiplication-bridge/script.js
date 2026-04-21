class MultiplicationBridge {
    constructor() {
        this.mode = null;       // 1, 2, or 3
        this.direction = null;  // 'to-mult' or 'to-add'
        this.totalGames = 0;

        this.rows = 0;  // number of groups
        this.cols = 0;  // group size

        this.slots = [];        // [{el, value}]
        this.activeSlotIdx = null;

        this.init();
    }

    init() {
        // Mode selection
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.startMode(parseInt(btn.dataset.mode)));
        });

        // Picker dismiss
        document.getElementById('picker-overlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('picker-overlay')) this.closePicker();
        });

        // Check button
        document.getElementById('check-btn').addEventListener('click', () => this.checkAnswer());
    }

    startMode(mode) {
        this.mode = mode;
        this.totalGames = 0;
        document.getElementById('total-count').textContent = 0;
        document.getElementById('mode-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        this.startNewRound();
    }

    // ── Problem Generation ──────────────────────────────────────

    startNewRound() {
        this.rows = Math.floor(Math.random() * 6) + 1; // 1–6
        this.cols = Math.floor(Math.random() * 6) + 1; // 1–6
        this.slots = [];
        this.activeSlotIdx = null;
        this.expression = [];
        document.getElementById('builder-slots').classList.remove('to-add-mode');

        // Determine direction
        if (this.mode === 1) this.direction = 'to-mult';
        else if (this.mode === 2) this.direction = 'to-add';
        else this.direction = Math.random() < 0.5 ? 'to-mult' : 'to-add';

        // Remove next button if present
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) nextBtn.remove();

        document.getElementById('check-btn').disabled = true;
        document.getElementById('check-btn').classList.remove('hidden');

        if (this.direction === 'to-mult') {
            this.setupToMult();
        } else {
            this.setupToAdd();
        }
    }

    // ── Mode: Repeated Addition → Multiplication ────────────────
    // Show:  4 + 4 + 4
    // Build: free-form with numbers + × + ⌫

    setupToMult() {
        const terms = Array(this.rows).fill(this.cols).join(' + ');
        document.getElementById('problem-display').textContent = terms;
        document.getElementById('builder-prompt').textContent = 'Write this as a multiplication';
        this.setupFreeForm('×');
    }

    // ── Mode: Multiplication → Repeated Addition ────────────────
    // Show:  3 × 5
    // Build: free-form with numbers + + + ⌫

    setupToAdd() {
        document.getElementById('problem-display').textContent = `${this.rows} × ${this.cols}`;
        document.getElementById('builder-prompt').textContent = 'Write this as repeated addition';
        this.setupFreeForm('+');
    }

    // ── Shared free-form builder ─────────────────────────────────

    setupFreeForm(operator) {
        this.operator = operator; // '+' or '×'
        this.expression = [];

        const container = document.getElementById('builder-slots');
        container.innerHTML = '';
        container.classList.add('to-add-mode');

        // Expression display
        const exprDisplay = document.createElement('div');
        exprDisplay.id = 'expr-display';
        exprDisplay.className = 'expr-display';
        container.appendChild(exprDisplay);

        // Number bank
        const bank = document.createElement('div');
        bank.className = 'number-bank';

        for (let n = 1; n <= 9; n++) {
            const tile = document.createElement('button');
            tile.className = 'bank-tile';
            tile.textContent = n;
            tile.addEventListener('click', () => this.bankTap(n));
            bank.appendChild(tile);
        }

        const opTile = document.createElement('button');
        opTile.className = 'bank-tile bank-plus';
        opTile.textContent = operator;
        opTile.addEventListener('click', () => this.bankTap(operator));
        bank.appendChild(opTile);

        const backTile = document.createElement('button');
        backTile.className = 'bank-tile bank-back';
        backTile.textContent = '⌫';
        backTile.addEventListener('click', () => this.bankTap('⌫'));
        bank.appendChild(backTile);

        container.appendChild(bank);

        this.slots = [];
        this.renderExpression();
    }

    bankTap(token) {
        const last = this.expression[this.expression.length - 1];
        const op = this.operator;

        if (token === '⌫') {
            this.expression.pop();
        } else if (token === op) {
            // For ×: only one operator allowed (exactly two numbers)
            const alreadyHasOp = op === '×' && this.expression.includes('×');
            if (this.expression.length > 0 && last !== op && !alreadyHasOp) {
                this.expression.push(op);
            }
        } else {
            // Number: only if expression is empty or last token is the operator
            if (this.expression.length === 0 || last === op) {
                this.expression.push(token);
            }
        }

        this.renderExpression();

        // Enable check if expression ends with a number and has at least one term
        const last2 = this.expression[this.expression.length - 1];
        const valid = this.expression.length > 0 && last2 !== op;
        document.getElementById('check-btn').disabled = !valid;
    }

    renderExpression() {
        const display = document.getElementById('expr-display');
        display.innerHTML = '';

        if (this.expression.length === 0) {
            const placeholder = document.createElement('span');
            placeholder.className = 'expr-placeholder';
            placeholder.textContent = 'tap numbers to build';
            display.appendChild(placeholder);
            return;
        }

        this.expression.forEach(token => {
            const chip = document.createElement('span');
            chip.className = token === this.operator ? 'expr-op' : 'expr-num';
            chip.textContent = token;
            display.appendChild(chip);
        });

    }

    // ── Slot helpers ────────────────────────────────────────────

    makeSlot(idx) {
        const el = document.createElement('div');
        el.className = 'num-slot';
        el.addEventListener('click', () => {
            if (el.classList.contains('correct')) return;
            this.openPicker(idx);
        });
        return { el, value: null };
    }

    makeOp(text) {
        const el = document.createElement('span');
        el.className = 'op-text';
        el.textContent = text;
        return el;
    }

    makeResult(text) {
        const el = document.createElement('span');
        el.className = 'result-text';
        el.textContent = text;
        el.id = 'result-display';
        return el;
    }

    // ── Picker ──────────────────────────────────────────────────

    openPicker(slotIdx) {
        this.activeSlotIdx = slotIdx;
        document.querySelectorAll('.num-slot').forEach(s => s.classList.remove('active'));
        this.slots[slotIdx].el.classList.add('active');

        const options = document.getElementById('picker-options');
        options.innerHTML = '';

        // Offer both numbers from the problem as choices
        const choices = [...new Set([this.rows, this.cols])]; // dedupe if equal
        choices.forEach(val => {
            const btn = document.createElement('button');
            btn.className = 'picker-option';
            btn.textContent = val;
            btn.addEventListener('click', () => this.selectValue(val));
            options.appendChild(btn);
        });

        document.getElementById('picker-overlay').classList.remove('hidden');
    }

    closePicker() {
        document.getElementById('picker-overlay').classList.add('hidden');
        document.querySelectorAll('.num-slot').forEach(s => s.classList.remove('active'));
        this.activeSlotIdx = null;
    }

    selectValue(val) {
        const idx = this.activeSlotIdx;
        this.slots[idx].value = val;
        this.slots[idx].el.textContent = val;
        this.slots[idx].el.classList.add('filled');
        this.closePicker();

        // Enable check when all slots filled
        const allFilled = this.slots.every(s => s.value !== null);
        document.getElementById('check-btn').disabled = !allFilled;
    }

    // ── Validation ──────────────────────────────────────────────

    checkAnswer() {
        let correct = false;

        if (this.direction === 'to-mult') {
            // Free-form: extract numbers around ×, accept either order
            const nums = this.expression.filter(t => t !== '×');
            const hasOp = this.expression.includes('×');
            correct = hasOp && nums.length === 2 &&
                ((nums[0] === this.rows && nums[1] === this.cols) ||
                 (nums[0] === this.cols && nums[1] === this.rows));
        } else {
            // Free-form: extract numbers from expression
            const nums = this.expression.filter(t => t !== '+');
            const target = this.rows * this.cols;
            const sum = nums.reduce((a, b) => a + b, 0);
            const allSame = nums.every(n => n === nums[0]);
            correct = nums.length >= 1 && allSame && sum === target;
        }

        if (correct) {
            document.querySelectorAll('.expr-num').forEach(el => el.classList.add('expr-correct'));
            this.totalGames++;
            document.getElementById('total-count').textContent = this.totalGames;
            document.getElementById('check-btn').classList.add('hidden');
            this.celebrate();
            this.showNextButton();
        } else {
            document.querySelectorAll('.expr-num').forEach(el => el.classList.add('expr-incorrect'));
            setTimeout(() => {
                this.expression = [];
                this.renderExpression();
                document.getElementById('check-btn').disabled = true;
            }, 700);
        }
    }

    // ── Next ────────────────────────────────────────────────────

    showNextButton() {
        const btn = document.createElement('button');
        btn.id = 'next-btn';
        btn.textContent = 'Next problem';
        btn.addEventListener('click', () => this.startNewRound());
        document.body.appendChild(btn);
    }

    // ── Celebration ─────────────────────────────────────────────

    celebrate() {
        const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9A3C'];
        for (let i = 0; i < 28; i++) {
            setTimeout(() => {
                const p = document.createElement('div');
                p.className = 'particle';
                p.style.left = Math.random() * 100 + 'vw';
                p.style.background = colors[Math.floor(Math.random() * colors.length)];
                p.style.animationDuration = (2 + Math.random() * 2) + 's';
                p.style.animationDelay = Math.random() * 0.5 + 's';
                document.getElementById('particles-container').appendChild(p);
                setTimeout(() => p.remove(), 4000);
            }, i * 40);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => new MultiplicationBridge());
