// Combined Addition Game
// Alternates between equation-skip-counting and visual-adding modes

// Game settings
// Question format configuration - cycle through these combinations
// Each array element is [show_blocks, generator_function_name]
let question_format = [
    [0, "generateDoublePlusDoubleWithCarry"]
];

// Game state
let currentProblem = null; // [a, b] - the current problem
let problemCount = 0;
let gamesCompleted = 0;
let currentMode = 0; // Track current mode: 0=numberboard display, 1=numberboard modal, 2=numpad modal

// Equation mode state
let currentNumbers = []; // [first_number, second_number] or [first_number, tens, ones] after splitting
let gameActive = false;
let currentStepIndex = 0;
let gameComplete = false;

// Visual mode state
let droppedFlag = false;
let visualCurrentNumbers = [];

// DOM elements
let equationModeDiv, visualModeDiv, numberboardDisplayMode;
let equationEquationDiv, visualEquationDiv, numberboardEquationDisplay, modal, answerInput, errorMsg, nextGameBtn;
let gamesCompletedDisplay, modalNumberGrid, numberboardNumberGrid, confettiContainer, originalEquationDisplay;
let swapNumbersBtnNumberboard, swapNumbersBtnVisual;

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
});

function initializeGame() {
    // Get DOM elements
    numberboardDisplayMode = document.getElementById('numberboard-display-mode');
    numberboardEquationDisplay = document.getElementById('numberboard-equation-display');
    numberboardNumberGrid = document.getElementById('numberboard-number-grid');
    confettiContainer = document.getElementById('confetti-container');
    visualModeDiv = document.getElementById('visual-mode');
    visualEquationDiv = document.getElementById('equation');
    modal = document.getElementById('modal');
    answerInput = document.getElementById('answer-input');
    errorMsg = document.getElementById('error-msg');
    nextGameBtn = document.getElementById('next-game-btn');
    gamesCompletedDisplay = document.getElementById('games-completed');
    modalNumberGrid = document.getElementById('modal-number-grid');
    originalEquationDisplay = document.getElementById('original-equation-display');
    swapNumbersBtnNumberboard = document.getElementById('swap-numbers-btn-numberboard');
    swapNumbersBtnVisual = document.getElementById('swap-numbers-btn-visual');
    
    // Create the number grids
    createModalNumberGrid();
    createNumberboardDisplayGrid();
    
    // Set up event listeners
    nextGameBtn.addEventListener('click', handleNextGameClick);
    swapNumbersBtnNumberboard.addEventListener('click', handleSwapNumbers);
    swapNumbersBtnVisual.addEventListener('click', handleSwapNumbers);
    
    // Prevent zooming on double tap
    setupZoomPrevention();
    
    // Start the first problem
    startNewProblem();
}

// === PROBLEM GENERATORS ===
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

    if (a<b){
        [a, b] = [b, a];
    }

    return [a, b];
}

function generateRandomBothDoubleDigitsNoMultiplesOfTen() {
    let a, b;
    do {
        [a, b] = generateRandomBothDoubleDigits();
    } while (a % 10 === 0 || b % 10 === 0);
    return [a, b];
}

function generateDoubleDigitsNoCarry() {
    let a, b;
    do {
        [a, b] = generateRandomBothDoubleDigitsNoMultiplesOfTen();
    } while ((a % 10) + (b % 10) > 10);
    return [a, b];
}

