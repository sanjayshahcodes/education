// Beginning Sounds — one picture per screen, tap the letter it starts with.
// All tuning lives in settings.js.

(function () {
    "use strict";

    const startScreen = document.getElementById("start-screen");
    const startButton = document.getElementById("start-button");
    const gameEl      = document.getElementById("game-container");
    const picture     = document.getElementById("picture");
    const wordHint    = document.getElementById("word-hint");
    const choices     = document.getElementById("choices");
    const starsEl     = document.getElementById("stars");
    const cheer       = document.getElementById("cheer");
    const sayAgain    = document.getElementById("say-again");
    const errorBox    = document.getElementById("setup-error");

    let deck = [];        // shuffled words still to come
    let current = null;   // { word, letter }
    let locked = false;   // ignore taps during the celebration

    // ── setup checks ────────────────────────────────────────

    function fail(msg) {
        errorBox.textContent = msg;
        errorBox.classList.remove("hidden");
        startScreen.classList.add("hidden");
        gameEl.classList.add("hidden");
    }

    function checkSettings() {
        if (typeof KNOWN_LETTERS === "undefined" || typeof WORD_LIBRARY === "undefined") {
            return "Could not load settings.js or words.js.";
        }
        if (!Array.isArray(KNOWN_LETTERS) || KNOWN_LETTERS.length < 2) {
            return "KNOWN_LETTERS in settings.js needs at least 2 letters.";
        }
        const unknown = KNOWN_LETTERS.filter(l => !WORD_LIBRARY[String(l).toUpperCase()]);
        if (unknown.length) {
            return "These letters in settings.js aren't in the word list: " + unknown.join(", ");
        }
        if (LETTER_OPTIONS > KNOWN_LETTERS.length) {
            return "LETTER_OPTIONS (" + LETTER_OPTIONS + ") is more than the "
                 + KNOWN_LETTERS.length + " letters in KNOWN_LETTERS.";
        }
        return null;
    }

    // Every word for the letters she knows, as { word, letter } pairs.
    function buildDeck() {
        const out = [];
        for (const letter of KNOWN_LETTERS) {
            const words = WORD_LIBRARY[String(letter).toUpperCase()] || [];
            for (const word of words) out.push({ word, letter: String(letter).toLowerCase() });
        }
        return out;
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    const imagePath = word => "images/" + encodeURIComponent(word) + ".jpg";

    // ── a single round ──────────────────────────────────────

    function nextRound() {
        if (deck.length === 0) deck = shuffle(buildDeck());
        current = deck.pop();
        locked = false;

        picture.src = imagePath(current.word);
        picture.alt = current.word;

        renderWordHint(current.word);

        renderChoices();
        speak(current.word);

        // fetch the next picture now so it appears instantly
        if (deck.length) new Image().src = imagePath(deck[deck.length - 1].word);
    }

    // The word under the picture, laid out on a handwriting triline the way
    // her worksheet does it — top line, dashed midline, solid baseline — with
    // the first letter's slot left empty for her to work out.
    function renderWordHint(word) {
        wordHint.innerHTML = "";
        if (!SHOW_WORD) return;

        [...word].forEach((ch, i) => {
            if (ch === " ") {
                const gap = document.createElement("span");
                gap.className = "gap";
                wordHint.appendChild(gap);
                return;
            }
            const slot = document.createElement("span");
            slot.className = "slot";
            if (i === 0) {
                slot.classList.add("blank");         // the letter she's identifying
            } else {
                const glyph = document.createElement("span");
                glyph.className = "glyph";
                glyph.textContent = LETTER_CASE === "upper"
                    ? ch.toUpperCase()
                    : ch.toLowerCase();
                slot.appendChild(glyph);
            }
            wordHint.appendChild(slot);
        });

        fitWordHint();
    }

    // The word is set as large as it will go. A few of the longest words
    // would spill past the edge of the card at that size, so those — and
    // only those — are scaled down just enough to fit.
    function fitWordHint() {
        wordHint.style.fontSize = "";                     // back to the CSS size
        const card = document.getElementById("picture-card");
        const cs = getComputedStyle(card);
        const avail = card.clientWidth
                    - parseFloat(cs.paddingLeft)
                    - parseFloat(cs.paddingRight);
        const needed = wordHint.scrollWidth;
        if (needed > avail && needed > 0) {
            const size = parseFloat(getComputedStyle(wordHint).fontSize);
            wordHint.style.fontSize = Math.floor(size * (avail / needed)) + "px";
        }
    }

    function renderChoices() {
        // one correct letter + wrong choices drawn only from letters she knows
        const pool = KNOWN_LETTERS
            .map(l => String(l).toLowerCase())
            .filter(l => l !== current.letter);
        const wanted = Math.min(LETTER_OPTIONS, KNOWN_LETTERS.length) - 1;
        const picked = shuffle(pool).slice(0, wanted);
        const letters = shuffle([current.letter, ...picked]);

        choices.innerHTML = "";
        for (const letter of letters) {
            const btn = document.createElement("button");
            btn.className = "choice";
            btn.textContent = LETTER_CASE === "upper"
                ? letter.toUpperCase()
                : letter.toLowerCase();
            btn.addEventListener("click", () => answer(btn, letter));
            choices.appendChild(btn);
        }
        sizeChoices(letters.length);
    }

    // Shrink the letter circles as LETTER_OPTIONS grows so they always fit
    // on screen — in landscape they stack vertically and would otherwise
    // run off the bottom past three or four.
    function sizeChoices(n) {
        const w = document.documentElement.clientWidth;
        const h = document.documentElement.clientHeight;
        const landscape = w > h;
        let size;

        if (landscape) {
            const gap   = Math.min(26, h * 0.022);
            const avail = h - 130;                  // less the star strip and replay button
            size = Math.min((avail - (n - 1) * gap) / n, h * 0.19, 165);
        } else {
            const gap   = Math.min(40, w * 0.03);
            const avail = w - 40;                   // less the container padding
            size = Math.min((avail - (n - 1) * gap) / n, h * 0.15, 150);
        }

        size = Math.max(64, Math.floor(size));      // never below a comfortable tap target
        choices.style.setProperty("--choice-size", size + "px");
    }

    function answer(btn, letter) {
        if (locked) return;

        if (letter === current.letter) {
            locked = true;
            btn.classList.add("right");
            chime();
            addStar();
            celebrate();
            setTimeout(nextRound, 1100);
        } else {
            // No penalty — dim the wrong choice, say the word again, let her retry.
            btn.classList.add("wrong");
            btn.disabled = true;
            buzz();
            setTimeout(() => speak(current.word), 350);
        }
    }

    // ── feedback ────────────────────────────────────────────

    function addStar() {
        const s = document.createElement("span");
        s.className = "star";
        s.textContent = "★";
        starsEl.appendChild(s);
        // keep the strip from overflowing
        while (starsEl.children.length > 12) starsEl.removeChild(starsEl.firstChild);
    }

    function celebrate() {
        cheer.textContent = ["🎉", "⭐", "🌟", "👏", "🎈"][Math.floor(Math.random() * 5)];
        cheer.classList.remove("hidden");
        cheer.classList.add("pop");
        setTimeout(() => {
            cheer.classList.add("hidden");
            cheer.classList.remove("pop");
        }, 900);
    }

    // ── audio ───────────────────────────────────────────────
    // iOS keeps audio muted until a real tap, so both the Web Audio
    // context and the first utterance are primed from the Start button.

    let audioCtx = null;

    function unlockAudio() {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (Ctx) {
                audioCtx = audioCtx || new Ctx();
                if (audioCtx.state === "suspended") audioCtx.resume();
            }
        } catch (e) { /* no Web Audio — game still works, just silent */ }

        try {
            if (SPEAK_WORD && "speechSynthesis" in window) {
                // a near-silent utterance is enough to open the channel
                const warm = new SpeechSynthesisUtterance(" ");
                warm.volume = 0;
                window.speechSynthesis.speak(warm);
            }
        } catch (e) { /* no voice available */ }
    }

    function tone(freq, start, dur, gainPeak) {
        if (!SOUND_EFFECTS || !audioCtx) return;
        try {
            const osc  = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            osc.connect(gain).connect(audioCtx.destination);
            const t = audioCtx.currentTime + start;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(gainPeak, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
            osc.start(t);
            osc.stop(t + dur);
        } catch (e) { /* not worth interrupting the game for */ }
    }

    function chime() {            // rising major triad
        tone(523.25, 0,    0.30, 0.25);
        tone(659.25, 0.10, 0.30, 0.25);
        tone(783.99, 0.20, 0.40, 0.25);
    }

    function buzz() {             // soft low blip, deliberately not harsh
        tone(196, 0, 0.18, 0.14);
    }

    function speak(word) {
        if (!SPEAK_WORD || !("speechSynthesis" in window)) return;
        try {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(word);
            u.rate  = 0.8;
            u.pitch = 1.1;
            window.speechSynthesis.speak(u);
        } catch (e) { /* no voice available */ }
    }

    // ── go ──────────────────────────────────────────────────

    const problem = checkSettings();
    if (problem) { fail(problem); return; }

    sayAgain.addEventListener("click", () => { if (current) speak(current.word); });

    // re-fit the letters and the word when the iPad is rotated
    window.addEventListener("resize", () => {
        const n = choices.children.length;
        if (n) sizeChoices(n);
        if (wordHint.children.length) fitWordHint();
    });

    startButton.addEventListener("click", () => {
        unlockAudio();
        startScreen.classList.add("hidden");
        gameEl.classList.remove("hidden");
        deck = shuffle(buildDeck());
        nextRound();
    });

})();
