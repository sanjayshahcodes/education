class NumberShortcuts {
    constructor() {
        this.totalGames = 0;
        this.problem = null;
        this.selectedSign = null;    // '+' or '-'
        this.selectedAmount = null;  // 1, 2, or 3
        this.activeSlot = null;      // 'sign' or 'amount'
        this.currentInput = '';
        this.init();
    }

    init() {
        this.buildNumberPad();

        document.getElementById('start-btn').addEventListener('click', () => this.onStart());
        document.getElementById('btn-gaining').addEventListener('click', () => this.pickGainingLosing('gaining'));
        document.getElementById('btn-losing').addEventListener('click', () => this.pickGainingLosing('losing'));
        [1, 2, 3].forEach(n => {
            document.getElementById(`hm-btn-${n}`).addEventListener('click', () => this.pickHowMany(n));
        });

        // Builder slots open picker on tap
        document.getElementById('build-sign-slot').addEventListener('click', () => this.openPicker('sign'));
        document.getElementById('build-amount-slot').addEventListener('click', () => this.openPicker('amount'));

        document.getElementById('check-build-btn').addEventListener('click', () => this.checkBuild());
        document.getElementById('solve-next-btn').addEventListener('click', () => this.startNewRound());

        // Dismiss picker by tapping outside
        document.getElementById('picker-overlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('picker-overlay')) this.closePicker();
        });

        this.startNewRound();
    }

    // ── Problem generation ───────────────────────────────────────

    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    generateProblem() {
        const a = this.randInt(40, 70);
        const b = this.randInt(15, 30);
        const op1 = Math.random() < 0.5 ? '+' : '-';
        const op2 = op1 === '+' ? '-' : '+';
        let c;
        do { c = b + this.randInt(-3, 3); } while (c === b);
        // net: combined effect of the easy pair — always ±1, ±2, or ±3
        const net = (op1 === '+' ? b : -b) + (op2 === '+' ? c : -c);
        return { a, b, c, op1, op2, net };
    }

    // ── Round management ─────────────────────────────────────────

    startNewRound() {
        this.problem = this.generateProblem();
        this.selectedSign = null;
        this.selectedAmount = null;
        this.currentInput = '';

        // Render plain equation (highlight appears after Start)
        const { a, b, c, op1, op2 } = this.problem;
        document.getElementById('main-equation').textContent =
            `${a} ${op1} ${b} ${op2} ${c} = ?`;

        // Show start, hide everything else
        this.show('start-section');
        this.hide('question-area');
        this.hide('summary-area');
        this.hide('build-section');
        this.hide('solve-section');
        this.hide('picker-overlay');

        // Reset gl/hm sub-sections
        this.show('gl-sub');
        this.hide('hm-sub');

        // Reset builder slots
        this.resetSlot('build-sign-slot');
        this.resetSlot('build-amount-slot');
        document.getElementById('check-build-btn').disabled = true;

        // Reset solve section
        this.show('number-pad');
        this.hide('solve-next-btn');
    }

    onStart() {
        this.hide('start-section');
        // Switch to highlighted equation
        const { a, b, c, op1, op2 } = this.problem;
        document.getElementById('main-equation').innerHTML =
            `<span class="eq-normal">${a} </span>` +
            `<span class="eq-highlight">${op1} ${b} ${op2} ${c}</span>` +
            `<span class="eq-normal"> = ?</span>`;
        this.show('question-area');
    }

    // ── Gaining / Losing ─────────────────────────────────────────

    pickGainingLosing(choice) {
        const correct = this.problem.net > 0 ? 'gaining' : 'losing';
        if (choice === correct) {
            this.hide('gl-sub');
            const dir = this.problem.net > 0 ? 'gaining' : 'losing';
            document.getElementById('hm-prompt').textContent = `How many are you ${dir}?`;
            this.show('hm-sub');
        } else {
            this.shake(document.getElementById(`btn-${choice}`));
        }
    }

    // ── How many ─────────────────────────────────────────────────

    pickHowMany(amount) {
        if (amount === Math.abs(this.problem.net)) {
            // Show summary and builder
            const dir = this.problem.net > 0 ? 'Gaining' : 'Losing';
            document.getElementById('summary-label').textContent = `${dir} ${amount}`;
            this.hide('question-area');
            this.show('summary-area');

            document.getElementById('build-start').textContent = this.problem.a;
            this.show('build-section');
        } else {
            this.shake(document.getElementById(`hm-btn-${amount}`));
        }
    }

    // ── Picker ───────────────────────────────────────────────────

    openPicker(slotType) {
        this.activeSlot = slotType;

        // Highlight active slot
        document.getElementById('build-sign-slot').classList.remove('active');
        document.getElementById('build-amount-slot').classList.remove('active');
        document.getElementById(`build-${slotType}-slot`).classList.add('active');

        const options = slotType === 'sign' ? ['+', '-'] : ['1', '2', '3'];
        const container = document.getElementById('picker-options');
        container.innerHTML = '';
        options.forEach(val => {
            const btn = document.createElement('button');
            btn.className = 'picker-option';
            btn.textContent = val;
            btn.addEventListener('click', () => this.onPickerSelect(val));
            container.appendChild(btn);
        });

        this.show('picker-overlay');
    }

    closePicker() {
        this.hide('picker-overlay');
        document.getElementById('build-sign-slot').classList.remove('active');
        document.getElementById('build-amount-slot').classList.remove('active');
        this.activeSlot = null;
    }

    onPickerSelect(val) {
        const slotEl = document.getElementById(`build-${this.activeSlot}-slot`);
        slotEl.querySelector('.slot-label').textContent = val;
        slotEl.classList.add('filled');

        if (this.activeSlot === 'sign') {
            this.selectedSign = val; // '+' or '-'
        } else {
            this.selectedAmount = parseInt(val);
        }

        this.closePicker();

        const ready = this.selectedSign !== null && this.selectedAmount !== null;
        document.getElementById('check-build-btn').disabled = !ready;
    }

    // ── Build check ──────────────────────────────────────────────

    checkBuild() {
        const applied = this.selectedSign === '+' ? this.selectedAmount : -this.selectedAmount;
        if (applied === this.problem.net) {
            // Flash correct, then show solve
            ['build-sign-slot', 'build-amount-slot'].forEach(id => {
                document.getElementById(id).classList.add('correct');
            });
            setTimeout(() => {
                this.hide('build-section');
                this.renderSolve();
                this.show('solve-section');
            }, 600);
        } else {
            ['build-sign-slot', 'build-amount-slot'].forEach(id => {
                document.getElementById(id).classList.add('incorrect');
            });
            setTimeout(() => {
                this.resetSlot('build-sign-slot');
                this.resetSlot('build-amount-slot');
                this.selectedSign = null;
                this.selectedAmount = null;
                document.getElementById('check-build-btn').disabled = true;
            }, 550);
        }
    }

    // ── Solve ────────────────────────────────────────────────────

    renderSolve() {
        const { a, net } = this.problem;
        const sign = net > 0 ? '+' : '-';
        const amount = Math.abs(net);
        document.getElementById('solve-equation').innerHTML =
            `${a} <span class="eq-highlight">${sign} ${amount}</span> = <span id="solve-answer">?</span>`;
        this.currentInput = '';
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
        document.getElementById('solve-answer').textContent = this.currentInput || '?';
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
                if (!ansEl.classList.contains('correct')) ansEl.textContent = '?';
            }, 500);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────

    show(id) { document.getElementById(id).classList.remove('hidden'); }
    hide(id) { document.getElementById(id).classList.add('hidden'); }

    resetSlot(id) {
        const slot = document.getElementById(id);
        slot.querySelector('.slot-label').textContent = '';
        slot.classList.remove('filled', 'active', 'correct', 'incorrect');
    }

    shake(el) {
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 500);
    }

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

document.addEventListener('DOMContentLoaded', () => new NumberShortcuts());
