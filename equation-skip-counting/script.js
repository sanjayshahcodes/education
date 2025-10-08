// Equation Skip Counting Game
// Combines visual adding equation format with skip counting number board

// Game settings
const show_blocks = false; // Set to false to hide blocks above numbers

// Question format configuration - cycle through these combinations
// Each array element is [generator_function_name]
let question_format = [
    "generateRandomBothDoubleDigits"
];

// Current game variables
let currentGameIndex = 0;
let problemCount = 0;
let gamesCompleted = 0;

// Game state
let currentNumbers = []; // [first_number, second_number] or [first_number, tens, ones] after splitting
let gameActive = false;
let currentStepIndex = 0; // Which number we're currently adding (0 = starting position set, 1 = first addition, 2 = second addition, etc.)
let gameComplete = false;

// DOM elements
let numberGrid;
let equationDisplay;
let gamesCompletedDisplay;
let nextGameBtn;
let confettiContainer;

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
});

function initializeGame() {
    // Get DOM elements
    numberGrid = document.getElementById('number-grid');
    equationDisplay = document.getElementById('equation-display');
    gamesCompletedDisplay = document.getElementById('games-completed');
    nextGameBtn = document.getElementById('next-game-btn');
    confettiContainer = document.getElementById('confetti-container');
    
    // Create the number grid
    createNumberGrid();
    
    // Set up event listeners
    nextGameBtn.addEventListener('click', startNewGame);
    
    // Start the first game
    startNewGame();
}

// === EQUATION GENERATOR FUNCTIONS (copied from visual-adding) ===
function generateRandomNumbers() {
    const targetSum = Math.floor(Math.random() * 98) + 2;
    const minA = Math.max(1, targetSum - 98);
    const maxA = Math.min(98, targetSum - 1);
    const a = Math.floor(Math.random() * (maxA - minA + 1)) + minA;
    const b = targetSum - a;
    return [a, b];
}

function generateRandomBothDoubleDigits() {
    let a, b;
    do {
        [a, b] = generateRandomNumbers();
    } while (a < 10 || b < 10);
    
    return [a, b];
}

function generateDoubleDigitsNoCarry() {
    let a, b;
    do {
        [a, b] = generateRandomBothDoubleDigits();
    } while ((a % 10) + (b % 10) > 10);
    return [a, b];
}

function generateBothMultiplesOfTen() {
    const possibleSums = [20, 30, 40, 50, 60, 70, 80, 90];
    const targetSum = possibleSums[Math.floor(Math.random() * possibleSums.length)];
    
    const validSplits = [];
    for (let a = 10; a <= 90; a += 10) {
        const b = targetSum - a;
        if (b >= 10 && b <= 90 && b % 10 === 0) {
            validSplits.push([a, b]);
        }
    }
    
    return validSplits[Math.floor(Math.random() * validSplits.length)];
}

function generateDoublePlusSingleNoCarry() {
    let a, b;
    do {
        // Generate a number > 10 that's not a multiple of 10
        a = Math.floor(Math.random() * 89) + 11; // 11-99
        while (a % 10 === 0) {
            a = Math.floor(Math.random() * 89) + 11;
        }
        
        // Generate a single digit
        b = Math.floor(Math.random() * 9) + 1; // 1-9
        
        // Check if adding them does NOT cross to the next ten AND sum is less than 100
        const onesDigitA = a % 10;
        const crossesTen = (onesDigitA + b) > 10;
        const sumLessThan100 = (a + b) < 100;
        
        if (!crossesTen && sumLessThan100) {
            break;
        }
    } while (true);
    
    return [a, b];
}

function generateDoublePlusDoubleWithCarry() {
    let a, b;
    do {
        [a, b] = generateRandomBothDoubleDigits();
        
        // Check if adding them results in a carry
        const onesDigitA = a % 10;
        const onesDigitB = b % 10;
        const hasCarry = (onesDigitA + onesDigitB) >= 10;
        
        // Accept if there's a carry AND sum is <= 100
        if (hasCarry && (a + b) <= 100) {
            break;
        }
    } while (true);
    
    return [a, b];
}

