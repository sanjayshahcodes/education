class MysteryNumberGameV6 {
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
        this.displayValues = [];
        this.correctWhole = '';
        this.correctPartLeft = '';
        this.correctPartRight = '';

        // Step tracking (1=translate, 2=diagram, 3=build equation, 4=solve)
        this.currentStep = 1;

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
        // Step 2 check button
        document.getElementById('step2-check').addEventListener('click', () => {
            this.checkStep2();
        });

        // Equation builder slots
        document.querySelectorAll('.builder-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                if (this.currentStep !== 3) return;
                if (slot.classList.contains('locked')) return;
                this.onSlotTap(slot.dataset.slot);
            });
        });

        // Step 3 check button
        document.getElementById('step3-check').addEventListener('click', () => {
            this.checkStep3();
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

        // Generate numbers: total (whole) between 25-50, smaller part is 20-40% of whole
        let attempts = 0;
        do {
            attempts++;
            const whole = Math.floor(Math.random() * 26) + 25; // 25-50

            // Smaller part is 20-40% of whole
            const minPart = Math.ceil(whole * 0.20);
            const maxPart = Math.floor(whole * 0.40);
            const smallerPart = Math.floor(Math.random() * (maxPart - minPart + 1)) + minPart;
            const largerPart = whole - smallerPart;

            if (this.operation === 'added') {
                // S + operand = result, so S is mystery, operand is known, result is whole
                // Randomly assign which part is S and which is operand
                if (Math.random() < 0.5) {
                    this.mysteryNumber = smallerPart;
                    this.operand = largerPart;
                } else {
                    this.mysteryNumber = largerPart;
                    this.operand = smallerPart;
                }
                this.result = whole;
            } else {
                // S - operand = result, so S is whole, operand and result are parts
                this.mysteryNumber = whole;
                // Randomly assign which part is operand and which is result
                if (Math.random() < 0.5) {
                    this.operand = smallerPart;
                    this.result = largerPart;
                } else {
                    this.operand = largerPart;
                    this.result = smallerPart;
                }
            }
        } while (this.operand < 3 && attempts < 100); // ensure operand isn't trivially small

        if (this.operation === 'subtracted') {
            this.correctWhole = 'S';
            this.displayValues = ['S', String(this.operand), String(this.result)];
        } else {
            this.correctWhole = String(this.result);
            this.displayValues = ['S', String(this.operand), String(this.result)];
        }

        // Part placements match equation order
        // For subtraction (S - op = r): whole=S, parts are result(left) and operand(right)
        // For addition (S + op = r): whole=result, parts are S(left) and operand(right)
        if (this.operation === 'subtracted') {
            this.correctPartLeft = String(this.result);
            this.correctPartRight = String(this.operand);
        } else {
            this.correctPartLeft = 'S';
            this.correctPartRight = String(this.operand);
        }
    }

    // ---- Block Diagram ----

    buildDiagram() {
        const svg = document.getElementById('diagram-svg');
        const ns = 'http://www.w3.org/2000/svg';
        const xhtmlNs = 'http://www.w3.org/1999/xhtml';
        svg.innerHTML = '';

        // Compute part values
        const leftValue = this.correctPartLeft === 'S' ? this.mysteryNumber : parseInt(this.correctPartLeft);
        const rightValue = this.correctPartRight === 'S' ? this.mysteryNumber : parseInt(this.correctPartRight);
        const total = leftValue + rightValue;

        // Block layout
        const bs = this.blockSize;
        const gap = this.blockGap;
        const pad = this.diagramPadding;

        // Total width of all blocks
        const blocksWidth = total * bs + (total - 1) * gap;
        const svgWidth = blocksWidth + pad * 2;

        // Vertical layout
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

        // Split point between left and right blocks
        const splitX = pad + leftValue * bs + (leftValue - 1) * gap + gap / 2 + bs / 2;
        // More precisely: last left block ends at pad + leftValue * bs + (leftValue - 1) * gap
        // First right block starts at that + gap
        const leftEnd = pad + leftValue * bs + (leftValue - 1) * gap;
        const rightStart = leftEnd + gap;
        const tickX = (leftEnd + rightStart) / 2;

        // Arc center points
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

        // Draw blocks — left group
        const leftColor = 'rgba(255, 120, 100, 0.7)';
        const rightColor = 'rgba(255, 200, 60, 0.7)';
        const blockStroke = 'rgba(255,255,255,0.6)';

        for (let i = 0; i < leftValue; i++) {
            const x = pad + i * (bs + gap);
            const rect = document.createElementNS(ns, 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', blockY);
            rect.setAttribute('width', bs);
            rect.setAttribute('height', blockHeight);
            rect.setAttribute('rx', 2);
            rect.setAttribute('fill', leftColor);
            rect.setAttribute('stroke', blockStroke);
            rect.setAttribute('stroke-width', '1');
            svg.appendChild(rect);
        }

        // Draw blocks — right group
        for (let i = 0; i < rightValue; i++) {
            const x = rightStart + i * (bs + gap);
            const rect = document.createElementNS(ns, 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', blockY);
            rect.setAttribute('width', bs);
            rect.setAttribute('height', blockHeight);
            rect.setAttribute('rx', 2);
            rect.setAttribute('fill', rightColor);
            rect.setAttribute('stroke', blockStroke);
            rect.setAttribute('stroke-width', '1');
            svg.appendChild(rect);
        }

        // Whole circle — centered on top arc
        const wholeFO = document.createElementNS(ns, 'foreignObject');
        wholeFO.setAttribute('x', topCenterX - half);
        wholeFO.setAttribute('y', arcTopPeakY - half);
        wholeFO.setAttribute('width', circleSize);
        wholeFO.setAttribute('height', circleSize);
        wholeFO.innerHTML = `<div xmlns="${xhtmlNs}" class="diagram-circle empty" data-circle="whole"><span class="circle-label">?</span></div>`;
        svg.appendChild(wholeFO);

        // Part-left circle — centered on left arc
        const partLeftFO = document.createElementNS(ns, 'foreignObject');
        partLeftFO.setAttribute('x', leftCenterX - half);
        partLeftFO.setAttribute('y', arcBottomPeakY - half);
        partLeftFO.setAttribute('width', circleSize);
        partLeftFO.setAttribute('height', circleSize);
        partLeftFO.innerHTML = `<div xmlns="${xhtmlNs}" class="diagram-circle empty" data-circle="partLeft"><span class="circle-label">?</span></div>`;
        svg.appendChild(partLeftFO);

        // Part-right circle — centered on right arc
        const partRightFO = document.createElementNS(ns, 'foreignObject');
        partRightFO.setAttribute('x', rightCenterX - half);
        partRightFO.setAttribute('y', arcBottomPeakY - half);
        partRightFO.setAttribute('width', circleSize);
        partRightFO.setAttribute('height', circleSize);
        partRightFO.innerHTML = `<div xmlns="${xhtmlNs}" class="diagram-circle empty" data-circle="partRight"><span class="circle-label">?</span></div>`;
        svg.appendChild(partRightFO);

        // Re-attach circle click listeners
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
        this.currentStep = 1;
        this.currentInput = '';
        this.gameActive = true;

        // Reset placements
        this.placements = { whole: null, partLeft: null, partRight: null };

        // Reset builder slots
        this.builderSlots = { num1: null, operator: null, num2: null };

        // Reset builder slots UI
        document.querySelectorAll('.builder-slot').forEach(s => {
            s.className = s.dataset.slot === 'operator' ? 'builder-slot operator-slot' : 'builder-slot';
            s.querySelector('.slot-label').textContent = '';
        });

        // Show step 1, hide everything else
        document.getElementById('step1-area').classList.remove('hidden');
        document.getElementById('step1-prompt').classList.remove('hidden');
        document.getElementById('diagram-area').classList.add('hidden');
        document.getElementById('step2-area').classList.add('hidden');
        document.getElementById('step2-check').disabled = true;
        document.getElementById('step3-area').classList.add('hidden');
        document.getElementById('step3-prompt').classList.remove('hidden');
        document.getElementById('step3-check').disabled = true;
        document.getElementById('equation-builder').classList.remove('hidden');
        document.getElementById('step3-check').classList.remove('hidden');
        document.getElementById('step4-area').classList.add('hidden');
        document.getElementById('playback-area').classList.add('hidden');
        this.updateAnswerDisplay();

        // Remove answer result box if exists
        const resultBox = document.getElementById('answer-result-box');
        if (resultBox) resultBox.remove();

        // Remove completed equation display if exists
        const completedEq = document.getElementById('completed-equation');
        if (completedEq) completedEq.remove();

        // Hide next button if exists
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) nextBtn.classList.add('hidden');

        // Display problem
        const verb = this.operation;
        const prep = this.operation === 'added' ? 'to' : 'from';
        document.getElementById('problem-text').textContent =
            `I ${verb} ${this.operand} ${prep} my secret number and got ${this.result}. What is my secret number?`;

        // Build block diagram (will be shown in step 2)
        this.buildDiagram();

        // Set up step 1 choices
        this.setupStep1();
    }

    // ---- Step 1: Translate sentence to equation ----

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
            document.getElementById('step1-prompt').classList.add('hidden');
            document.querySelectorAll('#translate-choices .equation-option').forEach(btn => {
                if (!btn.classList.contains('selected-correct')) {
                    btn.classList.add('hidden');
                }
            });
            document.getElementById('diagram-area').classList.remove('hidden');
            document.getElementById('step2-area').classList.remove('hidden');
        } else if (step === 3) {
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
            completedEq.textContent = `S = ${num1} ${op} ${num2}`;
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
                values = ['+', '\u2212'];
            } else {
                values = [String(this.result), String(this.operand)];
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

    // ---- Step 3: Check equation builder ----

    checkStep3() {
        const num1 = this.builderSlots.num1;
        const op = this.builderSlots.operator;
        const num2 = this.builderSlots.num2;

        let correct = false;
        if (this.operation === 'subtracted') {
            // Correct: S = result + operand (either order for addition)
            if (op === '+') {
                const a = parseInt(num1);
                const b = parseInt(num2);
                if ((a === this.result && b === this.operand) || (a === this.operand && b === this.result)) {
                    correct = true;
                }
            }
        } else {
            // Correct: S = result - operand (order matters for subtraction)
            if (op === '\u2212') {
                const a = parseInt(num1);
                const b = parseInt(num2);
                if (a === this.result && b === this.operand) {
                    correct = true;
                }
            }
        }

        if (correct) {
            document.querySelectorAll('.builder-slot').forEach(s => {
                s.classList.add('correct', 'locked');
            });
            setTimeout(() => {
                this.showStep(4);
            }, 800);
        } else {
            document.querySelectorAll('.builder-slot').forEach(s => {
                s.classList.add('incorrect');
            });
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
    new MysteryNumberGameV6();
});
