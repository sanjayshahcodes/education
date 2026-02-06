class BlockCountingGame {
    constructor() {
        // Probability weights - higher numbers appear more often
        // Easy numbers (1-3) have low probability, harder numbers (6-9) have high probability
        this.numberProbabilities = [
            { number: 1, weight: 1 },   // Very rare
            { number: 2, weight: 1 },   // Very rare  
            { number: 3, weight: 2 },   // Rare
            { number: 4, weight: 3 },   // Uncommon
            { number: 5, weight: 4 },   // Moderate
            { number: 6, weight: 6 },   // Common
            { number: 7, weight: 8 },   // Very common
            { number: 8, weight: 8 },   // Very common
            { number: 9, weight: 6 },   // Common
            { number: 10, weight: 4 }   // Moderate
        ];

        // Different arrangements for each number - structured and symmetric layouts
        this.arrangements = {
            1: [
                { positions: [{x: 0, y: 0}] }
            ],
            2: [
                { positions: [{x: -30, y: 0}, {x: 30, y: 0}] },
                { positions: [{x: 0, y: -30}, {x: 0, y: 30}] }
            ],
            3: [
                { positions: [{x: -60, y: 0}, {x: 0, y: 0}, {x: 60, y: 0}] },
                { positions: [{x: 0, y: -40}, {x: -30, y: 20}, {x: 30, y: 20}] },
                { positions: [{x: -30, y: -30}, {x: 30, y: -30}, {x: 0, y: 30}] }
            ],
            4: [
                { positions: [{x: -30, y: -30}, {x: 30, y: -30}, {x: -30, y: 30}, {x: 30, y: 30}] },
                { positions: [{x: -90, y: 0}, {x: -30, y: 0}, {x: 30, y: 0}, {x: 90, y: 0}] },
                { positions: [{x: -30, y: -30}, {x: 30, y: -30}, {x: 0, y: 30}, {x: 0, y: 90}] }
            ],
            5: [
                { positions: [{x: 0, y: -60}, {x: -30, y: -20}, {x: 30, y: -20}, {x: -30, y: 20}, {x: 30, y: 20}] },
                { positions: [{x: -60, y: -30}, {x: 0, y: -30}, {x: 60, y: -30}, {x: -30, y: 30}, {x: 30, y: 30}] },
                { positions: [{x: -120, y: 0}, {x: -60, y: 0}, {x: 0, y: 0}, {x: 60, y: 0}, {x: 120, y: 0}] }
            ],
            6: [
                { positions: [{x: -30, y: -60}, {x: 30, y: -60}, {x: -30, y: 0}, {x: 30, y: 0}, {x: -30, y: 60}, {x: 30, y: 60}] },
                { positions: [{x: -60, y: -30}, {x: 0, y: -30}, {x: 60, y: -30}, {x: -60, y: 30}, {x: 0, y: 30}, {x: 60, y: 30}] },
                { positions: [{x: -60, y: -40}, {x: 0, y: -40}, {x: 60, y: -40}, {x: -30, y: 20}, {x: 30, y: 20}, {x: 0, y: 60}] }
            ],
            7: [
                { positions: [{x: -60, y: -40}, {x: 0, y: -40}, {x: 60, y: -40}, {x: -60, y: 20}, {x: 0, y: 20}, {x: 60, y: 20}, {x: 0, y: 80}] },
                { positions: [{x: -60, y: -60}, {x: 0, y: -60}, {x: 60, y: -60}, {x: -30, y: 0}, {x: 30, y: 0}, {x: -60, y: 60}, {x: 60, y: 60}] },
                { positions: [{x: -90, y: 0}, {x: -30, y: 0}, {x: 30, y: 0}, {x: 90, y: 0}, {x: -60, y: 60}, {x: 0, y: 60}, {x: 60, y: 60}] }
            ],
            8: [
                { positions: [{x: -30, y: -90}, {x: 30, y: -90}, {x: -30, y: -30}, {x: 30, y: -30}, {x: -30, y: 30}, {x: 30, y: 30}, {x: -30, y: 90}, {x: 30, y: 90}] },
                { positions: [{x: -90, y: -30}, {x: -30, y: -30}, {x: 30, y: -30}, {x: 90, y: -30}, {x: -90, y: 30}, {x: -30, y: 30}, {x: 30, y: 30}, {x: 90, y: 30}] },
                { positions: [{x: -60, y: -60}, {x: 0, y: -60}, {x: 60, y: -60}, {x: -90, y: 0}, {x: 90, y: 0}, {x: -60, y: 60}, {x: 0, y: 60}, {x: 60, y: 60}] }
            ],
            9: [
                { positions: [{x: -60, y: -60}, {x: 0, y: -60}, {x: 60, y: -60}, {x: -60, y: 0}, {x: 0, y: 0}, {x: 60, y: 0}, {x: -60, y: 60}, {x: 0, y: 60}, {x: 60, y: 60}] },
                { positions: [{x: -90, y: -60}, {x: 0, y: -60}, {x: 90, y: -60}, {x: -90, y: 0}, {x: 0, y: 0}, {x: 90, y: 0}, {x: -45, y: 60}, {x: 0, y: 60}, {x: 45, y: 60}] },
                { positions: [{x: -120, y: -30}, {x: -60, y: -30}, {x: 0, y: -30}, {x: 60, y: -30}, {x: 120, y: -30}, {x: -60, y: 30}, {x: 0, y: 30}, {x: 60, y: 30}, {x: 0, y: 90}] }
            ],
            10: [
                { positions: [{x: -90, y: -60}, {x: -30, y: -60}, {x: 30, y: -60}, {x: 90, y: -60}, {x: -60, y: 0}, {x: 0, y: 0}, {x: 60, y: 0}, {x: -90, y: 60}, {x: 30, y: 60}, {x: 0, y: 120}] },
                { positions: [{x: -30, y: -120}, {x: 30, y: -120}, {x: -30, y: -60}, {x: 30, y: -60}, {x: -30, y: 0}, {x: 30, y: 0}, {x: -30, y: 60}, {x: 30, y: 60}, {x: -30, y: 120}, {x: 30, y: 120}] },
                { positions: [{x: -120, y: -30}, {x: -60, y: -30}, {x: 0, y: -30}, {x: 60, y: -30}, {x: 120, y: -30}, {x: -120, y: 30}, {x: -60, y: 30}, {x: 0, y: 30}, {x: 60, y: 30}, {x: 120, y: 30}] }
            ]
        };

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
                    const selectedNumber = parseInt(e.target.dataset.number);
                    this.checkAnswer(selectedNumber, e.target);
                }
            });
        });
    }

    getWeightedRandomNumber() {
        // Calculate total weight
        const totalWeight = this.numberProbabilities.reduce((sum, item) => sum + item.weight, 0);
        
        // Generate random number between 0 and totalWeight
        let random = Math.random() * totalWeight;
        
        // Find the number that corresponds to this random value
        for (const item of this.numberProbabilities) {
            random -= item.weight;
            if (random <= 0) {
                return item.number;
            }
        }
        
        // Fallback (shouldn't happen)
        return this.numberProbabilities[this.numberProbabilities.length - 1].number;
    }

    startNewRound() {
        this.currentNumber = this.getWeightedRandomNumber();
        this.currentAttempt = 1;
        this.gameActive = true;
        
        // Hide feedback overlay
        this.hideFeedback();
        
        // Clear any previous button states
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.remove('correct', 'incorrect');
        });
        
        this.createBlocks();
    }

    createBlocks() {
        const container = document.getElementById('blocks-container');
        container.innerHTML = '';
        
        // Get random arrangement for this number
        const arrangements = this.arrangements[this.currentNumber];
        const selectedArrangement = arrangements[Math.floor(Math.random() * arrangements.length)];
        
        // Create blocks with the selected arrangement
        selectedArrangement.positions.forEach((pos, index) => {
            const block = document.createElement('div');
            block.className = `block block-${(index % 8) + 1}`;
            block.style.left = `calc(50% + ${pos.x}px)`;
            block.style.top = `calc(50% + ${pos.y}px)`;
            block.style.transform = 'translate(-50%, -50%)';
            
            // Add slight random rotation for more organic feel
            const rotation = (Math.random() - 0.5) * 10; // -5 to +5 degrees
            block.style.transform += ` rotate(${rotation}deg)`;
            
            // Stagger the appearance animation
            block.style.animationDelay = `${index * 0.1}s`;
            
            container.appendChild(block);
        });
    }

    checkAnswer(selectedNumber, buttonElement) {
        if (!this.gameActive) return;
        
        this.gameActive = false;
        
        if (selectedNumber === this.currentNumber) {
            // Correct answer
            buttonElement.classList.add('correct');
            
            if (this.currentAttempt === 1) {
                this.firstTryCorrect++;
            }
            this.totalGames++;
            
            this.showFeedback('🎉 Correct! 🎉', 'feedback-correct');
            this.createCelebrationParticles();
            
            // Start new round after delay
            setTimeout(() => {
                this.startNewRound();
            }, 2000);
            
        } else {
            // Incorrect answer
            buttonElement.classList.add('incorrect');
            this.currentAttempt++;
            
            this.showFeedback('Try again! 🤔', 'feedback-incorrect');
            
            // Allow retry after delay
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
        
        // Create 30 particles
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + 'vw';
                particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                particle.style.animationDelay = Math.random() * 1 + 's';
                particle.style.animationDuration = (2 + Math.random() * 2) + 's';
                
                container.appendChild(particle);
                
                // Remove particle after animation
                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.remove();
                    }
                }, 4000);
            }, i * 30);
        }
    }
}

// Start the game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new BlockCountingGame();
});