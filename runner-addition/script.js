// Game configuration
const LEVEL_CONFIGS = [
    { level: 1, obstacleInterval: 12000, name: "Beginner" },
    { level: 2, obstacleInterval: 10500, name: "Easy" },
    { level: 3, obstacleInterval: 9000, name: "Medium" },
    { level: 4, obstacleInterval: 7500, name: "Hard" },
    { level: 5, obstacleInterval: 6000, name: "Expert" }
];

// Game state
let currentLevel = 1;
let currentTotal = 0;
let currentScore = 0;
let currentLives = 2;
let obstaclesDestroyed = 0;
let gameActive = false;
let currentInput = '';
let obstacleInterval = null;
let obstacles = [];
let nextObstacleId = 0;
let levelStartTime = 0;
let lastAnswerTime = 0;

// DOM elements
let elements = {};

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
});

function initializeGame() {
    // Get DOM elements
    elements = {
        currentLevel: document.getElementById('current-level'),
        currentScore: document.getElementById('current-score'),
        currentLives: document.getElementById('current-lives'),
        currentTotal: document.getElementById('current-total'),
        gameCanvas: document.getElementById('game-canvas'),
        runner: document.getElementById('runner'),
        finishLine: document.getElementById('finish-line'),
        progressFill: document.getElementById('progress-fill'),
        progressText: document.getElementById('progress-text'),
        inputDisplay: document.getElementById('input-display'),
        numberPad: document.getElementById('number-pad'),
        startBtn: document.getElementById('start-btn'),
        nextLevelBtn: document.getElementById('next-level-btn'),
        restartBtn: document.getElementById('restart-btn'),
        gameMessage: document.getElementById('game-message'),
        confettiContainer: document.getElementById('confetti-container')
    };
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize display
    updateDisplay();
}

function setupEventListeners() {
    // Number pad buttons
    const numberButtons = document.querySelectorAll('.number-btn');
    numberButtons.forEach(button => {
        button.addEventListener('click', handleNumberPadClick);
        button.addEventListener('touchstart', handleNumberPadClick, { passive: false });
    });
    
    // Control buttons
    elements.startBtn.addEventListener('click', startLevel);
    elements.nextLevelBtn.addEventListener('click', nextLevel);
    elements.restartBtn.addEventListener('click', restartLevel);
    
    // Prevent zooming on double tap
    document.addEventListener('touchstart', function(event) {
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    });
    
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
}

function handleNumberPadClick(event) {
    event.preventDefault();
    
    if (!gameActive) return;
    
    const value = event.target.dataset.number;
    
    if (value === 'clear') {
        // Backspace - remove last character
        if (currentInput.length > 0) {
            currentInput = currentInput.slice(0, -1);
            updateInputDisplay();
        }
    } else if (value === 'enter') {
        if (currentInput !== '') {
            checkAnswer(parseInt(currentInput));
        }
    } else {
        // Add digit to input (max 4 digits for reasonable numbers)
        if (currentInput.length < 4) {
            currentInput += value;
            updateInputDisplay();
        }
    }
}

function updateInputDisplay() {
    elements.inputDisplay.textContent = currentInput || '';
}

function updateDisplay() {
    elements.currentLevel.textContent = currentLevel;
    elements.currentScore.textContent = currentScore;
    elements.currentLives.textContent = currentLives;
    elements.currentTotal.textContent = currentTotal;
    elements.progressText.textContent = `${obstaclesDestroyed}/10`;
    elements.progressFill.style.width = `${(obstaclesDestroyed / 10) * 100}%`;
}

function startLevel() {
    // Reset level state
    currentTotal = Math.floor(Math.random() * 20) + 5; // Start with random number 5-24
    currentLives = 2;
    obstaclesDestroyed = 0;
    currentInput = '';
    gameActive = true;
    levelStartTime = Date.now();
    lastAnswerTime = Date.now();
    
    // Clear any existing obstacles
    clearObstacles();
    
    // Update display
    updateDisplay();
    updateInputDisplay();
    
    // Hide/show appropriate buttons
    elements.startBtn.classList.add('hidden');
    elements.nextLevelBtn.classList.add('hidden');
    elements.restartBtn.classList.add('hidden');
    
    // Start spawning obstacles
    startObstacleSpawning();
    
    showMessage(`Level ${currentLevel} Started!`, 1500);
}

