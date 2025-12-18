// Visual Subtraction Game
// Combines equation display with number grid for interactive subtraction learning

document.addEventListener('DOMContentLoaded', function() {
    // === ZOOM PREVENTION CODE ===
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
    
    let lastTap = 0;
    document.addEventListener('touchstart', function(event) {
        // Skip prevention for modal buttons
        if (event.target.closest('#modal')) {
            return;
        }
        
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 500 && tapLength > 0) {
            event.preventDefault();
        }
        lastTap = currentTime;
    }, { passive: false });

    // === GAME VARIABLES ===
    let currentNumbers = []; // [minuend, subtrahend] or [minuend, tens, ones] after splitting
    let originalMinuend = 0; // Store original minuend for grid highlighting
    let problemsCompleted = 0;
    let gameActive = false;
    let gameComplete = false;
    let currentStepIndex = 0; // Which subtraction step we're on
    let droppedFlag = false;
    let subtractionHistory = []; // Track each subtraction step for grid highlighting

    // DOM elements
    let numberGrid;
    let equationDisplay;
    let problemsCompletedDisplay;
    let nextGameBtn;
    let modal;
    let answerInput;
    let errorMsg;
    let confettiContainer;

    // Initialize the game when the page loads
    initializeGame();

    function initializeGame() {
        // Get DOM elements
        numberGrid = document.getElementById('number-grid');
        equationDisplay = document.getElementById('equation-display');
        problemsCompletedDisplay = document.getElementById('problems-completed');
        nextGameBtn = document.getElementById('next-game-btn');
        modal = document.getElementById('modal');
        answerInput = document.getElementById('answer-input');
        errorMsg = document.getElementById('error-msg');
        confettiContainer = document.getElementById('confetti-container');
        
        // Create the number grid
        createNumberGrid();
        
        // Set up event listeners
        nextGameBtn.addEventListener('click', startNewProblem);
        
        // Start the first problem
        startNewProblem();
    }

    // === PROBLEM GENERATION ===
    function generateSubtractionProblem() {
        let minuend, subtrahend;
        
        // Generate problems where subtrahend is at most 63% of minuend
        // This encourages decomposition strategy rather than counting up
        do {
            minuend = Math.floor(Math.random() * 89) + 11; // 11-99
            // Subtrahend should be at most 63% of minuend, but at least 11
            const maxSubtrahend = Math.floor(minuend * 0.63);
            const minSubtrahend = Math.max(11, Math.floor(minuend * 0.2)); // At least 20% to ensure meaningful subtraction
            subtrahend = Math.floor(Math.random() * (maxSubtrahend - minSubtrahend + 1)) + minSubtrahend;
        } while (subtrahend >= minuend || minuend - subtrahend <= 0 || subtrahend > 99);
        
        return [minuend, subtrahend];
    }

    function createNumberGrid() {
        numberGrid.innerHTML = '';
        
        // Create tiles for numbers 1-100
        for (let i = 1; i <= 100; i++) {
            const tile = document.createElement('div');
            tile.className = 'number-tile';
            tile.textContent = i;
            tile.dataset.number = i;
            
            numberGrid.appendChild(tile);
        }
    }

    function startNewProblem() {
        // Generate new problem
        [originalMinuend, currentNumbers[1]] = generateSubtractionProblem();
        currentNumbers = [originalMinuend, currentNumbers[1]];
        
        // Update original equation display
        const originalEquationDiv = document.getElementById('original-equation');
        originalEquationDiv.textContent = `${originalMinuend} − ${currentNumbers[1]} = __`;
        
        // Reset game state
        gameActive = false; // Will be enabled after splitting (if needed) or immediately
        gameComplete = false;
        currentStepIndex = 0;
        subtractionHistory = []; // Reset subtraction history
        
        // Hide next game button
        nextGameBtn.classList.add('hidden');
        
        // Clear confetti
        confettiContainer.classList.add('hidden');
        confettiContainer.innerHTML = '';
        
        // Reset all tiles
        document.querySelectorAll('.number-tile').forEach(tile => {
            tile.classList.remove('minuend-range', 'subtracted-range', 'previous-subtracted', 'current-result', 'current-position', 'incorrect');
        });
        
        // Render initial equation
        renderEquation();
        
        // Set up initial board state
        updateGridHighlighting();
        
        // If no splitting is needed, enable game immediately
        if (!needsSplitting()) {
            gameActive = true;
            currentStepIndex = 1; // Ready for first subtraction
            renderEquation(); // Update to show draggable state
        } else {
            // If splitting is needed, disable dragging until split
            gameActive = false;
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

    // === EQUATION RENDERING ===
    function renderEquation() {
        equationDisplay.innerHTML = '';
        
        // If game is complete, just show the final result
        if (gameComplete) {
            const circle = document.createElement('div');
            circle.className = 'number-circle blue';
            circle.dataset.value = currentNumbers[0];
            
            const valueDiv = document.createElement('div');
            valueDiv.className = 'number-value';
            valueDiv.textContent = currentNumbers[0];
            circle.appendChild(valueDiv);
            
            equationDisplay.appendChild(circle);
            return;
        }
        
        currentNumbers.forEach((num, idx) => {
            if (idx > 0) {
                const minus = document.createElement('div');
                minus.className = 'minus';
                minus.textContent = '−';
                equationDisplay.appendChild(minus);
            }
            
            const circle = document.createElement('div');
            circle.className = 'number-circle';
            circle.dataset.value = num;
            
            // Style based on position and game state
            if (idx === 0) {
                // First number (minuend) is always gray (non-draggable)
                circle.classList.add('grayed');
            } else if (needsSplitting() && idx === 1 && currentNumbers.length === 2) {
                // Second number is splittable if not yet split
                circle.classList.add('splittable');
            } else {
                // Split numbers are draggable
                circle.classList.add('blue');
            }
            
            const valueDiv = document.createElement('div');
            valueDiv.className = 'number-value';
            valueDiv.textContent = num;
            circle.appendChild(valueDiv);
            
            // Add double-click handler for splittable numbers
            if (idx === 1 && needsSplitting() && currentNumbers.length === 2) {
                circle.addEventListener('dblclick', handleSplitNumber);
                circle.addEventListener('touchstart', handleDoubleTap);
            }
            
            equationDisplay.appendChild(circle);
        });
        
        // Always set up dragging, but dropzone availability depends on game state
        makeDraggable();
    }

    // === SPLITTING FUNCTIONALITY ===
    function handleSplitNumber(event) {
        event.preventDefault();
        if (currentNumbers.length !== 2) return;
        
        const secondNum = currentNumbers[1];
        const tens = Math.floor(secondNum / 10) * 10;
        const ones = secondNum % 10;
        
        if (tens > 0 && ones > 0) {
            // Split the number
            currentNumbers = [currentNumbers[0], tens, ones];
            
            // Enable game and set step index
            gameActive = true;
            currentStepIndex = 1;
            
            renderEquation();
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

    // === DRAG AND DROP FUNCTIONALITY ===
    function makeDraggable() {
        // Make draggable numbers (not the grayed minuend)
        interact('.number-circle:not(.grayed)')
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

        // Make minuend (grayed circle) a dropzone only if game is active
        if (gameActive) {
            interact('.number-circle.grayed').dropzone({
                accept: '.number-circle:not(.grayed)',
                overlap: 'pointer',
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
                    
                    // Show modal for subtraction
                    showSubtractionModal(targetNum, droppedNum);
                    resetPosition(event.relatedTarget);
                }
            });
        }
    }

    function resetPosition(element) {
        element.style.transform = 'translate(0px, 0px)';
        element.setAttribute('data-x', 0);
        element.setAttribute('data-y', 0);
    }

    // === MODAL FUNCTIONALITY ===
    function showSubtractionModal(minuend, subtrahend) {
        renderModalEquation(minuend, subtrahend);
        answerInput.value = '';
        errorMsg.classList.add('hidden');
        modal.classList.remove('hidden');
        
        setupModalEventListeners(minuend - subtrahend, minuend, subtrahend);
    }

    function renderModalEquation(minuend, subtrahend) {
        const modalEquationDiv = document.getElementById('modal-equation');
        modalEquationDiv.innerHTML = '';
        
        [minuend, subtrahend].forEach((num, idx) => {
            if (idx > 0) {
                const minus = document.createElement('div');
                minus.className = 'minus';
                minus.textContent = '−';
                modalEquationDiv.appendChild(minus);
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

    function setupModalEventListeners(expectedAnswer, minuend, subtrahend) {
        // Set up numpad buttons
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                answerInput.value += btn.textContent;
            };
        });
        
        // Set up backspace
        document.getElementById('backspace').onclick = (e) => {
            e.preventDefault();
            answerInput.value = answerInput.value.slice(0, -1);
        };
        
        // Set up cancel
        document.getElementById('cancel').onclick = (e) => {
            e.preventDefault();
            modal.classList.add('hidden');
        };
        
        // Set up submit
        document.getElementById('submit').onclick = (e) => {
            e.preventDefault();
            const answer = parseInt(answerInput.value);
            
            if (isNaN(answer) || answer !== expectedAnswer) {
                errorMsg.classList.remove('hidden');
            } else {
                // Correct answer - update the equation and game state
                handleCorrectSubtraction(minuend, subtrahend, expectedAnswer);
                modal.classList.add('hidden');
            }
        };
    }

    function handleCorrectSubtraction(minuend, subtrahend, result) {
        // Record this subtraction step in history
        subtractionHistory.push({
            from: minuend,
            subtracted: subtrahend,
            to: result
        });
        
        // Remove the subtrahend from currentNumbers and update minuend
        const subtrahendIdx = currentNumbers.findIndex(num => num === subtrahend);
        if (subtrahendIdx !== -1) {
            currentNumbers.splice(subtrahendIdx, 1); // Remove subtrahend
            currentNumbers[0] = result; // Update minuend to result
        }
        
        // Move to next step
        currentStepIndex++;
        
        // Update grid highlighting
        updateGridHighlighting();
        
        // Check if game is complete
        if (currentNumbers.length === 1) {
            completeGame();
        } else {
            // Re-render equation for next step
            renderEquation();
        }
    }

    // === GRID HIGHLIGHTING ===
    function updateGridHighlighting() {
        // Clear all previous highlighting and X overlays
        document.querySelectorAll('.number-tile').forEach(tile => {
            tile.classList.remove('minuend-range', 'subtracted-range', 'previous-subtracted', 'current-result', 'current-position');
            // Remove any existing X overlays
            const existingX = tile.querySelector('.subtracted-x');
            if (existingX) {
                tile.removeChild(existingX);
            }
        });
        
        if (currentNumbers.length === 0) return;
        
        const currentMinuend = currentNumbers[0];
        
        // Highlight current result position with thick border
        const resultTile = document.querySelector(`[data-number="${currentMinuend}"]`);
        if (resultTile) {
            resultTile.classList.add('current-result');
        }
        
        // Highlight remaining minuend range (1 to current result)
        for (let i = 1; i <= currentMinuend; i++) {
            const tile = document.querySelector(`[data-number="${i}"]`);
            if (tile && i !== currentMinuend) { // Don't double-apply to result tile
                tile.classList.add('minuend-range');
            }
        }
        
        // Handle step-by-step subtraction highlighting
        if (subtractionHistory.length > 0) {
            // Show previous steps as light gray with X overlay
            for (let i = 0; i < subtractionHistory.length - 1; i++) {
                const step = subtractionHistory[i];
                for (let j = step.to + 1; j <= step.from; j++) {
                    const tile = document.querySelector(`[data-number="${j}"]`);
                    if (tile) {
                        tile.classList.remove('minuend-range'); // Remove light blue
                        tile.classList.add('previous-subtracted'); // Add light gray
                        
                        // Add X overlay
                        const xOverlay = document.createElement('div');
                        xOverlay.className = 'subtracted-x';
                        xOverlay.textContent = '✗';
                        tile.appendChild(xOverlay);
                    }
                }
            }
            
            // Show current step as dark gray with X overlay (only the most recent subtraction)
            const currentStep = subtractionHistory[subtractionHistory.length - 1];
            for (let j = currentStep.to + 1; j <= currentStep.from; j++) {
                const tile = document.querySelector(`[data-number="${j}"]`);
                if (tile) {
                    tile.classList.remove('minuend-range', 'previous-subtracted'); // Remove other colors
                    tile.classList.add('subtracted-range'); // Add dark gray
                    
                    // Add X overlay
                    const xOverlay = document.createElement('div');
                    xOverlay.className = 'subtracted-x';
                    xOverlay.textContent = '✗';
                    tile.appendChild(xOverlay);
                }
            }
        }
    }

    function completeGame() {
        gameActive = false;
        gameComplete = true;
        
        // Update original equation to show the answer
        const originalEquationDiv = document.getElementById('original-equation');
        const originalSubtrahend = subtractionHistory.reduce((sum, step) => sum + step.subtracted, 0);
        originalEquationDiv.textContent = `${originalMinuend} − ${originalSubtrahend} = ${currentNumbers[0]}`;
        
        // Update grid highlighting with final state
        updateGridHighlighting();
        
        // Re-render equation to show just the result
        renderEquation();
        
        // Increment problems completed counter
        problemsCompleted++;
        problemsCompletedDisplay.textContent = problemsCompleted;
        
        // Show confetti
        showConfetti();
        
        // Show next game button
        setTimeout(() => {
            nextGameBtn.classList.remove('hidden');
        }, 1000);
    }

    // === CONFETTI ANIMATION ===
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

    // Prevent zooming on double tap for better touch experience
    document.addEventListener('touchstart', function(event) {
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    });

    let lastTouchEndTime = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEndTime <= 300) {
            event.preventDefault();
        }
        lastTouchEndTime = now;
    }, false);
});
