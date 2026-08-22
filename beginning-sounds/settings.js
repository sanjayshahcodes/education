// ============================================================
//  SETTINGS — edit this file to change how the game plays.
//  Nothing else needs to be touched.
// ============================================================


// ── 1. Which letters does she know? ─────────────────────────
//
// Only these letters are used in the game — both for the answer
// and for the wrong choices she picks between. Add a letter here
// once she's learned its sound.
//
// All 26: a b c d e f g h i j k l m n o p q r s t u v w x y z

const KNOWN_LETTERS = [
  "a", "b", "c", "d", "e", "f", "g", "h", "i",
  "j", "k", "l", "o", "p", "r", "s", "t", "u",
];


// ── 2. How many letters to choose from? ─────────────────────
//
// 3 is a good starting point. Raise it as she gets more
// confident — 4, then 5. It can't go higher than the number of
// letters in KNOWN_LETTERS above.

const LETTER_OPTIONS = 3;


// ============================================================
//  Optional extras — all fine to leave as they are.
// ============================================================


// Say the word out loud when each picture appears, and again if
// she taps the wrong letter. Uses the device's built-in voice.
// This matters: it means she never has to guess what a picture
// is called. Set to false for silent play.
const SPEAK_WORD = true;

// Show the word under the picture with the first letter blanked
// out, the way her worksheet does:  _pple
// Set to false to show the picture only.
const SHOW_WORD = true;

// "lower" → a b c      "upper" → A B C
const LETTER_CASE = "lower";

// Play a chime when she gets it right.
const SOUND_EFFECTS = true;
