/**
 * Cancel Line — number-line variant of cancel-game2.
 *
 * Same equation form (a + b − c or a − b + c), different visualization.
 * The two motions are drawn as arrows on a number line:
 *   • A green +b arrow rightward (or leftward, depending on sign)
 *   • A red −c arrow continuing from the +b endpoint
 *   • The end position is the answer; a yellow bracket from start to end
 *     highlights the *net displacement* — that's the netting punchline.
 *
 * Why a second model: cancel-game2 teaches netting via the chip model
 * (positives and negatives annihilate). The number line teaches the same
 * concept geometrically — same distance forward, less distance back leaves
 * a small displacement. Different lens, same insight.
 */

class CancelLine {
    constructor() {
        this.totalGames = 0;
        this.correctCount = 0;
        this.problem = null;

        // Mode (URL ?mode=1|2|3|learn) — same conventions as cancel-game2.
        const params = new URLSearchParams(window.location.search);
        const rawMode = params.get('mode');
        if (rawMode === 'learn') {
            this.mode = 'learn';
            this.learnIndex = 0;
            this.learnCycle = [
                { values: [25, 16, 16], ops: ['+', '-'] },
                { values: [25, 16, 15], ops: ['+', '-'] },
                { values: [25, 16, 17], ops: ['+', '-'] },
                { values: [25, 16, 14], ops: ['+', '-'] },
                { values: [25, 16, 18], ops: ['+', '-'] },
            ];
        } else {
            const m = parseInt(rawMode, 10);
            this.mode = (m === 2 || m === 3) ? m : 1;
        }

        // Solve mode (?solve=true) — after predicting more/less, she has to
        // type the actual answer on a numpad. Rows stay hidden until she
        // submits, forcing a mental computation rather than counting cells.
        this.solveMode = params.get('solve') === 'true';
        this.solveInput = '';

        this.init();
    }

    init() {
        document.getElementById('continue-btn').addEventListener('click', () => this.startNewRound());
        document.querySelectorAll('#numpad .numkey').forEach(btn => {
            btn.addEventListener('click', () => this.handleNumKey(btn.dataset.key));
        });
        // The "Correct" stat is only meaningful when she's actually
        // submitting answers — hide it in observe-only mode.
        if (this.solveMode) {
            document.getElementById('correct-stat').classList.remove('hidden');
        }
        this.startNewRound();
    }

    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // ── Problem generation ─────────────────────────

    generateProblem() {
        if (this.mode === 'learn') {
            const entry = this.learnCycle[this.learnIndex % this.learnCycle.length];
            this.learnIndex += 1;
            const [a, b, c] = entry.values;
            const [op1, op2] = entry.ops;
            const apply = (acc, op, n) => op === '+' ? acc + n : acc - n;
            const result = apply(apply(a, op1, b), op2, c);
            return { values: entry.values, ops: entry.ops, result };
        }
        const allowSubFirst = this.mode === 2 || this.mode === 3;
        const deltaRange = this.mode === 3 ? 3 : 2;
        for (let tries = 0; tries < 120; tries++) {
            const subFirst = allowSubFirst && Math.random() < 0.5;
            const ops = subFirst ? ['-', '+'] : ['+', '-'];
            const a = this.randInt(20, 30);
            const bMax = subFirst ? Math.min(22, a - 1) : 22;
            if (bMax < 12) continue;
            const b = this.randInt(12, bMax);
            const cDelta = this.randInt(-deltaRange, deltaRange);
            // Predict-step relies on the answer being strictly more or less
            // than start, so we never let b equal c (which would make the
            // net zero — neither "more" nor "less").
            if (cDelta === 0) continue;
            const c = b + cDelta;
            const cMin = 12 - deltaRange;
            const cMax = 22 + deltaRange;
            if (c < cMin || c > cMax) continue;
            const apply = (acc, op, n) => op === '+' ? acc + n : acc - n;
            let result = apply(a, ops[0], b);
            if (result < 1) continue;
            result = apply(result, ops[1], c);
            if (result < 1 || result > 30) continue;
            return { values: [a, b, c], ops, result };
        }
        return { values: [25, 16, 14], ops: ['+', '-'], result: 27 };
    }

    // ── Round lifecycle ────────────────────────────

