// Dual Mode Addition Game
// Shows both numberboard and flexible combining methods side by side

// Game state
let currentProblem = null; // [a, b] - the current problem
let gamesCompleted = 0;

// Numberboard state
let numberboardNumbers = []; // Current numbers for numberboard method
let numberboardGameActive = false;
let numberboardGameComplete = false;
let numberboardStepIndex = 0;

// Flexible method state
let flexibleNumbers = []; // Current numbers for flexible method
let flexibleGameComplete = false;
let droppedFlag = false;

// DOM elements
let numberboardEquationDisplay, flexibleEquationDiv, modal, answerInput, errorMsg, nextGameBtn;
let gamesCompletedDisplay, numberboardNumberGrid, originalEquationDisplay;
let numberboardConfettiContainer, flexibleConfettiContainer;

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
});

function initializeGame() {
    // Get DOM elements
    numberboardEquationDisplay = document.getElementById('numberboard-equation-display');
    flexibleEquationDiv = document.getElementById('flexible-equation');
    modal = document.getElementById('modal');
    answerInput = document.getElementById('answer-input');
    errorMsg = document.getElementById('error-msg');
    nextGameBtn = document.getElementById('next-game-btn');
    gamesCompletedDisplay = document.getElementById('games-completed');
    numberboardNumberGrid = document.getElementById('numberboard-number-grid');
    originalEquationDisplay = document.getElementById('original-equation-display');
    numberboardConfettiContainer = document.getElementById('numberboard-confetti-container');
    flexibleConfettiContainer = document.getElementById('flexible-confetti-container');
    
    // Create the number grids
    createNumberboardGrid();
    
    // Set up event listeners
    nextGameBtn.addEventListener('click', startNewProblem);
    
    // Prevent zooming on double tap
    setupZoomPrevention();
    
    // Start the first problem
    startNewProblem();
}

function createNumberboardGrid() {
    numberboardNumberGrid.innerHTML = '';
    for (let i = 1; i <= 100; i++) {
        const tile = document.createElement('div');
        tile.className = 'number-tile';
        tile.textContent = i;
        tile.dataset.number = i;
        tile.addEventListener('click', () => handleNumberboardTileClick(i));
        numberboardNumberGrid.appendChild(tile);
    }
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
    numberboardNumbers = [...currentProblem];
    flexibleNumbers = [...currentProblem];
    numberboardGameActive = true;
    numberboardGameComplete = false;
    flexibleGameComplete = false;
    numberboardStepIndex = 0;
    droppedFlag = false;
    
    // Show the original equation
    showOriginalEquation();
    
    // Start both methods
    startNumberboardMethod();
    startFlexibleMethod();
    
    // Hide next game button and modal
    nextGameBtn.classList.add('hidden');
    modal.classList.add('hidden');
    
    // Clear confetti
    numberboardConfettiContainer.classList.add('hidden');
    flexibleConfettiContainer.classList.add('hidden');
}

function startNumberboardMethod() {
    renderNumberboardEquation();
    updateNumberboardTileColoring();
}

function startFlexibleMethod() {
    renderFlexibleEquation();
    makeFlexibleDraggable();
}

// === NUMBERBOARD METHOD ===
function renderNumberboardEquation() {
    numberboardEquationDisplay.innerHTML = '';
    
    numberboardNumbers.forEach((num, idx) => {
        if (idx > 0) {
            const plus = document.createElement('div');
            plus.className = 'plus';
            plus.textContent = '+';
            numberboardEquationDisplay.appendChild(plus);
        }
        
        const circle = document.createElement('div');
        circle.className = 'number-circle';
        
        const valueDiv = document.createElement('div');
        valueDiv.className = 'number-value';
        valueDiv.textContent = num;
        circle.appendChild(valueDiv);
        
        numberboardEquationDisplay.appendChild(circle);
    });
}

function updateNumberboardTileColoring() {
    // Clear all previous coloring
    numberboardNumberGrid.querySelectorAll('.number-tile').forEach(tile => {
        tile.classList.remove('starting-blocks', 'first-addition', 'second-addition', 'current-position');
    });
    
    if (numberboardNumbers.length >= 1) {
        // Highlight current position (always the first number)
        const currentTile = numberboardNumberGrid.querySelector(`[data-number="${numberboardNumbers[0]}"]`);
        if (currentTile) {
            currentTile.classList.add('current-position');
        }
        
        // Color tiles based on step
        if (numberboardStepIndex === 0) {
            // Initial state - show starting blocks for first number
            for (let i = 1; i <= numberboardNumbers[0]; i++) {
                const tile = numberboardNumberGrid.querySelector(`[data-number="${i}"]`);
                if (tile) {
                    tile.classList.add('starting-blocks');
                }
            }
        } else {
            // After clicking - show the addition
            const [a, b] = currentProblem;
            
            // Show starting blocks (first number)
            for (let i = 1; i <= a; i++) {
                const tile = numberboardNumberGrid.querySelector(`[data-number="${i}"]`);
                if (tile) {
                    tile.classList.add('first-addition');
                }
            }
            
            // Show second addition
            for (let i = a + 1; i <= a + b; i++) {
                const tile = numberboardNumberGrid.querySelector(`[data-number="${i}"]`);
                if (tile) {
                    tile.classList.add('second-addition');
                }
            }
        }
    }
}

