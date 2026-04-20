class ArrayBuilderGame {
    constructor() {
        this.totalGames = 0;

        // Current problem
        this.rows = 0;   // first number — how many groups
        this.cols = 0;   // second number — group size

        // Placement state
        this.placedRowData = [];   // [{gridRow, color}]
        this.occupiedGridRows = new Set();

        this.rowColors = [
            '#FF6B6B',
            '#FFD93D',
            '#6BCB77',
            '#4D96FF',
            '#C77DFF',
            '#FF9A3C',
        ];

        // Drag state
        this.dragState = null;

        // Solve state
        this.currentInput = '';
        this.phase = 'building'; // 'building' | 'solving'

        this.init();
    }

    init() {
        this.buildGrid();
        this.buildPalette();
        this.setupEventListeners();
        this.startNewRound();
    }

    // ── Grid & Palette Construction ──────────────────────────────

    buildGrid() {
        const grid = document.getElementById('grid');
        grid.innerHTML = '';
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 6; c++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                grid.appendChild(cell);
            }
        }
    }

    buildPalette() {
        const palette = document.getElementById('palette');
        palette.innerHTML = '';
        for (let size = 1; size <= 6; size++) {
            const row = document.createElement('div');
            row.className = 'palette-row';
            row.dataset.size = size;
            for (let i = 0; i < size; i++) {
                const block = document.createElement('div');
                block.className = 'palette-block';
                row.appendChild(block);
            }
            palette.appendChild(row);
        }
    }

    getBlockSize() {
        return parseInt(getComputedStyle(document.documentElement)
            .getPropertyValue('--block-size')) || 30;
    }

    // ── Event Listeners ──────────────────────────────────────────

    setupEventListeners() {
        const palette = document.getElementById('palette');

        // Touch (iPad)
        palette.addEventListener('touchstart', (e) => {
            if (this.phase !== 'building') return;
            const row = e.target.closest('.palette-row');
            if (!row) return;
            e.preventDefault();
            this.startDrag(row, { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }, 'touch');
        }, { passive: false });

        // Mouse (desktop / preview)
        palette.addEventListener('mousedown', (e) => {
            if (this.phase !== 'building') return;
            const row = e.target.closest('.palette-row');
            if (!row) return;
            e.preventDefault();
            this.startDrag(row, { clientX: e.clientX, clientY: e.clientY }, 'mouse');
        });

        document.querySelectorAll('.pad-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleInput(e.currentTarget.dataset.value);
            });
        });
    }

    // ── Drag & Drop ──────────────────────────────────────────────

    startDrag(paletteRow, pointer, mode) {
        const size = parseInt(paletteRow.dataset.size);
        const colorIndex = this.placedRowData.length % this.rowColors.length;
        const color = this.rowColors[colorIndex];

        // Create ghost
        const blockSize = this.getBlockSize();
        const ghost = document.createElement('div');
        ghost.id = 'drag-ghost';
        for (let i = 0; i < size; i++) {
            const b = document.createElement('div');
            b.className = 'palette-block';
            b.style.width = blockSize + 'px';
            b.style.height = blockSize + 'px';
            b.style.background = color;
            b.style.borderColor = 'rgba(255,255,255,0.7)';
            ghost.appendChild(b);
        }

        const rect = paletteRow.getBoundingClientRect();
        const offsetX = pointer.clientX - rect.left;
        const offsetY = pointer.clientY - rect.top;

        ghost.style.left = (pointer.clientX - offsetX) + 'px';
        ghost.style.top  = (pointer.clientY - offsetY) + 'px';
        document.body.appendChild(ghost);
        paletteRow.classList.add('dragging');

        this.dragState = { size, color, ghost, offsetX, offsetY, paletteRow };

        const getCoords = (e) => mode === 'touch'
            ? { clientX: e.touches[0]?.clientX ?? e.changedTouches[0].clientX,
                clientY: e.touches[0]?.clientY ?? e.changedTouches[0].clientY }
            : { clientX: e.clientX, clientY: e.clientY };

        const onMove = (e) => {
            e.preventDefault();
            const { clientX, clientY } = getCoords(e);
            ghost.style.left = (clientX - offsetX) + 'px';
            ghost.style.top  = (clientY - offsetY) + 'px';
            this.highlightTargetRow(clientX, clientY);
        };

        const onEnd = (e) => {
            if (mode === 'touch') {
                document.removeEventListener('touchmove', onMove);
                document.removeEventListener('touchend', onEnd);
            } else {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onEnd);
            }
            const { clientX, clientY } = getCoords(e);
            this.endDrag(clientX, clientY);
        };

        if (mode === 'touch') {
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onEnd);
        } else {
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);
        }
    }

    highlightTargetRow(x, y) {
        // Clear previous highlights
        document.querySelectorAll('.grid-cell.drop-target').forEach(c => c.classList.remove('drop-target'));

        const gridEl = document.getElementById('grid');
        const gridRect = gridEl.getBoundingClientRect();
        if (x < gridRect.left || x > gridRect.right || y < gridRect.top || y > gridRect.bottom) return;

        const targetRow = this.getGridRow(y, gridRect);
        if (targetRow < 0 || targetRow > 5) return;

        for (let c = 0; c < this.cols; c++) {
            const cell = gridEl.querySelector(`[data-row="${targetRow}"][data-col="${c}"]`);
            if (cell && !cell.classList.contains('filled')) cell.classList.add('drop-target');
        }
    }

    endDrag(x, y) {
        const { size, color, ghost, paletteRow } = this.dragState;
        this.dragState = null;

        paletteRow.classList.remove('dragging');
        document.querySelectorAll('.grid-cell.drop-target').forEach(c => c.classList.remove('drop-target'));

        const gridEl = document.getElementById('grid');
        const gridRect = gridEl.getBoundingClientRect();
        const overGrid = x >= gridRect.left && x <= gridRect.right &&
                         y >= gridRect.top  && y <= gridRect.bottom;

        if (!overGrid) {
            ghost.remove();
            return;
        }

        const targetRow = this.getGridRow(y, gridRect);
        const valid = this.validateDrop(size, targetRow);

        if (valid) {
            ghost.remove();
            this.placeRow(targetRow, color);
        } else {
            // Nope — flash red, shake, remove
            ghost.classList.add('invalid', 'ghost-shake');
            setTimeout(() => ghost.remove(), 450);
        }
    }

    getGridRow(y, gridRect) {
        const relY = y - gridRect.top;
        return Math.min(5, Math.max(0, Math.floor(relY / (gridRect.height / 6))));
    }

    validateDrop(size, targetRow) {
        if (size !== this.cols) return false;
        if (this.occupiedGridRows.has(targetRow)) return false;
        if (this.placedRowData.length >= this.rows) return false;

        // Must be adjacent to existing placed rows (or first placement)
        if (this.occupiedGridRows.size === 0) return true;
        return this.occupiedGridRows.has(targetRow - 1) ||
               this.occupiedGridRows.has(targetRow + 1);
    }

    placeRow(targetRow, color) {
        const gridEl = document.getElementById('grid');
        for (let c = 0; c < this.cols; c++) {
            const cell = gridEl.querySelector(`[data-row="${targetRow}"][data-col="${c}"]`);
            cell.style.background = color;
            cell.style.setProperty('--fill-color', color);
            cell.classList.add('filled');
        }

        this.occupiedGridRows.add(targetRow);
        this.placedRowData.push({ gridRow: targetRow, color });
        this.updateCounter();

        if (this.placedRowData.length === this.rows) {
            setTimeout(() => this.completeBuildPhase(), 500);
        }
    }

    // ── Round Management ─────────────────────────────────────────

    startNewRound() {
        this.rows = Math.floor(Math.random() * 6) + 1; // 1–6
        this.cols = Math.floor(Math.random() * 6) + 1; // 1–6
        this.placedRowData = [];
        this.occupiedGridRows = new Set();
        this.currentInput = '';
        this.phase = 'building';

        // Reset grid cells
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('filled', 'drop-target');
            cell.style.background = '';
        });

        // Reset palette appearance
        document.querySelectorAll('.palette-row').forEach(r => r.classList.remove('dragging'));

        // Reset UI areas
        document.getElementById('equation-area').classList.add('hidden');
        document.getElementById('solve-area').classList.add('hidden');
        document.getElementById('playback-area').classList.add('hidden');
        document.getElementById('answer-display').textContent = '?';
        document.getElementById('answer-display').classList.remove('hidden');
        document.getElementById('number-pad').classList.remove('hidden');

        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) nextBtn.remove();

        // Problem text
        document.getElementById('problem-expression').textContent =
            `${this.rows} × ${this.cols} = ?`;
        document.getElementById('problem-words').textContent =
            `${this.rows} group${this.rows > 1 ? 's' : ''} of ${this.cols}`;
        this.updateCounter();
    }

    updateCounter() {
        const placed = this.placedRowData.length;
        const needed = this.rows;
        if (placed === 0) {
            document.getElementById('row-counter').textContent = '';
        } else {
            document.getElementById('row-counter').textContent =
                `${placed} of ${needed} row${needed > 1 ? 's' : ''} placed`;
        }
    }

    // ── Build → Solve Transition ─────────────────────────────────

    completeBuildPhase() {
        this.phase = 'solving';
        document.getElementById('row-counter').textContent = '';

        // Build repeated addition display
        const container = document.getElementById('repeated-addition');
        container.innerHTML = '';

        // Sort by grid row for a clean left-to-right reading
        const sorted = [...this.placedRowData].sort((a, b) => a.gridRow - b.gridRow);
        sorted.forEach((data, idx) => {
            if (idx > 0) {
                const op = document.createElement('span');
                op.className = 'add-op';
                op.textContent = ' + ';
                container.appendChild(op);
            }
            const num = document.createElement('span');
            num.className = 'add-num';
            num.style.color = data.color;
            num.textContent = this.cols;
            container.appendChild(num);
        });

        const eq = document.createElement('span');
        eq.className = 'add-eq';
        eq.textContent = ' = ';
        container.appendChild(eq);

        const q = document.createElement('span');
        q.className = 'add-q';
        q.textContent = '?';
        container.appendChild(q);

        document.getElementById('equation-area').classList.remove('hidden');
        document.getElementById('solve-area').classList.remove('hidden');
    }

    // ── Number Pad ───────────────────────────────────────────────

    handleInput(value) {
        if (this.phase !== 'solving') return;

        if (value === 'backspace') {
            this.currentInput = this.currentInput.slice(0, -1);
        } else if (value === 'enter') {
            if (this.currentInput.length > 0) this.checkAnswer(parseInt(this.currentInput));
            return;
        } else {
            if (this.currentInput.length < 3) this.currentInput += value;
        }
        document.getElementById('answer-display').textContent = this.currentInput || '?';
    }

    checkAnswer(answer) {
        const correct = this.rows * this.cols;

        if (answer === correct) {
            this.totalGames++;
            document.getElementById('total-count').textContent = this.totalGames;
            this.showSuccess(answer);
        } else {
            this.showPlayback(answer, correct);
            this.currentInput = '';
            document.getElementById('answer-display').textContent = '?';
        }
    }

    showPlayback(answer, correct) {
        const playback = document.getElementById('playback-area');
        document.getElementById('playback-equation').innerHTML =
            `<span class="answer-box">${answer}</span> ≠ ${correct}`;
        document.getElementById('playback-mark').textContent = `Try again`;
        playback.classList.remove('hidden');
        setTimeout(() => playback.classList.add('hidden'), 1200);
    }

    showSuccess(answer) {
        // Update the ? in repeated addition to the answer
        const q = document.querySelector('.add-q');
        if (q) {
            q.textContent = answer;
            q.style.color = '#6BCB77';
        }

        document.getElementById('answer-display').textContent = answer;
        document.getElementById('number-pad').classList.add('hidden');

        this.createParticles();

        const btn = document.createElement('button');
        btn.id = 'next-btn';
        btn.textContent = 'Next problem';
        btn.addEventListener('click', () => this.startNewRound());
        document.body.appendChild(btn);
    }

    // ── Celebration ──────────────────────────────────────────────

    createParticles() {
        const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9A3C'];
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const p = document.createElement('div');
                p.className = 'particle';
                p.style.left = Math.random() * 100 + 'vw';
                p.style.background = colors[Math.floor(Math.random() * colors.length)];
                p.style.animationDuration = (2 + Math.random() * 2) + 's';
                p.style.animationDelay = Math.random() * 0.5 + 's';
                document.getElementById('particles-container').appendChild(p);
                setTimeout(() => p.remove(), 4000);
            }, i * 40);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => new ArrayBuilderGame());
