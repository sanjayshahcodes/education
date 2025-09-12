// SET Game Logic
class SetGame {
    constructor() {
        this.cards = [];
        this.selectedCards = [];
        this.foundSets = [];
        this.allPossibleSets = [];
        this.init();
    }

    init() {
        this.generateCardsWithSixSets();
        this.renderCards();
        this.updateScore();
    }

    // Generate all possible cards (3^3 = 27 total combinations)
    generateAllCards() {
        const numbers = [1, 2, 3];
        const shapes = ['circle', 'square', 'triangle'];
        const colors = ['red', 'green', 'purple'];
        
        const allCards = [];
        for (let number of numbers) {
            for (let shape of shapes) {
                for (let color of colors) {
                    allCards.push({ number, shape, color });
                }
            }
        }
        return allCards;
    }

    // Find all possible sets in a given array of cards
    findAllSets(cards) {
        const sets = [];
        for (let i = 0; i < cards.length - 2; i++) {
            for (let j = i + 1; j < cards.length - 1; j++) {
                for (let k = j + 1; k < cards.length; k++) {
                    if (this.isValidSet([cards[i], cards[j], cards[k]])) {
                        sets.push([i, j, k]);
                    }
                }
            }
        }
        return sets;
    }

    // Generate 9 cards that contain exactly 6 sets
    generateCardsWithSixSets() {
        const allCards = this.generateAllCards();
        let attempts = 0;
        const maxAttempts = 1000;

        while (attempts < maxAttempts) {
            // Randomly select 9 cards
            const shuffled = [...allCards].sort(() => Math.random() - 0.5);
            const selectedCards = shuffled.slice(0, 9);
            
            // Check how many sets this combination has
            const sets = this.findAllSets(selectedCards);
            
            if (sets.length === 6) {
                this.cards = selectedCards;
                this.allPossibleSets = sets;
                return;
            }
            attempts++;
        }

        // Fallback: use a known configuration with 6 sets
        this.cards = [
            { number: 1, shape: 'circle', color: 'red' },
            { number: 1, shape: 'circle', color: 'green' },
            { number: 1, shape: 'circle', color: 'purple' },
            { number: 2, shape: 'square', color: 'red' },
            { number: 2, shape: 'square', color: 'green' },
            { number: 2, shape: 'square', color: 'purple' },
            { number: 3, shape: 'triangle', color: 'red' },
            { number: 3, shape: 'triangle', color: 'green' },
            { number: 3, shape: 'triangle', color: 'purple' }
        ];
        this.allPossibleSets = this.findAllSets(this.cards);
    }

    renderCards() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '';

        this.cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.dataset.index = index;
            
            const shapesContainer = document.createElement('div');
            shapesContainer.className = 'shapes';
            
            for (let i = 0; i < card.number; i++) {
                const shape = document.createElement('div');
                shape.className = `shape ${card.shape} ${card.color}`;
                shapesContainer.appendChild(shape);
            }
            