    startNewRound() {
        this.problem = this.generateProblem();
        this.revealed = false;
        this.predicted = false;
        this.solveInput = '';
        this.renderEquation();
        this.hide('continue-btn');
        this.hide('numpad');
        // Number-line is hidden until she's done predicting (and, in solve
        // mode, typed her answer) — keeps the question pure.
        document.getElementById('number-line').innerHTML = '';
        this.renderPredictButtons();
    }

    onPredict() {
        if (this.predicted) return;
        this.predicted = true;
        this.hide('predict-buttons');
        if (this.solveMode) {
            // Reveal numpad; rows still hidden until she submits an answer.
            this.solveInput = '';
            this.renderSolveInput();
            this.show('numpad');
        } else {
            this.reveal();
        }
    }

    handleNumKey(key) {
        if (!this.solveMode || !this.predicted || this.revealed) return;
        if (key === 'back') {
            this.solveInput = this.solveInput.slice(0, -1);
            this.renderSolveInput();
            return;
        }
        if (key === 'enter') {
            if (this.solveInput.length === 0) return;
            // Silently track correctness — the counter updates without
            // any visual flash so the no-feedback rule still holds.
            if (parseInt(this.solveInput, 10) === this.problem.result) {
                this.correctCount++;
                document.getElementById('correct-count').textContent = this.correctCount;
            }
            this.hide('numpad');
            this.reveal();
            return;
        }
        if (this.solveInput.length >= 2) return;
        this.solveInput += key;
        this.renderSolveInput();
    }

    renderSolveInput() {
        const el = document.getElementById('eq-answer-box');
        if (!el) return;
        if (this.solveInput.length === 0) {
            el.textContent = '';
            el.classList.add('empty');
        } else {
            el.textContent = this.solveInput;
            el.classList.remove('empty');
        }
    }

    // Reveal the rows and (in non-solve mode) fill in the answer. In solve
    // mode the equation already shows her typed guess; the picture is the
    // truth she compares against.
    reveal() {
        this.revealed = true;
        this.renderEquation();
        this.renderLine();
        setTimeout(() => {
            this.totalGames++;
            document.getElementById('total-count').textContent = this.totalGames;
            this.show('continue-btn');
        }, 3400);
    }

    renderPredictButtons() {
        const a = this.problem.values[0];
        const container = document.getElementById('predict-buttons');
        container.innerHTML = '';
        const make = (label) => {
            const b = document.createElement('button');
            b.className = 'btn btn-predict';
            b.textContent = label;
            b.addEventListener('click', () => this.onPredict());
            return b;
        };
        container.appendChild(make(`Less than ${a}`));
        container.appendChild(make(`More than ${a}`));
        this.show('predict-buttons');
    }

    renderEquation() {
        const { values, ops, result } = this.problem;
        const [a, b, c] = values;
        const [op1, op2] = ops;
        const num  = (n) => `<span class="eq-num">${n}</span>`;
        const op   = (s) => `<span class="eq-op">${s === '+' ? '+' : '−'}</span>`;
        // In solve mode, the equation always ends with [her answer box] ? —
        // her guess goes in the box, the picture below is the truth.
        // Otherwise the tail is ? before reveal, the result after.
        const tail = this.solveMode
            ? `<span class="eq-answer-box empty" id="eq-answer-box"></span><span class="eq-tail">?</span>`
            : `<span class="eq-tail">${this.revealed ? String(result) : '?'}</span>`;
        document.getElementById('main-equation').innerHTML =
            num(a) + op(op1) + num(b) + op(op2) + num(c) +
            `<span class="eq-op">=</span>` + tail;
        if (this.solveMode) this.renderSolveInput();
    }

    // ── Number-line rendering ─────────────────────