function handleNumberboardTileClick(clickedNumber) {
    if (!numberboardGameActive || numberboardGameComplete) return;
    
    const [a, b] = currentProblem;
    const correctAnswer = a + b;
    
    if (clickedNumber === correctAnswer) {
        handleNumberboardCorrectAnswer();
    }
}

function handleNumberboardCorrectAnswer() {
    numberboardGameComplete = true;
    numberboardGameActive = false;
    numberboardStepIndex = 1;
    
    // Combine numbers and update display
    const [a, b] = currentProblem;
    numberboardNumbers = [a + b];
    
    renderNumberboardEquation();
    updateNumberboardTileColoring();
    
    // Show confetti
    showNumberboardConfetti();
    
    // Check if both methods are complete
    checkIfBothComplete();
}

// === FLEXIBLE METHOD ===
function renderFlexibleEquation() {
    flexibleEquationDiv.innerHTML = '';
    
    flexibleNumbers.forEach((num, idx) => {
        if (idx > 0) {
            const plus = document.createElement('div');
            plus.className = 'plus';
            plus.textContent = '+';
            flexibleEquationDiv.appendChild(plus);
        }
        
        const circle = document.createElement('div');
        circle.className = 'number-circle';
        circle.dataset.value = num;

        const valueDiv = document.createElement('div');
        valueDiv.className = 'number-value';
        valueDiv.textContent = num;
        circle.appendChild(valueDiv);

        flexibleEquationDiv.appendChild(circle);
    });
}

function isAllowedToAdd(a, b, currentLength) {
    const isMult10 = (n) => n % 10 === 0 && n >= 10;
    const isSingle = (n) => n >= 1 && n <= 9;
    
    // Tens can combine with tens
    if (isMult10(a) && isMult10(b)) return true;
    
    // Ones can combine with ones
    if (isSingle(a) && isSingle(b)) return true;
    
    // Tens can combine with ones only when there are no more splits possible (length = 2)
    if (currentLength === 2 && ((isMult10(a) && isSingle(b)) || (isMult10(b) && isSingle(a)))) return true;
    
    return false;
}

function makeFlexibleDraggable() {
    // Clear any existing interact bindings
    interact('.number-circle').unset();
    
    // Add a small delay to ensure DOM is ready
    setTimeout(() => {
        const circles = flexibleEquationDiv.querySelectorAll('.number-circle');
        
        // Make all numbers draggable
        interact('#flexible-equation .number-circle')
            .draggable({
                inertia: false,
                autoScroll: false,
                listeners: {
                    start(event) {
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
                    end: function(event) {
                        event.target.style.transform = '';
                        event.target.style.zIndex = '';
                        event.target.classList.remove('dragging');
                        
                        // Reset position if not dropped on a valid target
                        if (!droppedFlag) {
                            resetPosition(event.target);
                        }
                        droppedFlag = false;
                    }
                }
            });

        // Handle double-click for splitting numbers
        circles.forEach((circle) => {
            // Remove any existing listeners first
            circle.removeEventListener('dblclick', circle._dblClickHandler);
            
            // Create and store the handler
            circle._dblClickHandler = function(event) {
                event.preventDefault();
                event.stopPropagation();
                
                const num = parseInt(this.querySelector('.number-value').textContent);
                const idx = flexibleNumbers.indexOf(num);
                if (idx !== -1) {
                    const tens = Math.floor(num / 10) * 10;
                    const ones = num % 10;
                    if (tens > 0 && ones > 0) {
                        flexibleNumbers.splice(idx, 1, tens, ones);
                        renderFlexibleEquation();
                        makeFlexibleDraggable();
                    }
                }
            };
            
            circle.addEventListener('dblclick', circle._dblClickHandler);
        });

        // Make numbers dropzones for other numbers with flexible combining rules
        interact('#flexible-equation .number-circle').dropzone({
            accept: '#flexible-equation .number-circle',
            overlap: 'pointer',
            checker: function(dragEvent, event, dropped, dropzone, dropElement, draggable, draggableElement) {
                if (!dropped) return false;
                
                const droppedNum = parseInt(draggableElement.querySelector('.number-value').textContent);
                const targetNum = parseInt(dropElement.querySelector('.number-value').textContent);
                return isAllowedToAdd(droppedNum, targetNum, flexibleNumbers.length);
            },
            listeners: {
                drop: function(event) {
                    const draggableElement = event.relatedTarget;
                    const dropzoneElement = event.target;
                    
                    const droppedNum = parseInt(draggableElement.querySelector('.number-value').textContent);
                    const targetNum = parseInt(dropzoneElement.querySelector('.number-value').textContent);
                    
                    if (isAllowedToAdd(droppedNum, targetNum, flexibleNumbers.length)) {
                        showPopup(droppedNum, targetNum);
                        droppedFlag = true;
                    }
                }
            }
        });
    }, 100);
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
    
    setupNumpadModal(a, b);
    
    document.getElementById('cancel').onclick = () => {
        modal.classList.add('hidden');
    };
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
        
        const valueDiv = document.createElement('div');
        valueDiv.className = 'number-value';
        valueDiv.textContent = num;
        circle.appendChild(valueDiv);
        
        modalEquationDiv.appendChild(circle);
    });
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
        const userAnswer = parseInt(answerInput.value);
        const correctAnswer = a + b;
        
        if (userAnswer === correctAnswer) {
            handleCorrectFlexibleAnswer(a, b);
        } else {
            errorMsg.classList.remove('hidden');
            setTimeout(() => {
                errorMsg.classList.add('hidden');
            }, 2000);
        }
    };
}

