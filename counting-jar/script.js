class CountingJarGame {
    constructor() {
        this.objects = [
            { type: 'lollipop', emoji: '🍭', class: 'lollipop' },
            { type: 'apple', emoji: '🍎', class: 'apple' },
            { type: 'diamond', emoji: '💎', class: 'diamond' },
            { type: 'heart', emoji: '💜', class: 'heart' },
            { type: 'balloon', emoji: '🎈', class: 'balloon' }
        ];
        
        this.currentCount = 0;
        this.targetCount = 0;
        this.itemsInJar = 0;
        this.currentObjects = [];
        this.gamesCompleted = 0;
        this.currentObjectType = null;
        
        this.init();
    }
    
    init() {
        this.createAudioContext();
        this.startNewRound();
        this.setupEventListeners();
    }
    
    createAudioContext() {
        // Create audio context for click sound
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.createClickSound();
    }
    
    createClickSound() {
        // Create a simple click/clink sound
        this.clickSound = () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        };
    }
    
    startNewRound() {
        this.targetCount = Math.floor(Math.random() * 10) + 1; // 1-10
        this.currentObjectType = this.objects[Math.floor(Math.random() * this.objects.length)];
        this.itemsInJar = 0;
        this.currentObjects = [];
        
        this.clearJar();
        this.hideNumberSelection();
        this.createObjects();
    }
    
    retryCurrentRound() {
        // Keep the same targetCount and objectType, just reset the game state
        this.itemsInJar = 0;
        this.currentObjects = [];
        
        this.clearJar();
        this.hideNumberSelection();
        this.createObjects();
    }
    
    createObjects() {
        const container = document.getElementById('objects-container');
        container.innerHTML = '';
        
        // Use the current object type (set in startNewRound or kept for retry)
        const objectType = this.currentObjectType;
        
        for (let i = 0; i < this.targetCount; i++) {
            const objectElement = document.createElement('div');
            objectElement.className = `draggable-object ${objectType.class}`;
            objectElement.textContent = objectType.emoji;
            objectElement.draggable = false; // Prevent default drag
            
            // Add touch and mouse events
            this.addDragEvents(objectElement);
            
            container.appendChild(objectElement);
            this.currentObjects.push(objectElement);
        }
    }
    
    addDragEvents(element) {
        let isDragging = false;
        let startX, startY;
        let offsetX, offsetY;
        
        const startDrag = (e, clientX, clientY) => {
            isDragging = true;
            const rect = element.getBoundingClientRect();
            startX = rect.left;
            startY = rect.top;
            offsetX = clientX - startX;
            offsetY = clientY - startY;
            
            element.classList.add('dragging');
            element.style.position = 'fixed';
            element.style.left = startX + 'px';
            element.style.top = startY + 'px';
            element.style.zIndex = '1000';
        };
        
        const drag = (e, clientX, clientY) => {
            if (isDragging) {
                element.style.left = (clientX - offsetX) + 'px';
                element.style.top = (clientY - offsetY) + 'px';
            }
        };
        
        const endDrag = () => {
            if (isDragging) {
                isDragging = false;
                this.endDrag(element);
            }
        };
        
        // Mouse events
        element.addEventListener('mousedown', (e) => {
            e.preventDefault();
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            startDrag(e, e.clientX, e.clientY);
        });
        
        // Touch events
        element.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            const touch = e.touches[0];
            startDrag(e, touch.clientX, touch.clientY);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging && element.classList.contains('dragging')) {
                drag(e, e.clientX, e.clientY);
            }
        });
        
        document.addEventListener('touchmove', (e) => {
            if (isDragging && element.classList.contains('dragging')) {
                e.preventDefault();
                const touch = e.touches[0];
                drag(e, touch.clientX, touch.clientY);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging && element.classList.contains('dragging')) {
                endDrag();
            }
        });
        
        document.addEventListener('touchend', (e) => {
            if (isDragging && element.classList.contains('dragging')) {
                e.preventDefault();
                endDrag();
            }
        });
    }
    
    endDrag(element) {
        const jar = document.getElementById('jar');
        const jarRect = jar.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // Check if dropped on jar
        if (this.isOverlapping(elementRect, jarRect)) {
            this.addToJar(element);
        } else {
            this.snapBack(element);
        }
    }
    
    isOverlapping(rect1, rect2) {
        return !(rect1.right < rect2.left || 
                rect1.left > rect2.right || 
                rect1.bottom < rect2.top || 
                rect1.top > rect2.bottom);
    }
    
    addToJar(element) {
        this.clickSound();
        
        // Remove from objects area
        element.remove();
        
        // Add to jar with proper stacking using rows
        const jarContents = document.getElementById('jar-contents');
        const jarItem = document.createElement('div');
        jarItem.className = `jar-item ${element.className.split(' ')[1]}`;
        jarItem.textContent = element.textContent;
        
        // Find or create the appropriate row
        const rowIndex = Math.floor(this.itemsInJar / 3);
        const positionInRow = this.itemsInJar % 3;
        
        // Get existing rows (they're in reverse order due to column-reverse)
        const existingRows = jarContents.querySelectorAll('.jar-row');
        let targetRow;
        
        if (positionInRow === 0) {
            // Start a new row
            targetRow = document.createElement('div');
            targetRow.className = 'jar-row';
            jarContents.appendChild(targetRow);
        } else {
            // Use the last (bottom-most) row
            targetRow = existingRows[existingRows.length - 1];
        }
        
        targetRow.appendChild(jarItem);
        
        this.itemsInJar++;
        
        // Check if all items are in jar
        if (this.itemsInJar === this.targetCount) {
            setTimeout(() => {
                this.showNumberSelection();
            }, 500);
        }
    }
    
    snapBack(element) {
        // Find original position in container
        const container = document.getElementById('objects-container');
        element.style.position = '';
        element.style.left = '';
        element.style.top = '';
        element.style.zIndex = '';
        element.classList.remove('dragging');
        
        // Add a little shake animation
        element.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            element.style.animation = '';
        }, 500);
    }
    
    showNumberSelection() {
        document.getElementById('number-selection').classList.remove('hidden');
    }
    
    hideNumberSelection() {
        document.getElementById('number-selection').classList.add('hidden');
    }
    
    clearJar() {
        document.getElementById('jar-contents').innerHTML = '';
    }
    
    setupEventListeners() {
        const numberButtons = document.querySelectorAll('.number-btn');
        numberButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const selectedNumber = parseInt(e.target.dataset.number);
                this.checkAnswer(selectedNumber);
            });
        });
    }
    
    checkAnswer(selectedNumber) {
        const feedback = document.getElementById('feedback');
        
        if (selectedNumber === this.targetCount) {
            // Correct answer
            feedback.textContent = '🎉 Great job! 🎉';
            feedback.className = 'correct';
            feedback.classList.remove('hidden');
            
            // Increment games completed counter
            this.gamesCompleted++;
            this.updateCounter();
            
            this.createConfetti();
            
            setTimeout(() => {
                feedback.classList.add('hidden');
                this.startNewRound();
            }, 3000);
        } else {
            // Wrong answer - retry the same round
            feedback.textContent = '❌ Try again! ❌';
            feedback.className = 'incorrect';
            feedback.classList.remove('hidden');
            
            setTimeout(() => {
                feedback.classList.add('hidden');
                this.retryCurrentRound();
            }, 2000);
        }
    }
    
    createConfetti() {
        const container = document.getElementById('confetti-container');
        const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
        
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + 'vw';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDelay = Math.random() * 2 + 's';
                
                container.appendChild(confetti);
                
                setTimeout(() => {
                    confetti.remove();
                }, 3000);
            }, i * 50);
        }
    }
    
    updateCounter() {
        const counterValue = document.getElementById('counter-value');
        counterValue.textContent = this.gamesCompleted;
        
        // Add a little celebration animation for the counter
        counterValue.style.animation = 'bounce 0.5s ease-in-out';
        setTimeout(() => {
            counterValue.style.animation = '';
        }, 500);
    }
}

// Add bounce animation to CSS
const counterStyle = document.createElement('style');
counterStyle.textContent = `
    @keyframes bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
    }
`;
document.head.appendChild(counterStyle);

// Start the game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new CountingJarGame();
});