function generateDoublePlusDoubleWithCarry() {
    let a, b;
    do {
        [a, b] = generateRandomBothDoubleDigitsNoMultiplesOfTen();
        
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
    "generateDoublePlusDoubleWithCarry": generateDoublePlusDoubleWithCarry
};

// Function to get current settings based on problem count
function getCurrentSettings() {
    const index = problemCount % question_format.length;
    const [show_blocks, generator_name] = question_format[index];
    const generator = generatorFunctions[generator_name];
    return { show_blocks, generator };
}

// Problem generator selection
function generateProblem() {
    const { generator } = getCurrentSettings();
    return generator();
}

// === GAME FLOW CONTROL ===
function handleNextGameClick() {
    if (currentMode === 2) {
        // After mode 2 (numpad modal), start a completely new problem at mode 0
        currentMode = 0; // Reset to mode 0 for new problem
        startNewProblem();
    } else {
        // After mode 0 or 1, switch to next mode with same problem
        switchToNextMode();
    }
}

function startNewProblem() {
    // Generate new problem
    currentProblem = generateProblem();
    
    // Show the original equation for the new problem
    showOriginalEquation();
    
    // Show swap button for new problems (will be hidden after first split)
    showSwapButton();
    
    // Use the currentMode that was set (don't recalculate)
    // If currentMode wasn't set explicitly, default to mode based on problem count
    if (currentMode === undefined || currentMode === null) {
        currentMode = problemCount % 3;
    }
    
    if (currentMode === 0) {
        startNumberboardDisplayMode();
    } else if (currentMode === 1) {
        startVisualModeWithNumberboardModal();
    } else {
        startVisualModeWithNumpadModal();
    }
}

// === EQUATION MODE IMPLEMENTATION ===
function startEquationMode() {
    const [a, b] = currentProblem;
    currentNumbers = [a, b];
    
    // Equation mode removed - redirecting to visual mode
    startVisualMode();
    return;
    
    // Hide next game button
    nextGameBtn.classList.add('hidden');
}

function createModalNumberGrid() {
    modalNumberGrid.innerHTML = '';
    
    // Create tiles for numbers 1-100
    for (let i = 1; i <= 100; i++) {
        const tile = document.createElement('div');
        tile.className = 'number-tile';
        tile.textContent = i;
        tile.dataset.number = i;
        
        modalNumberGrid.appendChild(tile);
    }
}

function createNumberboardDisplayGrid() {
    numberboardNumberGrid.innerHTML = '';
    
    // Create tiles for numbers 1-100
    for (let i = 1; i <= 100; i++) {
        const tile = document.createElement('div');
        tile.className = 'number-tile';
        tile.textContent = i;
        tile.dataset.number = i;
        
        // Add touch event listeners
        tile.addEventListener('click', handleNumberboardDisplayTileClick);
        tile.addEventListener('touchstart', handleNumberboardDisplayTileClick, { passive: false });
        
        numberboardNumberGrid.appendChild(tile);
    }
}

function handleTileClick(event) {
    event.preventDefault();
    
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
    // Combine numbers in the equation display
    combineNumbersInEquation();
    
    // Move to next step
    currentStepIndex++;
    
    // Update tile coloring
    updateTileColoring();
    
    // Check if game is complete (we've added all numbers after the first one)
    if (currentStepIndex > currentNumbers.length - 1) {
        completeEquationMode();
        return;
    }
    
    // Update equation display to show next active number
    renderEquationModeEquation();
}

function combineNumbersInEquation() {
    // Combine the first number with the current step number
    if (currentStepIndex >= 1 && currentStepIndex < currentNumbers.length) {
        const firstNum = currentNumbers[0];
        const addedNum = currentNumbers[currentStepIndex];
        const sum = firstNum + addedNum;
        
        // Replace the first two numbers with their sum
        currentNumbers.splice(0, currentStepIndex + 1, sum);
        
        // Reset step index since we've combined numbers
        currentStepIndex = 0;
    }
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
            }
        }
    }
    
    // Highlight the current position (where we are on the number board)
    let currentPosition;
    if (currentStepIndex === 0) {
        // At the beginning, current position is the first number
        currentPosition = currentNumbers[0];
    } else {
        // Calculate current position based on completed steps
        currentPosition = currentNumbers[0];
        for (let i = 1; i <= Math.min(currentStepIndex - 1, currentNumbers.length - 1); i++) {
            currentPosition += currentNumbers[i];
        }
    }
    
    const currentTile = document.querySelector(`[data-number="${currentPosition}"]`);
    if (currentTile) {
        currentTile.classList.add('current-position');
    }
}

function renderEquationModeEquation() {
    equationDisplay.innerHTML = '';
    
    // Create equation display
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
        const { show_blocks } = getCurrentSettings();
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
        
        // Arrow indicators removed for cleaner interface
        
        // Add double-click handler for splittable numbers
        if (idx === 1 && needsSplitting() && currentNumbers.length === 2) {
            circle.addEventListener('dblclick', handleSplitNumber);
            circle.addEventListener('touchstart', handleDoubleTap);
        }
        
        equationDisplay.appendChild(circle);
    });
}

function needsSplitting() {
    // Check if second number needs to be split (has both tens and ones)
    if (currentNumbers.length !== 2) return false;
    const secondNum = currentNumbers[1];
    const tens = Math.floor(secondNum / 10);
    const ones = secondNum % 10;
    return tens > 0 && ones > 0;
}

// Arrow indicators removed for cleaner interface

