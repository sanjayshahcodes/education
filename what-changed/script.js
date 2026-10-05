/* What Changed? — the four steps, in order.

   The reasoning she is being walked through is deliberately slower than the
   arithmetic would be. Steps 1 and 2 ask the same two questions about each
   number in turn — what moved, and which way that pushes the answer — because
   the second half of step 2 is the one that feels backwards and is the only
   reason this game exists.

   Both halves of both steps offer the same chips, so "1 more → +1" in step 1
   lands in the same column while "1 more → −1" in step 2 crosses over, and
   the asymmetry is visible rather than explained. Both signed amounts stay on
   screen while she answers, so combining them is read off the board instead
   of being held in her head. */

/* ?mode=2 starts her there instead of grinding up from the first, and ?hold
   keeps her there instead of advancing — the pair of them is how a grown-up
   drills the one case she is actually stuck on. Same idea as
   compute-efficiently's ?mode=parens. */
const params = new URLSearchParams(window.location.search);

function startingMode() {
    const asked = Number(params.get('mode'));
    if (!Number.isInteger(asked) || asked < 1) return 0;
    return Math.min(asked - 1, MODES.length - 1);
}

/* Asked twice per round and repeated in both summaries, so it lives in one
   place rather than being spelled out in four. */
const EFFECT_PROMPT = 'The effect on the answer is';

const el = (id) => document.getElementById(id);

const ui = {
    modeLabel:   el('mode-label'),
    anchorEq:    el('anchor-eq'),
    problemEq:   el('problem-eq'),
    ask1a:       el('ask-1a'),
    ask2a:       el('ask-2a'),
    ask3:        el('ask-3'),
    choices1a:   el('choices-1a'),
    choices1b:   el('choices-1b'),
    choices2a:   el('choices-2a'),
    choices2b:   el('choices-2b'),
    row1b:       el('ask-1b-row'),
    row2b:       el('ask-2b-row'),
    summary1:    el('summary-1'),
    summary2:    el('summary-2'),
    answerBox:   el('answer-box'),
    message:     el('message'),
    numpad:      el('numpad'),
    continueBtn: el('continue-btn'),
    total:       el('total-count'),
    clean:       el('clean-count'),
    steps: [null, el('step-1'), el('step-2'), el('step-3')],
};

const state = {
    round: null,
    phase: '1a',
    typed: '',
    wrongAnswers: 0,      // misses at the answer step, for how much help to give
    cleanRound: true,     // no wrong taps yet this round
    solved: 0,
    firstTry: 0,
    mode: startingMode(),
    cleanRun: 0,          // clean rounds at the current mode
    hold: params.has('hold'),
};

/* ── Wording ───────────────────────────────────── */

/* "More" and "less" for what she did, "higher" and "lower" for what it does
   to the answer. Keeping the two vocabularies apart matters: the whole lesson
   is that more taken away means a lower answer, and that is impossible to
   say cleanly if both halves use the same word. */
function amountLabel(delta) {
    if (delta === 0) return 'Same';
    return `${Math.abs(delta)} ${delta > 0 ? 'more' : 'less'}`;
}

/* The signed amount to apply to the fact she already knows, so step 3 is
   literally 296 + (−1) + (−1) rather than a translation out of arrows.
   U+2212 for the minus, not a hyphen — it is the same character the
   equations use and it balances the plus instead of sitting short. */
function effectLabel(n) {
    if (n === 0) return '0';
    return (n > 0 ? '+' : '−') + Math.abs(n);
}

function netPhrase(net) {
    if (net === 0) return 'and it does not move at all';
    const words = ['', 'one', 'two', 'three', 'four'];
    return `and it goes ${words[Math.abs(net)]} ${net > 0 ? 'higher' : 'lower'}`;
}

/* ── Drawing the two equations ─────────────────── */