            cardElement.appendChild(shapesContainer);
            cardElement.addEventListener('click', () => this.selectCard(index));
            gameBoard.appendChild(cardElement);
        });
    }

    selectCard(index) {
        const cardElement = document.querySelector(`[data-index="${index}"]`);
        
        if (this.selectedCards.includes(index)) {
            // Deselect card
            this.selectedCards = this.selectedCards.filter(i => i !== index);
            cardElement.classList.remove('selected');
        } else if (this.selectedCards.length < 3) {
            // Select card
            this.selectedCards.push(index);
            cardElement.classList.add('selected');
            
            // Check for set when 3 cards are selected
            if (this.selectedCards.length === 3) {
                this.checkSet();
            }
        }
    }

    checkSet() {
        const selectedCardData = this.selectedCards.map(i => this.cards[i]);
        
        if (this.isValidSet(selectedCardData)) {
            // Check if this set has already been found
            if (this.isSetAlreadyFound(this.selectedCards)) {
                this.handleDuplicateSet();
            } else {
                this.handleCorrectSet();
            }
        } else {
            this.handleIncorrectSet();
        }
    }

    isSetAlreadyFound(cardIndices) {
        // Sort the indices to compare sets regardless of selection order
        const sortedIndices = [...cardIndices].sort((a, b) => a - b);
        
        return this.foundSets.some(foundSet => {
            const sortedFoundSet = [...foundSet].sort((a, b) => a - b);
            return sortedFoundSet.length === sortedIndices.length && 
                   sortedFoundSet.every((val, index) => val === sortedIndices[index]);
        });
    }

    handleDuplicateSet() {
        // Add visual feedback for duplicate set (yellow/orange)
        this.selectedCards.forEach(index => {
            const cardElement = document.querySelector(`[data-index="${index}"]`);
            cardElement.classList.add('duplicate-set');
            cardElement.classList.remove('selected');
        });

        setTimeout(() => {
            // Remove visual feedback and deselect cards
            this.selectedCards.forEach(index => {
                const cardElement = document.querySelector(`[data-index="${index}"]`);
                cardElement.classList.remove('duplicate-set');
            });
            this.selectedCards = [];
        }, 800);
    }

    isValidSet(cards) {
        if (cards.length !== 3) return false;
        
        const properties = ['number', 'shape', 'color'];
        
        for (let prop of properties) {
            const values = cards.map(card => card[prop]);
            const allSame = values.every(v => v === values[0]);
            const allDifferent = new Set(values).size === 3;
            
            if (!allSame && !allDifferent) {
                return false;
            }
        }
        
        return true;
    }

    handleCorrectSet() {
        // Add visual feedback
        this.selectedCards.forEach(index => {
            const cardElement = document.querySelector(`[data-index="${index}"]`);
            cardElement.classList.add('correct-set');
            cardElement.classList.remove('selected');
            
            // Add checkmark indicator
            const checkmark = document.createElement('div');
            checkmark.className = 'checkmark';
            checkmark.innerHTML = '✓';
            cardElement.appendChild(checkmark);
            
            // Fade out checkmark after 1.5 seconds, then remove after fade completes
            setTimeout(() => {
                if (checkmark.parentNode) {
                    checkmark.classList.add('fade-out');
                    // Remove after fade animation completes
                    setTimeout(() => {
                        if (checkmark.parentNode) {
                            checkmark.remove();
                        }
                    }, 500); // Match the CSS transition duration
                }
            }, 1500);
        });

        // Store the found set
        this.foundSets.push([...this.selectedCards]);
        this.selectedCards = [];
        
        setTimeout(() => {
            // Remove flash animation but keep cards active
            document.querySelectorAll('.correct-set').forEach(card => {
                card.classList.remove('correct-set');
            });
            
            this.updateScore();
            
            // Check if game is complete
            if (this.foundSets.length === 6) {
                this.showConfetti();
                setTimeout(() => this.showGameOver(), 1500);
            }
        }, 800);
    }

    showConfetti() {
        // Create confetti effect
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'][Math.floor(Math.random() * 5)];
            confetti.style.animationDelay = Math.random() * 2 + 's';
            document.body.appendChild(confetti);
            
            // Remove confetti after animation
            setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.parentNode.removeChild(confetti);
                }
            }, 3000);
        }
    }

    handleIncorrectSet() {
        // Add visual feedback for incorrect set
        this.selectedCards.forEach(index => {
            const cardElement = document.querySelector(`[data-index="${index}"]`);
            cardElement.classList.add('incorrect-set');
        });

        setTimeout(() => {
            // Remove visual feedback and deselect cards
            this.selectedCards.forEach(index => {
                const cardElement = document.querySelector(`[data-index="${index}"]`);
                cardElement.classList.remove('incorrect-set', 'selected');
            });
            this.selectedCards = [];
        }, 600);
    }

    updateScore() {
        // Update progress boxes
        const progressBoxes = document.querySelectorAll('.progress-box');
        progressBoxes.forEach((box, index) => {
            if (index < this.foundSets.length) {
                box.classList.add('completed');
                // Add hover events for completed boxes
                box.addEventListener('mouseenter', () => this.highlightSet(index));
                box.addEventListener('mouseleave', () => this.clearHighlight());
            } else {
                box.classList.remove('completed');
                box.removeEventListener('mouseenter', () => this.highlightSet(index));
                box.removeEventListener('mouseleave', () => this.clearHighlight());
            }
        });
    }

    highlightSet(setIndex) {
        if (setIndex < this.foundSets.length) {
            const setCards = this.foundSets[setIndex];
            setCards.forEach(cardIndex => {
                const cardElement = document.querySelector(`[data-index="${cardIndex}"]`);
                if (cardElement) {
                    cardElement.classList.add('highlighted');
                }
            });
            
            // Also highlight the corresponding progress box
            const progressBox = document.querySelector(`[data-set-index="${setIndex}"]`);
            if (progressBox) {
                progressBox.classList.add('highlighted');
            }
        }
    }

    clearHighlight() {
        document.querySelectorAll('.card.highlighted').forEach(card => {
            card.classList.remove('highlighted');
        });
        document.querySelectorAll('.progress-box.highlighted').forEach(box => {
            box.classList.remove('highlighted');
        });
    }

    showGameOver() {
        document.getElementById('game-over').style.display = 'block';
    }

    reset() {
        this.selectedCards = [];
        this.foundSets = [];
        this.allPossibleSets = [];
        document.getElementById('game-over').style.display = 'none';
        
        // Reset all card styles and remove checkmarks
        document.querySelectorAll('.card').forEach(card => {
            card.classList.remove('selected', 'correct-set', 'incorrect-set', 'duplicate-set', 'highlighted');
            const checkmark = card.querySelector('.checkmark');
            if (checkmark) {
                checkmark.remove();
            }
        });
        
        // Reset progress boxes
        document.querySelectorAll('.progress-box').forEach(box => {
            box.classList.remove('completed');
            box.replaceWith(box.cloneNode(true)); // Remove all event listeners
        });
        
        // Remove any remaining confetti
        document.querySelectorAll('.confetti').forEach(confetti => {
            confetti.remove();
        });
        
        this.init();
    }
}

// Global game instance
let game;

function startNewGame() {
    if (game) {
        game.reset();
    } else {
        game = new SetGame();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    startNewGame();
});
