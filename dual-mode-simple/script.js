// Dual Mode Addition Game - Clean Implementation
// Top: Mode 4 (Flexible Combining with Numpad)
// Bottom: Mode 1 (Numberboard Modal with Swap)

// Game state
let currentProblem = null;
let gamesCompleted = 0;

// Mode states
let mode4Numbers = []; // Top section numbers
let mode1Numbers = []; // Bottom section numbers
let mode4Complete = false;
let mode1Complete = false;
let currentModalMode = null; // 'mode4' or 'mode1'
let droppedFlag = false;

// DOM elements
let mode4EquationDiv, mode1EquationDiv, modal, answerInput, errorMsg, nextGameBtn;
let gamesCompletedDisplay, modalNumberGrid, originalEquationDisplay, swapBtn;
let modalEquationDiv, equalsSign, numpad, numberboard;

// Initialize the game
document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
});

function initializeGame() {
    // Get DOM elements
    mode4EquationDiv = document.getElementById('mode4-equation');
    mode1EquationDiv = document.getElementById('mode1-equation');
    modal = document.getElementById('modal');
    answerInput = document.getElementById('answer-input');
    errorMsg = document.getElementById('error-msg');
    nextGameBtn = document.getElementById('next-game-btn');
    gamesCompletedDisplay = document.getElementById('games-completed');
    originalEquationDisplay = document.getElementById('original-equation-display');
    swapBtn = document.getElementById('swap-btn');
    modalEquationDiv = document.getElementById('modal-equation');
    equalsSign = document.getElementById('equals-sign');
    numpad = document.getElementById('numpad');
    numberboard = document.getElementById('numberboard');
    
    // Create modal number grid
    createModalNumberGrid();
    
    // Set up event listeners
    nextGameBtn.addEventListener('click', startNewProblem);
    swapBtn.addEventListener('click', handleSwapNumbers);
    document.getElementById('cancel').addEventListener('click', () => modal.classList.add('hidden'));
    
    // Setup numpad
    setupNumpad();
    
    // Prevent zooming
    setupZoomPrevention();
    
    // Start first problem
    startNewProblem();
}

function createModalNumberGrid() {
    const grid = document.getElementById('modal-number-grid');
    if (!grid) {
        const gridDiv = document.createElement('div');
        gridDiv.id = 'modal-number-grid';
        gridDiv.className = 'number-grid';
        numberboard.appendChild(gridDiv);
    }
    
    const modalGrid = document.getElementById('modal-number-grid');
    modalGrid.innerHTML = '';
    
    for (let i = 1; i <= 100; i++) {
        const tile = document.createElement('div');
        tile.className = 'number-tile';
        tile.textContent = i;
        tile.dataset.number = i;
        tile.addEventListener('click', () => handleNumberboardTileClick(i));
        modalGrid.appendChild(tile);
    }
}

function setupNumpad() {
    const numBtns = document.querySelectorAll('.num-btn');
    numBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            answerInput.value += btn.textContent;
        });
    });
    
    document.getElementById('backspace').addEventListener('click', () => {
        answerInput.value = answerInput.value.slice(0, -1);
    });
    
    document.getElementById('submit').addEventListener('click', handleNumpadSubmit);
}

// === PROBLEM GENERATION ===
// Question format array - each element is just the generator function name
let question_format = [
    "generateDoublePlusDoubleWithCarry",
    "generateDoublePlusDoubleWithCarry"
];

// Mapping of generator function names to actual functions
const generatorFunctions = {
    "generateRandomNumbers": generateRandomNumbers,
    "generateRandomBothDoubleDigits": generateRandomBothDoubleDigits,
    "generateDoubleDigitsNoCarry": generateDoubleDigitsNoCarry,
    "generateBothMultiplesOfTen": generateBothMultiplesOfTen,
    "generateOneMultipleOfTenPlusNonMultiple": generateOneMultipleOfTenPlusNonMultiple,
    "generateDoublePlusSingleWithCarry": generateDoublePlusSingleWithCarry,
    "generateDoublePlusSingleNoCarry": generateDoublePlusSingleNoCarry,
    "generateDoublePlusDoubleWithCarry": generateDoublePlusDoubleWithCarry,
    "generateRandomBothDoubleDigitsNoMultiplesOfTen": generateRandomBothDoubleDigitsNoMultiplesOfTen
};

// Function to get current generator based on problem count
function getCurrentGenerator() {
    const index = gamesCompleted % question_format.length;
    const generator_name = question_format[index];
    return generatorFunctions[generator_name];
}

