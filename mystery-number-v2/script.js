class MysteryNumberGameV2 {
    constructor() {
        const params = new URLSearchParams(window.location.search);
        this.mode = parseInt(params.get('mode')) || 1;

        this.totalGames = 0;
        this.gameActive = false;

        // Problem state
        this.mysteryNumber = 0;
        this.operation = '';
        this.operand = 0;
        this.result = 0;
        this.lastOperation = '';
        this.sameOpCount = 0;

        // The three display values for the diagram
        this.displayValues = []; // e.g. ['S', '20', '40']
        this.correctWhole = '';  // which value belongs on top

        // Step tracking
        this.currentStep = 1;

        // Step 1 state
        this.placements = { whole: null, partLeft: null, partRight: null };
        this.activeCircle = null;

        // Step 2 state
        this.equationOptions = [];

        // Step 3 state
        this.currentInput = '';

        this.init();
    }

    init() {
        this.updateStatsDisplay();
        this.setupEventListeners();
        this.startNewRound();
    }

    updateStatsDisplay() {
        document.getElementById('total-count').textContent = this.totalGames;
    }

    setupEventListeners() {
        // Diagram circles
        document.querySelectorAll('.diagram-circle').forEach(circle => {
            circle.addEventListener('click', () => {
                if (this.currentStep !== 1) return;
                if (circle.classList.contains('locked')) return;
                this.onCircleTap(circle.dataset.circle);
            });
        });

        // Step 1 check button
        document.getElementById('step1-check').addEventListener('click', () => {
            this.checkStep1();
        });

        // Number pad
        document.querySelectorAll('.pad-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleInput(e.currentTarget.dataset.value);
            });
        });

        // Picker overlay dismiss (tap outside)
        document.getElementById('picker-overlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('picker-overlay')) {
                this.closePicker();
            }
        });
    }

    // ---- Problem Generation (same as v1) ----

    generateProblem() {
        // Alternate operations
        if (this.sameOpCount >= 2) {
            this.operation = this.lastOperation === 'added' ? 'subtracted' : 'added';
        } else {
            this.operation = Math.random() < 0.5 ? 'added' : 'subtracted';
        }
        if (this.operation === this.lastOperation) {
            this.sameOpCount++;
        } else {
            this.sameOpCount = 1;
        }
        this.lastOperation = this.operation;

        if (this.mode === 1) {
            this.operand = Math.floor(Math.random() * 13) + 3;
            if (this.operation === 'added') {
                this.mysteryNumber = Math.floor(Math.random() * (30 - this.operand - 2)) + 2;
                this.result = this.mysteryNumber + this.operand;
            } else {
                this.mysteryNumber = Math.floor(Math.random() * (30 - this.operand - 2)) + this.operand + 2;
                this.result = this.mysteryNumber - this.operand;
            }
        } else if (this.mode === 2) {
            this.operand = (Math.floor(Math.random() * 8) + 1) * 5;
            if (this.operation === 'added') {
                const maxM = Math.floor((100 - this.operand) / 5);
                this.mysteryNumber = (Math.floor(Math.random() * (maxM - 1)) + 1) * 5;
                this.result = this.mysteryNumber + this.operand;
            } else {
                const minM = this.operand / 5 + 1;
                this.mysteryNumber = (Math.floor(Math.random() * (20 - minM)) + minM) * 5;
                this.result = this.mysteryNumber - this.operand;
            }
        } else {
            this.operand = Math.floor(Math.random() * 41) + 10;
            if (this.operation === 'added') {
                this.mysteryNumber = Math.floor(Math.random() * (99 - this.operand - 10 + 1)) + 10;
                this.result = this.mysteryNumber + this.operand;
            } else {
                this.mysteryNumber = Math.floor(Math.random() * (99 - this.operand - 10 + 1)) + this.operand + 10;
                this.result = this.mysteryNumber - this.operand;
            }
        }

        // Set up display values and correct whole
        if (this.operation === 'subtracted') {
            // "I subtracted X from S and got Y" → S is the whole (biggest)
            this.correctWhole = 'S';
            this.displayValues = ['S', String(this.operand), String(this.result)];
        } else {
            // "I added X to S and got Y" → Y (result) is the whole
            this.correctWhole = String(this.result);
            this.displayValues = ['S', String(this.operand), String(this.result)];
        }
    }

    // ---- Round Management ----

    startNewRound() {
        this.generateProblem();
        this.currentStep = 1;
        this.currentInput = '';
        this.gameActive = true;

        // Reset placements
        this.placements = { whole: null, partLeft: null, partRight: null };

        // Reset UI
        document.querySelectorAll('.diagram-circle').forEach(c => {
            c.className = 'diagram-circle empty';
            c.querySelector('.circle-label').textContent = '?';
        });

        document.getElementById('step1-area').classList.remove('hidden');
        document.getElementById('step1-check').disabled = true;
        document.getElementById('step2-area').classList.add('hidden');
        document.getElementById('step2-prompt').classList.remove('hidden');
        document.getElementById('step3-area').classList.add('hidden');
        document.getElementById('playback-area').classList.add('hidden');
        this.updateAnswerDisplay();

        // Remove answer result box if exists
        const resultBox = document.getElementById('answer-result-box');
        if (resultBox) resultBox.remove();

        // Hide next button if exists
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) nextBtn.classList.add('hidden');

        // Display problem
        const verb = this.operation;
        const prep = this.operation === 'added' ? 'to' : 'from';
        document.getElementById('problem-text').textContent =
            `I ${verb} ${this.operand} ${prep} my secret number and got ${this.result}. What is my secret number?`;
    }

    showStep(step) {
        this.currentStep = step;

        if (step === 2) {
            document.getElementById('step1-area').classList.add('hidden');
            document.getElementById('step2-area').classList.remove('hidden');
            this.setupStep2();
        } else if (step === 3) {
            // Keep step2 visible but only show the correct equation
            document.getElementById('step2-prompt').classList.add('hidden');
            document.querySelectorAll('.equation-option').forEach(btn => {
                if (!btn.classList.contains('selected-correct')) {
                    btn.classList.add('hidden');
                }
            });
            document.getElementById('step3-area').classList.remove('hidden');
            this.currentInput = '';
            this.updateAnswerDisplay();
        }
    }

    // ---- Step 1: Diagram ----

    onCircleTap(circleId) {
        this.activeCircle = circleId;

        // Highlight active circle
        document.querySelectorAll('.diagram-circle').forEach(c => c.classList.remove('active'));
        document.querySelector(`[data-circle="${circleId}"]`).classList.add('active');

        this.showPicker();
    }

    showPicker() {
        const optionsContainer = document.getElementById('picker-options');
        optionsContainer.innerHTML = '';

        for (const val of this.displayValues) {
            const btn = document.createElement('button');
            btn.className = 'picker-option';
            btn.textContent = val;
            btn.addEventListener('click', () => {
                this.onPickerSelect(val);
            });
            optionsContainer.appendChild(btn);
        }

        document.getElementById('picker-overlay').classList.remove('hidden');
    }

    closePicker() {
        document.getElementById('picker-overlay').classList.add('hidden');
        document.querySelectorAll('.diagram-circle').forEach(c => c.classList.remove('active'));
        this.activeCircle = null;
    }

    onPickerSelect(value) {
        // If this value was in the active circle already, remove it
        if (this.placements[this.activeCircle] === value) {
            this.placements[this.activeCircle] = null;
            const circle = document.querySelector(`[data-circle="${this.activeCircle}"]`);
            circle.classList.remove('filled');
            circle.classList.add('empty');
            circle.querySelector('.circle-label').textContent = '?';
        } else {
            // Remove this value from any other circle that has it
            for (const key of Object.keys(this.placements)) {
                if (this.placements[key] === value) {
                    this.placements[key] = null;
                    const otherCircle = document.querySelector(`[data-circle="${key}"]`);
                    otherCircle.classList.remove('filled');
                    otherCircle.classList.add('empty');
                    otherCircle.querySelector('.circle-label').textContent = '?';
                }
            }

            // Place in active circle
            this.placements[this.activeCircle] = value;
            const circle = document.querySelector(`[data-circle="${this.activeCircle}"]`);
            circle.classList.remove('empty');
            circle.classList.add('filled');
            circle.querySelector('.circle-label').textContent = value;
        }

        this.closePicker();

        // Enable check button if all circles filled
        const allFilled = Object.values(this.placements).every(v => v !== null);
        document.getElementById('step1-check').disabled = !allFilled;
    }

    checkStep1() {
        const wholeCorrect = this.placements.whole === this.correctWhole;

        // Parts: the other two values in any order
        const expectedParts = this.displayValues.filter(v => v !== this.correctWhole);
        const actualParts = new Set([this.placements.partLeft, this.placements.partRight]);
        const partsCorrect = expectedParts.every(v => actualParts.has(v));

        if (wholeCorrect && partsCorrect) {
            // All correct
            document.querySelectorAll('.diagram-circle').forEach(c => {
                c.classList.add('correct', 'locked');
            });
            setTimeout(() => {
                this.showStep(2);
            }, 800);
        } else {
            // Wrong — shake and clear
            document.querySelectorAll('.diagram-circle').forEach(c => {
                c.classList.add('incorrect');
            });
            setTimeout(() => {
                this.placements = { whole: null, partLeft: null, partRight: null };
                document.querySelectorAll('.diagram-circle').forEach(c => {
                    c.className = 'diagram-circle empty';
                    c.querySelector('.circle-label').textContent = '?';
                });
                document.getElementById('step1-check').disabled = true;
            }, 700);
        }
    }

    // ---- Step 2: Equation Choice ----

    setupStep2() {
        const r = this.result;
        const op = this.operand;

        this.equationOptions = [
            { text: `S = ${r} + ${op}`, correct: this.operation === 'subtracted' },
            { text: `S = ${r} - ${op}`, correct: this.operation === 'added' },
            { text: `S = ${op} - ${r}`, correct: false }
        ];

        // Shuffle
        for (let i = this.equationOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.equationOptions[i], this.equationOptions[j]] = [this.equationOptions[j], this.equationOptions[i]];
        }

        const container = document.getElementById('equation-choices');
        container.innerHTML = '';

        this.equationOptions.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'equation-option';
            btn.textContent = opt.text;
            btn.addEventListener('click', () => this.checkStep2(idx, btn));
            container.appendChild(btn);
        });
    }

    checkStep2(index, btnElement) {
        if (btnElement.classList.contains('selected-wrong') || btnElement.classList.contains('selected-correct')) {
            return;
        }

        if (this.equationOptions[index].correct) {
            btnElement.classList.add('selected-correct');
            setTimeout(() => {
                this.showStep(3);
            }, 800);
        } else {
            btnElement.classList.add('selected-wrong');
        }
    }

    // ---- Step 3: Number Pad (same as v1) ----

    handleInput(value) {
        if (this.currentStep !== 3) return;

        if (value === 'backspace') {
            this.currentInput = this.currentInput.slice(0, -1);
            this.updateAnswerDisplay();
        } else if (value === 'enter') {
            if (this.currentInput.length > 0) {
                this.checkAnswer(parseInt(this.currentInput));
            }
        } else {
            if (this.currentInput.length < 3) {
                this.currentInput += value;
                this.updateAnswerDisplay();
            }
        }
    }

    updateAnswerDisplay() {
        document.getElementById('answer-display').textContent = this.currentInput || '?';
    }

    checkAnswer(answer) {
        this.showPlayback(answer);

        if (answer === this.mysteryNumber) {
            this.totalGames++;
            this.updateStatsDisplay();
            this.createCelebrationParticles();
            this.showNextButton();
        } else {
            this.currentInput = '';
            this.updateAnswerDisplay();
        }
    }

    showPlayback(answer) {
        const playbackArea = document.getElementById('playback-area');
        const equation = document.getElementById('playback-equation');
        const mark = document.getElementById('playback-mark');

        const op = this.operation === 'added' ? '+' : '-';
        let computed;
        if (this.operation === 'added') {
            computed = answer + this.operand;
        } else {
            computed = answer - this.operand;
        }

        const isCorrect = answer === this.mysteryNumber;

        if (computed < 0) {
            equation.innerHTML = `<span class="answer-box">${answer}</span> ${op} ${this.operand} = <span class="not-allowed">Not allowed</span>`;
        } else {
            equation.innerHTML = `<span class="answer-box">${answer}</span> ${op} ${this.operand} = ${computed}`;
        }

        if (isCorrect) {
            // Append a real equation-option element styled identically to the correct equation
            const resultEl = document.createElement('div');
            resultEl.className = 'equation-option selected-correct';
            resultEl.id = 'answer-result-box';
            resultEl.textContent = `S = ${answer}`;
            // Insert after the visible correct equation in step2-area
            const step2 = document.getElementById('step2-area');
            step2.appendChild(resultEl);
            return;
        } else if (computed < 0) {
            mark.textContent = '';
            mark.className = 'incorrect';
        } else {
            mark.textContent = `Should equal ${this.result}`;
            mark.className = 'incorrect';
        }

        playbackArea.classList.remove('hidden');
    }

    // ---- Completion ----

    showNextButton() {
        // Hide number pad
        document.getElementById('step3-area').querySelector('#number-pad').classList.add('hidden');
        document.getElementById('answer-display').classList.add('hidden');
        document.getElementById('step3-prompt').classList.add('hidden');

        let btn = document.getElementById('next-btn');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'next-btn';
            btn.textContent = 'Next Question';
            btn.addEventListener('click', () => {
                btn.classList.add('hidden');
                document.getElementById('step3-area').querySelector('#number-pad').classList.remove('hidden');
                document.getElementById('answer-display').classList.remove('hidden');
                document.getElementById('step3-prompt').classList.remove('hidden');
                this.startNewRound();
            });
            document.getElementById('game-container').appendChild(btn);
        }
        btn.classList.remove('hidden');
    }

    createCelebrationParticles() {
        const container = document.getElementById('particles-container');
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];

        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + 'vw';
                particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                particle.style.animationDelay = Math.random() * 1 + 's';
                particle.style.animationDuration = (2 + Math.random() * 2) + 's';

                container.appendChild(particle);

                setTimeout(() => {
                    if (particle.parentNode) particle.remove();
                }, 4000);
            }, i * 30);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MysteryNumberGameV2();
});
