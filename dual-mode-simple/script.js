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
function generateRandomBothDoubleDigitsNoMultiplesOfTen() {
    let a, b;
    do {
        a = Math.floor(Math.random() * 90) + 10; // 10-99
        b = Math.floor(Math.random() * 90) + 10; // 10-99
    } while (a % 10 === 0 || b % 10 === 0); // Ensure neither is multiple of 10
    
    return [a, b];
}

function startNewProblem() {
    // Generate new problem
    currentProblem = generateRandomBothDoubleDigitsNoMultiplesOfTen();
    
    // Reset states
    mode4Numbers = [...currentProblem];
    mode1Numbers = [...currentProblem];
    mode4Complete = false;
    mode1Complete = false;
    currentModalMode = null;
    droppedFlag = false;
    
    // Show original equation
    showOriginalEquation();
    
    // Show swap button for mode 1
    swapBtn.classList.remove('hidden');
    
    // Render both modes
    renderMode4();
    renderMode1();
    
    // Hide next game button and modal
    nextGameBtn.classList.add('hidden');
    modal.classList.add('hidden');
}

function renderMode4() {
    renderEquation(mode4EquationDiv, mode4Numbers, false); // No grayed first number
    makeMode4Draggable();
}

function renderMode1() {
    renderEquation(mode1EquationDiv, mode1Numbers, true); // Grayed first number
    makeMode1Draggable();
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
function makeMode4Draggable() {
    // Clear existing bindings
    interact('#mode4-equation .number-circle').unset();
    
    setTimeout(() => {
        // Make draggable
        interact('#mode4-equation .number-circle')
            .draggable({
                inertia: false,
                autoScroll: false,
                listeners: {
                    start(event) {
                        event.target.style.transform = 'scale(1.1)';
                        event.target.style.zIndex = '1000';
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
                        if (!droppedFlag) {
                            resetPosition(event.target);
                        }
                        droppedFlag = false;
                    }
                }
            });

        // Add double-click for splitting
        const circles = mode4EquationDiv.querySelectorAll('.number-circle');
        circles.forEach(circle => {
            circle.addEventListener('dblclick', function(event) {
                event.preventDefault();
                const num = parseInt(this.querySelector('.number-value').textContent);
                const idx = mode4Numbers.indexOf(num);
                if (idx !== -1) {
                    const tens = Math.floor(num / 10) * 10;
                    const ones = num % 10;
                    if (tens > 0 && ones > 0) {
                        mode4Numbers.splice(idx, 1, tens, ones);
                        renderMode4();
                    }
                }
            });
        });

        // Make dropzones
        interact('#mode4-equation .number-circle').dropzone({
            accept: '#mode4-equation .number-circle',
            overlap: 'pointer',
            checker: function(dragEvent, event, dropped, dropzone, dropElement, draggable, draggableElement) {
                if (!dropped) return false;
                const droppedNum = parseInt(draggableElement.querySelector('.number-value').textContent);
                const targetNum = parseInt(dropElement.querySelector('.number-value').textContent);
                return isAllowedToAdd(droppedNum, targetNum, mode4Numbers.length);
            },
            listeners: {
                drop: function(event) {
                    const draggableElement = event.relatedTarget;
                    const dropzoneElement = event.target;
                    const droppedNum = parseInt(draggableElement.querySelector('.number-value').textContent);
                    const targetNum = parseInt(dropzoneElement.querySelector('.number-value').textContent);
                    
                    if (isAllowedToAdd(droppedNum, targetNum, mode4Numbers.length)) {
                        currentModalMode = 'mode4';
                        showModal(droppedNum, targetNum, 'numpad');
                        droppedFlag = true;
                    }
                }
            }
        });
    }, 100);
}

function isAllowedToAdd(a, b, currentLength) {
    const isMult10 = (n) => n % 10 === 0 && n >= 10;
    const isSingle = (n) => n >= 1 && n <= 9;
    
    if (isMult10(a) && isMult10(b)) return true;
    if (isSingle(a) && isSingle(b)) return true;
    if (currentLength === 2 && ((isMult10(a) && isSingle(b)) || (isMult10(b) && isSingle(a)))) return true;
    
    return false;
}

// === MODE 1 (NUMBERBOARD MODAL) ===
function makeMode1Draggable() {
    // Clear existing bindings
    interact('#mode1-equation .number-circle').unset();
    
    setTimeout(() => {
        // Make draggable (except first number)
        interact('#mode1-equation .number-circle:not(:first-child)')
            .draggable({
                inertia: false,
                autoScroll: false,
                listeners: {
                    start(event) {
                        event.target.style.transform = 'scale(1.1)';
                        event.target.style.zIndex = '1000';
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
                        if (!droppedFlag) {
                            resetPosition(event.target);
                        }
                        droppedFlag = false;
                    }
                }
            });

        // Add double-click for splitting (except first number)
        const circles = mode1EquationDiv.querySelectorAll('.number-circle:not(:first-child)');
        circles.forEach(circle => {
            circle.addEventListener('dblclick', function(event) {
                event.preventDefault();
                const num = parseInt(this.querySelector('.number-value').textContent);
                const idx = mode1Numbers.indexOf(num);
                if (idx !== -1 && idx > 0) { // Don't split first number
                    const tens = Math.floor(num / 10) * 10;
                    const ones = num % 10;
                    if (tens > 0 && ones > 0) {
                        mode1Numbers.splice(idx, 1, tens, ones);
                        renderMode1();
                    }
                }
            });
        });

        // Make dropzones (can drop on any number)
        interact('#mode1-equation .number-circle').dropzone({
            accept: '#mode1-equation .number-circle:not(:first-child)',
            overlap: 'pointer',
            listeners: {
                drop: function(event) {
                    const draggableElement = event.relatedTarget;
                    const dropzoneElement = event.target;
                    const droppedNum = parseInt(draggableElement.querySelector('.number-value').textContent);
                    const targetNum = parseInt(dropzoneElement.querySelector('.number-value').textContent);
                    
                    currentModalMode = 'mode1';
                    showModal(droppedNum, targetNum, 'numberboard');
                    droppedFlag = true;
                }
            }
        });
    }, 100);
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
        updateModalTileColoring(a, b);
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
    const correctAnswer = modalNumbers.reduce((sum, num) => sum + num, 0);
    
    if (clickedNumber === correctAnswer) {
        setTimeout(() => {
            handleCorrectAnswer(modalNumbers[0], modalNumbers[1]);
        }, 500);
    }
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
function handleSwapNumbers() {
    if (mode1Numbers.length >= 2) {
        [mode1Numbers[0], mode1Numbers[1]] = [mode1Numbers[1], mode1Numbers[0]];
        renderMode1();
        showOriginalEquation(); // Update original equation display
    }
}

function resetPosition(element) {
    element.style.transform = '';
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
