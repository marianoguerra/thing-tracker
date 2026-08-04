/**
 * A curated emoji palette.
 *
 * Deliberately not an emoji-picker library: those ship a few hundred kB of
 * Unicode data and usually fetch it, both wrong for an app that must work
 * offline on first launch. A curated set is also the better product — for a
 * tracker, 250 relevant symbols beat 1800 irrelevant ones.
 *
 * Entries avoid ZWJ sequences and skin-tone modifiers, which render as tofu on
 * older Android and Windows. Anything outside this list can still be pasted
 * into the picker's free-text field.
 */

export type EmojiCategory =
  | "Food & drink"
  | "Health"
  | "Activity"
  | "Rest"
  | "Mood"
  | "Focus"
  | "Home"
  | "Nature & pets"
  | "Places"
  | "Social"
  | "Money"
  | "Symbols";

export type EmojiEntry = {
  char: string;
  name: string;
  keywords: string[];
  category: EmojiCategory;
};

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  "Food & drink",
  "Health",
  "Activity",
  "Rest",
  "Mood",
  "Focus",
  "Home",
  "Nature & pets",
  "Places",
  "Social",
  "Money",
  "Symbols",
];

const e = (
  char: string,
  name: string,
  category: EmojiCategory,
  ...keywords: string[]
): EmojiEntry => ({ char, name, category, keywords });

