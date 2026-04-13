class MysteryNumberGameV3 {
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

        // Diagram values
        this.displayValues = [];
        this.correctWhole = '';

        // Step tracking (1=translate, 2=diagram, 3=rearrange, 4=solve)
        this.currentStep = 1;

        // Step 2 state (diagram)
        this.placements = { whole: null, partLeft: null, partRight: null };
        this.activeCircle = null;

        // Step 4 state (solve)
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
                if (this.currentStep !== 2) return;
                if (circle.classList.contains('locked')) return;
                this.onCircleTap(circle.dataset.circle);
            });
        });

        // Step 2 check button
        document.getElementById('step2-check').addEventListener('click', () => {
            this.checkStep2();
        });

        // Number pad
        document.querySelectorAll('.pad-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleInput(e.currentTarget.dataset.value);
            });
        });

        // Picker overlay dismiss
        document.getElementById('picker-overlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('picker-overlay')) {
                this.closePicker();
            }
        });
    }

    // ---- Problem Generation (same as v1/v2) ----

    generateProblem() {
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

        if (this.operation === 'subtracted') {
            this.correctWhole = 'S';
            this.displayValues = ['S', String(this.operand), String(this.result)];
        } else {
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

        // Reset diagram circles
        document.querySelectorAll('.diagram-circle').forEach(c => {
            c.className = 'diagram-circle empty';
            c.querySelector('.circle-label').textContent = '?';
        });

        // Show step 1, hide everything else
        document.getElementById('step1-area').classList.remove('hidden');
        document.getElementById('step1-prompt').classList.remove('hidden');
        document.getElementById('diagram-area').classList.add('hidden');
        document.getElementById('step2-area').classList.add('hidden');
        document.getElementById('step2-check').disabled = true;
        document.getElementById('step3-area').classList.add('hidden');
        document.getElementById('step3-prompt').classList.remove('hidden');
        document.getElementById('step4-area').classList.add('hidden');
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

        // Set up step 1 choices
        this.setupStep1();
    }

    // ---- Step 1: Translate sentence to equation ----

    setupStep1() {
        const r = this.result;
        const op = this.operand;

        let options;
        if (this.operation === 'subtracted') {
            // Correct: S - op = r
            options = [
                { text: `S \u2212 ${op} = ${r}`, correct: true },
                { text: `S + ${op} = ${r}`, correct: false },
                { text: `${op} \u2212 S = ${r}`, correct: false }
            ];
        } else {
            // Correct: S + op = r
            options = [
                { text: `S + ${op} = ${r}`, correct: true },
                { text: `S \u2212 ${op} = ${r}`, correct: false },
                { text: `S + ${r} = ${op}`, correct: false }
            ];
        }

        // Shuffle
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }

        this.translateOptions = options;

        const container = document.getElementById('translate-choices');
        container.innerHTML = '';

        options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'equation-option';
            btn.textContent = opt.text;
            btn.addEventListener('click', () => this.checkStep1(idx, btn));
            container.appendChild(btn);
        });
    }

    checkStep1(index, btnElement) {
        if (btnElement.classList.contains('selected-wrong') || btnElement.classList.contains('selected-correct')) {
            return;
        }

        if (this.translateOptions[index].correct) {
            btnElement.classList.add('selected-correct');
            setTimeout(() => {
                this.showStep(2);
            }, 800);
        } else {
            btnElement.classList.add('selected-wrong');
        }
    }

    // ---- Step transitions ----

    showStep(step) {
        this.currentStep = step;

        if (step === 2) {
            // Hide step 1 prompt and wrong choices, keep correct one visible
            document.getElementById('step1-prompt').classList.add('hidden');
            document.querySelectorAll('#translate-choices .equation-option').forEach(btn => {
                if (!btn.classList.contains('selected-correct')) {
                    btn.classList.add('hidden');
                }
            });
            // Show diagram and check button
            document.getElementById('diagram-area').classList.remove('hidden');
            document.getElementById('step2-area').classList.remove('hidden');
        } else if (step === 3) {
            // Hide check button
            document.getElementById('step2-area').classList.add('hidden');
            // Show rearrange choices
            document.getElementById('step3-area').classList.remove('hidden');
            this.setupStep3();
        } else if (step === 4) {
            // Hide step 3 prompt and wrong choices, keep correct equation visible
            document.getElementById('step3-prompt').classList.add('hidden');
            document.querySelectorAll('#equation-choices .equation-option').forEach(btn => {
                if (!btn.classList.contains('selected-correct')) {
                    btn.classList.add('hidden');
                }
            });
            // Show number pad
            document.getElementById('step4-area').classList.remove('hidden');
            this.currentInput = '';
            this.updateAnswerDisplay();
        }
    }

    // ---- Step 2: Diagram ----

    onCircleTap(circleId) {
        this.activeCircle = circleId;
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
        if (this.placements[this.activeCircle] === value) {
            this.placements[this.activeCircle] = null;
            const circle = document.querySelector(`[data-circle="${this.activeCircle}"]`);
            circle.classList.remove('filled');
            circle.classList.add('empty');
            circle.querySelector('.circle-label').textContent = '?';
        } else {
            for (const key of Object.keys(this.placements)) {
                if (this.placements[key] === value) {
                    this.placements[key] = null;
                    const otherCircle = document.querySelector(`[data-circle="${key}"]`);
                    otherCircle.classList.remove('filled');
                    otherCircle.classList.add('empty');
                    otherCircle.querySelector('.circle-label').textContent = '?';
                }
            }

            this.placements[this.activeCircle] = value;
            const circle = document.querySelector(`[data-circle="${this.activeCircle}"]`);
            circle.classList.remove('empty');
            circle.classList.add('filled');
            circle.querySelector('.circle-label').textContent = value;
        }

        this.closePicker();

        const allFilled = Object.values(this.placements).every(v => v !== null);
        document.getElementById('step2-check').disabled = !allFilled;
    }

    checkStep2() {
        const wholeCorrect = this.placements.whole === this.correctWhole;
        const expectedParts = this.displayValues.filter(v => v !== this.correctWhole);
        const actualParts = new Set([this.placements.partLeft, this.placements.partRight]);
        const partsCorrect = expectedParts.every(v => actualParts.has(v));

        if (wholeCorrect && partsCorrect) {
            document.querySelectorAll('.diagram-circle').forEach(c => {
                c.classList.add('correct', 'locked');
            });
            setTimeout(() => {
                this.showStep(3);
            }, 800);
        } else {
            document.querySelectorAll('.diagram-circle').forEach(c => {
                c.classList.add('incorrect');
            });
            setTimeout(() => {
                this.placements = { whole: null, partLeft: null, partRight: null };
                document.querySelectorAll('.diagram-circle').forEach(c => {
                    c.className = 'diagram-circle empty';
                    c.querySelector('.circle-label').textContent = '?';
                });
                document.getElementById('step2-check').disabled = true;
            }, 700);
        }
    }

    // ---- Step 3: Rearrange — pick S= equation ----

    setupStep3() {
        const r = this.result;
        const op = this.operand;

        let options;
        if (this.operation === 'subtracted') {
            // Started with S - op = r, correct rearrangement: S = r + op
            options = [
                { text: `S = ${r} + ${op}`, correct: true },
                { text: `S = ${op} \u2212 ${r}`, correct: false },
                { text: `S = ${r} \u2212 ${op}`, correct: false }
            ];
        } else {
            // Started with S + op = r, correct rearrangement: S = r - op
            options = [
                { text: `S = ${r} \u2212 ${op}`, correct: true },
                { text: `S = ${r} + ${op}`, correct: false },
                { text: `S = ${op} \u2212 ${r}`, correct: false }
            ];
        }

        // Shuffle
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }

        this.rearrangeOptions = options;

        const container = document.getElementById('equation-choices');
        container.innerHTML = '';

        options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'equation-option';
            btn.textContent = opt.text;
            btn.addEventListener('click', () => this.checkStep3(idx, btn));
            container.appendChild(btn);
        });
    }

    checkStep3(index, btnElement) {
        if (btnElement.classList.contains('selected-wrong') || btnElement.classList.contains('selected-correct')) {
            return;
        }

        if (this.rearrangeOptions[index].correct) {
            btnElement.classList.add('selected-correct');
            setTimeout(() => {
                this.showStep(4);
            }, 800);
        } else {
            btnElement.classList.add('selected-wrong');
        }
    }

    // ---- Step 4: Number Pad Solve ----

    handleInput(value) {
        if (this.currentStep !== 4) return;

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

        const op = this.operation === 'added' ? '+' : '\u2212';
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
            const resultEl = document.createElement('div');
            resultEl.className = 'equation-option selected-correct';
            resultEl.id = 'answer-result-box';
            resultEl.textContent = `S = ${answer}`;
            document.getElementById('step3-area').appendChild(resultEl);
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
        document.getElementById('step4-area').querySelector('#number-pad').classList.add('hidden');
        document.getElementById('answer-display').classList.add('hidden');
        document.getElementById('step4-prompt').classList.add('hidden');

        let btn = document.getElementById('next-btn');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'next-btn';
            btn.textContent = 'Next Question';
            btn.addEventListener('click', () => {
                btn.classList.add('hidden');
                document.getElementById('step4-area').querySelector('#number-pad').classList.remove('hidden');
                document.getElementById('answer-display').classList.remove('hidden');
                document.getElementById('step4-prompt').classList.remove('hidden');
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
    new MysteryNumberGameV3();
});