    renderLine() {
        const svg = document.getElementById('number-line');
        const SVG_NS = 'http://www.w3.org/2000/svg';

        const { values, ops, result } = this.problem;
        const [a, b, c] = values;
        const [op1, op2] = ops;

        // Compute the journey: start → a → midpoint → end (= result).
        const start = a;
        const sign1 = op1 === '+' ? 1 : -1;
        const sign2 = op2 === '+' ? 1 : -1;
        const mid   = start + sign1 * b;
        const end   = mid + sign2 * c;

        // Use a fixed-size window so cell sizes stay constant across
        // problems. We center the journey range within FIXED_CELLS cells,
        // shifting if needed to avoid going below 0.
        const FIXED_CELLS = 26;
        const minVal = Math.min(start, mid, end);
        const maxVal = Math.max(start, mid, end);
        const journeySpan = maxVal - minVal;
        const slack = Math.max(0, FIXED_CELLS - 1 - journeySpan);
        let lineMin = minVal - Math.floor(slack / 2);
        if (lineMin < 0) lineMin = 0;
        const lineMax = lineMin + FIXED_CELLS - 1;

        // SVG layout. Three stacked number-line rows, each its own state
        // of the journey:
        //   Row 1: starting state (start cell highlighted)
        //   Row 2: after first operation (mid cell highlighted, arrow above)
        //   Row 3: after second operation (end cell highlighted, arrow above)
        // The same x-coordinate maps to the same number in every row, so
        // she can trace a vertical column to see how a position evolves.
        const VW = 1000, VH = 440;
        const LEFT  = 130;
        const RIGHT = VW - 30;
        const cellCount = lineMax - lineMin + 1;
        const cellW = (RIGHT - LEFT) / cellCount;
        const cellH = Math.min(34, cellW);
        const ROW_GAP = cellH + 90;             // spacing between row centers (room for arrows above)
        const ROW2_Y  = 80;
        const ROW3_Y  = ROW2_Y + ROW_GAP;

        // xOf returns the horizontal *center* of cell value v.
        const xOf = (v) => LEFT + (v - lineMin + 0.5) * cellW;

        // Reset and build SVG.
        svg.innerHTML = '';
        svg.setAttribute('viewBox', `0 0 ${VW} ${VH}`);

        const elt = (name, attrs = {}, text = null) => {
            const el = document.createElementNS(SVG_NS, name);
            for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
            if (text !== null) el.textContent = text;
            return el;
        };

        // Draw one row of numbered cells.
        //   marks: array of { value, kind } where kind ∈
        //     'start' (white border)
        //     'pos'   (green endpoint styling)
        //     'neg'   (red endpoint styling)
        //     'end'   (yellow border, final answer)
        //   path:  optional { from, to, kind } — colors every cell from
        //          min(from,to) to max(from,to) inclusive in the same
        //          endpoint styling as marks of that kind.
        const STEP_MS = 450;
        const setStep = (g, step) => {
            g.style.animationDelay = (step * STEP_MS) + 'ms';
        };

        const drawRow = (rowY, marks, rowLabel, path = null, step = 0) => {
            const g = elt('g', { class: 'fade-in' });
            setStep(g, step);
            const markFor = (v) => marks.find((m) => m.value === v);
            const inPath = (v) => {
                if (!path) return false;
                const lo = Math.min(path.from, path.to);
                const hi = Math.max(path.from, path.to);
                return v >= lo && v <= hi;
            };
            for (let v = lineMin; v <= lineMax; v++) {
                const isMajor = (v % 5 === 0);
                const m = markFor(v);
                const onPath = inPath(v);
                let cls = 'cell';
                if (m) {
                    if (m.kind === 'end')      cls = 'cell-end';
                    else if (m.kind === 'pos') cls = 'cell-path-pos cell-endpoint-pos';
                    else if (m.kind === 'neg') cls = 'cell-path-neg cell-endpoint-neg';
                    else                       cls = 'cell-start';
                } else if (onPath) {
                    cls = path.kind === 'pos' ? 'cell-path-pos cell-endpoint-pos'
                                              : 'cell-path-neg cell-endpoint-neg';
                } else if (isMajor) {
                    cls = 'cell-major';
                }
                g.appendChild(elt('rect', {
                    class: cls,
                    x: xOf(v) - cellW / 2 + 1,
                    y: rowY - cellH / 2,
                    width:  cellW - 2,
                    height: cellH,
                    rx: 6, ry: 6,
                }));
                const labelCls = (isMajor || m || onPath)
                    ? 'cell-label cell-label-major'
                    : 'cell-label';
                g.appendChild(elt('text', {
                    class: labelCls,
                    x: xOf(v),
                    y: rowY + 1,
                }, String(v)));
            }
            // Row label on the left (e.g. "Start", "After +15", "After −17").
            g.appendChild(elt('text', {
                class: 'row-label',
                x: LEFT - 14,
                y: rowY + 1,
            }, rowLabel));
            svg.appendChild(g);
        };

        // Reveal sequence:
        //   step 0 — both rows fade in together (the empty number lines)
        //   step 1 — start anchor on row 2
        //   step 2 — arrow above row 2
        //   step 3 — arrow above row 3
        //   step 4 — end anchor on row 3
        // Row 2: every cell from start to mid (inclusive) colored to op1.
        const kind1 = op1 === '+' ? 'pos' : 'neg';
        drawRow(ROW2_Y,
            [],
            `After ${op1 === '+' ? '+' : '−'}${b}`,
            { from: start, to: mid, kind: kind1 },
            0);
        // Row 3: every cell from mid to end (inclusive) colored to op2.
        const kind2 = op2 === '+' ? 'pos' : 'neg';
        drawRow(ROW3_Y,
            [],
            `After ${op2 === '+' ? '+' : '−'}${c}`,
            { from: mid, to: end, kind: kind2 },
            0);

        // Anchor cells — overlay slightly larger boxes on top of the start
        // (row 2) and end (row 3) cells so the journey's beginning and end
        // pop out from the colored path.
        const anchorScale = 1.30;
        const anchorW = (cellW - 2) * anchorScale;
        const anchorH = cellH * anchorScale;
        const drawAnchor = (v, rowY, boxCls, labelCls, step) => {
            const g = elt('g', { class: 'fade-in' });
            setStep(g, step);
            g.appendChild(elt('rect', {
                class: boxCls,
                x: xOf(v) - anchorW / 2,
                y: rowY - anchorH / 2,
                width:  anchorW,
                height: anchorH,
                rx: 8, ry: 8,
            }));
            g.appendChild(elt('text', {
                class: `cell-label ${labelCls}`,
                x: xOf(v),
                y: rowY + 1,
            }, String(v)));
            svg.appendChild(g);
        };
        drawAnchor(start, ROW2_Y, 'cell-anchor-start', 'cell-label-final', 1);
        drawAnchor(end,   ROW3_Y, 'cell-final',        'cell-label-final', 4);

        // Arrow helper: a straight line from x1→x2 with an arrowhead at x2.
        // Stagger lets the second arrow stack above the first when their
        // ranges overlap — keeps the netting visually legible.
        const drawArrow = (vFrom, vTo, sign, label, yOffset, step) => {
            const cls = sign === '+' ? 'arrow-pos' : 'arrow-neg';
            const headCls = sign === '+' ? 'arrowhead-pos' : 'arrowhead-neg';
            const lblCls = sign === '+' ? 'arrow-label-pos' : 'arrow-label-neg';
            const x1 = xOf(vFrom);
            const x2 = xOf(vTo);
            const y = yOffset;

            const g = elt('g', { class: 'fade-in' });
            setStep(g, step);
            // Shaft (stop short of the tip so the arrowhead caps it).
            const dir = Math.sign(x2 - x1) || 1;
            const tip = x2;
            const shaftEnd = x2 - dir * 12;
            g.appendChild(elt('line', {
                class: cls,
                x1, x2: shaftEnd, y1: y, y2: y,
            }));
            // Arrowhead (triangle).
            const headLen = 16;
            const headW = 10;
            const tipX = tip;
            const baseX = tip - dir * headLen;
            const points = `${tipX},${y} ${baseX},${y - headW} ${baseX},${y + headW}`;
            g.appendChild(elt('polygon', { class: headCls, points }));
            // Label centered over arrow.
            const cx = (x1 + x2) / 2;
            g.appendChild(elt('text', {
                class: lblCls,
                x: cx,
                y: y - 16,
            }, label));
            svg.appendChild(g);
        };

        // Arrows above rows 2 and 3 — connect the two highlighted endpoint
        // cells so the motion (and direction) reads at a glance.
        const ARROW_Y_OFFSET = cellH / 2 + 18;
        drawArrow(start, mid, op1, `${op1 === '+' ? '+' : '−'}${b}`,
                  ROW2_Y - ARROW_Y_OFFSET, 2);
        drawArrow(mid, end, op2, `${op2 === '+' ? '+' : '−'}${c}`,
                  ROW3_Y - ARROW_Y_OFFSET, 3);
    }

    show(id) { document.getElementById(id).classList.remove('hidden'); }
    hide(id) { document.getElementById(id).classList.add('hidden'); }
}

document.addEventListener('DOMContentLoaded', () => new CancelLine());
