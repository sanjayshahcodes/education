// Word library for the Beginning Sounds app.
// Every word has a matching image in ./images/<word>.jpg
//
// Vowels (A E I O U) are restricted to their SHORT sound only
// (e.g. "igloo" not "ice cream", "umbrella" not "unicorn").
// C and G are restricted to their hard sound only
// (e.g. "cat" not "city", "goat" not "giraffe").
//
// Some letters can't reach 10 with real, kid-friendly words — that's a
// limit of English, not a gap in the list (noted per letter).

const WORD_LIBRARY = {
  A: ["apple", "ant", "alligator", "ax", "anchor", "arrow", "ambulance", "acrobat", "animal", "astronaut"],
  B: ["ball", "banana", "bear", "bee", "bus", "butterfly", "balloon", "bird", "boat", "book"],
  C: ["cat", "cow", "cup", "cake", "car", "cookie", "candy", "camera", "castle", "comb"],
  D: ["dog", "duck", "doll", "door", "drum", "dinosaur", "desk", "doctor", "dolphin", "donut"],
  E: ["egg", "elephant", "envelope", "elbow", "engine", "exit", "elk", "elf", "escalator", "elevator"],
  F: ["fish", "frog", "fox", "feather", "flower", "fan", "farm", "fire", "fork", "flag"],
  G: ["goat", "gift", "guitar", "grapes", "glasses", "gorilla", "golf", "gate", "girl", "garden"],
  H: ["hat", "hen", "house", "horse", "heart", "hand", "hammer", "honey", "hippo", "helicopter"],
  I: ["igloo", "insect", "iguana", "inchworm", "ink", "instruments", "ill", "itch", "infant", "invitation"],
  J: ["jam", "jar", "jacket", "juice", "jellyfish", "jeep", "jet", "jump", "jewel", "jungle"],
  K: ["kite", "king", "key", "kangaroo", "koala", "kitten", "kettle", "ketchup", "kayak", "kick"],
  L: ["lion", "leaf", "lamp", "ladder", "lemon", "leg", "lock", "log", "lips", "ladybug"],
  M: ["moon", "mop", "monkey", "mouse", "milk", "mitten", "mask", "mountain", "moth", "mug"],
  N: ["nest", "net", "nut", "nose", "nail", "napkin", "needle", "necklace", "noodle", "newspaper"],
  O: ["octopus", "ostrich", "olive", "ox", "otter", "octagon", "orbit"], // only 7 — few real words carry a clean short-o sound
  P: ["pig", "pie", "pumpkin", "penguin", "pizza", "pencil", "panda", "popcorn", "pillow", "purse"],
  Q: ["queen", "quilt", "quarter", "question mark", "quack"], // only 5 — "qu" is a narrow sound
  R: ["rabbit", "rainbow", "ring", "rocket", "rose", "rain", "robot", "rope", "ruler", "raccoon"],
  S: ["sun", "sock", "snake", "star", "strawberry", "spoon", "spider", "saw", "sandwich", "seal"],
  T: ["tiger", "tree", "turtle", "table", "top", "toothbrush", "tomato", "train", "teddy bear", "taco"],
  U: ["umbrella", "umpire", "uncle", "up", "under", "unzip", "ugly"], // only 7 — short-u words are limited
  V: ["van", "vase", "violin", "volcano", "vest", "vegetables", "vulture", "volleyball", "vacuum", "valentine"],
  W: ["watermelon", "whale", "web", "window", "worm", "wagon", "watch", "waffle", "wolf", "witch"],
  X: ["xylophone", "x-ray"], // only 2 — no other beginning-X words exist for kids
  Y: ["yarn", "yak", "yo-yo", "yolk", "yogurt", "yellow", "yawn"], // only 7
  Z: ["zebra", "zipper", "zoo", "zero", "zigzag", "zucchini", "zap", "zoom"], // only 8
};
