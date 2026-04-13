class BlockCountingGame {
    constructor() {
        // Probability weights - higher numbers appear more often
        this.numberProbabilities = [
            { number: 4, weight: 7.5 },
            { number: 5, weight: 7.5 },
            { number: 6, weight: 17 },
            { number: 7, weight: 17 },
            { number: 8, weight: 17 },
            { number: 9, weight: 17 },
            { number: 10, weight: 17 }
        ];

        // Max blocks per row for arrangement generation
        this.MAX_ROW_WIDTH = 6;

        // Cell spacing in pixels. Each "cell unit" in the arrangements above
        // is half this value, so adjacent cells (cell distance 2) sit CELL_SPACING apart.
        this.CELL_SPACING = 75;

        this.currentNumber = 0;
        this.totalGames = 0;
        this.firstTryCorrect = 0;
        this.currentAttempt = 1;
        this.gameActive = false;

        this.init();
    }

    init() {
        this.updateStatsDisplay();
        this.setupEventListeners();
        this.startNewRound();
    }

    updateStatsDisplay() {
        document.getElementById('total-count').textContent = this.totalGames;
        document.getElementById('first-try-count').textContent = this.firstTryCorrect;
    }

    setupEventListeners() {
        const answerButtons = document.querySelectorAll('.answer-btn');
        answerButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                if (this.gameActive) {
                    const selectedNumber = parseInt(e.currentTarget.dataset.number);
                    this.checkAnswer(selectedNumber, e.currentTarget);
                }
            });
        });
    }

    getWeightedRandomNumber() {
        const totalWeight = this.numberProbabilities.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        for (const item of this.numberProbabilities) {
            random -= item.weight;
            if (random <= 0) {
                return item.number;
            }
        }
        return this.numberProbabilities[this.numberProbabilities.length - 1].number;
    }

    startNewRound() {
        let next;
        do {
            next = this.getWeightedRandomNumber();
        } while (next === this.currentNumber);
        this.currentNumber = next;
        this.currentAttempt = 1;
        this.gameActive = true;

        this.hideFeedback();

        const container = document.getElementById('number-buttons');
        const buttons = [...container.querySelectorAll('.answer-btn')];
        buttons.forEach(btn => btn.classList.remove('correct', 'incorrect'));
        // Fisher-Yates shuffle
        for (let i = buttons.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            container.appendChild(buttons[j]);
            buttons.splice(j, 1);
        }

        this.createBlocks();
    }

    // Generate a random connected shape of n cells on the grid.
    // Starts from a random seed cell and grows by adding random
    // orthogonal neighbors, producing a unique shape every time.
    // Generate centered rows of blocks that sum to n.
    // Each row is centered horizontally, giving a balanced shape.
    generateArrangement(n) {
        const rows = this._splitIntoRows(n);

        // Build centered positions
        const positions = [];
        const totalRows = rows.length;
        const centerY = (totalRows - 1) / 2;

        for (let r = 0; r < rows.length; r++) {
            const count = rows[r];
            const startX = -(count - 1) / 2;
            for (let i = 0; i < count; i++) {
                positions.push([startX + i, r - centerY]);
            }
        }

        return positions;
    }

    // Split n into random row lengths (1 to MAX_ROW_WIDTH each).
    _splitIntoRows(n) {
        if (n === 1) return [1];

        for (let attempt = 0; attempt < 50; attempt++) {
            const rows = [];
            let remaining = n;

            while (remaining > 0) {
                const max = Math.min(remaining, this.MAX_ROW_WIDTH);
                const count = Math.floor(Math.random() * max) + 1;
                rows.push(count);
                remaining -= count;
            }

            // Avoid boring single-row layouts for n > 1
            if (rows.length === 1 && n > 1) continue;

            // Max 4 rows to stay within the block box
            if (rows.length > 4) continue;

            // Shuffle row order for variety
            for (let i = rows.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [rows[i], rows[j]] = [rows[j], rows[i]];
            }

            return rows;
        }

        // Fallback
        return [n];
    }

    createBlocks() {
        const container = document.getElementById('blocks-container');
        container.innerHTML = '';

        const positions = this.generateArrangement(this.currentNumber);
        const colorOffset = Math.floor(Math.random() * 8);

        positions.forEach(([cx, cy], index) => {
            const block = document.createElement('div');
            block.className = `block block-${((index + colorOffset) % 8) + 1}`;
            const px = cx * this.CELL_SPACING;
            const py = cy * this.CELL_SPACING;
            block.style.left = `calc(50% + ${px}px)`;
            block.style.top = `calc(50% + ${py}px)`;
            block.style.transform = 'translate(-50%, -50%)';
            block.style.animationDelay = `${index * 0.08}s`;
            container.appendChild(block);
        });
    }

    checkAnswer(selectedNumber, buttonElement) {
        if (!this.gameActive) return;

        this.gameActive = false;

        if (selectedNumber === this.currentNumber) {
            buttonElement.classList.add('correct');

            if (this.currentAttempt === 1) {
                this.firstTryCorrect++;
            }
            this.totalGames++;

            this.showFeedback('🎉 Correct! 🎉', 'feedback-correct');
            this.createCelebrationParticles();

            setTimeout(() => {
                this.startNewRound();
            }, 2000);

        } else {
            buttonElement.classList.add('incorrect');
            this.currentAttempt++;

            this.showFeedback('Try again! 🤔', 'feedback-incorrect');

            setTimeout(() => {
                this.gameActive = true;
                buttonElement.classList.remove('incorrect');
                this.hideFeedback();
            }, 1500);
        }

        this.updateStatsDisplay();
    }

    showFeedback(message, className) {
        const overlay = document.getElementById('feedback-overlay');
        const messageElement = document.getElementById('feedback-message');

        messageElement.textContent = message;
        messageElement.className = className;
        overlay.classList.remove('hidden');
    }

    hideFeedback() {
        document.getElementById('feedback-overlay').classList.add('hidden');
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
                    if (particle.parentNode) {
                        particle.remove();
                    }
                }, 4000);
            }, i * 30);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BlockCountingGame();
});
