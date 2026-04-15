class InverseRelationshipsGame {
    constructor() {
        const params = new URLSearchParams(window.location.search);
        this.mode = parseInt(params.get('mode')) || 1;

        this.totalGames = 0;

        // Problem state
        this.whole = 0;
        this.partLeft = 0;  // larger part
        this.partRight = 0; // smaller part
        this.sPosition = null; // which position is S (mode 2): 'whole', 'left', or 'right'

        // Equation sequence
        this.equations = [];      // array of { target, correctNum1, correctOp, correctNum2, text }
        this.currentEquationIdx = 0;

        // Builder state
        this.builderSlots = { num1: null, operator: null, num2: null };
        this.activeSlot = null;

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
        // Builder slots
        document.querySelectorAll('.builder-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                if (slot.classList.contains('locked')) return;
                this.onSlotTap(slot.dataset.slot);
            });
        });

        // Check button
        document.getElementById('builder-check').addEventListener('click', () => {
            this.checkEquation();
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
        let attempts = 0;
        do {
            attempts++;
            this.whole = Math.floor(Math.random() * 26) + 25; // 25-50

            const minPart = Math.ceil(this.whole * 0.20);
            const maxPart = Math.floor(this.whole * 0.40);
            this.partRight = Math.floor(Math.random() * (maxPart - minPart + 1)) + minPart;
            this.partLeft = this.whole - this.partRight;
        } while (this.partRight < 3 && attempts < 100);

        // In mode 2, randomly assign S to one position
        if (this.mode === 2) {
            const positions = ['whole', 'left', 'right'];
            this.sPosition = positions[Math.floor(Math.random() * 3)];
        } else {
            this.sPosition = null;
        }

        // Display labels (S or number)
        const wLabel = this.sPosition === 'whole' ? 'S' : this.whole;
        const pLLabel = this.sPosition === 'left' ? 'S' : this.partLeft;
        const pRLabel = this.sPosition === 'right' ? 'S' : this.partRight;

        // Generate 3 equations using labels
        this.equations = [
            {
                target: pLLabel,
                otherNums: [wLabel, pRLabel],
                // Correct: pL = w - pR
                validate: (s1, op, s2) => {
                    return op === '\u2212' && String(s1) === String(wLabel) && String(s2) === String(pRLabel);
                }
            },
            {
                target: pRLabel,
                otherNums: [wLabel, pLLabel],
                // Correct: pR = w - pL
                validate: (s1, op, s2) => {
                    return op === '\u2212' && String(s1) === String(wLabel) && String(s2) === String(pLLabel);
                }
            },
            {
                target: wLabel,
                otherNums: [pLLabel, pRLabel],
                // Correct: w = pL + pR (either order)
                validate: (s1, op, s2) => {
                    if (op !== '+') return false;
                    return (String(s1) === String(pLLabel) && String(s2) === String(pRLabel)) ||
                           (String(s1) === String(pRLabel) && String(s2) === String(pLLabel));
                }
            }
        ];

        // Shuffle equation order
        for (let i = this.equations.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.equations[i], this.equations[j]] = [this.equations[j], this.equations[i]];
        }
    }

    // ---- Block Diagram (all circles pre-filled) ----

    buildDiagram() {
        const svg = document.getElementById('diagram-svg');
        const ns = 'http://www.w3.org/2000/svg';
        const xhtmlNs = 'http://www.w3.org/1999/xhtml';
        svg.innerHTML = '';

        const leftValue = this.partLeft;
        const rightValue = this.partRight;
        const total = this.whole;

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

        // Circle labels (S or number)
        const wholeLabel = this.sPosition === 'whole' ? 'S' : total;
        const leftLabel = this.sPosition === 'left' ? 'S' : leftValue;
        const rightLabel = this.sPosition === 'right' ? 'S' : rightValue;

        // Whole circle — pre-filled
        const wholeFO = document.createElementNS(ns, 'foreignObject');
        wholeFO.setAttribute('x', topCenterX - half);
        wholeFO.setAttribute('y', arcTopPeakY - half);
        wholeFO.setAttribute('width', circleSize);
        wholeFO.setAttribute('height', circleSize);
        wholeFO.innerHTML = `<div xmlns="${xhtmlNs}" class="diagram-circle"><span class="circle-label">${wholeLabel}</span></div>`;
        svg.appendChild(wholeFO);

        // Part-left circle — pre-filled
        const partLeftFO = document.createElementNS(ns, 'foreignObject');
        partLeftFO.setAttribute('x', leftCenterX - half);
        partLeftFO.setAttribute('y', arcBottomPeakY - half);
        partLeftFO.setAttribute('width', circleSize);
        partLeftFO.setAttribute('height', circleSize);
        partLeftFO.innerHTML = `<div xmlns="${xhtmlNs}" class="diagram-circle"><span class="circle-label">${leftLabel}</span></div>`;
        svg.appendChild(partLeftFO);

        // Part-right circle — pre-filled
        const partRightFO = document.createElementNS(ns, 'foreignObject');
        partRightFO.setAttribute('x', rightCenterX - half);
        partRightFO.setAttribute('y', arcBottomPeakY - half);
        partRightFO.setAttribute('width', circleSize);
        partRightFO.setAttribute('height', circleSize);
        partRightFO.innerHTML = `<div xmlns="${xhtmlNs}" class="diagram-circle"><span class="circle-label">${rightLabel}</span></div>`;
        svg.appendChild(partRightFO);
    }

    // ---- Round Management ----

    startNewRound() {
        this.generateProblem();
        this.currentEquationIdx = 0;

        // Clear completed equations
        document.getElementById('completed-equations').innerHTML = '';

        // Reset builder
        this.resetBuilder();

        // Show builder
        document.getElementById('builder-area').classList.remove('hidden');

        // Hide next button
        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) nextBtn.classList.add('hidden');

        // Build diagram
        this.buildDiagram();

        // Set up first equation
        this.setupCurrentEquation();
    }

    setupCurrentEquation() {
        const eq = this.equations[this.currentEquationIdx];
        document.getElementById('builder-target').textContent = `${eq.target} =`;
        this.resetBuilder();
    }

    resetBuilder() {
        this.builderSlots = { num1: null, operator: null, num2: null };
        this.activeSlot = null;

        document.querySelectorAll('.builder-slot').forEach(s => {
            s.className = s.dataset.slot === 'operator' ? 'builder-slot operator-slot' : 'builder-slot';
            s.querySelector('.slot-label').textContent = '';
        });

        document.getElementById('builder-check').disabled = true;
    }

    // ---- Slot Picker ----

    onSlotTap(slotId) {
        this.activeSlot = slotId;
        document.querySelectorAll('.builder-slot').forEach(s => s.classList.remove('active'));
        document.querySelector(`[data-slot="${slotId}"]`).classList.add('active');
        this.showPicker();
    }

    showPicker() {
        const optionsContainer = document.getElementById('picker-options');
        optionsContainer.innerHTML = '';

        const eq = this.equations[this.currentEquationIdx];
        let values;

        if (this.activeSlot === 'operator') {
            values = ['+', '\u2212'];
        } else {
            values = eq.otherNums.map(String);
        }

        for (const val of values) {
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
        document.getElementById('builder-check').disabled = !allFilled;
    }

    // ---- Validation ----

    checkEquation() {
        const eq = this.equations[this.currentEquationIdx];
        const s1 = this.builderSlots.num1;
        const op = this.builderSlots.operator;
        const s2 = this.builderSlots.num2;

        const correct = eq.validate(s1, op, s2);

        if (correct) {
            // Flash green on slots
            document.querySelectorAll('.builder-slot').forEach(s => {
                s.classList.add('correct', 'locked');
            });

            // Build display text
            const displayText = `${eq.target} = ${this.builderSlots.num1} ${op} ${this.builderSlots.num2}`;

            setTimeout(() => {
                // Add to completed equations
                const completedEl = document.createElement('div');
                completedEl.className = 'completed-equation';
                completedEl.textContent = displayText;
                document.getElementById('completed-equations').appendChild(completedEl);

                // Advance to next equation
                this.currentEquationIdx++;

                if (this.currentEquationIdx >= this.equations.length) {
                    // All done!
                    this.totalGames++;
                    this.updateStatsDisplay();
                    document.getElementById('builder-area').classList.add('hidden');
                    this.createCelebrationParticles();
                    this.showNextButton();
                } else {
                    this.setupCurrentEquation();
                }
            }, 700);
        } else {
            // Shake and reset
            document.querySelectorAll('.builder-slot').forEach(s => {
                s.classList.add('incorrect');
            });
            setTimeout(() => {
                this.resetBuilder();
            }, 700);
        }
    }

    // ---- Completion ----

    showNextButton() {
        let btn = document.getElementById('next-btn');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'next-btn';
            btn.textContent = 'Next Question';
            btn.addEventListener('click', () => {
                btn.classList.add('hidden');
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
    new InverseRelationshipsGame();
});