// === GENERATOR FUNCTIONS (copied from original visual-adding) ===
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

function generateOneMultipleOfTenPlusNonMultiple() {
    let a, b;
    do {
        [a, b] = generateRandomNumbers();
    } while (
        (a % 10 === 0 && b % 10 === 0) || 
        (a % 10 !== 0 && b % 10 !== 0) ||
        a < 10 || 
        b < 10
    );
    return [a, b];
}

function generateDoublePlusSingleWithCarry() {
    let a, b;
    do {
        // Generate a number > 10 that's not a multiple of 10
        a = Math.floor(Math.random() * 89) + 11; // 11-99
        while (a % 10 === 0) {
            a = Math.floor(Math.random() * 89) + 11;
        }
        
        // Generate a single digit
        b = Math.floor(Math.random() * 9) + 1; // 1-9
        
        // Check if adding them crosses to the next ten (includes cases that equal 10)
        const onesDigitA = a % 10;
        const crossesTen = (onesDigitA + b) >= 10;
        
        // Accept if there's a carry AND sum is <= 100
        if (crossesTen && (a + b) <= 100) {
            break;
        }
    } while (true);
    
    return [a, b];
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

function generateRandomBothDoubleDigitsNoMultiplesOfTen() {
    let a, b;
    do {
        a = Math.floor(Math.random() * 90) + 10; // 10-99
        b = Math.floor(Math.random() * 90) + 10; // 10-99
    } while (a % 10 === 0 || b % 10 === 0); // Ensure neither is multiple of 10
    
    return [a, b];
}

function startNewProblem() {
    // Generate new problem using current generator
    const generator = getCurrentGenerator();
    currentProblem = generator();
    
    // Reset states
    mode4Numbers = [...currentProblem];
    mode1Numbers = [...currentProblem];
    mode4Complete = false;
    mode1Complete = false;
    currentModalMode = null;
    droppedFlag = false;
    
    // Force fresh render by resetting tracking arrays
    lastMode4Numbers = [];
    lastMode1Numbers = [];
    
    // Remove any existing checkmarks and arrows from previous game
    removeAllCheckmarks();
    
    // Show arrow pointing to Mode 4 (top section) to start
    addActiveArrow('mode4');
    
    // Show original equation
    showOriginalEquation();
    
    // Show swap button for mode 1
    swapBtn.classList.remove('hidden');
    
    // Render both modes
    renderMode4();
    renderMode1();
    
    // Disable Mode 1 initially - it will be enabled after Mode 4 is complete
    mode1EquationDiv.closest('.mode-section').classList.add('disabled');
    addDisabledOverlay('mode1');
    
    // Ensure Mode 4 is enabled at start of new game
    mode4EquationDiv.closest('.mode-section').classList.remove('disabled');
    removeDisabledOverlay('mode4');
    
    // Hide next game button and modal
    nextGameBtn.classList.add('hidden');
    modal.classList.add('hidden');
}

let lastMode4Numbers = [];
let lastMode1Numbers = [];

function renderMode4() {
    // Only re-render and re-bind if numbers actually changed
    if (JSON.stringify(mode4Numbers) !== JSON.stringify(lastMode4Numbers)) {
        renderEquation(mode4EquationDiv, mode4Numbers, false);
        lastMode4Numbers = [...mode4Numbers];
        makeDraggable();
    }
}

function renderMode1() {
    // Only re-render and re-bind if numbers actually changed
    if (JSON.stringify(mode1Numbers) !== JSON.stringify(lastMode1Numbers)) {
        renderEquation(mode1EquationDiv, mode1Numbers, true);
        lastMode1Numbers = [...mode1Numbers];
        makeDraggable();
    }
}

function renderEquation(targetDiv, numbers, grayFirst) {
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
        
        const valueDiv = document.createElement('div');
        valueDiv.className = 'number-value';
        valueDiv.textContent = num;
        circle.appendChild(valueDiv);
        
        targetDiv.appendChild(circle);
    });
}