function equation(start, taken, answer) {
    const frag = document.createDocumentFragment();
    const num = (value, role) => {
        const s = document.createElement('span');
        s.className = 'num';
        if (role) s.dataset.role = role;
        if (value === null) { s.textContent = '?'; s.classList.add('blank'); }
        else s.textContent = value;
        return s;
    };
    const op = (text) => {
        const s = document.createElement('span');
        s.className = 'op';
        s.textContent = text;
        return s;
    };
    frag.appendChild(num(start, 'start'));
    frag.appendChild(op('−'));
    frag.appendChild(num(taken, 'taken'));
    frag.appendChild(op('='));
    frag.appendChild(num(answer, 'answer'));
    return frag;
}

/* Lights the number the open step is asking about — the top one for step 1,
   the bottom one for step 2 — so she is looking at the right column without
   being told which.

   Only ever in the new equation. The fact above it is the thing she is
   leaning on and stays uniformly quiet: marking its number too would answer
   half the question, since spotting which one moved is the question. */
function light(role) {
    ui.problemEq.querySelectorAll('.num').forEach(n => {
        n.classList.remove('lit-start', 'lit-taken');
        if (role && n.dataset.role === role) n.classList.add(`lit-${role}`);
    });
}

/* ── Choice rows ───────────────────────────────── */

/* Every row is built up front but only answers to the step that owns it.
   Without the phase check a stray tap on a step she has not reached yet
   counts as a wrong answer and costs her the first-try streak. */
function renderChoices(container, phase, options, onPick) {
    container.replaceChildren();
    options.forEach(opt => {
        const b = document.createElement('button');
        b.className = 'choice';
        b.textContent = opt.label;
        b.addEventListener('click', () => {
            if (b.disabled || state.phase !== phase) return;
            onPick(opt.value, b, container);
        });
        container.appendChild(b);
    });
}

function lockRow(container, chosenBtn) {
    container.querySelectorAll('.choice').forEach(b => {
        b.disabled = true;
        b.classList.remove('wrong');
    });
    chosenBtn.classList.add('chosen');
}

/* Both halves answered: the four chips she passed over have done their job,
   so the step folds down to just the two she picked. By the time she is on
   the answer, her whole argument is two short lines and the two amounts she
   has to combine are the only numbers on them. */
function collapseStep(stepIndex, lead, amountChip, effectChip) {
    const row = stepIndex === 1 ? ui.summary1 : ui.summary2;

    const text = (t) => {
        const s = document.createElement('span');
        s.className = 'ask-text';
        s.textContent = t;
        return s;
    };
    /* A disabled button rather than a span, so it is the same chip she tapped
       — same size, same colour — and not a lookalike that has to be kept in
       step with it. */
    const chip = (t) => {
        const b = document.createElement('button');
        b.className = 'choice chosen';
        b.disabled = true;
        b.textContent = t;
        return b;
    };

    row.replaceChildren(text(lead), chip(amountChip),
                        text(EFFECT_PROMPT), chip(effectChip));
    ui.steps[stepIndex].classList.add('collapsed');
}

/* ── Messages ──────────────────────────────────── */

function say(text, kind) {
    ui.message.textContent = text;
    ui.message.className = kind || '';
}

function wrongTap(btn, hint) {
    state.cleanRound = false;
    btn.classList.add('wrong');
    say(hint, 'scold');
}

/* ── Step wiring ───────────────────────────────── */

function setPhase(phase) {
    state.phase = phase;

    const stepOf = { '1a': 1, '1b': 1, '2a': 2, '2b': 2, 'ans': 3, 'done': 3 };
    const current = stepOf[phase];

    ui.steps.forEach((step, i) => {
        if (!step) return;
        step.classList.toggle('live', i === current && phase !== 'done');
        step.classList.toggle('done', i < current || phase === 'done');
    });

    light(current === 1 ? 'start' : current === 2 ? 'taken' : null);
    ui.numpad.classList.toggle('hidden', phase !== 'ans');
}

