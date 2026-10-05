/* What Changed? — problem generation and the modes.
   Kept apart from the UI the same way compute-efficiently does it, so the
   teaching order can be read in one place without wading through rendering. */

/* Every question draws its nudge from the same five, so the chips are
   identical in every mode and the width of a row never hints at the answer. */
const NUDGES = [-2, -1, 0, 1, 2];

/* ?mode=N picks one. Each decides only how the two numbers are allowed to
   move; everything else about a round is the same. */
const MODES = [
    {
        /* One number moves and the other stays put, by one or two, and which
           one it is alternates. The number that did not move still gets asked
           about, so "Same" stays a live answer rather than a chip she learns
           to ignore. */
        label: 'One number changes',
        deltas: () => {
            const by = pickNudge();
            return Math.random() < 0.5 ? [by, 0] : [0, by];
        },
    },
    {
        /* Everything from mode 1, plus both numbers moving by one — where her
           two amounts either cancel to nothing or stack to two.

           Split evenly between the two families rather than pooled: mode 1
           has eight shapes to this one's four, so pooling them would leave
           the new material in a third of the rounds instead of half. */
        label: 'One or both change',
        advanceNote: 'now both numbers can move',
        deltas: () => Math.random() < 0.5
            ? MODES[0].deltas()
            : [pickSign(), pickSign()],
    },
];

/* Four clean runs before the next mode opens. Low enough that a good day
   moves her along, high enough that one lucky guess doesn't. */
const CLEAN_RUNS_TO_ADVANCE = 4;

/* ±1, for the mode where both numbers move at once. */
function pickSign() {
    return Math.random() < 0.5 ? 1 : -1;
}

/* ±1 or ±2, never 0 — this is the number that is meant to have moved. */
function pickNudge() {
    return (Math.random() < 0.5 ? 1 : -1) * (Math.random() < 0.5 ? 1 : 2);
}

function randomInt(lo, hi) {
    return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/* The fact she is handed. It has to look like the three-digit subtraction she
   actually struggles with — so it borrows somewhere — but the units digits are
   kept clear of 0, 1, 8 and 9. A nudge of ±2 then stays inside the units
   column instead of rolling over a ten, which would drag the whole problem
   back to the regrouping she is not being asked about here. */
function makeAnchor() {
    for (let tries = 0; tries < 400; tries++) {
        const start = randomInt(3, 8) * 100 + randomInt(0, 9) * 10 + randomInt(2, 7);
        const taken = randomInt(1, 2) * 100 + randomInt(0, 9) * 10 + randomInt(2, 7);

        if (taken >= start) continue;
        if (start - taken < 100) continue;

        // A borrow somewhere, so it reads as a hard problem and not a freebie.
        const borrows = (start % 10) < (taken % 10)
                     || Math.floor(start / 10) % 10 < Math.floor(taken / 10) % 10;
        if (!borrows) continue;

        return { start, taken, answer: start - taken };
    }
    return { start: 424, taken: 128, answer: 296 };
}

/* One full round: the given fact, the variant built off it, and everything
   the three steps will be checked against. */
function makeRound(modeIndex) {
    const mode = MODES[Math.min(modeIndex, MODES.length - 1)];
    const anchor = makeAnchor();

    let dStart, dTaken;
    do {
        [dStart, dTaken] = mode.deltas();
    } while (dStart === 0 && dTaken === 0);   // nothing moved is not a problem

    /* Taking more away pulls the answer down. The game asks for each number's
       effect as a signed amount, so the effects are just dStart and −dTaken;
       script.js applies that sign where it is picked. */
    const net = dStart - dTaken;

    return {
        anchor,
        start: anchor.start + dStart,
        taken: anchor.taken + dTaken,
        answer: anchor.answer + net,
        dStart,
        dTaken,
        net,
        modeLabel: mode.label,
    };
}