// === MODE 4 (FLEXIBLE COMBINING) ===
function makeDraggable() {
    // Clear all existing interactions first to avoid conflicts
    interact('.number-circle').unset();
    
    // Make numbers draggable - EXACTLY like the working test file
    interact('.number-circle')
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

    // Add double-tap to split numbers (exact copy from original visual-adding)
    document.querySelectorAll('.number-circle').forEach(circle => {
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
                
                // Determine which mode this circle belongs to and handle accordingly
                if (this.closest('#mode4-equation')) {
                    // Find the actual index of this specific circle element
                    const circles = this.closest('#mode4-equation').querySelectorAll('.number-circle');
                    const idx = Array.from(circles).indexOf(this);
                    if (idx !== -1 && idx < mode4Numbers.length) {
                        const tens = Math.floor(num / 10) * 10;
                        const ones = num % 10;
                        if (tens > 0 && ones > 0) {
                            mode4Numbers.splice(idx, 1, tens, ones);
                            renderMode4();
                        }
                    }
                } else if (this.closest('#mode1-equation')) {
                    // Find the actual index of this specific circle element
                    const circles = this.closest('#mode1-equation').querySelectorAll('.number-circle');
                    const idx = Array.from(circles).indexOf(this);
                    if (idx !== -1 && idx > 0 && idx < mode1Numbers.length) { // Don't split first number in mode 1
                        const tens = Math.floor(num / 10) * 10;
                        const ones = num % 10;
                        if (tens > 0 && ones > 0) {
                            mode1Numbers.splice(idx, 1, tens, ones);
                            renderMode1();
                            // Hide swap button after first split in Mode 1
                            swapBtn.classList.add('hidden');
                        }
                    }
                }
            }
        };
        
        circle.addEventListener('touchstart', handleTap);
        
        circle.addEventListener('dblclick', function(event) {
            event.preventDefault();
            const num = parseInt(this.querySelector('.number-value').textContent);
            
            // Determine which mode this circle belongs to and handle accordingly
            if (this.closest('#mode4-equation')) {
                // Find the actual index of this specific circle element
                const circles = this.closest('#mode4-equation').querySelectorAll('.number-circle');
                const idx = Array.from(circles).indexOf(this);
                if (idx !== -1 && idx < mode4Numbers.length) {
                    const tens = Math.floor(num / 10) * 10;
                    const ones = num % 10;
                    if (tens > 0 && ones > 0) {
                        mode4Numbers.splice(idx, 1, tens, ones);
                        renderMode4();
                    }
                }
            } else if (this.closest('#mode1-equation')) {
                // Find the actual index of this specific circle element
                const circles = this.closest('#mode1-equation').querySelectorAll('.number-circle');
                const idx = Array.from(circles).indexOf(this);
                if (idx !== -1 && idx > 0 && idx < mode1Numbers.length) { // Don't split first number in mode 1
                    const tens = Math.floor(num / 10) * 10;
                    const ones = num % 10;
                    if (tens > 0 && ones > 0) {
                        mode1Numbers.splice(idx, 1, tens, ones);
                        renderMode1();
                        // Hide swap button after first split in Mode 1
                        swapBtn.classList.add('hidden');
                    }
                }
            }
        });
    });

    // Make numbers dropzones for other numbers (exact copy from original visual-adding)
    interact('.number-circle').dropzone({
        accept: '.number-circle',
        overlap: 0.25,
        checker: function(dragEvent, event, dropped, dropzone, dropElement, draggable, draggableElement) {
            if (!dropped) return false;
            
            const droppedNum = parseInt(draggableElement.querySelector('.number-value').textContent);
            const targetNum = parseInt(dropElement.querySelector('.number-value').textContent);
            
            // Quick check: are both elements in Mode 4? (most common case)
            if (mode4Numbers.includes(droppedNum) && mode4Numbers.includes(targetNum)) {
                return isAllowedToAdd(droppedNum, targetNum, mode4Numbers.length);
            }
            
            // Quick check: are both elements in Mode 1?
            if (mode1Numbers.includes(droppedNum) && mode1Numbers.includes(targetNum)) {
                const draggedIdx = mode1Numbers.indexOf(droppedNum);
                const targetIdx = mode1Numbers.indexOf(targetNum);
                
                // Basic check: can only drag non-first numbers onto the first number
                if (!(draggedIdx > 0 && targetIdx === 0)) return false;
                
                // Additional restriction: only allow multiples of 10 or single digits to be dragged
                const isMultipleOf10 = droppedNum % 10 === 0 && droppedNum >= 10;
                const isSingleDigit = droppedNum >= 1 && droppedNum <= 9;
                
                return isMultipleOf10 || isSingleDigit;
            }
            
            return false;
        },
        ondragenter: function(event) {
            // Add visual feedback when dragging over valid target
            event.target.classList.add('drag-target');
        },
        ondragleave: function(event) {
            // Remove visual feedback when dragging away
            event.target.classList.remove('drag-target');
        },
        ondrop: function(event) {
            // Remove visual feedback on drop
            event.target.classList.remove('drag-target');
            droppedFlag = true;
            
            const droppedNum = parseInt(event.relatedTarget.querySelector('.number-value').textContent);
            const targetNum = parseInt(event.target.querySelector('.number-value').textContent);
            if (event.relatedTarget !== event.target) {
                
                // Determine which mode we're in
                if (event.target.closest('#mode4-equation')) {
                    const droppedIdx = mode4Numbers.indexOf(droppedNum);
                    let targetIdx = mode4Numbers.indexOf(targetNum);
                    
                    if (droppedNum === targetNum && droppedIdx === targetIdx) {
                        targetIdx = mode4Numbers.indexOf(targetNum, droppedIdx + 1);
                    }
                    
                    if (droppedIdx < targetIdx) {
                        currentModalMode = 'mode4';
                        showModal(droppedNum, targetNum, 'numpad');
                    } else {
                        currentModalMode = 'mode4';
                        showModal(targetNum, droppedNum, 'numpad');
                    }
                } else if (event.target.closest('#mode1-equation')) {
                    const droppedIdx = mode1Numbers.indexOf(droppedNum);
                    let targetIdx = mode1Numbers.indexOf(targetNum);
                    
                    if (droppedNum === targetNum && droppedIdx === targetIdx) {
                        targetIdx = mode1Numbers.indexOf(targetNum, droppedIdx + 1);
                    }
                    
                    if (droppedIdx < targetIdx) {
                        currentModalMode = 'mode1';
                        showModal(droppedNum, targetNum, 'numberboard');
                    } else {
                        currentModalMode = 'mode1';
                        showModal(targetNum, droppedNum, 'numberboard');
                    }
                }
            }
        }
    });
}

