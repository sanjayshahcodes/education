class MysteryNumberGameV7 {
    constructor() {
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
        this.correctWhole = '';
        this.correctPartLeft = '';
        this.correctPartRight = '';

        // Step tracking (1=translate, 2=build equation, 3=solve)
        this.currentStep = 1;

        // Step 2 state (equation builder)
        this.builderSlots = { num1: null, operator: null, num2: null };
        this.activeSlot = null;

        // Step 3 state (solve)
        this.currentInput = '';

        // Hint state
        this.hintVisible = false;

        // Block diagram constants
        this.blockSize = 18;
        this.blockGap = 2;
        this.diagramPadding = 30;

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
        // Hint button
        document.getElementById('hint-btn').addEventListener('click', () => {
            this.toggleHint();
        });

        // Builder slots
        document.querySelectorAll('.builder-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                if (this.currentStep !== 2) return;
                if (slot.classList.contains('locked')) return;
                this.onSlotTap(slot.dataset.slot);
            });
        });

        // Step 2 check
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

    // ---- Problem Generation ----

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

        let attempts = 0;
        do {
            attempts++;
            const whole = Math.floor(Math.random() * 26) + 25; // 25-50
            const minPart = Math.ceil(whole * 0.20);
            const maxPart = Math.floor(whole * 0.40);
            const smallerPart = Math.floor(Math.random() * (maxPart - minPart + 1)) + minPart;
            const largerPart = whole - smallerPart;

            if (this.operation === 'added') {
                if (Math.random() < 0.5) {
                    this.mysteryNumber = smallerPart;
                    this.operand = largerPart;
                } else {
                    this.mysteryNumber = largerPart;
                    this.operand = smallerPart;
                }
                this.result = whole;
            } else {
                this.mysteryNumber = whole;
                if (Math.random() < 0.5) {
                    this.operand = smallerPart;
                    this.result = largerPart;
                } else {
                    this.operand = largerPart;
                    this.result = smallerPart;
                }
            }
        } while (this.operand < 3 && attempts < 100);

        if (this.operation === 'subtracted') {
            this.correctWhole = 'S';
            this.correctPartLeft = String(this.result);
            this.correctPartRight = String(this.operand);
        } else {
            this.correctWhole = String(this.result);
            this.correctPartLeft = 'S';
            this.correctPartRight = String(this.operand);
        }
    }

    // ---- Pre-filled Hint Diagram ----

    buildHintDiagram() {
        const svg = document.getElementById('diagram-svg');
        const ns = 'http://www.w3.org/2000/svg';
        const xhtmlNs = 'http://www.w3.org/1999/xhtml';
        svg.innerHTML = '';

        const leftValue = this.operation === 'subtracted' ? this.result : this.mysteryNumber;
        const rightValue = this.operand;
        const total = leftValue + rightValue;

        const bs = this.blockSize;
        const gap = this.blockGap;
        const pad = this.diagramPadding;

        const blocksWidth = total * bs + (total - 1) * gap;
        const svgWidth = blocksWidth + pad * 2;

        const blockY = 110;
        const blockHeight = bs;
        const arcTopPeakY = 35;
        const arcBottomPeakY = blockY + blockHeight + 80;
        const svgHeight = arcBottomPeakY + 50;
        const circleSize = 66;
        const half = circleSize / 2;

        svg.setAttribute('width', svgWidth);
        svg.setAttribute('height', svgHeight);
        svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        svg.style.overflow = 'visible';

        const barLeft = pad;
        const barRight = pad + blocksWidth;
        const barMidY = blockY + blockHeight / 2;

        const leftEnd = pad + leftValue * bs + (leftValue - 1) * gap;
        const rightStart = leftEnd + gap;
        const tickX = (leftEnd + rightStart) / 2;

        const topCenterX = (barLeft + barRight) / 2;
        const leftCenterX = (barLeft + tickX) / 2;
        const rightCenterX = (tickX + barRight) / 2;

        const arcStroke = 'rgba(255,255,255,0.35)';

        // Top arc
        const topArc = document.createElementNS(ns, 'path');
        topArc.setAttribute('d', `M ${barLeft},${barMidY} Q ${barLeft},${arcTopPeakY} ${topCenterX},${arcTopPeakY} Q ${barRight},${arcTopPeakY} ${barRight},${barMidY}`);
        topArc.setAttribute('fill', 'none');
        topArc.setAttribute('stroke', arcStroke);
        topArc.setAttribute('stroke-width', '2');
        svg.appendChild(topArc);

        // Bottom-left arc
        const bottomLeftArc = document.createElementNS(ns, 'path');
        bottomLeftArc.setAttribute('d', `M ${barLeft},${barMidY} Q ${barLeft},${arcBottomPeakY} ${leftCenterX},${arcBottomPeakY} Q ${tickX},${arcBottomPeakY} ${tickX},${barMidY}`);
        bottomLeftArc.setAttribute('fill', 'none');
        bottomLeftArc.setAttribute('stroke', arcStroke);
        bottomLeftArc.setAttribute('stroke-width', '2');
        svg.appendChild(bottomLeftArc);

        // Bottom-right arc
        const bottomRightArc = document.createElementNS(ns, 'path');
        bottomRightArc.setAttribute('d', `M ${tickX},${barMidY} Q ${tickX},${arcBottomPeakY} ${rightCenterX},${arcBottomPeakY} Q ${barRight},${arcBottomPeakY} ${barRight},${barMidY}`);
        bottomRightArc.setAttribute('fill', 'none');
        bottomRightArc.setAttribute('stroke', arcStroke);
        bottomRightArc.setAttribute('stroke-width', '2');
        svg.appendChild(bottomRightArc);

        // Blocks — left group
        const leftColor = 'rgba(255, 120, 100, 0.7)';
        const rightColor = 'rgba(255, 200, 60, 0.7)';
        const blockStroke = 'rgba(255,255,255,0.6)';

        for (let i = 0; i < leftValue; i++) {
            const x = pad + i * (bs + gap);
            const rect = document.createElementNS(ns, 'rect');
            rect.setAttribute('x', x); rect.setAttribute('y', blockY);
            rect.setAttribute('width', bs); rect.setAttribute('height', blockHeight);
            rect.setAttribute('rx', 2); rect.setAttribute('fill', leftColor);
            rect.setAttribute('stroke', blockStroke); rect.setAttribute('stroke-width', '1');
            svg.appendChild(rect);
        }

        // Blocks — right group
        for (let i = 0; i < rightValue; i++) {
            const x = rightStart + i * (bs + gap);
            const rect = document.createElementNS(ns, 'rect');
            rect.setAttribute('x', x); rect.setAttribute('y', blockY);
            rect.setAttribute('width', bs); rect.setAttribute('height', blockHeight);
            rect.setAttribute('rx', 2); rect.setAttribute('fill', rightColor);
            rect.setAttribute('stroke', blockStroke); rect.setAttribute('stroke-width', '1');
            svg.appendChild(rect);
        }

        // Whole circle
        const wholeFO = document.createElementNS(ns, 'foreignObject');
        wholeFO.setAttribute('x', topCenterX - half); wholeFO.setAttribute('y', arcTopPeakY - half);
        wholeFO.setAttribute('width', circleSize); wholeFO.setAttribute('height', circleSize);
        wholeFO.innerHTML = `<div xmlns="${xhtmlNs}" class="diagram-circle"><span class="circle-label">${this.correctWhole}</span></div>`;
        svg.appendChild(wholeFO);

        // Part-left circle
        const partLeftFO = document.createElementNS(ns, 'foreignObject');
        partLeftFO.setAttribute('x', leftCenterX - half); partLeftFO.setAttribute('y', arcBottomPeakY - half);
        partLeftFO.setAttribute('width', circleSize); partLeftFO.setAttribute('height', circleSize);
        partLeftFO.innerHTML = `<div xmlns="${xhtmlNs}" class="diagram-circle"><span class="circle-label">${this.correctPartLeft}</span></div>`;
        svg.appendChild(partLeftFO);

        // Part-right circle
        const partRightFO = document.createElementNS(ns, 'foreignObject');
        partRightFO.setAttribute('x', rightCenterX - half); partRightFO.setAttribute('y', arcBottomPeakY - half);
        partRightFO.setAttribute('width', circleSize); partRightFO.setAttribute('height', circleSize);
        partRightFO.innerHTML = `<div xmlns="${xhtmlNs}" class="diagram-circle"><span class="circle-label">${this.correctPartRight}</span></div>`;
        svg.appendChild(partRightFO);
    }

    toggleHint() {
        this.hintVisible = !this.hintVisible;
        const diagramArea = document.getElementById('diagram-area');
        const hintBtn = document.getElementById('hint-btn');

        if (this.hintVisible) {
            diagramArea.classList.remove('hidden');
            hintBtn.textContent = '(Hide hint)';
            hintBtn.classList.add('active');
        } else {
            diagramArea.classList.add('hidden');
            hintBtn.textContent = '(Click for a hint)';
            hintBtn.classList.remove('active');
        }
    }

    // ---- Round Management ----

    startNewRound() {
        this.generateProblem();
        this.currentStep = 1;
        this.currentInput = '';
        this.gameActive = true;
        this.hintVisible = false;

        // Reset builder slots
        this.builderSlots = { num1: null, operator: null, num2: null };
        document.querySelectorAll('.builder-slot').forEach(s => {
            s.className = s.dataset.slot === 'operator' ? 'builder-slot operator-slot' : 'builder-slot';
            s.querySelector('.slot-label').textContent = '';
        });

        // Reset hint
        document.getElementById('hint-area').classList.add('hidden');
        document.getElementById('diagram-area').classList.add('hidden');
        document.getElementById('hint-btn').textContent = '(Click for a hint)';
        document.getElementById('hint-btn').classList.remove('active');

        // Show step 1, hide the rest
        document.getElementById('step1-area').classList.remove('hidden');
        document.getElementById('step1-prompt').classList.remove('hidden');
        document.getElementById('step2-area').classList.add('hidden');
        document.getElementById('step2-check').disabled = true;
        document.getElementById('step3-area').classList.add('hidden');
        document.getElementById('playback-area').classList.add('hidden');
        document.getElementById('step2-prompt').classList.remove('hidden');
        document.getElementById('equation-builder').classList.remove('hidden');
        document.getElementById('step2-check').classList.remove('hidden');
        this.updateAnswerDisplay();

        // Remove result boxes
        const resultBox = document.getElementById('answer-result-box');
        if (resultBox) resultBox.remove();
        const completedEq = document.getElementById('completed-equation');
        if (completedEq) completedEq.remove();

        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) nextBtn.classList.add('hidden');

        // Problem text
        const verb = this.operation;
        const prep = this.operation === 'added' ? 'to' : 'from';
        document.getElementById('problem-text').textContent =
            `I ${verb} ${this.operand} ${prep} my secret number and got ${this.result}. What is my secret number?`;

        // Build hint diagram
        this.buildHintDiagram();

        // Set up step 1
        this.setupStep1();
    }

    // ---- Step 1: Translate ----

    setupStep1() {
        const r = this.result;
        const op = this.operand;

        let options;
        if (this.operation === 'subtracted') {
            options = [
                { text: `S \u2212 ${op} = ${r}`, correct: true },
                { text: `S + ${op} = ${r}`, correct: false },
                { text: `${op} \u2212 S = ${r}`, correct: false }
            ];
        } else {
            options = [
                { text: `S + ${op} = ${r}`, correct: true },
                { text: `S \u2212 ${op} = ${r}`, correct: false },
                { text: `S + ${r} = ${op}`, correct: false }
            ];
        }

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
        if (btnElement.classList.contains('selected-wrong') || btnElement.classList.contains('selected-correct')) return;

        if (this.translateOptions[index].correct) {
            btnElement.classList.add('selected-correct');
            setTimeout(() => this.showStep(2), 800);
        } else {
            btnElement.classList.add('selected-wrong');
        }
    }

    // ---- Step transitions ----

    showStep(step) {
        this.currentStep = step;

        if (step === 2) {
            document.getElementById('step1-prompt').classList.add('hidden');
            document.querySelectorAll('#translate-choices .equation-option').forEach(btn => {
                if (!btn.classList.contains('selected-correct')) btn.classList.add('hidden');
            });
            document.getElementById('hint-area').classList.remove('hidden');
            document.getElementById('step2-area').classList.remove('hidden');
        } else if (step === 3) {
            document.getElementById('step2-prompt').classList.add('hidden');
            document.getElementById('equation-builder').classList.add('hidden');
            document.getElementById('step2-check').classList.add('hidden');

            const completedEq = document.createElement('div');
            completedEq.className = 'equation-option selected-correct';
            completedEq.id = 'completed-equation';
            completedEq.textContent = `S = ${this.builderSlots.num1} ${this.builderSlots.operator} ${this.builderSlots.num2}`;
            document.getElementById('step2-area').appendChild(completedEq);

            document.getElementById('step3-area').classList.remove('hidden');
            this.currentInput = '';
            this.updateAnswerDisplay();
        }
    }

    // ---- Step 2: Equation Builder ----

    onSlotTap(slotId) {
        this.activeSlot = slotId;
        document.querySelectorAll('.builder-slot').forEach(s => s.classList.remove('active'));
        document.querySelector(`[data-slot="${slotId}"]`).classList.add('active');
        this.showPicker();
    }

    showPicker() {
        const optionsContainer = document.getElementById('picker-options');
        optionsContainer.innerHTML = '';

        let values;
        if (this.activeSlot === 'operator') {
            values = ['+', '\u2212'];
        } else {
            values = [String(this.result), String(this.operand)];
        }

        for (const val of values) {
            const btn = document.createElement('button');
            btn.className = 'picker-option';
            btn.textContent = val;
            btn.addEventListener('click', () => this.onPickerSelect(val));
            optionsContainer.appendChild(btn);
        }

        document.getElementById('picker-overlay').classList.remove('hidden');
    }

    closePicker() {
        document.getElementById('picker-overlay').classList.add('hidden');
        document.querySelectorAll('.builder-slot').forEach(s => s.classList.remove('active'));
        this.activeSlot = null;
    }

    onPickerSelect(value) {
        const slotEl = document.querySelector(`[data-slot="${this.activeSlot}"]`);

        if (this.builderSlots[this.activeSlot] === value) {
            this.builderSlots[this.activeSlot] = null;
            slotEl.classList.remove('filled');
            slotEl.querySelector('.slot-label').textContent = '';
        } else {
            this.builderSlots[this.activeSlot] = value;
            slotEl.classList.add('filled');
            slotEl.querySelector('.slot-label').textContent = value;
        }

        this.closePicker();

        const allFilled = Object.values(this.builderSlots).every(v => v !== null);
        document.getElementById('step2-check').disabled = !allFilled;
    }

    checkStep2() {
        const num1 = this.builderSlots.num1;
        const op = this.builderSlots.operator;
        const num2 = this.builderSlots.num2;

        let correct = false;
        if (this.operation === 'subtracted') {
            if (op === '+') {
                const a = parseInt(num1), b = parseInt(num2);
                if ((a === this.result && b === this.operand) || (a === this.operand && b === this.result)) correct = true;
            }
        } else {
            if (op === '\u2212') {
                const a = parseInt(num1), b = parseInt(num2);
                if (a === this.result && b === this.operand) correct = true;
            }
        }

        if (correct) {
            document.querySelectorAll('.builder-slot').forEach(s => s.classList.add('correct', 'locked'));
            setTimeout(() => this.showStep(3), 800);
        } else {
            document.querySelectorAll('.builder-slot').forEach(s => s.classList.add('incorrect'));
            setTimeout(() => {
                this.builderSlots = { num1: null, operator: null, num2: null };
                document.querySelectorAll('.builder-slot').forEach(s => {
                    s.className = s.dataset.slot === 'operator' ? 'builder-slot operator-slot' : 'builder-slot';
                    s.querySelector('.slot-label').textContent = '';
                });
                document.getElementById('step2-check').disabled = true;
            }, 700);
        }
    }

    // ---- Step 3: Solve ----

    handleInput(value) {
        if (this.currentStep !== 3) return;

        if (value === 'backspace') {
            this.currentInput = this.currentInput.slice(0, -1);
            this.updateAnswerDisplay();
        } else if (value === 'enter') {
            if (this.currentInput.length > 0) this.checkAnswer(parseInt(this.currentInput));
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
        const computed = this.operation === 'added' ? answer + this.operand : answer - this.operand;
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
            document.getElementById('step2-area').appendChild(resultEl);
            return;
        }

        mark.textContent = computed < 0 ? '' : `Should equal ${this.result}`;
        mark.className = 'incorrect';
        playbackArea.classList.remove('hidden');
    }

    showNextButton() {
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
                setTimeout(() => { if (particle.parentNode) particle.remove(); }, 4000);
            }, i * 30);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MysteryNumberGameV7();
});