function handleSplitNumber(event) {
    event.preventDefault();
    if (currentNumbers.length !== 2) return;
    
    const secondNum = currentNumbers[1];
    const tens = Math.floor(secondNum / 10) * 10;
    const ones = secondNum % 10;
    
    if (tens > 0 && ones > 0) {
        // Split the number
        currentNumbers = [currentNumbers[0], tens, ones];
        
        // Hide swap button after first split
        hideSwapButton();
        
        // Set step index to 1 to show arrow on first split number
        currentStepIndex = 1;
        
        renderEquationModeEquation();
        
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

function completeEquationMode() {
    gameActive = false;
    gameComplete = true;
    
    // Update tile coloring with final state
    updateTileColoring();
    
    // Update equation to show final answer
    renderEquationModeEquation();
    
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

// === SHARED RENDERING FUNCTIONS ===
function renderEquationInDiv(targetDiv, numbers) {
    targetDiv.innerHTML = '';
    
    numbers.forEach((num, idx) => {
        if (idx > 0) {
            const plus = document.createElement('div');
            plus.className = 'plus';
            plus.textContent = '+';
            targetDiv.appendChild(plus);
        }
        
        const circle = document.createElement('div');
        circle.className = 'number-circle';
        circle.dataset.value = num;

        // First number is always grayed out (non-draggable)
        if (idx === 0) {
            circle.classList.add('grayed');
        }

        const valueDiv = document.createElement('div');
        valueDiv.className = 'number-value';
        valueDiv.textContent = num;
        circle.appendChild(valueDiv);

        // Add blocks if enabled
        const { show_blocks } = getCurrentSettings();
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
        targetDiv.appendChild(circle);
    });
}

// Equation mode functions removed - game now uses visual mode only

function makeVisualDraggable() {
    makeDraggable(); // Use the existing makeDraggable function
}

// === NUMBERBOARD DISPLAY MODE IMPLEMENTATION ===
function startNumberboardDisplayMode() {
    // Hide visual mode, show numberboard display mode
    visualModeDiv.classList.add('hidden');
    numberboardDisplayMode.classList.remove('hidden');
    
    // Clear any existing interact.js bindings to prevent conflicts
    interact('.number-circle').unset();
    
    const [a, b] = currentProblem;
    currentNumbers = [a, b];
    
    // Reset game state
    gameActive = false;
    gameComplete = false;
    currentStepIndex = 0;
    
    // Hide button initially
    nextGameBtn.classList.add('hidden');
    
    // Render initial equation
    renderNumberboardDisplayEquation();
    
    // Set up initial board state
    updateNumberboardDisplayTileColoring();
    
    // If no splitting is needed, enable game immediately and set up first step
    if (!needsNumberboardSplitting()) {
        gameActive = true;
        currentStepIndex = 1; // Ready for first addition
        renderNumberboardDisplayEquation(); // Update to show arrow
    }
}

function needsNumberboardSplitting() {
    // Check if second number needs to be split (has both tens and ones)
    if (currentNumbers.length !== 2) return false;
    const secondNum = currentNumbers[1];
    const tens = Math.floor(secondNum / 10);
    const ones = secondNum % 10;
    return tens > 0 && ones > 0;
}

function handleNumberboardDisplayTileClick(event) {
    event.preventDefault();
    
    if (!gameActive || gameComplete) return;
    
    const clickedNumber = parseInt(event.target.dataset.number);
    
    // Calculate what the expected number should be
    const expectedNumber = getNumberboardExpectedNumber();
    
    if (clickedNumber === expectedNumber) {
        handleNumberboardCorrectAnswer(event.target);
    } else {
        handleNumberboardIncorrectAnswer(event.target);
    }
}

function getNumberboardExpectedNumber() {
    if (currentStepIndex === 0) {
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

function handleNumberboardCorrectAnswer(tile) {
    // Combine numbers in the equation display
    combineNumberboardNumbers();
    
    // Move to next step
    currentStepIndex++;
    
    // Update tile coloring
    updateNumberboardDisplayTileColoring();
    
    // Check if game is complete (we've added all numbers after the first one)
    if (currentStepIndex > currentNumbers.length - 1) {
        completeNumberboardDisplayMode();
        return;
    }
    
    // Update equation display to show next active number
    renderNumberboardDisplayEquation();
}

function combineNumberboardNumbers() {
    // Combine the first number with the current step number
    if (currentStepIndex >= 1 && currentStepIndex < currentNumbers.length) {
        const firstNum = currentNumbers[0];
        const addedNum = currentNumbers[currentStepIndex];
        const sum = firstNum + addedNum;
        
        // Hide swap button after first combination
        hideSwapButton();
        
        // Replace the first two numbers with their sum
        currentNumbers.splice(0, currentStepIndex + 1, sum);
        
        // Reset step index since we've combined numbers
        currentStepIndex = 0;
    }
}

function handleNumberboardIncorrectAnswer(tile) {
    // Show red X animation
    showNumberboardErrorX(tile);
    
    // Briefly highlight tile as incorrect
    tile.classList.add('incorrect');
    
    setTimeout(() => {
        tile.classList.remove('incorrect');
    }, 1000);
}

function showNumberboardErrorX(tile) {
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

function updateNumberboardDisplayTileColoring() {
    // Clear all previous coloring
    numberboardNumberGrid.querySelectorAll('.number-tile').forEach(tile => {
        tile.classList.remove('correct', 'current', 'completed', 'current-sequence', 'current-position', 'current-completed', 'starting-blocks', 'first-addition', 'second-addition');
    });
    
    if (currentNumbers.length === 0) return;
    
    let cumulativeSum = currentNumbers[0];
    
    // Calculate how many steps to color
    const maxStep = gameComplete ? currentNumbers.length - 1 : currentStepIndex - 1;
    
    // Color starting position (1 to first number) as yellow
    for (let i = 1; i <= currentNumbers[0]; i++) {
        const tile = numberboardNumberGrid.querySelector(`[data-number=\"${i}\"]`);
        if (tile) {
            tile.classList.add('starting-blocks');
        }
    }
    
    // Always highlight the current position (first number) as bold/large
    const currentPositionTile = numberboardNumberGrid.querySelector(`[data-number=\"${currentNumbers[0]}\"]`);
    if (currentPositionTile) {
        currentPositionTile.classList.add('current-position');
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
            const tile = numberboardNumberGrid.querySelector(`[data-number=\"${i}\"]`);
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

function renderNumberboardDisplayEquation() {
    numberboardEquationDisplay.innerHTML = '';
    
    // Create equation display similar to equation-skip-counting game
    currentNumbers.forEach((num, idx) => {
        if (idx > 0) {
            const plus = document.createElement('div');
            plus.className = 'plus';
            plus.textContent = '+';
            numberboardEquationDisplay.appendChild(plus);
        }
        
        const circle = document.createElement('div');
        circle.className = 'number-circle';
        circle.dataset.value = num;
        
        // Style based on position and game state
        if (idx === 0) {
            // First number is always gray (non-splittable)
            circle.classList.add('grayed');
        } else if (needsNumberboardSplitting() && idx === 1 && currentNumbers.length === 2) {
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
        const { show_blocks } = getCurrentSettings();
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
        
        // Arrow indicators removed for cleaner interface
        
        // Add double-click handler for splittable numbers
        if (idx === 1 && needsNumberboardSplitting() && currentNumbers.length === 2) {
            circle.addEventListener('dblclick', handleNumberboardSplitNumber);
            circle.addEventListener('touchstart', handleNumberboardDoubleTap);
        }
        
        numberboardEquationDisplay.appendChild(circle);
    });
    
    // Final answer display removed for cleaner interface
}

// Arrow indicator function removed - arrows disabled for cleaner interface

function handleNumberboardSplitNumber(event) {
    event.preventDefault();
    if (currentNumbers.length !== 2) return;
    
    const secondNum = currentNumbers[1];
    const tens = Math.floor(secondNum / 10) * 10;
    const ones = secondNum % 10;
    
    if (tens > 0 && ones > 0) {
        // Split the number
        currentNumbers = [currentNumbers[0], tens, ones];
        
        // Hide swap button after first split
        hideSwapButton();
        
        // Set step index to 1 to show arrow on first split number
        currentStepIndex = 1;
        
        renderNumberboardDisplayEquation();
        
        // Enable number board interaction
        gameActive = true;
    }
}

// Handle double-tap for touch devices in numberboard display mode
let numberboardTapCount = 0;
let numberboardTapTimer;

function handleNumberboardDoubleTap(event) {
    numberboardTapCount++;
    
    if (numberboardTapCount === 1) {
        numberboardTapTimer = setTimeout(() => {
            numberboardTapCount = 0;
        }, 300);
    } else if (numberboardTapCount === 2) {
        clearTimeout(numberboardTapTimer);
        numberboardTapCount = 0;
        
        event.preventDefault();
        event.stopPropagation();
        
        handleNumberboardSplitNumber(event);
    }
}

function completeNumberboardDisplayMode() {
    gameActive = false;
    gameComplete = true;
    
    // Update tile coloring with final state
    updateNumberboardDisplayTileColoring();
    
    // Update equation to show final answer
    renderNumberboardDisplayEquation();
    
    // Increment games completed counter for this mode
    gamesCompleted++;
    gamesCompletedDisplay.textContent = gamesCompleted;
    
    // Show confetti
    showNumberboardConfetti();
    
    // Show next game button (which will switch to next mode)
    setTimeout(() => {
        nextGameBtn.classList.remove('hidden');
    }, 1000);
}

function showNumberboardConfetti() {
    confettiContainer.classList.remove('hidden');
    
    // Create multiple bursts
    createNumberboardConfettiBurst(80); // First big burst
    
    setTimeout(() => {
        createNumberboardConfettiBurst(60); // Second burst
    }, 300);
    
    setTimeout(() => {
        createNumberboardConfettiBurst(40); // Third burst
    }, 600);
    
    // Hide confetti container after animation completes
    setTimeout(() => {
        confettiContainer.classList.add('hidden');
        confettiContainer.innerHTML = ''; // Clear all confetti
    }, 3000);
}

function createNumberboardConfettiBurst(pieceCount) {
    for (let i = 0; i < pieceCount; i++) {
        setTimeout(() => {
            createNumberboardConfettiPiece();
        }, i * 10); // Stagger the creation slightly
    }
}

function createNumberboardConfettiPiece() {
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

function switchToNextMode() {
    // Move to next mode in the cycle
    currentMode = (currentMode + 1) % 3;
    
    if (currentMode === 1) {
        // Switch from numberboard display to visual mode with numberboard modal
        numberboardDisplayMode.classList.add('hidden');
        visualModeDiv.classList.remove('hidden');
        startVisualModeWithNumberboardModal();
    } else if (currentMode === 2) {
        // Switch from numberboard modal to visual mode with numpad modal
        numberboardDisplayMode.classList.add('hidden');
        visualModeDiv.classList.remove('hidden');
        startVisualModeWithNumpadModal();
    } else {
        // Switch from numpad modal to new problem (back to mode 0)
        startNewProblem();
        return;
    }
}

// === VISUAL MODE IMPLEMENTATION ===
function startVisualMode() {
    const [a, b] = currentProblem;
    visualCurrentNumbers = [a, b];
    
    renderEquationInDiv(visualEquationDiv, visualCurrentNumbers);
    makeVisualDraggable();
    
    nextGameBtn.classList.add('hidden');
    modal.classList.add('hidden');
}

function startVisualModeWithNumberboardModal() {
    // Hide numberboard display mode, show visual mode
    numberboardDisplayMode.classList.add('hidden');
    visualModeDiv.classList.remove('hidden');
    
    const [a, b] = currentProblem;
    visualCurrentNumbers = [a, b];
    
    renderEquationInDiv(visualEquationDiv, visualCurrentNumbers);
    makeVisualDraggable();
    
    nextGameBtn.classList.add('hidden');
    modal.classList.add('hidden');
}

function startVisualModeWithNumpadModal() {
    // Hide numberboard display mode, show visual mode
    numberboardDisplayMode.classList.add('hidden');
    visualModeDiv.classList.remove('hidden');
    
    const [a, b] = currentProblem;
    visualCurrentNumbers = [a, b];
    
    renderEquationInDiv(visualEquationDiv, visualCurrentNumbers);
    makeVisualDraggable();
    
    nextGameBtn.classList.add('hidden');
    modal.classList.add('hidden');
}


function makeDraggable() {
    // Make numbers draggable (except first number which is grayed) - only in visual mode
    interact('#visual-mode .number-circle:not(.grayed)')
        .draggable({
            inertia: false,
            autoScroll: false,
            listeners: {
                start(event) {
                    droppedFlag = false;
                    event.target.setAttribute('data-x', 0);
                    event.target.setAttribute('data-y', 0);
                    event.target.style.transform = 'scale(1.1)';
                    event.target.style.zIndex = '1000';
                    event.target.classList.add('dragging');
                },
                move(event) {
                    const target = event.target;
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                    target.style.transform = `translate(${x}px, ${y}px) scale(1.1)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                },
                end(event) {
                    event.target.style.transform = '';
                    event.target.style.zIndex = '';
                    event.target.classList.remove('dragging');
                    if (!droppedFlag) {
                        resetPosition(event.target);
                    }
                }
            }
        });

    // Add double-tap to split numbers (only for second number and beyond) - only in visual mode
    document.querySelectorAll('#visual-mode .number-circle:not(.grayed)').forEach(circle => {
        let tapCount = 0;
        let tapTimer;
        
        const handleTap = function(event) {
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
                
                const num = parseInt(this.querySelector('.number-value').textContent);
                const idx = visualCurrentNumbers.indexOf(num);
                if (idx !== -1 && idx > 0) { // Only allow splitting of non-first numbers
                    const tens = Math.floor(num / 10) * 10;
                    const ones = num % 10;
                    if (tens > 0 && ones > 0) {
                        hideSwapButton();
                        visualCurrentNumbers.splice(idx, 1, tens, ones);
                        renderEquationInDiv(visualEquationDiv, visualCurrentNumbers);
                        makeDraggable();
                    }
                }
            }
        };
        
        circle.addEventListener('touchstart', handleTap);
        
        circle.addEventListener('dblclick', function(event) {
            event.preventDefault();
            const num = parseInt(this.querySelector('.number-value').textContent);
            const idx = visualCurrentNumbers.indexOf(num);
            if (idx !== -1 && idx > 0) { // Only allow splitting of non-first numbers
                const tens = Math.floor(num / 10) * 10;
                const ones = num % 10;
                if (tens > 0 && ones > 0) {
                    hideSwapButton();
                    visualCurrentNumbers.splice(idx, 1, tens, ones);
                    renderEquationInDiv(visualEquationDiv, visualCurrentNumbers);
                    makeDraggable();
                }
            }
        });
    });

    // Make numbers dropzones for other numbers (restricted combinations) - only in visual mode
    interact('#visual-mode .number-circle').dropzone({
        accept: '#visual-mode .number-circle:not(.grayed)',
        overlap: 'pointer',
        checker: function(dragEvent, event, dropped, dropzone, dropElement, draggable, draggableElement) {
            if (!dropped) return false;
            
            const droppedNum = parseInt(draggableElement.querySelector('.number-value').textContent);
            const targetNum = parseInt(dropElement.querySelector('.number-value').textContent);
            
            // Don't allow dropping onto self
            if (droppedNum === targetNum && draggableElement === dropElement) return false;
            
            // Only allow specific combinations that follow the pattern
            return isAllowedCombination(droppedNum, targetNum);
        },
        ondragenter: function(event) {
            event.target.classList.add('drag-target');
        },
        ondragleave: function(event) {
            event.target.classList.remove('drag-target');
        },
        ondrop: function(event) {
            event.target.classList.remove('drag-target');
            droppedFlag = true;
            
            const droppedNum = parseInt(event.relatedTarget.querySelector('.number-value').textContent);
            const targetNum = parseInt(event.target.querySelector('.number-value').textContent);
            
            if (event.relatedTarget !== event.target) {
                showPopup(targetNum, droppedNum);
            }
            resetPosition(event.relatedTarget);
        }
    });
}

function isAllowedCombination(droppedNum, targetNum) {
    // Only allow combinations that follow the equation-skip-counting pattern:
    // - First number (targetNum) + tens from second number
    // - First number (targetNum) + ones from second number
    // - (First number + tens) + ones from second number
    // - (First number + ones) + tens from second number
    
    const [originalA, originalB] = currentProblem;
    const tensB = Math.floor(originalB / 10) * 10;
    const onesB = originalB % 10;
    
    // Allow dropping tens or ones onto the original first number
    if (targetNum === originalA) {
        return droppedNum === tensB || droppedNum === onesB;
    }
    
    // Allow dropping the remaining component onto the intermediate sum
    // (e.g., if we already added tens to first number, allow adding ones)
    if (targetNum === originalA + tensB) {
        return droppedNum === onesB;
    }
    
    if (targetNum === originalA + onesB) {
        return droppedNum === tensB;
    }
    
    return false;
}

function resetPosition(element) {
    element.style.transform = 'translate(0px, 0px)';
    element.setAttribute('data-x', 0);
    element.setAttribute('data-y', 0);
}

function showPopup(a, b) {
    renderModalEquation(a, b);
    answerInput.value = '';
    errorMsg.classList.add('hidden');
    modal.classList.remove('hidden');
    
    // Switch between different modal types based on the current mode
    const numpad = document.getElementById('numpad');
    const numberboard = document.getElementById('numberboard');
    
    if (currentMode === 1) {
        // Mode 1: Numberboard modal (visual mode with numberboard modal)
        numpad.classList.add('hidden');
        numberboard.classList.remove('hidden');
        answerInput.style.display = 'none'; // Hide input field
        setupNumberboardModal(a, b);
    } else if (currentMode === 2) {
        // Mode 2: Numpad modal (visual mode with numpad modal)
        numpad.classList.remove('hidden');
        numberboard.classList.add('hidden');
        answerInput.style.display = 'block'; // Show input field
        setupNumpadModal(a, b);
    }
    // Mode 0 (numberboard display) doesn't use modals, so no else case needed
    
    document.getElementById('cancel').onclick = () => {
        modal.classList.add('hidden');
    };
}

function setupNumpadModal(a, b) {
    const numBtns = document.querySelectorAll('.num-btn');
    numBtns.forEach(btn => {
        btn.onclick = () => {
            answerInput.value += btn.textContent;
        };
    });
    
    document.getElementById('backspace').onclick = () => {
        answerInput.value = answerInput.value.slice(0, -1);
    };
    
    document.getElementById('submit').onclick = () => {
        const ans = parseInt(answerInput.value);
        if (isNaN(ans) || ans !== a + b) {
            errorMsg.classList.remove('hidden');
        } else {
            handleCorrectModalAnswer(a, b);
        }
    };
}

function setupNumberboardModal(a, b) {
    // Update modal numberboard with current state
    updateModalTileColoring(a, b);
    
    // Add click handlers to numberboard tiles
    const tiles = modalNumberGrid.querySelectorAll('.number-tile');
    tiles.forEach(tile => {
        tile.onclick = () => {
            const clickedNumber = parseInt(tile.dataset.number);
            if (clickedNumber === a + b) {
                showCorrectAnswerAnimation(a, b, () => {
                    handleCorrectModalAnswer(a, b);
                });
            } else {
                errorMsg.classList.remove('hidden');
                setTimeout(() => {
                    errorMsg.classList.add('hidden');
                }, 2000);
            }
        };
    });
}

function showCorrectAnswerAnimation(a, b, callback) {
    const sum = a + b;
    
    // Clear all previous coloring
    modalNumberGrid.querySelectorAll('.number-tile').forEach(tile => {
        tile.classList.remove('starting-blocks', 'first-addition', 'second-addition', 'current-position');
    });
    
    // Show all squares from 1 to the answer (sum) in yellow
    for (let i = 1; i <= sum; i++) {
        const tile = modalNumberGrid.querySelector(`[data-number="${i}"]`);
        if (tile) {
            tile.classList.add('starting-blocks');
        }
    }
    
    // Make the starting number (a) normal again (remove bold/large)
    const startTile = modalNumberGrid.querySelector(`[data-number="${a}"]`);
    if (startTile) {
        startTile.classList.remove('current-position');
    }
    
    // Make the answer (sum) bold and large to indicate final position
    const answerTile = modalNumberGrid.querySelector(`[data-number="${sum}"]`);
    if (answerTile) {
        answerTile.classList.add('current-position');
    }
    
    // Wait 1 second then call the callback to close modal
    setTimeout(callback, 1000);
}

function handleCorrectModalAnswer(a, b) {
    const sum = a + b;
    const idxA = visualCurrentNumbers.indexOf(a);
    let idxB = visualCurrentNumbers.indexOf(b);
    
    if (a === b && idxA === idxB) {
        idxB = visualCurrentNumbers.indexOf(b, idxA + 1);
    }
    
    if (idxA !== -1 && idxB !== -1) {
        hideSwapButton();
        const minIdx = Math.min(idxA, idxB);
        const maxIdx = Math.max(idxA, idxB);
        visualCurrentNumbers.splice(maxIdx, 1);
        visualCurrentNumbers.splice(minIdx, 1, sum);
        renderEquationInDiv(visualEquationDiv, visualCurrentNumbers);
        makeDraggable();
    }
    modal.classList.add('hidden');
    checkIfDone();
}

function updateModalTileColoring(a, b) {
    // Clear all previous coloring
    modalNumberGrid.querySelectorAll('.number-tile').forEach(tile => {
        tile.classList.remove('starting-blocks', 'first-addition', 'second-addition', 'current-position');
    });
    
    // Highlight all squares from 1 to the first number (a) in yellow
    for (let i = 1; i <= a; i++) {
        const tile = modalNumberGrid.querySelector(`[data-number="${i}"]`);
        if (tile) {
            tile.classList.add('starting-blocks');
        }
    }
    
    // Make the starting number (a) bold and large to indicate current position
    const startTile = modalNumberGrid.querySelector(`[data-number="${a}"]`);
    if (startTile) {
        startTile.classList.add('current-position');
    }
}

function checkIfEquationDone() {
    if (currentNumbers.length === 1) {
        // Show confetti and next mode button
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
        nextGameBtn.classList.remove('hidden');
    }
}

function renderModalEquation(a, b) {
    const modalEquationDiv = document.getElementById('modal-equation');
    modalEquationDiv.innerHTML = '';
    
    [a, b].forEach((num, idx) => {
        if (idx > 0) {
            const plus = document.createElement('div');
            plus.className = 'plus';
            plus.textContent = '+';
            modalEquationDiv.appendChild(plus);
        }
        
        const circle = document.createElement('div');
        circle.className = 'number-circle';
        
        // First number should be yellow (grayed class gives yellow color)
        if (idx === 0) {
            circle.classList.add('grayed');
        }
        
        const valueDiv = document.createElement('div');
        valueDiv.className = 'number-value';
        valueDiv.textContent = num;
        circle.appendChild(valueDiv);
        
        // Add blocks if enabled
        const { show_blocks } = getCurrentSettings();
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
        modalEquationDiv.appendChild(circle);
    });
}

function checkIfDone() {
    if (visualCurrentNumbers.length === 1) {
        // Increment games completed counter for each mode completion
        gamesCompleted++;
        gamesCompletedDisplay.textContent = gamesCompleted;
        
        // Show confetti for completion
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
        
        if (currentMode === 2) {
            // Mode 2 (numpad modal) - increment problem count and show next game button
            problemCount++;
            nextGameBtn.classList.remove('hidden');
        } else {
            // Mode 1 (numberboard modal) - show next game button to continue to next mode
            setTimeout(() => {
                nextGameBtn.classList.remove('hidden');
            }, 1500);
        }
    }
}

function showOriginalEquation() {
    const [a, b] = currentProblem;
    originalEquationDisplay.innerHTML = '';
    
    // Create first number circle
    const circle1 = document.createElement('div');
    circle1.className = 'number-circle';
    const value1 = document.createElement('div');
    value1.className = 'number-value';
    value1.textContent = a;
    circle1.appendChild(value1);
    originalEquationDisplay.appendChild(circle1);
    
    // Create plus sign
    const plus = document.createElement('div');
    plus.className = 'plus';
    plus.textContent = '+';
    originalEquationDisplay.appendChild(plus);
    
    // Create second number circle
    const circle2 = document.createElement('div');
    circle2.className = 'number-circle';
    const value2 = document.createElement('div');
    value2.className = 'number-value';
    value2.textContent = b;
    circle2.appendChild(value2);
    originalEquationDisplay.appendChild(circle2);
    
    // Show the display
    originalEquationDisplay.classList.remove('hidden');
}

function hideOriginalEquation() {
    originalEquationDisplay.classList.add('hidden');
}

function showSwapButton() {
    if (currentMode === 0) {
        // Numberboard display mode
        swapNumbersBtnNumberboard.classList.remove('hidden');
        swapNumbersBtnVisual.classList.add('hidden');
    } else {
        // Visual modes
        swapNumbersBtnVisual.classList.remove('hidden');
        swapNumbersBtnNumberboard.classList.add('hidden');
    }
}

function hideSwapButton() {
    swapNumbersBtnNumberboard.classList.add('hidden');
    swapNumbersBtnVisual.classList.add('hidden');
}

function handleSwapNumbers() {
    // Swap the numbers in the current problem
    const [a, b] = currentProblem;
    currentProblem = [b, a];
    
    // Update the original equation display
    showOriginalEquation();
    
    // Update the current numbers array
    if (currentNumbers.length === 2) {
        currentNumbers = [b, a];
    }
    
    // Re-render the appropriate mode
    if (currentMode === 0) {
        // Numberboard display mode
        renderNumberboardDisplayEquation();
        updateNumberboardDisplayTileColoring();
    } else {
        // Visual modes
        visualCurrentNumbers = [b, a];
        renderEquationInDiv(visualEquationDiv, visualCurrentNumbers);
        makeVisualDraggable();
    }
}

// === UTILITY FUNCTIONS ===
function setupZoomPrevention() {
    document.addEventListener('touchstart', function(event) {
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    }, { passive: false });
    
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
}
