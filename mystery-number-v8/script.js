/**
 * Mystery Number v8 — same full pipeline as v6 (diagram → equation
 * builder → numpad solve), but the equation is shown directly at the
 * top instead of as a word problem, and uses `x` as the unknown.
 *
 * Four random equation forms per round:
 *   A) x + b = c       → x = c − b   (whole = c, parts = x, b)
 *   B) b + x = c       → x = c − b   (whole = c, parts = b, x)
 *   C) c − x = b       → x = c − b   (whole = c, parts = x, b)
 *   D) x − b = c       → x = c + b   (whole = x, parts = c, b)
 *
 * The picker offers three values for the diagram step: `x`, the number b,
 * and the number c. She drops each into the right circle.
 */
class MysteryNumberGameV8 {
    constructor() {
        this.totalGames = 0;
        this.gameActive = false;

        // Problem state — actual numeric values
        this.xValue = 0;          // the unknown's true value (for diagram + check)
        this.b = 0;
        this.c = 0;
        this.form = '';           // 'xPb' | 'bPx' | 'cMx' | 'xMb'
        this.lastForm = '';
        this.sameFormCount = 0;

        // Diagram targets (labels, not numeric values)
        this.displayValues = [];  // picker options for the three diagram circles
        this.correctWhole = '';
        this.correctPartLeft = '';
        this.correctPartRight = '';

        // Step tracking (2=diagram, 3=build equation, 4=solve). v6's
        // step 1 (translate) is gone; we show the equation directly.
        this.currentStep = 2;

        // Step 2 state (diagram)
        this.placements = { whole: null, partLeft: null, partRight: null };
        this.activeCircle = null;

        // Step 3 state (equation builder)
        this.builderSlots = { num1: null, operator: null, num2: null };
        this.activeSlot = null;

        // Step 4 state (solve)
        this.currentInput = '';

        // Picker mode: 'circle' for diagram, 'slot' for equation builder
        this.pickerMode = null;

        // Block diagram constants
        this.blockSize = 18;
        this.blockGap = 2;
        this.diagramPadding = 30;

        this.init();
    }

    init() {
        this.updateStatsDisplay();
        this.setupStaticListeners();
        this.startNewRound();
    }

    updateStatsDisplay() {
        document.getElementById('total-count').textContent = this.totalGames;
    }

