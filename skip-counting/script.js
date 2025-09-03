// Game configuration - Settings array defines the sequence of games
// Format: [skipBy, mode, maxStartingNumber]
// Modes: 'numberBoard' or 'numberPad'
const GAME_SETTINGS = [
    [3, 'numberPad', 90],
    [2, 'numberPad', 10], 
    [5, 'numberBoard', 10],
    [6, 'numberPad', 10]
];

// Current game variables
let currentGameIndex = 0;
let currentSkipBy = 2;
let currentMaxStarting = 10;

// Game state
let currentNumber = 0;
let targetNumber = 0;
let correctCount = 0;
let gamesCompleted = 0;
let gameActive = false;
let sequence = [];
let gameMode = 'grid'; // 'grid' or 'sequence'
let currentInput = '';

// DOM elements
let numberGrid;
let skipValueDisplay;
let skipValueSequenceDisplay;
let gamesCompletedDisplay;
let nextGameBtn;
let confettiContainer;
let gridMode;
let sequenceMode;
let sequenceDisplay;
let questionTile;

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
});

function initializeGame() {
    // Get DOM elements
    numberGrid = document.getElementById('number-grid');
    skipValueDisplay = document.getElementById('skip-value');
    skipValueSequenceDisplay = document.getElementById('skip-value-sequence');
    gamesCompletedDisplay = document.getElementById('games-completed');
    nextGameBtn = document.getElementById('next-game-btn');
    confettiContainer = document.getElementById('confetti-container');
    gridMode = document.getElementById('grid-mode');
    sequenceMode = document.getElementById('sequence-mode');
    sequenceDisplay = document.getElementById('sequence-display');
    
    // Initialize current game settings
    loadCurrentGameSettings();
    
    // Set up the skip value displays
    skipValueDisplay.textContent = currentSkipBy;
    skipValueSequenceDisplay.textContent = currentSkipBy;
    
    // Create the number grid
    createNumberGrid();
    
    // Set up event listeners
    nextGameBtn.addEventListener('click', startNewGame);
    setupNumberPadListeners();
    
    // Start the first game
    startNewGame();
}

function loadCurrentGameSettings() {
    const settings = GAME_SETTINGS[currentGameIndex];
    currentSkipBy = settings[0];
    currentMaxStarting = settings[2];
    // Mode will be determined in startNewGame()
}

function createNumberGrid() {
    numberGrid.innerHTML = '';
    
    // Create tiles for numbers 1-100
    for (let i = 1; i <= 100; i++) {
        const tile = document.createElement('div');
        tile.className = 'number-tile';
        tile.textContent = i;
        tile.dataset.number = i;
        
        // Add touch event listeners
        tile.addEventListener('click', handleTileClick);
        tile.addEventListener('touchstart', handleTileClick, { passive: false });
        
        numberGrid.appendChild(tile);
    }
}

function handleTileClick(event) {
    event.preventDefault(); // Prevent default touch behavior
    
    if (!gameActive) return;
    
    const clickedNumber = parseInt(event.target.dataset.number);
    
    if (clickedNumber === targetNumber) {
        handleCorrectAnswer(event.target);
    } else {
        handleIncorrectAnswer(event.target);
    }
}

function handleCorrectAnswer(tile) {
    // Mark tile as correct
    tile.classList.add('correct');
    tile.classList.remove('current');
    
    // Update progress within current game
    correctCount++;
    
    // Add to sequence
    sequence.push(targetNumber);
    
    // Check if game is complete
    if (correctCount >= 10) {
        completeGame();
        return;
    }
    
    // Set up next target
    currentNumber = targetNumber;
    targetNumber = currentNumber + currentSkipBy;
    
    // Remove any current highlighting from previous tiles
    document.querySelectorAll('.number-tile.current').forEach(t => {
        t.classList.remove('current');
    });
    
    // Check if game should continue or complete
    if (targetNumber > 100) {
        // If target exceeds 100, complete the game
        completeGame();
    }
    // Note: We don't highlight the next target - child must figure it out!
}

function handleIncorrectAnswer(tile) {
    // Show red X animation
    showErrorX(tile);
    
    // Briefly highlight tile as incorrect
    tile.classList.add('incorrect');
    
    setTimeout(() => {
        tile.classList.remove('incorrect');
    }, 1000);
}

function showErrorX(tile) {
    // Create error X element
    const errorX = document.createElement('div');
    errorX.className = 'error-x';
    errorX.textContent = '✗';
    
    // Add to tile
    tile.appendChild(errorX);
    
    // Remove after animation
    setTimeout(() => {
        if (tile.contains(errorX)) {
            tile.removeChild(errorX);
        }
    }, 1000);
}



function completeGame() {
    gameActive = false;
    
    // Increment games completed counter for both modes
    gamesCompleted++;
    gamesCompletedDisplay.textContent = gamesCompleted;
    
    // Show confetti for both modes
    showConfetti();
    
    // Show next game button for both modes
    setTimeout(() => {
        nextGameBtn.classList.remove('hidden');
    }, 1000);
    
    // Remove current highlighting
    document.querySelectorAll('.number-tile.current').forEach(tile => {
        tile.classList.remove('current');
    });
}

function showConfetti() {
    confettiContainer.classList.remove('hidden');
    
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
        confettiContainer.classList.add('hidden');
        confettiContainer.innerHTML = ''; // Clear all confetti
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
    
    confettiContainer.appendChild(confetti);
    
    // Remove after animation completes
    setTimeout(() => {
        if (confettiContainer.contains(confetti)) {
            confettiContainer.removeChild(confetti);
        }
    }, 2500);
}