function isAllowedToAdd(a, b, currentLength) {
    const isMult10 = (n) => n % 10 === 0 && n >= 10;
    const isSingle = (n) => n >= 1 && n <= 9;
    const isDoubleDigit = (n) => n >= 10 && n % 10 !== 0;
    
    // Tens can combine with tens
    if (isMult10(a) && isMult10(b)) return true;
    
    // Ones can combine with ones
    if (isSingle(a) && isSingle(b)) return true;
    
    // Only when down to 2 numbers total, allow these combinations:
    if (currentLength === 2) {
        // Tens + double-digit numbers (like 70 + 13)
        if ((isMult10(a) && isDoubleDigit(b)) || (isDoubleDigit(a) && isMult10(b))) return true;
        
        // Tens + ones (like 70 + 3)
        if ((isMult10(a) && isSingle(b)) || (isMult10(b) && isSingle(a))) return true;
    }
    
    return false;
}


// === MODAL HANDLING ===
function showModal(a, b, modalType) {
    renderModalEquation(a, b);
    answerInput.value = '';
    errorMsg.classList.add('hidden');
    modal.classList.remove('hidden');
    
    if (modalType === 'numpad') {
        numpad.classList.remove('hidden');
        numberboard.classList.add('hidden');
        equalsSign.style.display = 'block';
        answerInput.style.display = 'block';
    } else {
        numpad.classList.add('hidden');
        numberboard.classList.remove('hidden');
        equalsSign.style.display = 'none';
        answerInput.style.display = 'none';
        // Show only the first number highlighted, not the complete answer
        showFirstNumberOnly(a);
    }
}

function renderModalEquation(a, b) {
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
        
        const valueDiv = document.createElement('div');
        valueDiv.className = 'number-value';
        valueDiv.textContent = num;
        circle.appendChild(valueDiv);
        
        modalEquationDiv.appendChild(circle);
    });
}

function handleNumpadSubmit() {
    const userAnswer = parseInt(answerInput.value);
    const modalNumbers = Array.from(modalEquationDiv.querySelectorAll('.number-value')).map(el => parseInt(el.textContent));
    const correctAnswer = modalNumbers.reduce((sum, num) => sum + num, 0);
    
    if (userAnswer === correctAnswer) {
        handleCorrectAnswer(modalNumbers[0], modalNumbers[1]);
    } else {
        errorMsg.classList.remove('hidden');
        setTimeout(() => errorMsg.classList.add('hidden'), 2000);
    }
}

