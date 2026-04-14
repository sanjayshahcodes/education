class MysteryNumberGameV5 {
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

        // Diagram layout
        this.barLeft = 30;
        this.barRight = 510;
        this.barY = 100;
        this.tickX = 270; // will be computed per round

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

        // Generate numbers, retrying until the smaller part is 20-40% of the whole
        let attempts = 0;
        do {
            attempts++;
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
            } else if (this.mode === 3) {
                this.operand = Math.floor(Math.random() * 21) + 5;
                if (this.operation === 'added') {
                    this.mysteryNumber = Math.floor(Math.random() * (50 - this.operand - 5 + 1)) + 5;
                    this.result = this.mysteryNumber + this.operand;
                } else {
                    this.mysteryNumber = Math.floor(Math.random() * (50 - this.operand - 5 + 1)) + this.operand + 5;
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
        } while (!this.partsInRange() && attempts < 100);

        if (this.operation === 'subtracted') {
            this.correctWhole = 'S';
            this.displayValues = ['S', String(this.operand), String(this.result)];
        } else {
            this.correctWhole = String(this.result);
            this.displayValues = ['S', String(this.operand), String(this.result)];
        }

        // Part placements match equation order: S (mystery number) on left, operand on right
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

    // Check that the smaller part is 20-40% of the whole
    partsInRange() {
        // The two parts are always operand and one of {mysteryNumber, result}
        let partA, partB;
        if (this.operation === 'subtracted') {
            // whole = mysteryNumber, parts = operand and result
            partA = this.operand;
            partB = this.result;
        } else {
            // whole = result, parts = mysteryNumber and operand
            partA = this.mysteryNumber;
            partB = this.operand;
        }
        const whole = partA + partB;
        const smallerRatio = Math.min(partA, partB) / whole;
        return smallerRatio >= 0.20 && smallerRatio <= 0.40;
    }

    // ---- Scaled Diagram ----

    buildDiagram() {
        const svg = document.getElementById('diagram-svg');
        const ns = 'http://www.w3.org/2000/svg';
        const xhtmlNs = 'http://www.w3.org/1999/xhtml';
        svg.innerHTML = '';

        // Compute the split ratio based on actual part values
        const leftValue = this.correctPartLeft === 'S' ? this.mysteryNumber : parseInt(this.correctPartLeft);
        const rightValue = this.correctPartRight === 'S' ? this.mysteryNumber : parseInt(this.correctPartRight);
        const total = leftValue + rightValue;

        // Left part's share of the bar (generation guarantees smaller part is 20-40%)
        const leftRatio = leftValue / total;

        // Tick position: left segment takes leftRatio of the bar width
        this.tickX = this.barLeft + leftRatio * (this.barRight - this.barLeft);

        const bL = this.barLeft;
        const bR = this.barRight;
        const bY = this.barY;
        const tX = this.tickX;

        // Center points for arcs
        const topCenterX = (bL + bR) / 2;
        const leftCenterX = (bL + tX) / 2;
        const rightCenterX = (tX + bR) / 2;

        // Arc colors
        const arcStroke = 'rgba(255,255,255,0.35)';
        const barStroke = 'rgba(255,255,255,0.85)';

        // Top arc
        const topArc = document.createElementNS(ns, 'path');
        topArc.setAttribute('d', `M ${bL},${bY} Q ${bL},35 ${topCenterX},35 Q ${bR},35 ${bR},${bY}`);
        topArc.setAttribute('fill', 'none');
        topArc.setAttribute('stroke', arcStroke);
        topArc.setAttribute('stroke-width', '2');
        svg.appendChild(topArc);

        // Bottom-left arc — scaled to left segment
        const leftArcPeakY = 180;
        const bottomLeftArc = document.createElementNS(ns, 'path');
        bottomLeftArc.setAttribute('d', `M ${bL},${bY} Q ${bL},${leftArcPeakY} ${leftCenterX},${leftArcPeakY} Q ${tX},${leftArcPeakY} ${tX},${bY}`);
        bottomLeftArc.setAttribute('fill', 'none');
        bottomLeftArc.setAttribute('stroke', arcStroke);
        bottomLeftArc.setAttribute('stroke-width', '2');
        svg.appendChild(bottomLeftArc);

        // Bottom-right arc — scaled to right segment
        const bottomRightArc = document.createElementNS(ns, 'path');
        bottomRightArc.setAttribute('d', `M ${tX},${bY} Q ${tX},${leftArcPeakY} ${rightCenterX},${leftArcPeakY} Q ${bR},${leftArcPeakY} ${bR},${bY}`);
        bottomRightArc.setAttribute('fill', 'none');
        bottomRightArc.setAttribute('stroke', arcStroke);
        bottomRightArc.setAttribute('stroke-width', '2');
        svg.appendChild(bottomRightArc);

        // Horizontal bar
        const bar = document.createElementNS(ns, 'line');
        bar.setAttribute('x1', bL); bar.setAttribute('y1', bY);
        bar.setAttribute('x2', bR); bar.setAttribute('y2', bY);
        bar.setAttribute('stroke', barStroke); bar.setAttribute('stroke-width', '3');
        svg.appendChild(bar);

        // Left end cap
        const leftCap = document.createElementNS(ns, 'line');
        leftCap.setAttribute('x1', bL); leftCap.setAttribute('y1', bY - 12);
        leftCap.setAttribute('x2', bL); leftCap.setAttribute('y2', bY + 12);
        leftCap.setAttribute('stroke', barStroke); leftCap.setAttribute('stroke-width', '3');
        svg.appendChild(leftCap);

        // Right end cap
        const rightCap = document.createElementNS(ns, 'line');
        rightCap.setAttribute('x1', bR); rightCap.setAttribute('y1', bY - 12);
        rightCap.setAttribute('x2', bR); rightCap.setAttribute('y2', bY + 12);
        rightCap.setAttribute('stroke', barStroke); rightCap.setAttribute('stroke-width', '3');
        svg.appendChild(rightCap);

        // Center tick
        const tick = document.createElementNS(ns, 'line');
        tick.setAttribute('x1', tX); tick.setAttribute('y1', bY - 12);
        tick.setAttribute('x2', tX); tick.setAttribute('y2', bY + 12);
        tick.setAttribute('stroke', barStroke); tick.setAttribute('stroke-width', '3');
        svg.appendChild(tick);

        // Circle size
        const circleSize = 66;
        const half = circleSize / 2;

        // Whole circle — centered on top arc
        const wholeFO = document.createElementNS(ns, 'foreignObject');
        wholeFO.setAttribute('x', topCenterX - half);
        wholeFO.setAttribute('y', 2);
        wholeFO.setAttribute('width', circleSize);
        wholeFO.setAttribute('height', circleSize);
        wholeFO.innerHTML = `<div xmlns="${xhtmlNs}" class="diagram-circle empty" data-circle="whole"><span class="circle-label">?</span></div>`;
        svg.appendChild(wholeFO);

        // Part-left circle — centered on left arc
        const partLeftFO = document.createElementNS(ns, 'foreignObject');
        partLeftFO.setAttribute('x', leftCenterX - half);
        partLeftFO.setAttribute('y', 147);
        partLeftFO.setAttribute('width', circleSize);
        partLeftFO.setAttribute('height', circleSize);
        partLeftFO.innerHTML = `<div xmlns="${xhtmlNs}" class="diagram-circle empty" data-circle="partLeft"><span class="circle-label">?</span></div>`;
        svg.appendChild(partLeftFO);

        // Part-right circle — centered on right arc
        const partRightFO = document.createElementNS(ns, 'foreignObject');
        partRightFO.setAttribute('x', rightCenterX - half);
        partRightFO.setAttribute('y', 147);
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

        // Build scaled diagram (will be shown in step 2)
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
            // Show equation builder
            document.getElementById('step3-area').classList.remove('hidden');
        } else if (step === 4) {
            // Hide builder prompt, builder slots, and check button — show completed equation
            document.getElementById('step3-prompt').classList.add('hidden');
            document.getElementById('equation-builder').classList.add('hidden');
            document.getElementById('step3-check').classList.add('hidden');

            // Create a completed equation display
            const completedEq = document.createElement('div');
            completedEq.className = 'equation-option selected-correct';
            completedEq.id = 'completed-equation';
            const num1 = this.builderSlots.num1;
            const op = this.builderSlots.operator;
            const num2 = this.builderSlots.num2;
            completedEq.textContent = `S = ${num1} ${op} ${num2}`;
            document.getElementById('step3-area').appendChild(completedEq);

            // Show number pad
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
    new MysteryNumberGameV5();
});
