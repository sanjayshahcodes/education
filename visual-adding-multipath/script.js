document.addEventListener('DOMContentLoaded', () => {
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
    
    document.addEventListener('focusin', function(event) {
        if (event.target.tagName === 'INPUT') {
            const viewport = document.querySelector('meta[name="viewport"]');
            const originalContent = viewport.content;
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            
            setTimeout(() => {
                viewport.content = originalContent;
            }, 500);
        }
    });

    // === GAME VARIABLES ===
    let currentNumbers = [];
    let droppedFlag = false;
    let problemCount = 0;
    let hasPerformedSplit = false; // Track if at least one split has been made
    
    // === MULTI-PATH TRACKING VARIABLES ===
    let currentProblem = []; // Store the original problem numbers
    let currentAttempt = 1; // Track which attempt (1 or 2)
    let maxAttempts = 2; // Number of attempts required per problem
    let solutionPaths = []; // Store all solution paths: [path1, path2]
    let currentPath = []; // Track current solution path steps
    let lastOperation = null; // Track last operation type for consolidation
    
    // Question format configuration - cycle through these combinations
    // Each array element is [show_blocks, allow_splitting, generator_function_name]
    let question_format = [
        [0, 1, "generateRandomBothDoubleDigits"]
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
        "generateDoublePlusDoubleWithCarry": generateDoublePlusDoubleWithCarry
    };
    
    // Function to get current settings based on problem count
    function getCurrentSettings() {
        const index = problemCount % question_format.length;
        const [show_blocks, allow_splitting, generator_name] = question_format[index];
        const generator = generatorFunctions[generator_name];
        return { show_blocks, allow_splitting, generator };
    }

    const equationDiv = document.getElementById('equation');
    const modal = document.getElementById('modal');
    const addEquation = document.getElementById('add-equation');
    const answerInput = document.getElementById('answer-input');
    const errorMsg = document.getElementById('error-msg');
    const nextBtn = document.getElementById('next-btn');

    modal.classList.add('hidden');

    // === UTILITY FUNCTIONS ===
    function generateRandomNumbers() {
        const targetSum = Math.floor(Math.random() * 98) + 2;
        const minA = Math.max(1, targetSum - 98);
        const maxA = Math.min(98, targetSum - 1);
        const a = Math.floor(Math.random() * (maxA - minA + 1)) + minA;
        const b = targetSum - a;
        return [a, b];
    }

    function generateRandomNumbersNotMultiplesOfTen() {
        let a, b;
        do {
            [a, b] = generateRandomNumbers();
        } while (a % 10 === 0 || b % 10 === 0);
        return [a, b];
    }

    function generateRandomBothDoubleDigits() {
        let a, b;
        do {
            [a, b] = generateRandomNumbersNotMultiplesOfTen();
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

    // === MAIN FUNCTIONS ===
    function generateProblem() {
        // Check if we need to start a new problem or continue with current problem
        if (currentAttempt === 1) {
            // Starting fresh problem
            let a, b;
            const { generator } = getCurrentSettings();
            [a, b] = generator();
            currentProblem = [a, b];
            solutionPaths = []; // Reset paths for new problem
        }
        
        // Set up current attempt
        currentNumbers = [...currentProblem];
        hasPerformedSplit = false;
        currentPath = [currentNumbers.slice()]; // Start path with initial state
        lastOperation = null;
        
        document.getElementById('original-equation').textContent = `${currentProblem[0]} + ${currentProblem[1]} = __`;
        
        // Update attempt indicator
        const attemptIndicator = document.getElementById('attempt-indicator');
        if (maxAttempts > 1) {
            attemptIndicator.textContent = `Attempt ${currentAttempt} of ${maxAttempts}`;
            attemptIndicator.classList.remove('hidden');
        } else {
            attemptIndicator.classList.add('hidden');
        }
        
        // Hide path displays only when starting a new problem (attempt 1)
        if (currentAttempt === 1) {
            document.getElementById('method-1-path').classList.add('hidden');
            document.getElementById('method-2-path').classList.add('hidden');
        }
        
        renderEquation();
        
        const { allow_splitting } = getCurrentSettings();
        if (allow_splitting === 1) {
            makeDraggable();
        }
        
        nextBtn.classList.add('hidden');
        modal.classList.add('hidden');
    }

    // === PATH TRACKING FUNCTIONS ===
    function recordPathStep(operationType) {
        // Always record current state after an operation
        const currentState = currentNumbers.slice();
        const lastState = currentPath[currentPath.length - 1];
        
        // Only add if the state is actually different
        if (!arraysEqual(currentState, lastState)) {
            currentPath.push(currentState);
        }
        
        lastOperation = operationType;
    }
    
    function canConsolidate(operationType) {
        // This will be used in consolidatePath function
        return true;
    }
    
    function arraysEqual(arr1, arr2) {
        if (!arr1 || !arr2 || arr1.length !== arr2.length) return false;
        const sorted1 = [...arr1].sort((a, b) => a - b);
        const sorted2 = [...arr2].sort((a, b) => a - b);
        return sorted1.every((val, idx) => val === sorted2[idx]);
    }
    
    function consolidatePath(path) {
        if (path.length <= 2) return path; // Keep initial state + final if only 2 steps
        
        const consolidated = [path[0]]; // Always keep initial state
        let i = 1;
        
        while (i < path.length) {
            const currentStep = path[i];
            
            // Look ahead to see if we can consolidate
            let consolidatedStep = currentStep;
            let j = i + 1;
            
            // Try to consolidate consecutive steps of the same "phase"
            while (j < path.length && shouldConsolidateSteps(path[i-1], path[i], path[j])) {
                consolidatedStep = path[j];
                j++;
            }
            
            consolidated.push(consolidatedStep);
            i = j;
        }
        
        return consolidated;
    }
    
    function shouldConsolidateSteps(prevStep, currentStep, nextStep) {
        // Don't consolidate if this is the final step (single number)
        if (nextStep.length === 1) return false;
        
        // Consolidate if we're in a "splitting phase" or "combining phase"
        // where operations don't depend on previous results
        
        // If going from more numbers to fewer numbers, we're combining
        const isCurrentCombining = currentStep.length < prevStep.length;
        const isNextCombining = nextStep.length < currentStep.length;
        
        // If going from fewer numbers to more numbers, we're splitting  
        const isCurrentSplitting = currentStep.length > prevStep.length;
        const isNextSplitting = nextStep.length > currentStep.length;
        
        // Consolidate if both operations are the same type (both splitting or both combining)
        return (isCurrentCombining && isNextCombining) || (isCurrentSplitting && isNextSplitting);
    }

    function renderEquation() {
        equationDiv.innerHTML = '';
        
        const { show_blocks, allow_splitting } = getCurrentSettings();
        
        if (allow_splitting === 0) {
            // Static mode: grayed out numbers + equals + answer circle
            currentNumbers.forEach((num, idx) => {
                if (idx > 0) {
                    const plus = document.createElement('div');
                    plus.className = 'plus';
                    plus.textContent = '+';
                    equationDiv.appendChild(plus);
                }
                
                const circle = document.createElement('div');
                circle.className = 'number-circle grayed';
                circle.dataset.value = num;

                const valueDiv = document.createElement('div');
                valueDiv.className = 'number-value';
                valueDiv.textContent = num;
                circle.appendChild(valueDiv);

                // Add blocks if show_blocks is enabled
                if (show_blocks === 1) {
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
                
                equationDiv.appendChild(circle);
            });
            
            // Add equals sign and answer circle
            const equals = document.createElement('div');
            equals.className = 'equals';
            equals.textContent = '=';
            equationDiv.appendChild(equals);
            
            const answerCircle = document.createElement('div');
            answerCircle.className = 'number-circle answer-circle';
            answerCircle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                openModal();
            });
            
            const answerValue = document.createElement('div');
            answerValue.className = 'number-value';
            answerValue.textContent = '?';
            answerCircle.appendChild(answerValue);
            
            equationDiv.appendChild(answerCircle);
            
        } else {
            // Interactive mode: draggable functionality
            currentNumbers.forEach((num, idx) => {
                if (idx > 0) {
                    const plus = document.createElement('div');
                    plus.className = 'plus';
                    plus.textContent = '+';
                    equationDiv.appendChild(plus);
                }
                const circle = document.createElement('div');
                circle.className = 'number-circle';
                circle.dataset.value = num;

                const valueDiv = document.createElement('div');
                valueDiv.className = 'number-value';
                valueDiv.textContent = num;
                circle.appendChild(valueDiv);

                // Add blocks based on show_blocks setting
                if (show_blocks === 1) {
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

                equationDiv.appendChild(circle);
            });
        }
    }

    function makeDraggable() {
        // Make numbers draggable
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

        // Add double-tap to split numbers
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
                    const idx = currentNumbers.indexOf(num);
                    if (idx !== -1) {
                        const tens = Math.floor(num / 10) * 10;
                        const ones = num % 10;
                        if (tens > 0 && ones > 0) {
                            currentNumbers.splice(idx, 1, tens, ones);
                            hasPerformedSplit = true; // Mark that a split has been performed
                            recordPathStep('split'); // Record this split operation
                            renderEquation();
                            makeDraggable();
                        }
                    }
                }
            };
            
            circle.addEventListener('touchstart', handleTap);
            
            circle.addEventListener('dblclick', function(event) {
                event.preventDefault();
                const num = parseInt(this.querySelector('.number-value').textContent);
                const idx = currentNumbers.indexOf(num);
                if (idx !== -1) {
                    const tens = Math.floor(num / 10) * 10;
                    const ones = num % 10;
                    if (tens > 0 && ones > 0) {
                        currentNumbers.splice(idx, 1, tens, ones);
                        hasPerformedSplit = true; // Mark that a split has been performed
                        recordPathStep('split'); // Record this split operation
                        renderEquation();
                        makeDraggable();
                    }
                }
            });
        });

        // Make numbers dropzones for other numbers
        interact('.number-circle').dropzone({
            accept: '.number-circle',
            overlap: 'pointer',
            checker: function(dragEvent, event, dropped, dropzone, dropElement, draggable, draggableElement) {
                if (!dropped) return false;
                
                const droppedNum = parseInt(draggableElement.querySelector('.number-value').textContent);
                const targetNum = parseInt(dropElement.querySelector('.number-value').textContent);
                return isAllowedToAdd(droppedNum, targetNum, currentNumbers.length);
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
                    const droppedIdx = currentNumbers.indexOf(droppedNum);
                    let targetIdx = currentNumbers.indexOf(targetNum);
                    
                    if (droppedNum === targetNum && droppedIdx === targetIdx) {
                        targetIdx = currentNumbers.indexOf(targetNum, droppedIdx + 1);
                    }
                    
                    if (droppedIdx < targetIdx) {
                        showPopup(droppedNum, targetNum);
                    } else {
                        showPopup(targetNum, droppedNum);
                    }
                }
                resetPosition(event.relatedTarget);
            }
        });
    }

    function resetPosition(element) {
        element.style.transform = 'translate(0px, 0px)';
        element.setAttribute('data-x', 0);
        element.setAttribute('data-y', 0);
    }

    function isAllowedToAdd(a, b, len) {
        // If no split has been performed yet, don't allow any combinations
        // This encourages at least one strategic split
        if (!hasPerformedSplit) {
            return false;
        }
        
        // Don't allow adding two double-digit numbers unless at least one is a multiple of 10
        // This prevents recreating original-style problems (like 57 + 29)
        const isDoubleDigit = (n) => n >= 10 && n <= 99;
        const isMultipleOf10 = (n) => n % 10 === 0 && n >= 10;
        
        if (isDoubleDigit(a) && isDoubleDigit(b)) {
            // Both are double-digit, so at least one must be a multiple of 10
            if (!isMultipleOf10(a) && !isMultipleOf10(b)) {
                return false;
            }
        }
        
        // After at least one split, allow all other combinations
        // This gives maximum flexibility in problem-solving approach
        return true;
    }

    function showPopup(a, b) {
        renderModalEquation(a, b);
        answerInput.value = '';
        errorMsg.classList.add('hidden');
        modal.classList.remove('hidden');
        
        const numBtns = document.querySelectorAll('.num-btn');
        numBtns.forEach(btn => {
            btn.onclick = () => {
                answerInput.value += btn.textContent;
            };
        });
        
        document.getElementById('backspace').onclick = () => {
            answerInput.value = answerInput.value.slice(0, -1);
        };
        
        document.getElementById('cancel').onclick = () => {
            modal.classList.add('hidden');
        };
        
        document.getElementById('submit').onclick = () => {
            const ans = parseInt(answerInput.value);
            if (isNaN(ans) || ans !== a + b) {
                errorMsg.classList.remove('hidden');
            } else {
                const sum = a + b;
                const idxA = currentNumbers.indexOf(a);
                let idxB = currentNumbers.indexOf(b);
                
                if (a === b && idxA === idxB) {
                    idxB = currentNumbers.indexOf(b, idxA + 1);
                }
                
                if (idxA !== -1 && idxB !== -1) {
                    const minIdx = Math.min(idxA, idxB);
                    const maxIdx = Math.max(idxA, idxB);
                    currentNumbers.splice(maxIdx, 1);
                    currentNumbers.splice(minIdx, 1, sum);
                    recordPathStep('combine'); // Record this combination operation
                    renderEquation();
                    makeDraggable();
                }
                modal.classList.add('hidden');
                checkIfDone();
            }
        };
    }

    function renderModalEquation(a, b) {
        const modalEquationDiv = document.getElementById('modal-equation');
        modalEquationDiv.innerHTML = '';
        
        const { show_blocks } = getCurrentSettings(); // Get current settings
        console.log("renderModalEquation called with show_blocks:", show_blocks);
        
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
            
            // Only add blocks if show_blocks is enabled
            if (show_blocks === 1) {
                console.log("Adding blocks in renderModalEquation for:", num);
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
            } else {
                console.log("NOT adding blocks in renderModalEquation because show_blocks =", show_blocks);
            }
            
            modalEquationDiv.appendChild(circle);
        });
    }

    function checkIfDone() {
        if (currentNumbers.length === 1) {
            // Record final state
            recordPathStep('final');
            
            // Store the completed path
            const consolidatedPath = consolidatePath(currentPath);
            solutionPaths.push(consolidatedPath);
            
            if (currentAttempt < maxAttempts) {
                // Show first solution path and prepare for second attempt
                showFirstSolutionPath();
                currentAttempt++;
                
                // Generate same problem for second attempt immediately
                generateProblem();
                
            } else {
                // Show side-by-side comparison and complete problem
                showSolutionComparison();
                
                // Increment completed counter and reset for next problem
                problemCount++;
                document.getElementById('problem-counter').textContent = `Completed: ${problemCount}`;
                currentAttempt = 1; // Reset for next problem
                
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
                nextBtn.classList.remove('hidden');
            }
        }
    }

    // === PATH DISPLAY FUNCTIONS ===
    function showFirstSolutionPath() {
        // Show Method 1 path on the left side
        const method1Path = document.getElementById('method-1-path');
        const container = document.getElementById('method-1-content');
        
        if (solutionPaths.length > 0) {
            method1Path.classList.remove('hidden');
            renderPath(solutionPaths[0], container);
        }
    }
    
    function showSolutionComparison() {
        // Method 1 is already visible, now show Method 2 on the right
        const method2Path = document.getElementById('method-2-path');
        const container = document.getElementById('method-2-content');
        
        if (solutionPaths.length > 1) {
            method2Path.classList.remove('hidden');
            renderPath(solutionPaths[1], container);
        }
    }
    
    function renderPath(path, container) {
        container.innerHTML = '';
        
        // Skip first step (original problem) and last step (final answer)
        const startIndex = 1;
        const endIndex = path.length - 1;
        
        // Create a table for the path
        const table = document.createElement('table');
        table.className = 'path-table';
        
        for (let i = startIndex; i < endIndex; i++) {
            const step = path[i];
            const nextStep = i < endIndex - 1 ? path[i + 1] : null;
            
            // Create row for the numbers
            const numberRow = document.createElement('tr');
            numberRow.className = 'number-row';
            
            // Find combinations for diagonal lines
            const combinations = nextStep ? findCombinations(step, nextStep) : [];
            
            step.forEach((num, idx) => {
                if (idx > 0) {
                    // Add plus cell
                    const plusCell = document.createElement('td');
                    plusCell.className = 'plus-cell';
                    plusCell.textContent = '+';
                    numberRow.appendChild(plusCell);
                }
                
                // Add number cell
                const cell = document.createElement('td');
                cell.className = 'number-cell';
                
                const circle = document.createElement('div');
                circle.className = 'number-circle';
                circle.setAttribute('data-number', num);
                
                // Determine if this number came from a split
                const isFromSplit = isNumberFromSplit(num, path, i);
                if (isFromSplit) {
                    circle.classList.add('from-split');
                } else {
                    circle.classList.add('not-from-split');
                }
                
                // Check if this number is part of a combination
                const isInCombination = combinations.some(combo => combo.sources.includes(num));
                if (isInCombination) {
                    circle.setAttribute('data-combines', 'true');
                    const comboIndex = combinations.findIndex(combo => combo.sources.includes(num));
                    circle.setAttribute('data-combo-group', comboIndex);
                }
                
                const valueDiv = document.createElement('div');
                valueDiv.className = 'number-value';
                valueDiv.textContent = num;
                circle.appendChild(valueDiv);
                
                cell.appendChild(circle);
                numberRow.appendChild(cell);
            });
            
            table.appendChild(numberRow);
        }
        
        container.appendChild(table);
        
        // Add SVG overlay for diagonal lines after table is rendered
        setTimeout(() => {
            addSVGDiagonalLines(container, path, startIndex, endIndex);
        }, 50);
    }
    
    function addSVGDiagonalLines(container, path, startIndex, endIndex) {
        // Create SVG overlay
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '10';
        
        container.style.position = 'relative';
        container.appendChild(svg);
        
        // Draw lines for each step
        const table = container.querySelector('.path-table');
        const numberRows = table.querySelectorAll('.number-row');
        
        numberRows.forEach((numberRow, rowIndex) => {
            const stepIndex = startIndex + rowIndex;
            const step = path[stepIndex];
            const nextStep = stepIndex < endIndex - 1 ? path[stepIndex + 1] : null;
            
            if (!nextStep) return;
            
            const combinations = findCombinations(step, nextStep);
            if (combinations.length === 0) return;
            
            // Find the next number row to draw lines to
            const nextNumberRow = numberRows[rowIndex + 1];
            if (!nextNumberRow) return;
            
            // Draw lines for each combination
            combinations.forEach(combo => {
                drawCombinationLines(svg, container, numberRow, nextNumberRow, combo, step, nextStep);
            });
        });
    }
    
    function drawCombinationLines(svg, container, sourceRow, targetRow, combination, sourceStep, targetStep) {
        const containerRect = container.getBoundingClientRect();
        
        // Find source number circles
        const sourceCells = sourceRow.querySelectorAll('.number-cell');
        const sourceCircles = [];
        
        sourceCells.forEach(cell => {
            const circle = cell.querySelector('.number-circle');
            const num = parseInt(circle.getAttribute('data-number'));
            if (combination.sources.includes(num)) {
                sourceCircles.push(circle);
            }
        });
        
        // Find target number circle
        const targetCells = targetRow.querySelectorAll('.number-cell');
        let targetCircle = null;
        
        targetCells.forEach(cell => {
            const circle = cell.querySelector('.number-circle');
            const num = parseInt(circle.getAttribute('data-number'));
            if (num === combination.result) {
                targetCircle = circle;
            }
        });
        
        if (sourceCircles.length === 0 || !targetCircle) return;
        
        // Draw lines from each source to target
        sourceCircles.forEach(sourceCircle => {
            const sourceRect = sourceCircle.getBoundingClientRect();
            const targetRect = targetCircle.getBoundingClientRect();
            
            // Calculate positions relative to container
            const x1 = sourceRect.left + sourceRect.width/2 - containerRect.left;
            const y1 = sourceRect.bottom - containerRect.top;
            const x2 = targetRect.left + targetRect.width/2 - containerRect.left;
            const y2 = targetRect.top - containerRect.top;
            
            // Create line element
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('stroke', '#666');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('opacity', '0.7');
            line.setAttribute('stroke-dasharray', '3,3');
            
            svg.appendChild(line);
        });
    }
    
    // Helper function to determine if a number came from a split IN THIS STEP
    function isNumberFromSplit(num, path, stepIndex) {
        if (stepIndex === 0) return false; // First step has no splits
        
        const currentStep = path[stepIndex];
        const prevStep = path[stepIndex - 1];
        
        // A number is "from a split" if:
        // 1. It exists in current step
        // 2. It didn't exist in previous step  
        // 3. It could be a result of splitting a number that WAS in previous step
        
        // If this number existed in the previous step, it's not a new split
        if (prevStep.includes(num)) {
            return false;
        }
        
        // Check if this number could be from splitting something in the previous step
        for (let prevNum of prevStep) {
            const tens = Math.floor(prevNum / 10) * 10;
            const ones = prevNum % 10;
            
            // If this number matches a tens or ones component of a previous number
            // AND that previous number is no longer in current step (was split)
            if ((num === tens || num === ones) && !currentStep.includes(prevNum)) {
                return true;
            }
        }
        
        return false;
    }
    
    // Find which numbers were combined between steps
    function findCombinations(currentStep, nextStep) {
        const combinations = [];
        
        // For each number in nextStep, see if it's a sum of numbers from currentStep
        for (let nextNum of nextStep) {
            // Skip numbers that existed in currentStep (they weren't combined)
            if (currentStep.includes(nextNum)) continue;
            
            // Find combinations of currentStep numbers that sum to nextNum
            const sources = findSumCombination(currentStep, nextNum);
            if (sources.length >= 2) {
                combinations.push({
                    sources: sources,
                    result: nextNum
                });
            }
        }
        
        return combinations;
    }
    
    // Find which numbers from currentStep sum to target
    function findSumCombination(numbers, target) {
        // Try all combinations of 2 or more numbers
        for (let i = 0; i < numbers.length; i++) {
            for (let j = i + 1; j < numbers.length; j++) {
                if (numbers[i] + numbers[j] === target) {
                    return [numbers[i], numbers[j]];
                }
                
                // Try 3-number combinations
                for (let k = j + 1; k < numbers.length; k++) {
                    if (numbers[i] + numbers[j] + numbers[k] === target) {
                        return [numbers[i], numbers[j], numbers[k]];
                    }
                }
            }
        }
        return [];
    }

    function openModal() {
        const sum = currentNumbers.reduce((a, b) => a + b, 0);
        const { show_blocks } = getCurrentSettings();
        
        console.log("openModal called with show_blocks:", show_blocks);
        
        const modalEquationDiv = document.getElementById('modal-equation');
        if (modalEquationDiv) {
            modalEquationDiv.innerHTML = '';
            
            // Create the same visual representation as the main screen
            currentNumbers.forEach((num, idx) => {
                if (idx > 0) {
                    const plus = document.createElement('div');
                    plus.className = 'plus';
                    plus.textContent = '+';
                    modalEquationDiv.appendChild(plus);
                }
                
                const circle = document.createElement('div');
                circle.className = 'number-circle grayed';
                
                const valueDiv = document.createElement('div');
                valueDiv.className = 'number-value';
                valueDiv.textContent = num;
                circle.appendChild(valueDiv);
                
                // Add blocks ONLY if show_blocks is enabled
                if (show_blocks === 1) {
                    console.log("Adding blocks for number:", num);
                    const blocksContainer = document.createElement('div');
                    blocksContainer.className = 'blocks-container';

                    const tens = Math.floor(num / 10);
                    const ones = num % 10;

                    // Add tens columns
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

                    // Add ones column
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
                } else {
                    console.log("NOT adding blocks for number:", num, "because show_blocks =", show_blocks);
                }
                
                modalEquationDiv.appendChild(circle);
            });
        }
        
        modal.classList.remove('hidden');
        answerInput.value = '';
        errorMsg.classList.add('hidden');
        
        setupModalEventListeners(sum);
    }

    function setupModalEventListeners(expectedSum) {
        console.log("Setting up modal event listeners for sum:", expectedSum);
        
        // Set up numpad buttons
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                answerInput.value += btn.textContent;
                console.log("Number clicked:", btn.textContent, "Current value:", answerInput.value);
            };
        });
        
        // Set up backspace
        document.getElementById('backspace').onclick = (e) => {
            e.preventDefault();
            answerInput.value = answerInput.value.slice(0, -1);
            console.log("Backspace clicked, current value:", answerInput.value);
        };
        
        // Set up cancel
        document.getElementById('cancel').onclick = (e) => {
            e.preventDefault();
            modal.classList.add('hidden');
            console.log("Cancel clicked");
        };
        
        // Set up submit
        document.getElementById('submit').onclick = (e) => {
            e.preventDefault();
            const ans = parseInt(answerInput.value);
            console.log("Submit clicked, answer:", ans, "expected:", expectedSum);
            
            if (isNaN(ans) || ans !== expectedSum) {
                errorMsg.classList.remove('hidden');
                console.log("Wrong answer");
            } else {
                // Correct answer - replace the question mark circle with the answer
                replaceAnswerCircle(expectedSum);
                
                modal.classList.add('hidden');
                nextBtn.classList.remove('hidden');
                
                // Increment completed counter
                problemCount++;
                document.getElementById('problem-counter').textContent = `Completed: ${problemCount}`;
                
                console.log("Correct answer! Showing confetti");
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
        };
    }

    function replaceAnswerCircle(answer) {
        // Find the answer circle (the one with "?")
        const answerCircle = document.querySelector('.answer-circle');
        
        if (answerCircle) {
            // Remove the answer-circle class and add grayed class
            answerCircle.classList.remove('answer-circle');
            answerCircle.classList.add('grayed');
            
            // Remove click handler by cloning the element
            const newAnswerCircle = answerCircle.cloneNode(true);
            answerCircle.parentNode.replaceChild(newAnswerCircle, answerCircle);
            
            // Now update the text content in the NEW element
            const valueDiv = newAnswerCircle.querySelector('.number-value');
            if (valueDiv) {
                valueDiv.textContent = answer;
                console.log("Updated text to:", answer);
            } else {
                console.error("Could not find .number-value in the answer circle");
            }
            
            console.log("Replaced answer circle with answer:", answer);
        } else {
            console.error("Could not find .answer-circle element");
        }
    }

    // === EVENT HANDLERS ===
    nextBtn.onclick = () => {
        generateProblem();
    };

    // === INITIALIZATION ===
    problemCount = 0;
    document.getElementById('problem-counter').textContent = `Completed: ${problemCount}`;
    generateProblem();
});