function startObstacleSpawning() {
    // Create first obstacle immediately
    createObstacle();
    
    // No need for interval - obstacles will be created when previous ones are destroyed
    // The interval is now only used for collision timing
}

function createObstacle() {
    const obstacle = document.createElement('div');
    obstacle.className = 'obstacle moving';
    obstacle.id = `obstacle-${nextObstacleId++}`;
    
    // Generate random addition number (1-15)
    const addNumber = Math.floor(Math.random() * 15) + 1;
    obstacle.dataset.addNumber = addNumber;
    
    // Create obstacle content
    obstacle.innerHTML = `
        <div class="obstacle-add-sign">+</div>
        <div class="obstacle-number">${addNumber}</div>
    `;
    
    // Position obstacle
    obstacle.style.right = '-100px';
    
    // Calculate animation duration based on level speed
    const config = LEVEL_CONFIGS[currentLevel - 1];
    const animationDuration = config.obstacleInterval; // Use the interval as the time to cross screen
    obstacle.style.animationDuration = `${animationDuration}ms`;
    
    // Add to canvas
    elements.gameCanvas.appendChild(obstacle);
    obstacles.push(obstacle);
    
    // Remove obstacle when animation completes (if not destroyed)
    setTimeout(() => {
        if (obstacle.parentNode && !obstacle.classList.contains('exploding')) {
            // Obstacle reached the runner - lose a life
            handleObstacleCollision(obstacle);
        }
    }, animationDuration);
}

function handleObstacleCollision(obstacle) {
    if (!gameActive) return;
    
    // Remove obstacle
    removeObstacle(obstacle);
    
    // Lose a life
    currentLives--;
    updateDisplay();
    
    // Show stumble animation
    elements.runner.classList.add('stumble');
    setTimeout(() => {
        elements.runner.classList.remove('stumble');
    }, 1000);
    
    // Check if game over
    if (currentLives <= 0) {
        gameOver();
    } else {
        showMessage(`Oops! ${currentLives} ${currentLives === 1 ? 'life' : 'lives'} left!`, 2000);
    }
}

function checkAnswer(answer) {
    const currentObstacle = obstacles.find(obs => obs.parentNode);
    if (!currentObstacle) return;
    
    const addNumber = parseInt(currentObstacle.dataset.addNumber);
    const expectedAnswer = currentTotal + addNumber;
    
    if (answer === expectedAnswer) {
        handleCorrectAnswer(currentObstacle, addNumber);
    } else {
        handleIncorrectAnswer();
    }
}

function handleCorrectAnswer(obstacle, addNumber) {
    // Update total
    currentTotal += addNumber;
    
    // Calculate score based on speed
    const timeTaken = Date.now() - lastAnswerTime;
    const speedBonus = Math.max(0, 1000 - timeTaken); // Bonus points for speed
    const basePoints = 100;
    const pointsEarned = basePoints + Math.floor(speedBonus / 10);
    
    currentScore += pointsEarned;
    lastAnswerTime = Date.now();
    
    // Update progress
    obstaclesDestroyed++;
    
    // Clear input
    currentInput = '';
    
    // Update display
    updateDisplay();
    updateInputDisplay();
    
    // Explode obstacle
    explodeObstacle(obstacle);
    
    // Check if level complete
    if (obstaclesDestroyed >= 10) {
        completeLevel();
    } else {
        // Create next obstacle immediately after a short delay
        setTimeout(() => {
            if (gameActive && obstaclesDestroyed < 10) {
                createObstacle();
            }
        }, 1000); // 1 second delay before next obstacle
    }
}

function handleIncorrectAnswer() {
    // Show error feedback
    elements.inputDisplay.style.background = '#ff6b6b';
    elements.inputDisplay.style.color = 'white';
    
    setTimeout(() => {
        elements.inputDisplay.style.background = 'white';
        elements.inputDisplay.style.color = '#2d3436';
        // Auto-clear the incorrect input after showing the error
        currentInput = '';
        updateInputDisplay();
    }, 500);
}

function explodeObstacle(obstacle) {
    obstacle.classList.remove('moving');
    obstacle.classList.add('exploding');
    
    setTimeout(() => {
        removeObstacle(obstacle);
    }, 500);
}

function removeObstacle(obstacle) {
    if (obstacle.parentNode) {
        obstacle.parentNode.removeChild(obstacle);
    }
    obstacles = obstacles.filter(obs => obs !== obstacle);
}