export const EMOJI_PALETTE: EmojiEntry[] = [
  // ── Food & drink ─────────────────────────────────────────────────────────
  e("💧", "Water", "Food & drink", "hydration", "drink", "droplet"),
  e("☕", "Coffee", "Food & drink", "caffeine", "espresso", "drink"),
  e("🍵", "Tea", "Food & drink", "green tea", "matcha", "drink"),
  e("🥤", "Soft drink", "Food & drink", "soda", "cup", "straw"),
  e("🧃", "Juice", "Food & drink", "box", "drink"),
  e("🥛", "Milk", "Food & drink", "dairy", "glass"),
  e("🍺", "Beer", "Food & drink", "alcohol", "pint", "pub"),
  e("🍷", "Wine", "Food & drink", "alcohol", "glass"),
  e("🥃", "Spirits", "Food & drink", "whisky", "alcohol", "tumbler"),
  e("🍎", "Apple", "Food & drink", "fruit", "snack"),
  e("🍌", "Banana", "Food & drink", "fruit", "snack"),
  e("🍓", "Strawberry", "Food & drink", "fruit", "berry"),
  e("🥑", "Avocado", "Food & drink", "fruit", "fat"),
  e("🥦", "Broccoli", "Food & drink", "vegetable", "greens"),
  e("🥕", "Carrot", "Food & drink", "vegetable"),
  e("🥗", "Salad", "Food & drink", "greens", "healthy", "lunch"),
  e("🍚", "Rice", "Food & drink", "grain", "bowl"),
  e("🍞", "Bread", "Food & drink", "carbs", "toast"),
  e("🥚", "Egg", "Food & drink", "protein", "breakfast"),
  e("🍗", "Chicken", "Food & drink", "meat", "protein"),
  e("🥩", "Meat", "Food & drink", "steak", "protein"),
  e("🐟", "Fish", "Food & drink", "seafood", "protein"),
  e("🍝", "Pasta", "Food & drink", "spaghetti", "dinner"),
  e("🍕", "Pizza", "Food & drink", "takeaway", "dinner"),
  e("🍔", "Burger", "Food & drink", "fast food", "takeaway"),
  e("🌮", "Taco", "Food & drink", "mexican"),
  e("🍜", "Noodles", "Food & drink", "ramen", "soup"),
  e("🍲", "Stew", "Food & drink", "soup", "pot"),
  e("🥣", "Cereal", "Food & drink", "breakfast", "bowl", "porridge"),
  e("🍫", "Chocolate", "Food & drink", "sweet", "snack", "sugar"),
  e("🍪", "Cookie", "Food & drink", "sweet", "snack", "biscuit"),
  e("🍰", "Cake", "Food & drink", "sweet", "dessert"),
  e("🍦", "Ice cream", "Food & drink", "sweet", "dessert"),
  e("🍿", "Popcorn", "Food & drink", "snack", "cinema"),
  e("🥜", "Nuts", "Food & drink", "snack", "peanut"),
  e("🧂", "Salt", "Food & drink", "seasoning", "sodium"),
  e("🍽️", "Meal", "Food & drink", "dinner", "plate", "eat"),
  e("🥡", "Takeaway", "Food & drink", "takeout", "delivery"),

  // ── Health ───────────────────────────────────────────────────────────────
  e("💊", "Medication", "Health", "pill", "meds", "medicine", "tablet"),
  e("💉", "Injection", "Health", "shot", "vaccine", "insulin"),
  e("🩺", "Check-up", "Health", "doctor", "stethoscope", "appointment"),
  e("🌡️", "Temperature", "Health", "fever", "thermometer"),
  e("🩹", "Bandage", "Health", "injury", "plaster", "wound"),
  e("🦷", "Teeth", "Health", "dental", "brush", "floss"),
  e("🤕", "Headache", "Health", "pain", "migraine", "hurt"),
  e("🤒", "Sick", "Health", "ill", "fever", "unwell"),
  e("🤧", "Sneeze", "Health", "cold", "allergy", "hayfever"),
  e("😷", "Mask", "Health", "sick", "contagious"),
  e("🫀", "Heart rate", "Health", "cardio", "pulse", "bp"),
  e("🫁", "Breathing", "Health", "lungs", "breath", "asthma"),
  e("🧠", "Mind", "Health", "brain", "mental", "therapy"),
  e("🦴", "Bones", "Health", "joint", "skeleton"),
  e("👁️", "Eyes", "Health", "vision", "sight", "optician"),
  e("👂", "Ears", "Health", "hearing", "sound"),
  e("🩸", "Blood", "Health", "period", "test", "glucose"),
  e("⚖️", "Weight", "Health", "scale", "weigh"),
  e("🧴", "Skincare", "Health", "lotion", "sunscreen", "cream"),
  e("🚿", "Shower", "Health", "wash", "bath", "hygiene"),
  e("🛁", "Bath", "Health", "soak", "wash"),
  e("🪥", "Toothbrush", "Health", "brush", "dental", "hygiene"),

  // ── Activity ─────────────────────────────────────────────────────────────
  e("🏃", "Run", "Activity", "running", "jog", "cardio"),
  e("🚶", "Walk", "Activity", "walking", "steps", "stroll"),
  e("🥾", "Hike", "Activity", "hiking", "trail", "outdoors"),
  e("🚴", "Cycle", "Activity", "bike", "cycling", "ride"),
  e("🏊", "Swim", "Activity", "swimming", "pool", "laps"),
  e("🏋️", "Gym", "Activity", "weights", "lifting", "strength"),
  e("🧘", "Yoga", "Activity", "meditate", "stretch", "mindful"),
  e("🤸", "Stretch", "Activity", "mobility", "flexibility", "warmup"),
  e("⚽", "Football", "Activity", "soccer", "match", "sport"),
  e("🏀", "Basketball", "Activity", "hoops", "sport"),
  e("🎾", "Tennis", "Activity", "racket", "sport"),
  e("🏐", "Volleyball", "Activity", "sport"),
  e("🏓", "Table tennis", "Activity", "ping pong", "sport"),
  e("🏸", "Badminton", "Activity", "racket", "sport"),
  e("🧗", "Climb", "Activity", "climbing", "bouldering"),
  e("⛷️", "Ski", "Activity", "skiing", "snow"),
  e("🏄", "Surf", "Activity", "surfing", "waves"),
  e("🛹", "Skate", "Activity", "skateboard"),
  e("🥋", "Martial arts", "Activity", "judo", "karate", "bjj"),
  e("🤾", "Handball", "Activity", "sport"),
  e("🏹", "Archery", "Activity", "bow", "sport"),
  e("⛳", "Golf", "Activity", "sport"),
  e("🚣", "Rowing", "Activity", "boat", "erg"),
  e("🧎", "Kneel", "Activity", "pray", "stretch"),

  // ── Rest ─────────────────────────────────────────────────────────────────
  e("😴", "Sleep", "Rest", "asleep", "bedtime", "nap"),
  e("🛏️", "Bed", "Rest", "bedtime", "sleep"),
  e("🌙", "Night", "Rest", "moon", "evening", "bedtime"),
  e("🌅", "Wake up", "Rest", "sunrise", "morning", "awake"),
  e("⏰", "Alarm", "Rest", "wake", "clock", "morning"),
  e("🥱", "Tired", "Rest", "yawn", "sleepy", "fatigue"),
  e("💤", "Nap", "Rest", "doze", "snooze", "sleep"),
  e("🛋️", "Rest", "Rest", "couch", "relax", "lounge"),
  e("🧖", "Sauna", "Rest", "spa", "steam", "relax"),
  e("🕯️", "Wind down", "Rest", "candle", "calm", "evening"),

  // ── Mood ─────────────────────────────────────────────────────────────────
  e("🤩", "Great", "Mood", "excited", "amazing", "star"),
  e("😊", "Happy", "Mood", "good", "smile", "content"),
  e("🙂", "Okay", "Mood", "fine", "alright", "neutral"),
  e("😐", "Meh", "Mood", "neutral", "flat", "indifferent"),
  e("😔", "Low", "Mood", "sad", "down", "blue"),
  e("😢", "Upset", "Mood", "crying", "tears", "sad"),
  e("😠", "Angry", "Mood", "cross", "mad", "frustrated"),
  e("😰", "Anxious", "Mood", "worried", "stress", "nervous"),
  e("😌", "Calm", "Mood", "relieved", "peaceful", "relaxed"),
  e("🥳", "Celebrate", "Mood", "party", "win", "milestone"),
  e("😤", "Frustrated", "Mood", "annoyed", "steam"),
  e("🫠", "Overwhelmed", "Mood", "melting", "burnout", "too much"),
  e("🌫️", "Foggy", "Mood", "brain fog", "unfocused", "hazy"),
  e("🙃", "Silly", "Mood", "upside down", "wry"),
  e("😅", "Relieved", "Mood", "phew", "close call"),
  e("🥰", "Loved", "Mood", "affection", "warm"),
  e("😎", "Confident", "Mood", "cool", "good day"),
  e("🤔", "Pensive", "Mood", "thinking", "unsure"),

  // ── Focus ────────────────────────────────────────────────────────────────
  e("🎯", "Deep work", "Focus", "focus", "target", "concentrate"),
  e("💻", "Computer", "Focus", "laptop", "work", "coding"),
  e("⌨️", "Typing", "Focus", "keyboard", "writing"),
  e("📞", "Call", "Focus", "phone", "ring"),
  e("📅", "Meeting", "Focus", "calendar", "appointment", "standup"),
  e("📝", "Write", "Focus", "notes", "journal", "memo"),
  e("📚", "Study", "Focus", "read", "books", "learn"),
  e("📖", "Read", "Focus", "book", "reading", "chapter"),
  e("🎓", "Course", "Focus", "learn", "class", "lecture"),
  e("🗣️", "Language", "Focus", "practice", "speaking", "duolingo"),
  e("🖥️", "Code", "Focus", "programming", "dev", "build"),
  e("📊", "Review", "Focus", "chart", "analysis", "report"),
  e("✅", "Done", "Focus", "task", "complete", "tick"),
  e("🚫", "Distraction", "Focus", "blocked", "avoid", "no"),
  e("⏱️", "Pomodoro", "Focus", "timer", "session", "stopwatch"),
  e("⏸️", "Break", "Focus", "pause", "rest", "downtime"),
  e("🎨", "Create", "Focus", "art", "draw", "design"),
  e("🎸", "Practice", "Focus", "guitar", "instrument", "music"),
  e("🎹", "Piano", "Focus", "keys", "instrument", "music"),
  e("🎤", "Sing", "Focus", "voice", "karaoke", "music"),
  e("📷", "Photo", "Focus", "camera", "shoot", "picture"),
  e("🎬", "Film", "Focus", "video", "edit", "record"),

  // ── Home ─────────────────────────────────────────────────────────────────
  e("🧹", "Tidy", "Home", "clean", "sweep", "chores"),
  e("🧽", "Clean", "Home", "scrub", "wipe", "chores"),
  e("🧺", "Laundry", "Home", "washing", "clothes", "chores"),
  e("👕", "Fold", "Home", "clothes", "laundry"),
  e("🍴", "Dishes", "Home", "washing up", "kitchen", "chores"),
  e("🗑️", "Bins", "Home", "trash", "rubbish", "garbage"),
  e("♻️", "Recycling", "Home", "recycle", "bins"),
  e("🪴", "Plants", "Home", "water plants", "garden", "houseplant"),
  e("🌱", "Garden", "Home", "seedling", "grow", "plant"),
  e("🛒", "Groceries", "Home", "shopping", "food shop", "supermarket"),
  e("🔧", "Fix", "Home", "repair", "diy", "maintenance"),
  e("🔨", "Build", "Home", "diy", "hammer", "project"),
  e("🧰", "Maintenance", "Home", "toolbox", "diy", "service"),
  e("🛠️", "Chore", "Home", "tools", "task", "diy"),
  e("🪟", "Windows", "Home", "clean", "chores"),
  e("🧻", "Restock", "Home", "supplies", "household", "refill"),

  // ── Nature & pets ────────────────────────────────────────────────────────
  e("🐕", "Dog", "Nature & pets", "walk", "pet", "puppy"),
  e("🐈", "Cat", "Nature & pets", "pet", "kitty"),
  e("🐾", "Pet", "Nature & pets", "paws", "animal"),
  e("🍖", "Pet food", "Nature & pets", "feed", "meal", "bowl"),
  e("🏥", "Vet", "Nature & pets", "clinic", "appointment"),
  e("✂️", "Groom", "Nature & pets", "trim", "brush", "clip"),
  e("🐦", "Bird", "Nature & pets", "birds", "watching"),
  e("🐠", "Fish tank", "Nature & pets", "aquarium", "pet"),
  e("☀️", "Sunny", "Nature & pets", "sun", "weather", "clear"),
  e("🌧️", "Rain", "Nature & pets", "weather", "wet"),
  e("❄️", "Cold", "Nature & pets", "snow", "weather", "freeze"),
  e("🌬️", "Wind", "Nature & pets", "weather", "breezy"),
  e("🌊", "Sea", "Nature & pets", "ocean", "swim", "beach"),
  e("🌳", "Outdoors", "Nature & pets", "tree", "park", "nature"),
  e("🏔️", "Mountain", "Nature & pets", "hike", "peak", "outdoors"),
  e("🔥", "Streak", "Nature & pets", "fire", "hot", "burn"),

  // ── Places ───────────────────────────────────────────────────────────────
  e("🏠", "Home", "Places", "house", "in", "indoors"),
  e("🏢", "Office", "Places", "work", "building", "commute"),
  e("🚗", "Drive", "Places", "car", "commute", "trip"),
  e("🚌", "Bus", "Places", "commute", "transit"),
  e("🚆", "Train", "Places", "commute", "rail", "transit"),
  e("✈️", "Flight", "Places", "plane", "travel", "trip"),
  e("⛽", "Fuel", "Places", "petrol", "gas", "fill up"),
  e("🅿️", "Parking", "Places", "park", "car"),
  e("🛍️", "Shopping", "Places", "shops", "buy", "retail"),
  e("🏪", "Shop", "Places", "store", "corner shop"),
  e("🏟️", "Venue", "Places", "stadium", "match", "event"),
  e("🏖️", "Beach", "Places", "holiday", "seaside"),
  e("🎡", "Outing", "Places", "day out", "fun", "trip"),
  e("⛪", "Service", "Places", "church", "worship", "faith"),
  e("🏫", "School", "Places", "class", "pickup", "drop off"),
  e("🧳", "Travel", "Places", "trip", "luggage", "packing"),

  // ── Social ───────────────────────────────────────────────────────────────
  e("👋", "Met someone", "Social", "hello", "meet", "greet"),
  e("💬", "Chat", "Social", "message", "text", "talk"),
  e("📱", "Phone", "Social", "screen", "mobile", "scroll"),
  e("👪", "Family", "Social", "kids", "relatives", "family time"),
  e("👥", "Friends", "Social", "hangout", "social", "mates"),
  e("🎉", "Party", "Social", "celebration", "event"),
  e("🍻", "Drinks out", "Social", "pub", "bar", "social"),
  e("🎲", "Games night", "Social", "board games", "play"),
  e("🎮", "Gaming", "Social", "video games", "console", "play"),
  e("📺", "TV", "Social", "watch", "series", "screen"),
  e("🎧", "Podcast", "Social", "listen", "audio", "music"),
  e("🎵", "Music", "Social", "listen", "song"),
  e("🎥", "Cinema", "Social", "film", "movie"),
  e("💌", "Wrote to", "Social", "letter", "email", "note"),
  e("🫂", "Support", "Social", "hug", "comfort", "care"),
  e("🙏", "Gratitude", "Social", "thanks", "grateful", "pray"),

  // ── Money ────────────────────────────────────────────────────────────────
  e("💰", "Money", "Money", "cash", "savings", "funds"),
  e("💸", "Spent", "Money", "expense", "outgoing", "purchase"),
  e("💳", "Card", "Money", "payment", "spend", "debit"),
  e("🧾", "Receipt", "Money", "bill", "expense", "invoice"),
  e("🏦", "Bank", "Money", "banking", "transfer"),
  e("📈", "Saved", "Money", "invest", "growth", "up"),
  e("📉", "Loss", "Money", "down", "decline"),
  e("🎁", "Gift", "Money", "present", "treat"),
  e("🪙", "Small spend", "Money", "coin", "change"),
  e("🛜", "Subscription", "Money", "recurring", "bill", "service"),

  // ── Symbols ──────────────────────────────────────────────────────────────
  e("⭐", "Star", "Symbols", "favourite", "highlight", "good"),
  e("❤️", "Love", "Symbols", "heart", "like"),
  e("⚡", "Energy", "Symbols", "bolt", "quick", "power"),
  e("🔔", "Reminder", "Symbols", "bell", "alert", "notify"),
  e("📌", "Pin", "Symbols", "mark", "note"),
  e("🏁", "Finished", "Symbols", "end", "complete", "flag"),
  e("🔁", "Repeat", "Symbols", "again", "recurring", "loop"),
  e("➕", "Add", "Symbols", "plus", "more", "increase"),
  e("➖", "Subtract", "Symbols", "minus", "less", "decrease"),
  e("❓", "Question", "Symbols", "unsure", "unknown", "query"),
  e("❗", "Important", "Symbols", "alert", "urgent", "warning"),
  e("🟢", "Good", "Symbols", "green", "yes", "positive"),
  e("🟡", "Mixed", "Symbols", "yellow", "maybe", "middling"),
  e("🔴", "Bad", "Symbols", "red", "no", "negative"),
  e("🔵", "Note", "Symbols", "blue", "info", "neutral"),
  e("🧿", "Other", "Symbols", "misc", "general"),
];

/** Fast lookup for "does the palette know this character?". */
export const EMOJI_BY_CHAR = new Map(EMOJI_PALETTE.map((entry) => [entry.char, entry]));