function startRound() {
    const r = makeRound(state.mode);
    state.round = r;
    state.typed = '';
    state.cleanRound = true;

    ui.modeLabel.textContent = `Mode ${state.mode + 1} — ${r.modeLabel}`
        + (state.hold ? ' — staying here' : '');
    ui.anchorEq.replaceChildren(equation(r.anchor.start, r.anchor.taken, r.anchor.answer));
    ui.problemEq.replaceChildren(equation(r.start, r.taken, null));

    ui.ask1a.textContent = 'You started with…';
    ui.ask2a.textContent = 'You subtracted…';
    ui.answerBox.textContent = '?';
    ui.answerBox.className = '';
    /* openAnswer names the actual sum, but not until she gets there — until
       then this line would still be showing the previous round's equation. */
    ui.ask3.textContent = 'So the answer is';
    ui.row1b.classList.add('hidden');
    ui.row2b.classList.add('hidden');
    ui.choices1b.replaceChildren();
    ui.choices2b.replaceChildren();
    ui.summary1.replaceChildren();
    ui.summary2.replaceChildren();
    ui.steps[1].classList.remove('collapsed');
    ui.steps[2].classList.remove('collapsed');
    ui.continueBtn.classList.remove('shown');

    renderChoices(ui.choices1a, '1a',
        NUDGES.map(v => ({ value: v, label: amountLabel(v) })),
        (value, btn, row) => {
            if (value !== r.dStart) {
                return wrongTap(btn, compareHint('top', r.start, r.anchor.start));
            }
            lockRow(row, btn);
            say('');
            const startedWith = btn.textContent;
            /* The signed effect of the number she started with is simply how
               far it moved — more to start with, more left over. */
            openEffect(ui.row1b, ui.choices1b, r.dStart, '1b', (effectBtn) => {
                collapseStep(1, 'You started with…', startedWith, effectBtn.textContent);
                setPhase('2a');
            }, hintForStart(r));
        });

    renderChoices(ui.choices2a, '2a',
        NUDGES.map(v => ({ value: v, label: amountLabel(v) })),
        (value, btn, row) => {
            if (value !== r.dTaken) {
                return wrongTap(btn, compareHint('bottom', r.taken, r.anchor.taken));
            }
            lockRow(row, btn);
            say('');
            const gaveAway = btn.textContent;
            /* And the effect of the number she gave away is the opposite of
               how far it moved. The minus sign here is the whole lesson. */
            openEffect(ui.row2b, ui.choices2b, -r.dTaken, '2b', (effectBtn) => {
                collapseStep(2, 'You subtracted…', gaveAway, effectBtn.textContent);
                openAnswer(r);
            }, hintForTaken(r));
        });

    say('Work out what moved, one number at a time.', 'hint');
    setPhase('1a');
}

/* The second half of a step: which way that change pushes the answer. */
function openEffect(row, container, correct, phase, next, hint) {
    row.classList.remove('hidden');
    setPhase(phase);
    renderChoices(container, phase,
        NUDGES.map(v => ({ value: v, label: effectLabel(v) })),
        (value, btn, c) => {
            if (value !== correct) return wrongTap(btn, hint);
            lockRow(c, btn);
            say('');
            next(btn);
        });
}

/* Saying "157 against 157" when the number never moved is no help at all,
   so an unchanged number gets told plainly that it is unchanged. */
function compareHint(which, now, before) {
    if (now === before) return `Both ${which} numbers are ${now} — that one did not change.`;
    return `Compare the ${which} numbers: ${now} against ${before}.`;
}

function hintForStart(r) {
    if (r.dStart === 0) return 'The top number never moved, so on its own it changes nothing.';
    return r.dStart > 0
        ? 'You had more to begin with and gave away the same, so more is left.'
        : 'You had less to begin with and gave away the same, so less is left.';
}

/* The one she reverses. Said as plainly as it can be said. */
function hintForTaken(r) {
    if (r.dTaken === 0) return 'You gave away the same amount, so on its own it changes nothing.';
    return r.dTaken > 0
        ? 'You gave away more — so you keep less.'
        : 'You gave away less — so you keep more.';
}