// Mode switching functions
function switchToSequenceMode() {
    gameMode = 'sequence';
    gridMode.classList.add('hidden');
    sequenceMode.classList.remove('hidden');
    
    // Start fresh problem for sequence mode
    correctCount = 0;
    currentInput = '';
    sequence = []; // Clear the old sequence
    
    // Generate new starting number for sequence mode
    currentNumber = Math.floor(Math.random() * currentMaxStarting) + 1;
    targetNumber = currentNumber + currentSkipBy;
    sequence.push(currentNumber); // Start with just one number
    
    // Create sequence display
    updateSequenceDisplay();
    
    gameActive = true;
}

function switchToGridMode() {
    gameMode = 'grid';
    gridMode.classList.remove('hidden');
    sequenceMode.classList.add('hidden');
}

function updateSequenceDisplay() {
    sequenceDisplay.innerHTML = '';
    
    // Add completed numbers
    for (let i = 0; i < sequence.length; i++) {
        const tile = document.createElement('div');
        tile.className = 'sequence-tile completed';
        tile.textContent = sequence[i];
        sequenceDisplay.appendChild(tile);
    }
    
    // Add question mark tile for next number (only if we haven't completed 10 numbers)
    if (sequence.length < 10) {
        questionTile = document.createElement('div');
        questionTile.className = 'sequence-tile question';
        questionTile.textContent = currentInput || '?';
        sequenceDisplay.appendChild(questionTile);
    }
}

// Number pad functions
function setupNumberPadListeners() {
    const numberButtons = document.querySelectorAll('.number-btn');
    numberButtons.forEach(button => {
        button.addEventListener('click', handleNumberPadClick);
        button.addEventListener('touchstart', handleNumberPadClick, { passive: false });
    });
}

function handleNumberPadClick(event) {
    event.preventDefault();
    
    if (!gameActive || gameMode !== 'sequence') return;
    
    const value = event.target.dataset.number;
    
    if (value === 'clear') {
        // Backspace - remove last character
        if (currentInput.length > 0) {
            currentInput = currentInput.slice(0, -1);
            if (questionTile) {
                questionTile.textContent = currentInput || '?';
                questionTile.classList.remove('incorrect');
            }
        }
    } else if (value === 'enter') {
        if (currentInput !== '') {
            checkSequenceAnswer(parseInt(currentInput));
        }
    } else {
        // Add digit to input (max 3 digits for numbers up to 100)
        if (currentInput.length < 3) {
            currentInput += value;
            if (questionTile) {
                questionTile.textContent = currentInput;
                questionTile.classList.remove('incorrect');
            }
        }
    }
}

function checkSequenceAnswer(answer) {
    const expectedAnswer = sequence[sequence.length - 1] + currentSkipBy;
    
    if (answer === expectedAnswer) {
        // Correct answer
        sequence.push(answer);
        correctCount++;
        
        // Reset input
        currentInput = '';
        
        // Update display
        updateSequenceDisplay();
        
        // Check if sequence is complete (need 9 more after starting number = 10 total)
        if (correctCount >= 9) {
            completeGame();
        }
    } else {
        // Wrong answer - show red flash like in grid mode
        showSequenceError();
    }
}

function showSequenceError() {
    if (!questionTile) return;
    
    // Show red X animation just like in grid mode
    showErrorX(questionTile);
    
    // Show red flash on the question tile
    questionTile.classList.add('incorrect');
    
    // Keep the wrong number visible and reset after flash
    setTimeout(() => {
        if (questionTile) {
            questionTile.classList.remove('incorrect');
            // Don't clear the input - let them see their wrong answer
        }
    }, 1000);
}



function startNewGame() {
    // Load current game settings
    loadCurrentGameSettings();
    
    // Update skip value displays
    skipValueDisplay.textContent = currentSkipBy;
    skipValueSequenceDisplay.textContent = currentSkipBy;
    
    // Reset game state
    correctCount = 0;
    sequence = [];
    gameActive = true;
    
    // Hide next game button
    nextGameBtn.classList.add('hidden');
    
    // Clear confetti
    confettiContainer.classList.add('hidden');
    confettiContainer.innerHTML = '';
    
    // Get current game mode from settings
    const settings = GAME_SETTINGS[currentGameIndex];
    const targetMode = settings[1];
    
    if (targetMode === 'numberBoard') {
        // Grid mode
        gameMode = 'grid';
        switchToGridMode();
        
        // Reset all tiles
        document.querySelectorAll('.number-tile').forEach(tile => {
            tile.classList.remove('correct', 'current', 'incorrect');
        });
        
        // Choose random starting number based on max starting number
        currentNumber = Math.floor(Math.random() * currentMaxStarting) + 1;
        targetNumber = currentNumber + currentSkipBy;
        
        // Highlight starting number as correct (already completed)
        const startTile = document.querySelector(`[data-number="${currentNumber}"]`);
        if (startTile) {
            startTile.classList.add('correct');
        }
        
        // Add starting number to sequence
        sequence.push(currentNumber);
    } else {
        // Sequence mode (numberPad)
        switchToSequenceMode();
    }
    
    // Advance to next game in settings array (with wraparound)
    currentGameIndex = (currentGameIndex + 1) % GAME_SETTINGS.length;
}

// Prevent zooming on double tap for better touch experience
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