    setupStaticListeners() {
        document.getElementById('step2-check').addEventListener('click', () => {
            this.checkStep2();
        });

        document.querySelectorAll('.builder-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                if (this.currentStep !== 3) return;
                if (slot.classList.contains('locked')) return;
                this.onSlotTap(slot.dataset.slot);
            });
        });

        document.getElementById('step3-check').addEventListener('click', () => {
            this.checkStep3();
        });

        document.querySelectorAll('.pad-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleInput(e.currentTarget.dataset.value);
            });
        });

        document.getElementById('picker-overlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('picker-overlay')) {
                this.closePicker();
            }
        });
    }

    // ---- Problem Generation ----

    generateProblem() {
        // Pick a form, avoiding 3-in-a-row of the same.
        const allForms = ['xPb', 'bPx', 'cMx', 'xMb'];
        let pool = allForms;
        if (this.sameFormCount >= 2) {
            pool = allForms.filter(f => f !== this.lastForm);
        }
        this.form = pool[Math.floor(Math.random() * pool.length)];
        if (this.form === this.lastForm) this.sameFormCount++;
        else this.sameFormCount = 1;
        this.lastForm = this.form;

        // Whole/parts in v6's range (whole 25–50, smaller part 20–40%).
        let whole, smallerPart, largerPart;
        let tries = 0;
        do {
            tries++;
            whole = Math.floor(Math.random() * 26) + 25;
            const minPart = Math.ceil(whole * 0.20);
            const maxPart = Math.floor(whole * 0.40);
            smallerPart = Math.floor(Math.random() * (maxPart - minPart + 1)) + minPart;
            largerPart = whole - smallerPart;
        } while (smallerPart < 3 && tries < 100);

        // Assign x, b, c per form. The part-whole structure dictates
        // which value is the "whole" and which two are "parts."
        if (this.form === 'xPb') {
            if (Math.random() < 0.5) { this.xValue = smallerPart; this.b = largerPart; }
            else                      { this.xValue = largerPart;  this.b = smallerPart; }
            this.c = whole;
        } else if (this.form === 'bPx') {
            if (Math.random() < 0.5) { this.b = smallerPart; this.xValue = largerPart; }
            else                      { this.b = largerPart;  this.xValue = smallerPart; }
            this.c = whole;
        } else if (this.form === 'cMx') {
            if (Math.random() < 0.5) { this.xValue = smallerPart; this.b = largerPart; }
            else                      { this.xValue = largerPart;  this.b = smallerPart; }
            this.c = whole;
        } else {
            // x − b = c → x = c + b. x is the whole; c and b are the parts.
            this.xValue = whole;
            if (Math.random() < 0.5) { this.c = smallerPart; this.b = largerPart; }
            else                      { this.c = largerPart;  this.b = smallerPart; }
        }

        // Diagram labels per form. 'x' is the label for the unknown; b
        // and c are number strings. Picker shows all three.
        const bStr = String(this.b);
        const cStr = String(this.c);
        if (this.form === 'xPb') {
            this.correctWhole     = cStr;
            this.correctPartLeft  = 'x';
            this.correctPartRight = bStr;
        } else if (this.form === 'bPx') {
            this.correctWhole     = cStr;
            this.correctPartLeft  = bStr;
            this.correctPartRight = 'x';
        } else if (this.form === 'cMx') {
            this.correctWhole     = cStr;
            this.correctPartLeft  = 'x';
            this.correctPartRight = bStr;
        } else {
            this.correctWhole     = 'x';
            this.correctPartLeft  = cStr;
            this.correctPartRight = bStr;
        }
        // Picker options (shuffled order so position can't be memorized).
        this.displayValues = ['x', bStr, cStr];
        for (let i = this.displayValues.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.displayValues[i], this.displayValues[j]] = [this.displayValues[j], this.displayValues[i]];
        }
    }

    equationDisplay() {
        const minus = '−';
        switch (this.form) {
            case 'xPb': return `x + ${this.b} = ${this.c}`;
            case 'bPx': return `${this.b} + x = ${this.c}`;
            case 'cMx': return `${this.c} ${minus} x = ${this.b}`;
            case 'xMb': return `x ${minus} ${this.b} = ${this.c}`;
        }
        return '';
    }

    // ---- Block Diagram ----

    buildDiagram() {
        const svg = document.getElementById('diagram-svg');
        const ns = 'http://www.w3.org/2000/svg';
        const xhtmlNs = 'http://www.w3.org/1999/xhtml';
        svg.innerHTML = '';

        // Compute part values for block layout. 'x' maps to xValue.
        const leftValue = this.correctPartLeft === 'x' ? this.xValue : parseInt(this.correctPartLeft);
        const rightValue = this.correctPartRight === 'x' ? this.xValue : parseInt(this.correctPartRight);
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

        const topArc = document.createElementNS(ns, 'path');
        topArc.setAttribute('d', `M ${barLeft},${barMidY} Q ${barLeft},${arcTopPeakY} ${topCenterX},${arcTopPeakY} Q ${barRight},${arcTopPeakY} ${barRight},${barMidY}`);
        topArc.setAttribute('fill', 'none');
        topArc.setAttribute('stroke', arcStroke);
        topArc.setAttribute('stroke-width', '2');
        svg.appendChild(topArc);

        const bottomLeftArc = document.createElementNS(ns, 'path');
        bottomLeftArc.setAttribute('d', `M ${barLeft},${barMidY} Q ${barLeft},${arcBottomPeakY} ${leftCenterX},${arcBottomPeakY} Q ${tickX},${arcBottomPeakY} ${tickX},${barMidY}`);
        bottomLeftArc.setAttribute('fill', 'none');
        bottomLeftArc.setAttribute('stroke', arcStroke);
        bottomLeftArc.setAttribute('stroke-width', '2');
        svg.appendChild(bottomLeftArc);

        const bottomRightArc = document.createElementNS(ns, 'path');
        bottomRightArc.setAttribute('d', `M ${tickX},${barMidY} Q ${tickX},${arcBottomPeakY} ${rightCenterX},${arcBottomPeakY} Q ${barRight},${arcBottomPeakY} ${barRight},${barMidY}`);
        bottomRightArc.setAttribute('fill', 'none');
        bottomRightArc.setAttribute('stroke', arcStroke);
        bottomRightArc.setAttribute('stroke-width', '2');
        svg.appendChild(bottomRightArc);

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

        for (let i = 0; i < rightValue; i++) {
            const x = rightStart + i * (bs + gap);
            const rect = document.createElementNS(ns, 'rect');
            rect.setAttribute('x', x); rect.setAttribute('y', blockY);
            rect.setAttribute('width', bs); rect.setAttribute('height', blockHeight);
            rect.setAttribute('rx', 2); rect.setAttribute('fill', rightColor);
            rect.setAttribute('stroke', blockStroke); rect.setAttribute('stroke-width', '1');
            svg.appendChild(rect);
        }

        const wholeFO = document.createElementNS(ns, 'foreignObject');
        wholeFO.setAttribute('x', topCenterX - half); wholeFO.setAttribute('y', arcTopPeakY - half);
        wholeFO.setAttribute('width', circleSize); wholeFO.setAttribute('height', circleSize);
        wholeFO.innerHTML = `<div xmlns="${xhtmlNs}" class="diagram-circle empty" data-circle="whole"><span class="circle-label">?</span></div>`;
        svg.appendChild(wholeFO);

        const partLeftFO = document.createElementNS(ns, 'foreignObject');
        partLeftFO.setAttribute('x', leftCenterX - half); partLeftFO.setAttribute('y', arcBottomPeakY - half);
        partLeftFO.setAttribute('width', circleSize); partLeftFO.setAttribute('height', circleSize);
        partLeftFO.innerHTML = `<div xmlns="${xhtmlNs}" class="diagram-circle empty" data-circle="partLeft"><span class="circle-label">?</span></div>`;
        svg.appendChild(partLeftFO);

        const partRightFO = document.createElementNS(ns, 'foreignObject');
        partRightFO.setAttribute('x', rightCenterX - half); partRightFO.setAttribute('y', arcBottomPeakY - half);
        partRightFO.setAttribute('width', circleSize); partRightFO.setAttribute('height', circleSize);
        partRightFO.innerHTML = `<div xmlns="${xhtmlNs}" class="diagram-circle empty" data-circle="partRight"><span class="circle-label">?</span></div>`;
        svg.appendChild(partRightFO);

        svg.querySelectorAll('.diagram-circle').forEach(circle => {
            circle.addEventListener('click', () => {
                if (this.currentStep !== 2) return;
                if (circle.classList.contains('locked')) return;
                this.onCircleTap(circle.dataset.circle);
            });
        });
    }

    // ---- Round Management ----

    startNewRound() {
        this.generateProblem();
        this.currentStep = 2;
        this.currentInput = '';
        this.gameActive = true;

        this.placements = { whole: null, partLeft: null, partRight: null };
        this.builderSlots = { num1: null, operator: null, num2: null };

        document.querySelectorAll('.builder-slot').forEach(s => {
            s.className = s.dataset.slot === 'operator' ? 'builder-slot operator-slot' : 'builder-slot';
            s.querySelector('.slot-label').textContent = '';
        });

        // Show diagram + step 2 immediately (no translate step).
        document.getElementById('diagram-area').classList.remove('hidden');
        document.getElementById('step2-area').classList.remove('hidden');
        document.getElementById('step2-check').disabled = true;
        document.getElementById('step3-area').classList.add('hidden');
        document.getElementById('step3-prompt').classList.remove('hidden');
        document.getElementById('step3-check').disabled = true;
        document.getElementById('equation-builder').classList.remove('hidden');
        document.getElementById('step3-check').classList.remove('hidden');
        document.getElementById('step4-area').classList.add('hidden');
        document.getElementById('playback-area').classList.add('hidden');
        this.updateAnswerDisplay();

        const resultBox = document.getElementById('answer-result-box');
        if (resultBox) resultBox.remove();

        const completedEq = document.getElementById('completed-equation');
        if (completedEq) completedEq.remove();

        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) nextBtn.classList.add('hidden');

        document.getElementById('equation-display').textContent = this.equationDisplay();
        this.buildDiagram();
    }

    // ---- Step transitions ----

    showStep(step) {
        this.currentStep = step;

        if (step === 3) {
            document.getElementById('step2-area').classList.add('hidden');
            document.getElementById('step3-area').classList.remove('hidden');
        } else if (step === 4) {
            document.getElementById('step3-prompt').classList.add('hidden');
            document.getElementById('equation-builder').classList.add('hidden');
            document.getElementById('step3-check').classList.add('hidden');

            const completedEq = document.createElement('div');
            completedEq.className = 'equation-option selected-correct';
            completedEq.id = 'completed-equation';
            const num1 = this.builderSlots.num1;
            const op = this.builderSlots.operator;
            const num2 = this.builderSlots.num2;
            completedEq.textContent = `x = ${num1} ${op} ${num2}`;
            document.getElementById('step3-area').appendChild(completedEq);

            document.getElementById('step4-area').classList.remove('hidden');
            this.currentInput = '';
            this.updateAnswerDisplay();
        }
    }

    // ---- Step 2: Diagram ----

    onCircleTap(circleId) {
        this.activeCircle = circleId;
        this.pickerMode = 'circle';
        document.querySelectorAll('.diagram-circle').forEach(c => c.classList.remove('active'));
        document.querySelector(`[data-circle="${circleId}"]`).classList.add('active');
        this.showPicker();
    }

    // ---- Step 3: Equation Builder ----

    onSlotTap(slotId) {
        this.activeSlot = slotId;
        this.pickerMode = 'slot';
        document.querySelectorAll('.builder-slot').forEach(s => s.classList.remove('active'));
        document.querySelector(`[data-slot="${slotId}"]`).classList.add('active');
        this.showPicker();
    }

    // ---- Unified Picker ----

    showPicker() {
        const optionsContainer = document.getElementById('picker-options');
        optionsContainer.innerHTML = '';

        let values;
        if (this.pickerMode === 'circle') {
            values = this.displayValues;
        } else if (this.pickerMode === 'slot') {
            if (this.activeSlot === 'operator') {
                values = ['+', '−'];
            } else {
                values = [String(this.c), String(this.b)];
            }
        }

        for (const val of values) {
            const btn = document.createElement('button');
            btn.className = 'picker-option';
            btn.textContent = val;
            btn.addEventListener('click', () => {
                if (this.pickerMode === 'circle') {
                    this.onPickerSelectCircle(val);
                } else {
                    this.onPickerSelectSlot(val);
                }
            });
            optionsContainer.appendChild(btn);
        }

        document.getElementById('picker-overlay').classList.remove('hidden');
    }

    closePicker() {
        document.getElementById('picker-overlay').classList.add('hidden');
        document.querySelectorAll('.diagram-circle').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.builder-slot').forEach(s => s.classList.remove('active'));
        this.activeCircle = null;
        this.activeSlot = null;
        this.pickerMode = null;
    }

    onPickerSelectCircle(value) {
        if (this.placements[this.activeCircle] === value) {
            this.placements[this.activeCircle] = null;
            const circle = document.querySelector(`[data-circle="${this.activeCircle}"]`);
            circle.classList.remove('filled');
            circle.classList.add('empty');
            circle.querySelector('.circle-label').textContent = '?';
        } else {
            // Picker values are unique; clear any other circle holding the same value.
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

    onPickerSelectSlot(value) {
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
        document.getElementById('step3-check').disabled = !allFilled;
    }

    checkStep2() {
        const wholeCorrect = this.placements.whole === this.correctWhole;
        const leftCorrect = this.placements.partLeft === this.correctPartLeft;
        const rightCorrect = this.placements.partRight === this.correctPartRight;

        if (wholeCorrect && leftCorrect && rightCorrect) {
            document.querySelectorAll('.diagram-circle').forEach(c => {
                c.classList.add('correct', 'locked');
            });
            setTimeout(() => this.showStep(3), 800);
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

    // ---- Step 3: Check equation builder ----

    checkStep3() {
        const num1 = this.builderSlots.num1;
        const op = this.builderSlots.operator;
        const num2 = this.builderSlots.num2;
        const a = parseInt(num1), bv = parseInt(num2);
        const minus = '−';

        // Forms A, B, C: x = c − b. Form D: x = c + b (commutative).
        let correct = false;
        if (this.form === 'xMb') {
            if (op === '+') {
                if ((a === this.c && bv === this.b) || (a === this.b && bv === this.c)) correct = true;
            }
        } else {
            if (op === minus && a === this.c && bv === this.b) correct = true;
        }

        if (correct) {
            document.querySelectorAll('.builder-slot').forEach(s => s.classList.add('correct', 'locked'));
            setTimeout(() => this.showStep(4), 800);
        } else {
            document.querySelectorAll('.builder-slot').forEach(s => s.classList.add('incorrect'));
            setTimeout(() => {
                this.builderSlots = { num1: null, operator: null, num2: null };
                document.querySelectorAll('.builder-slot').forEach(s => {
                    s.className = s.dataset.slot === 'operator' ? 'builder-slot operator-slot' : 'builder-slot';
                    s.querySelector('.slot-label').textContent = '';
                });
                document.getElementById('step3-check').disabled = true;
            }, 700);
        }
    }

    // ---- Step 4: Number Pad Solve ----

    handleInput(value) {
        if (this.currentStep !== 4) return;

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

        if (answer === this.xValue) {
            this.totalGames++;
            this.updateStatsDisplay();
            this.createCelebrationParticles();
            this.showNextButton();
        } else {
            this.currentInput = '';
            this.updateAnswerDisplay();
        }
    }

    // Plug her guess back into the original equation form so she sees
    // exactly what computes and how it compares to the right-hand side.
    showPlayback(answer) {
        const playbackArea = document.getElementById('playback-area');
        const equation = document.getElementById('playback-equation');
        const mark = document.getElementById('playback-mark');
        const minus = '−';
        const answerBox = `<span class="answer-box">${answer}</span>`;

        let eq, computed, expectedLabel;

        if (this.form === 'xPb') {
            computed = answer + this.b;
            eq = `${answerBox} + ${this.b} = ${computed}`;
            expectedLabel = `Should equal ${this.c}`;
        } else if (this.form === 'bPx') {
            computed = this.b + answer;
            eq = `${this.b} + ${answerBox} = ${computed}`;
            expectedLabel = `Should equal ${this.c}`;
        } else if (this.form === 'cMx') {
            computed = this.c - answer;
            if (computed < 0) {
                eq = `${this.c} ${minus} ${answerBox} = <span class="not-allowed">Not allowed</span>`;
            } else {
                eq = `${this.c} ${minus} ${answerBox} = ${computed}`;
            }
            expectedLabel = `Should equal ${this.b}`;
        } else {
            computed = answer - this.b;
            if (computed < 0) {
                eq = `${answerBox} ${minus} ${this.b} = <span class="not-allowed">Not allowed</span>`;
            } else {
                eq = `${answerBox} ${minus} ${this.b} = ${computed}`;
            }
            expectedLabel = `Should equal ${this.c}`;
        }

        equation.innerHTML = eq;

        const isCorrect = answer === this.xValue;
        if (isCorrect) {
            const resultEl = document.createElement('div');
            resultEl.className = 'equation-option selected-correct';
            resultEl.id = 'answer-result-box';
            resultEl.textContent = `x = ${answer}`;
            document.getElementById('step3-area').appendChild(resultEl);
            return;
        }

        mark.textContent = computed < 0 ? '' : expectedLabel;
        mark.className = 'incorrect';
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
                setTimeout(() => { if (particle.parentNode) particle.remove(); }, 4000);
            }, i * 30);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MysteryNumberGameV8();
});
