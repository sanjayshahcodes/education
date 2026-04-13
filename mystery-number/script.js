class MysteryNumberGame {
    constructor() {
        // Mode from URL: ?mode=1 (within 30), ?mode=2 (multiples of 5 within 100), ?mode=3 (any within 100)
        const params = new URLSearchParams(window.location.search);
        this.mode = parseInt(params.get('mode')) || 1;

        this.totalGames = 0;
        this.currentAttempt = 1;
        this.gameActive = false;

        // Current problem state
        this.mysteryNumber = 0;
        this.operation = ''; // 'added' or 'subtracted'
        this.lastOperation = '';
        this.sameOpCount = 0;
        this.operand = 0;
        this.result = 0;

        // Current typed answer
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
        const padButtons = document.querySelectorAll('.pad-btn');
        padButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const value = e.currentTarget.dataset.value;
                this.handleInput(value);
            });
        });
    }

    handleInput(value) {
        if (!this.gameActive) return;

        if (value === 'backspace') {
            this.currentInput = this.currentInput.slice(0, -1);
            this.updateAnswerDisplay();
        } else if (value === 'enter') {
            if (this.currentInput.length > 0) {
                this.checkAnswer(parseInt(this.currentInput));
            }
        } else {
            // Max 3 digits
            if (this.currentInput.length < 3) {
                this.currentInput += value;
                this.updateAnswerDisplay();
            }
        }
    }

    updateAnswerDisplay() {
        const display = document.getElementById('answer-display');
        display.textContent = this.currentInput || '?';
    }

    generateProblem() {
        // Force switch after 2 in a row of the same operation
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
            // Within 30
            this.operand = Math.floor(Math.random() * 13) + 3; // 3-15
            if (this.operation === 'added') {
                this.mysteryNumber = Math.floor(Math.random() * (30 - this.operand - 2)) + 2;
                this.result = this.mysteryNumber + this.operand;
            } else {
                this.mysteryNumber = Math.floor(Math.random() * (30 - this.operand - 2)) + this.operand + 2;
                this.result = this.mysteryNumber - this.operand;
            }
        } else if (this.mode === 2) {
            // Multiples of 5 within 100
            this.operand = (Math.floor(Math.random() * 8) + 1) * 5; // 5, 10, ..., 40
            if (this.operation === 'added') {
                const maxMystery = Math.floor((100 - this.operand) / 5);
                this.mysteryNumber = (Math.floor(Math.random() * (maxMystery - 1)) + 1) * 5;
                this.result = this.mysteryNumber + this.operand;
            } else {
                const minMystery = this.operand / 5 + 1;
                const maxMystery = 20; // 100 / 5
                this.mysteryNumber = (Math.floor(Math.random() * (maxMystery - minMystery)) + minMystery) * 5;
                this.result = this.mysteryNumber - this.operand;
            }
        } else {
            // Any number within 100
            this.operand = Math.floor(Math.random() * 41) + 10; // 10-50
            if (this.operation === 'added') {
                this.mysteryNumber = Math.floor(Math.random() * (99 - this.operand - 10 + 1)) + 10;
                this.result = this.mysteryNumber + this.operand;
            } else {
                this.mysteryNumber = Math.floor(Math.random() * (99 - this.operand - 10 + 1)) + this.operand + 10;
                this.result = this.mysteryNumber - this.operand;
            }
        }
    }

    startNewRound() {
        this.generateProblem();
        this.currentAttempt = 1;
        this.currentInput = '';
        this.gameActive = true;

        this.hideFeedback();
        this.hidePlayback();
        this.updateAnswerDisplay();

        // Display the problem
        const problemText = document.getElementById('problem-text');
        const verb = this.operation === 'added' ? 'added' : 'subtracted';
        const preposition = this.operation === 'added' ? 'to' : 'from';
        problemText.textContent = `I ${verb} ${this.operand} ${preposition} my number and got ${this.result}. What was my number?`;
    }

    checkAnswer(answer) {
        if (!this.gameActive) return;
        this.gameActive = false;

        // Show playback
        this.showPlayback(answer);

        if (answer === this.mysteryNumber) {
            // Correct
            this.totalGames++;
            this.updateStatsDisplay();
            this.createCelebrationParticles();
            this.showNextButton();
        } else {
            // Incorrect — keep playback visible, let her try again
            this.currentAttempt++;
            this.gameActive = true;
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

        // Handle negative results — show "Not allowed" instead
        if (computed < 0) {
            equation.innerHTML = `<span class="answer-box">${answer}</span> ${op} ${this.operand} = <span class="not-allowed">Not allowed</span>`;
        } else {
            equation.innerHTML = `<span class="answer-box">${answer}</span> ${op} ${this.operand} = ${computed}`;
        }

        if (isCorrect) {
            mark.textContent = '\u2713';
            mark.className = 'correct';
        } else if (computed < 0) {
            mark.textContent = '';
            mark.className = 'incorrect';
        } else {
            mark.textContent = `Should equal ${this.result}`;
            mark.className = 'incorrect';
        }

        playbackArea.classList.remove('hidden');
    }

    hidePlayback() {
        document.getElementById('playback-area').classList.add('hidden');
    }

    showNextButton() {
        const answerSection = document.getElementById('answer-section');
        answerSection.classList.add('hidden');

        let btn = document.getElementById('next-btn');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'next-btn';
            btn.textContent = 'Next Question';
            btn.addEventListener('click', () => {
                btn.classList.add('hidden');
                answerSection.classList.remove('hidden');
                this.startNewRound();
            });
            document.getElementById('game-container').appendChild(btn);
        }
        btn.classList.remove('hidden');
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
    new MysteryNumberGame();
});