function handleNumberboardTileClick(clickedNumber) {
    const modalNumbers = Array.from(modalEquationDiv.querySelectorAll('.number-value')).map(el => parseInt(el.textContent));
    const firstNumber = modalNumbers[0];
    const secondNumber = modalNumbers[1];
    const correctAnswer = firstNumber + secondNumber;
    
    if (clickedNumber === correctAnswer) {
        // Remove current-position from all tiles
        const allTiles = document.querySelectorAll('#modal-number-grid .number-tile');
        allTiles.forEach(tile => tile.classList.remove('current-position'));
        
        // Color the first number's tiles in yellow (first-addition)
        for (let i = 1; i <= firstNumber; i++) {
            const tile = document.querySelector(`#modal-number-grid [data-number="${i}"]`);
            if (tile) tile.classList.add('first-addition');
        }
        
        // Color the second number's tiles in purple (second-addition)
        for (let i = firstNumber + 1; i <= correctAnswer; i++) {
            const tile = document.querySelector(`#modal-number-grid [data-number="${i}"]`);
            if (tile) tile.classList.add('second-addition');
        }
        
        // Add current-position to the clicked tile (make it bold and larger)
        const clickedTile = document.querySelector(`#modal-number-grid [data-number="${clickedNumber}"]`);
        if (clickedTile) clickedTile.classList.add('current-position');
        
        setTimeout(() => {
            handleCorrectAnswer(modalNumbers[0], modalNumbers[1]);
        }, 500);
    } else {
        errorMsg.textContent = 'Try again!';
        errorMsg.classList.remove('hidden');
        setTimeout(() => errorMsg.classList.add('hidden'), 2000);
    }
}

function clearModalTileColoring() {
    const tiles = document.querySelectorAll('#modal-number-grid .number-tile');
    tiles.forEach(tile => {
        tile.classList.remove('starting-blocks', 'first-addition', 'second-addition', 'current-position');
    });
}

function showFirstNumberOnly(a) {
    // Clear all coloring first
    clearModalTileColoring();
    
    // Show the first number highlighted in light blue
    for (let i = 1; i <= a; i++) {
        const tile = document.querySelector(`#modal-number-grid [data-number="${i}"]`);
        if (tile) tile.classList.add('first-addition');
    }
    
    // Mark the last tile (a) as current position (bold and larger)
    const currentTile = document.querySelector(`#modal-number-grid [data-number="${a}"]`);
    if (currentTile) currentTile.classList.add('current-position');
}

function updateModalTileColoring(a, b) {
    const tiles = document.querySelectorAll('#modal-number-grid .number-tile');
    tiles.forEach(tile => {
        tile.classList.remove('starting-blocks', 'first-addition', 'second-addition', 'current-position');
    });
    
    // Show starting blocks for first number
    for (let i = 1; i <= a; i++) {
        const tile = document.querySelector(`#modal-number-grid [data-number="${i}"]`);
        if (tile) tile.classList.add('first-addition');
    }
    
    // Show second addition
    for (let i = a + 1; i <= a + b; i++) {
        const tile = document.querySelector(`#modal-number-grid [data-number="${i}"]`);
        if (tile) tile.classList.add('second-addition');
    }
}

function handleCorrectAnswer(a, b) {
    const sum = a + b;
    
    if (currentModalMode === 'mode4') {
        // Update mode4 numbers
        const idxA = mode4Numbers.indexOf(a);
        let idxB = mode4Numbers.indexOf(b);
        if (a === b && idxA === idxB) {
            idxB = mode4Numbers.indexOf(b, idxA + 1);
        }
        
        if (idxA !== -1 && idxB !== -1) {
            const minIdx = Math.min(idxA, idxB);
            const maxIdx = Math.max(idxA, idxB);
            mode4Numbers.splice(maxIdx, 1);
            mode4Numbers.splice(minIdx, 1, sum);
            renderMode4();
            
            if (mode4Numbers.length === 1) {
                mode4Complete = true;
                
                // Add green checkmark to Mode 4
                addGreenCheckmark('mode4-equation');
                
                // Enable Mode 1 now that Mode 4 is complete
                mode1EquationDiv.closest('.mode-section').classList.remove('disabled');
                removeDisabledOverlay('mode1');
                
                // Disable Mode 4 now that student should focus on Mode 1
                mode4EquationDiv.closest('.mode-section').classList.add('disabled');
                addDisabledOverlay('mode4');
                
                // Move arrow to Mode 1 (bottom section)
                addActiveArrow('mode1');
                
                checkBothComplete();
            }
        }
    } else {
        // Update mode1 numbers
        const idxA = mode1Numbers.indexOf(a);
        let idxB = mode1Numbers.indexOf(b);
        if (a === b && idxA === idxB) {
            idxB = mode1Numbers.indexOf(b, idxA + 1);
        }
        
        if (idxA !== -1 && idxB !== -1) {
            const minIdx = Math.min(idxA, idxB);
            const maxIdx = Math.max(idxA, idxB);
            mode1Numbers.splice(maxIdx, 1);
            mode1Numbers.splice(minIdx, 1, sum);
            renderMode1();
            
            if (mode1Numbers.length === 1) {
                mode1Complete = true;
                
                // Add green checkmark to Mode 1
                addGreenCheckmark('mode1-equation');
                
                // Disable Mode 1 now that it's complete
                mode1EquationDiv.closest('.mode-section').classList.add('disabled');
                addDisabledOverlay('mode1');
                
                // Show confetti burst
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
                
                // Remove arrow since both modes are complete
                removeActiveArrow();
                
                swapBtn.classList.add('hidden');
                checkBothComplete();
            }
        }
    }
    
    modal.classList.add('hidden');
}