// Mapping of generator function names to actual functions
const generatorFunctions = {
    "generateRandomNumbers": generateRandomNumbers,
    "generateRandomBothDoubleDigits": generateRandomBothDoubleDigits,
    "generateDoubleDigitsNoCarry": generateDoubleDigitsNoCarry,
    "generateBothMultiplesOfTen": generateBothMultiplesOfTen,
    "generateDoublePlusSingleNoCarry": generateDoublePlusSingleNoCarry,
    "generateDoublePlusDoubleWithCarry": generateDoublePlusDoubleWithCarry
};

// Function to get current generator based on problem count
function getCurrentGenerator() {
    const index = problemCount % question_format.length;
    const generator_name = question_format[index];
    return generatorFunctions[generator_name];
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
    
    if (!gameActive || gameComplete) return;
    
    const clickedNumber = parseInt(event.target.dataset.number);
    
    // Calculate what the expected number should be
    const expectedNumber = getExpectedNumber();
    
    if (clickedNumber === expectedNumber) {
        handleCorrectAnswer(event.target);
    } else {
        handleIncorrectAnswer(event.target);
    }
}

function getExpectedNumber() {
    if (currentStepIndex === 0) {
        // Should never happen as we don't allow clicks when step is 0
        return -1;
    }
    
    // Calculate cumulative sum up to current step
    let sum = currentNumbers[0]; // Start with first number
    for (let i = 1; i <= currentStepIndex; i++) {
        if (i < currentNumbers.length) {
            sum += currentNumbers[i];
        }
    }
    return sum;
}