function handleCorrectFlexibleAnswer(a, b) {
    const sum = a + b;
    const idxA = flexibleNumbers.indexOf(a);
    let idxB = flexibleNumbers.indexOf(b);
    
    if (a === b && idxA === idxB) {
        idxB = flexibleNumbers.indexOf(b, idxA + 1);
    }
    
    if (idxA !== -1 && idxB !== -1) {
        const minIdx = Math.min(idxA, idxB);
        const maxIdx = Math.max(idxA, idxB);
        flexibleNumbers.splice(maxIdx, 1);
        flexibleNumbers.splice(minIdx, 1, sum);
        renderFlexibleEquation();
        makeFlexibleDraggable();
    }
    modal.classList.add('hidden');
    
    // Check if flexible method is complete
    if (flexibleNumbers.length === 1) {
        flexibleGameComplete = true;
        showFlexibleConfetti();
        checkIfBothComplete();
    }
}

// === COMPLETION LOGIC ===
function checkIfBothComplete() {
    if (numberboardGameComplete && flexibleGameComplete) {
        gamesCompleted++;
        gamesCompletedDisplay.textContent = gamesCompleted;
        nextGameBtn.classList.remove('hidden');
    }
}

// === CONFETTI ANIMATIONS ===
function showNumberboardConfetti() {
    numberboardConfettiContainer.classList.remove('hidden');
    
    // Create confetti elements
    for (let i = 0; i < 20; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'absolute';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '0%';
        confetti.style.borderRadius = '50%';
        confetti.style.animation = `fall ${2 + Math.random() * 3}s linear forwards`;
        numberboardConfettiContainer.appendChild(confetti);
    }
    
    // Clean up confetti after animation
    setTimeout(() => {
        while (numberboardConfettiContainer.firstChild) {
            numberboardConfettiContainer.removeChild(numberboardConfettiContainer.firstChild);
        }
    }, 5000);
}

function showFlexibleConfetti() {
    flexibleConfettiContainer.classList.remove('hidden');
    
    // Create confetti elements
    for (let i = 0; i < 20; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'absolute';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '0%';
        confetti.style.borderRadius = '50%';
        confetti.style.animation = `fall ${2 + Math.random() * 3}s linear forwards`;
        flexibleConfettiContainer.appendChild(confetti);
    }
    
    // Clean up confetti after animation
    setTimeout(() => {
        while (flexibleConfettiContainer.firstChild) {
            flexibleConfettiContainer.removeChild(flexibleConfettiContainer.firstChild);
        }
    }, 5000);
}

// === UTILITY FUNCTIONS ===
function showOriginalEquation() {
    originalEquationDisplay.innerHTML = '';
    
    const [a, b] = currentProblem;
    
    // Create first number circle
    const circle1 = document.createElement('div');
    circle1.className = 'number-circle';
    circle1.textContent = a;
    originalEquationDisplay.appendChild(circle1);
    
    // Create plus sign
    const plus = document.createElement('div');
    plus.className = 'plus';
    plus.textContent = '+';
    originalEquationDisplay.appendChild(plus);
    
    // Create second number circle
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
        // Skip prevention for modal buttons
        if (event.target.closest('#modal')) {
            return;
        }
        
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
}

// Add CSS animation for confetti
const style = document.createElement('style');
style.textContent = `
    @keyframes fall {
        to {
            transform: translateY(500px) rotate(360deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