/* ── Step 3: the answer ────────────────────────── */

/* Deliberately says nothing about the two amounts. Putting them together is
   the work now that the step which did it for her is gone — and both of them
   are still sitting on screen in the rows above. */
function openAnswer(r) {
    ui.ask3.textContent = `So ${r.start} − ${r.taken} is`;
    ui.answerBox.textContent = '?';
    state.wrongAnswers = 0;
    setPhase('ans');
}

function typeKey(key) {
    if (state.phase !== 'ans') return;
    const r = state.round;

    if (key === 'back') {
        state.typed = state.typed.slice(0, -1);
    } else if (key === 'enter') {
        if (!state.typed) return;
        if (Number(state.typed) !== r.answer) {
            state.cleanRound = false;
            state.wrongAnswers += 1;
            ui.answerBox.classList.add('wrong');
            /* Points her back at her own two amounts first. Only once she has
               missed twice does it combine them for her, so a stuck child is
               never stranded but a guessing one gets nothing for free. */
            say(state.wrongAnswers < 2
                ? `Not quite. Start at ${r.anchor.answer}, then move by both of your numbers.`
                : `Start at ${r.anchor.answer} ${netPhrase(r.net)}.`, 'scold');
            state.typed = '';
            setTimeout(() => ui.answerBox.classList.remove('wrong'), 600);
        } else {
            finishRound(r);
        }
    } else if (state.typed.length < 4) {
        state.typed += key;
        ui.answerBox.classList.remove('wrong');
    }

    if (state.phase === 'ans') ui.answerBox.textContent = state.typed || '?';
}

function finishRound(r) {
    const answerSlot = ui.problemEq.querySelector('[data-role="answer"]');
    answerSlot.textContent = r.answer;
    answerSlot.classList.remove('blank');

    ui.answerBox.textContent = r.answer;
    ui.answerBox.className = 'right';

    state.solved += 1;
    if (state.cleanRound) {
        state.firstTry += 1;
        state.cleanRun += 1;
    } else {
        state.cleanRun = 0;
    }
    ui.total.textContent = state.solved;
    ui.clean.textContent = state.firstTry;

    say(reasonFor(r), 'good');
    setPhase('done');
    light(null);

    if (!state.hold && state.cleanRun >= CLEAN_RUNS_TO_ADVANCE
        && state.mode < MODES.length - 1) {
        state.mode += 1;
        state.cleanRun = 0;
        const note = MODES[state.mode].advanceNote;
        say(`${reasonFor(r)}  —  ${note}!`, 'good');
    }

    ui.continueBtn.classList.add('shown');
}

/* One sentence she could repeat back, in the take-away words she already
   uses rather than the language of the steps. Both halves are always said,
   even when a number did not move — "and gave away the same" is the part
   that makes the other half mean anything. */
function reasonFor(r) {
    const moved = (d) => d === 0
        ? 'the same'
        : `${Math.abs(d)} ${d > 0 ? 'more' : 'less'}`;

    const why = r.net === 0
        ? 'those two cancel each other out, so you keep exactly the same'
        : `so you keep ${Math.abs(r.net)} ${r.net > 0 ? 'more' : 'less'}`;

    return `${r.start} − ${r.taken} = ${r.answer}.  `
         + `You started with ${moved(r.dStart)} and gave away ${moved(r.dTaken)} — ${why}.`;
}

/* ── Input ─────────────────────────────────────── */

ui.numpad.addEventListener('click', (e) => {
    const key = e.target.closest('.numkey');
    if (key) typeKey(key.dataset.key);
});

document.addEventListener('keydown', (e) => {
    if (state.phase === 'done' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        return startRound();
    }
    if (e.key >= '0' && e.key <= '9') typeKey(e.key);
    else if (e.key === 'Backspace') typeKey('back');
    else if (e.key === 'Enter') typeKey('enter');
});

ui.continueBtn.addEventListener('click', startRound);

startRound();