function handleCorrectAnswer(tile) {
    console.log('handleCorrectAnswer called');
    console.log('Before increment - currentStepIndex:', currentStepIndex);
    console.log('currentNumbers:', currentNumbers);
    
    // Move to next step
    currentStepIndex++;
    
    console.log('After increment - currentStepIndex:', currentStepIndex);
    console.log('Completion check:', currentStepIndex, '>', currentNumbers.length - 1, '=', currentStepIndex > currentNumbers.length - 1);
    
    // Update tile coloring
    updateTileColoring();
    
    // Check if game is complete (we've added all numbers after the first one)
    if (currentStepIndex > currentNumbers.length - 1) {
        console.log('Completing game');
        completeGame();
        return;
    }
    
    console.log('Continuing game, rendering equation');
    // Update equation display to show next active number
    renderEquation();
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

function updateTileColoring() {
    // Clear all previous coloring
    document.querySelectorAll('.number-tile').forEach(tile => {
        tile.classList.remove('correct', 'current', 'completed', 'current-sequence', 'current-position', 'current-completed', 'starting-blocks', 'first-addition', 'second-addition');
    });
    
    if (currentNumbers.length === 0) return;
    
    let cumulativeSum = currentNumbers[0];
    
    // Calculate how many steps to color
    const maxStep = gameComplete ? currentNumbers.length - 1 : currentStepIndex - 1;
    
    
    
    // Color starting position (1 to first number) as gray
    for (let i = 1; i <= currentNumbers[0]; i++) {
        const tile = document.querySelector(`[data-number="${i}"]`);
        if (tile) {
            tile.classList.add('starting-blocks');
            // Make the starting position (final gray square) big/bold if no steps completed yet
            if (i === currentNumbers[0] && currentStepIndex === 0) {
                tile.classList.add('current-position');
            }
        }
    }
    
    // Color each addition step
    
    for (let step = 1; step <= maxStep && step < currentNumbers.length; step++) {
        const addAmount = currentNumbers[step];
        const startPos = cumulativeSum + 1;
        cumulativeSum += addAmount;
        const endPos = cumulativeSum;
        
        // Determine semantic class based on step
        const stepClass = step === 1 ? 'first-addition' : 'second-addition';
        
        for (let i = startPos; i <= endPos; i++) {
            const tile = document.querySelector(`[data-number="${i}"]`);
            if (tile) {
                // Always add the semantic class
                tile.classList.add(stepClass);
                
                // Add bold/bigger styling to the end position of the most recently completed step
                if (i === endPos && step === maxStep) {
                    tile.classList.add('current-position');
                }
            }
        }
    }
}

function renderEquation() {
    equationDisplay.innerHTML = '';
    
    // Create equation display similar to visual adding game
    currentNumbers.forEach((num, idx) => {
        if (idx > 0) {
            const plus = document.createElement('div');
            plus.className = 'plus';
            plus.textContent = '+';
            equationDisplay.appendChild(plus);
        }
        
        const circle = document.createElement('div');
        circle.className = 'number-circle';
        circle.dataset.value = num;
        
        // Style based on position and game state
        if (idx === 0) {
            // First number is always gray (non-splittable)
            circle.classList.add('grayed');
        } else if (needsSplitting() && idx === 1 && currentNumbers.length === 2) {
            // Second number is blue and splittable if not yet split
            circle.classList.add('splittable');
        } else {
            // Split numbers or non-splittable numbers are blue
            circle.classList.add('blue');
        }
        
        const valueDiv = document.createElement('div');
        valueDiv.className = 'number-value';
        valueDiv.textContent = num;
        circle.appendChild(valueDiv);
        
        // Add blocks if enabled
        if (show_blocks) {
            const blocksContainer = document.createElement('div');
            blocksContainer.className = 'blocks-container';

            const tens = Math.floor(num / 10);
            const ones = num % 10;

            // Add full tens columns
            for (let i = 0; i < tens; i++) {
                const column = document.createElement('div');
                column.className = 'block-column';
                for (let j = 0; j < 10; j++) {
                    const block = document.createElement('div');
                    block.className = 'block';
                    column.appendChild(block);
                }
                blocksContainer.appendChild(column);
            }

            // Add ones column if any
            if (ones > 0) {
                const column = document.createElement('div');
                column.className = 'block-column';
                for (let j = 0; j < ones; j++) {
                    const block = document.createElement('div');
                    block.className = 'block';
                    column.appendChild(block);
                }
                blocksContainer.appendChild(column);
            }

            circle.appendChild(blocksContainer);
        }
        
        // Add arrow indicator for active number
        if (shouldShowArrow(idx)) {
            const arrow = document.createElement('div');
            arrow.className = 'arrow-indicator';
            arrow.textContent = '↑';
            circle.appendChild(arrow);
        }
        
        // Add double-click handler for splittable numbers
        if (idx === 1 && needsSplitting() && currentNumbers.length === 2) {
            circle.addEventListener('dblclick', handleSplitNumber);
            circle.addEventListener('touchstart', handleDoubleTap);
        }
        
        equationDisplay.appendChild(circle);
    });
    
    // Add equals and answer if game is complete
    if (gameComplete) {
        const equals = document.createElement('div');
        equals.className = 'equals';
        equals.textContent = '=';
        equationDisplay.appendChild(equals);
        
        // Create answer circle (gray background)
        const answerCircle = document.createElement('div');
        answerCircle.className = 'number-circle final-answer';
        const finalAnswer = currentNumbers.reduce((sum, num) => sum + num, 0);
        
        const valueDiv = document.createElement('div');
        valueDiv.className = 'number-value';
        valueDiv.textContent = finalAnswer;
        answerCircle.appendChild(valueDiv);
        
        // Add blocks above the answer if show_blocks is true
        if (show_blocks) {
            const blocksContainer = document.createElement('div');
            blocksContainer.className = 'blocks-container';
            
            const tens = Math.floor(finalAnswer / 10);
            const ones = finalAnswer % 10;
            
            // Add ten-columns
            for (let i = 0; i < tens; i++) {
                const column = document.createElement('div');
                column.className = 'block-column';
                for (let j = 0; j < 10; j++) {
                    const block = document.createElement('div');
                    block.className = 'block';
                    column.appendChild(block);
                }
                blocksContainer.appendChild(column);
            }

            // Add ones column if any
            if (ones > 0) {
                const column = document.createElement('div');
                column.className = 'block-column';
                for (let j = 0; j < ones; j++) {
                    const block = document.createElement('div');
                    block.className = 'block';
                    column.appendChild(block);
                }
                blocksContainer.appendChild(column);
            }
            
            answerCircle.appendChild(blocksContainer);
        }
        
        equationDisplay.appendChild(answerCircle);
    }
}

function needsSplitting() {
    // Check if second number needs to be split (has both tens and ones)
    if (currentNumbers.length !== 2) return false;
    const secondNum = currentNumbers[1];
    const tens = Math.floor(secondNum / 10);
    const ones = secondNum % 10;
    return tens > 0 && ones > 0;
}

function shouldShowArrow(idx) {
    // Show arrow for the number that should be clicked next
    if (currentStepIndex === 0) {
        // Before any clicks, no arrow (starting position is automatically set)
        return false;
    }
    
    // Show arrow for the current step we're working on
    return idx === currentStepIndex;
}

function handleSplitNumber(event) {
    event.preventDefault();
    if (currentNumbers.length !== 2) return;
    
    const secondNum = currentNumbers[1];
    const tens = Math.floor(secondNum / 10) * 10;
    const ones = secondNum % 10;
    
    if (tens > 0 && ones > 0) {
        // Split the number
        currentNumbers = [currentNumbers[0], tens, ones];
        
        // Set step index to 1 to show arrow on first split number
        currentStepIndex = 1;
        
        renderEquation();
        
        // Enable number board interaction
        gameActive = true;
    }
}

// Handle double-tap for touch devices
let tapCount = 0;
let tapTimer;

function handleDoubleTap(event) {
    tapCount++;
    
    if (tapCount === 1) {
        tapTimer = setTimeout(() => {
            tapCount = 0;
        }, 300);
    } else if (tapCount === 2) {
        clearTimeout(tapTimer);
        tapCount = 0;
        
        event.preventDefault();
        event.stopPropagation();
        
        handleSplitNumber(event);
    }
}

function completeGame() {
    console.log('completeGame() called');
    console.log('Stack trace:', new Error().stack);
    
    gameActive = false;
    gameComplete = true;
    
    // Update tile coloring with final state
    updateTileColoring();
    
    // Update equation to show final answer
    renderEquation();
    
    // Increment games completed counter
    gamesCompleted++;
    gamesCompletedDisplay.textContent = gamesCompleted;
    
    // Show confetti
    showConfetti();
    
    // Show next game button
    setTimeout(() => {
        nextGameBtn.classList.remove('hidden');
    }, 1000);
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

function startNewGame() {
    // Generate new problem
    const generator = getCurrentGenerator();
    let [a, b] = generator();
    
    // Temporary constraint: limit second number to 30 or less for easier learning
    while (b > 30) {
        [a, b] = generator();
    }
    
    currentNumbers = [a, b];
    
    // Reset game state
    gameActive = false; // Will be enabled after splitting (if needed) or immediately (if no splitting needed)
    gameComplete = false;
    currentStepIndex = 0;
    
    // Problem count tracking (for internal use)
    // problemCount is tracked internally for generator cycling
    
    // Hide next game button
    nextGameBtn.classList.add('hidden');
    
    // Clear confetti
    confettiContainer.classList.add('hidden');
    confettiContainer.innerHTML = '';
        
        // Reset all tiles
        document.querySelectorAll('.number-tile').forEach(tile => {
        tile.classList.remove('correct', 'current', 'incorrect', 'completed', 'current-sequence', 'current-position', 'current-completed', 'light-purple', 'dark-purple');
    });
    
    // Render initial equation
    renderEquation();
    
    // Set up initial board state
    updateTileColoring();
    
    // If no splitting is needed, enable game immediately and set up first step
    if (!needsSplitting()) {
        gameActive = true;
        currentStepIndex = 1; // Ready for first addition
        renderEquation(); // Update to show arrow
    }
    
    // Increment problem count
    problemCount++;
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