function clearObstacles() {
    obstacles.forEach(obstacle => {
        if (obstacle.parentNode) {
            obstacle.parentNode.removeChild(obstacle);
        }
    });
    obstacles = [];
    
    if (obstacleInterval) {
        clearInterval(obstacleInterval);
        obstacleInterval = null;
    }
}

function completeLevel() {
    gameActive = false;
    clearObstacles();
    
    // Calculate level completion bonus
    const levelTime = Date.now() - levelStartTime;
    const timeBonus = Math.max(0, 30000 - levelTime); // Bonus for completing under 30 seconds
    const perfectBonus = 500; // Bonus for no mistakes (2 lives remaining)
    
    let bonus = Math.floor(timeBonus / 100);
    if (currentLives === 2) {
        bonus += perfectBonus;
    }
    
    currentScore += bonus;
    updateDisplay();
    
    // Show confetti
    showConfetti();
    
    // Show completion message
    let message = `Level ${currentLevel} Complete!\n+${bonus} bonus points!`;
    if (currentLives === 2) {
        message += '\nPerfect run! 🌟';
    }
    
    showMessage(message, 3000);
    
    // Show next level button or completion message
    setTimeout(() => {
        if (currentLevel < LEVEL_CONFIGS.length) {
            elements.nextLevelBtn.classList.remove('hidden');
        } else {
            showMessage('🎉 Congratulations!\nYou completed all levels!\n🎉', 5000);
            elements.startBtn.classList.remove('hidden');
            elements.startBtn.textContent = 'Play Again';
        }
    }, 3000);
}

function gameOver() {
    gameActive = false;
    clearObstacles();
    
    showMessage(`Game Over!\nFinal Score: ${currentScore}`, 3000);
    
    setTimeout(() => {
        elements.restartBtn.classList.remove('hidden');
    }, 3000);
}

function nextLevel() {
    currentLevel++;
    if (currentLevel > LEVEL_CONFIGS.length) {
        currentLevel = 1; // Reset to level 1 if beyond max
    }
    startLevel();
}

function restartLevel() {
    startLevel();
}

function showMessage(message, duration) {
    elements.gameMessage.textContent = message;
    elements.gameMessage.classList.add('show');
    
    setTimeout(() => {
        elements.gameMessage.classList.remove('show');
    }, duration);
}

function showConfetti() {
    elements.confettiContainer.classList.remove('hidden');
    
    // Create multiple bursts
    createConfettiBurst(80); // First big burst
    
    setTimeout(() => {
        createConfettiBurst(60); // Second burst
    }, 300);
    
    setTimeout(() => {
        createConfettiBurst(40); // Third burst
    }, 600);
    
    // Hide confetti container after animation completes
    setTimeout(() => {
        elements.confettiContainer.classList.add('hidden');
        elements.confettiContainer.innerHTML = ''; // Clear all confetti
    }, 3000);
}

function createConfettiBurst(pieceCount) {
    for (let i = 0; i < pieceCount; i++) {
        setTimeout(() => {
            createConfettiPiece();
        }, i * 10); // Stagger the creation slightly
    }
}

function createConfettiPiece() {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    
    // Random size
    const size = Math.random() * 15 + 15; // 15-30px
    confetti.style.width = size + 'px';
    confetti.style.height = size + 'px';
    
    // Random shapes - some circular, some square
    if (Math.random() > 0.6) {
        confetti.style.borderRadius = '50%';
    }
    
    // Calculate random direction for burst effect
    const angle = Math.random() * 360; // Random angle in degrees
    const distance = Math.random() * 300 + 150; // Random distance 150-450px
    
    // Convert to radians and calculate end position
    const radian = (angle * Math.PI) / 180;
    const endX = Math.cos(radian) * distance;
    const endY = Math.sin(radian) * distance;
    
    // Set custom CSS properties for the burst direction
    confetti.style.setProperty('--end-x', endX + 'px');
    confetti.style.setProperty('--end-y', endY + 'px');
    
    // Random animation delay for more natural effect
    confetti.style.animationDelay = Math.random() * 0.2 + 's';
    
    elements.confettiContainer.appendChild(confetti);
    
    // Remove after animation completes
    setTimeout(() => {
        if (elements.confettiContainer.contains(confetti)) {
            elements.confettiContainer.removeChild(confetti);
        }
    }, 2500);
}