function checkBothComplete() {
    if (mode4Complete && mode1Complete) {
        gamesCompleted++;
        gamesCompletedDisplay.textContent = gamesCompleted;
        nextGameBtn.classList.remove('hidden');
    }
}

// === UTILITY FUNCTIONS ===
function addGreenCheckmark(equationId) {
    const equationDiv = document.getElementById(equationId);
    const modeSection = equationDiv.closest('.mode-section');
    const existingCheckmark = modeSection.querySelector('.green-checkmark');
    
    // Don't add if already exists
    if (existingCheckmark) return;
    
    const checkmark = document.createElement('div');
    checkmark.className = 'green-checkmark';
    checkmark.innerHTML = '✓';
    modeSection.appendChild(checkmark);
}

function addDisabledOverlay(modeId) {
    const equationDiv = document.getElementById(modeId + '-equation');
    const modeSection = equationDiv.closest('.mode-section');
    
    // Don't add if already exists
    if (modeSection.querySelector('.disabled-overlay')) return;
    
    const overlay = document.createElement('div');
    overlay.className = 'disabled-overlay';
    modeSection.appendChild(overlay);
}

function removeDisabledOverlay(modeId) {
    const equationDiv = document.getElementById(modeId + '-equation');
    const modeSection = equationDiv.closest('.mode-section');
    const overlay = modeSection.querySelector('.disabled-overlay');
    
    if (overlay) {
        overlay.remove();
    }
}

function removeAllCheckmarks() {
    // Remove all existing checkmarks from both mode sections
    const checkmarks = document.querySelectorAll('.green-checkmark');
    checkmarks.forEach(checkmark => checkmark.remove());
}

function addActiveArrow(modeId) {
    // Remove any existing arrows first
    removeActiveArrow();
    
    const equationDiv = document.getElementById(modeId + '-equation');
    const modeSection = equationDiv.closest('.mode-section');
    
    const arrow = document.createElement('div');
    arrow.className = 'active-arrow';
    modeSection.appendChild(arrow);
}

function removeActiveArrow() {
    const arrows = document.querySelectorAll('.active-arrow');
    arrows.forEach(arrow => arrow.remove());
}

function handleSwapNumbers() {
    if (mode1Numbers.length >= 2) {
        [mode1Numbers[0], mode1Numbers[1]] = [mode1Numbers[1], mode1Numbers[0]];
        renderMode1();
        showOriginalEquation(); // Update original equation display
    }
}

function resetPosition(element) {
    element.style.transform = 'translate(0px, 0px)';
    element.setAttribute('data-x', 0);
    element.setAttribute('data-y', 0);
}

function showOriginalEquation() {
    originalEquationDisplay.innerHTML = '';
    
    const [a, b] = currentProblem;
    
    const circle1 = document.createElement('div');
    circle1.className = 'number-circle';
    circle1.textContent = a;
    originalEquationDisplay.appendChild(circle1);
    
    const plus = document.createElement('div');
    plus.className = 'plus';
    plus.textContent = '+';
    originalEquationDisplay.appendChild(plus);
    
    const circle2 = document.createElement('div');
    circle2.className = 'number-circle';
    circle2.textContent = b;
    originalEquationDisplay.appendChild(circle2);
    
    originalEquationDisplay.classList.remove('hidden');
}

function setupZoomPrevention() {
    document.addEventListener('touchstart', function(event) {
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    }, { passive: false });
    
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        if (event.target.closest('#modal')) return;
        
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
}
