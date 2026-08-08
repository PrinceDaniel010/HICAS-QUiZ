const bcrypt = require('bcryptjs');
const db = require('./index');

function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, String(value));
}

function seedSettings() {
  setSetting('event_name', 'Department Quiz Fest 2026');
  setSetting('round1_question_count', 20);
  setSetting('round2_question_count', 20);
  setSetting('round3_question_count', 30);
  setSetting('round1_pass_mark', 12);
  setSetting('round2_pass_mark', 12);
  setSetting('question_time_limit_sec', 20);
  console.log('Settings ready.');
}

function seedOwnerAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe@123';
  const existing = db.prepare('SELECT username FROM admins WHERE username = ?').get(username);
  if (!existing) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, 'owner');
    console.log(`Owner admin account created -> username: "${username}" password: "${password}"`);
    console.log('IMPORTANT: change this password after first login. Add other organizer accounts from Admin > Organizers.');
  } else {
    console.log('Owner admin account already exists, skipping.');
  }
}

// ---------------- Round 1: General MCQ (20) ----------------
const round1 = [
  ["Who is known as the father of computers?", "Charles Babbage", "Alan Turing", "Isaac Newton", "Bill Gates", "A", "Technology"],
  ["Which planet is known as the Red Planet?", "Venus", "Mars", "Jupiter", "Saturn", "B", "Science"],
  ["What does 'WWW' stand for?", "World Wide Web", "World Wide Wire", "Web Wide World", "Wide World Web", "A", "Technology"],
  ["Who painted the Mona Lisa?", "Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Claude Monet", "C", "Art"],
  ["Which is the largest ocean on Earth?", "Atlantic", "Indian", "Arctic", "Pacific", "D", "Geography"],
  ["What is the national bird of India?", "Peacock", "Sparrow", "Eagle", "Parrot", "A", "General"],
  ["How many continents are there on Earth?", "5", "6", "7", "8", "C", "Geography"],
  ["Which gas do plants absorb from the atmosphere?", "Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen", "C", "Science"],
  ["Who wrote the Indian national anthem?", "Bankim Chandra", "Rabindranath Tagore", "Sarojini Naidu", "Subhas Chandra Bose", "B", "General"],
  ["What is the currency of Japan?", "Yuan", "Won", "Yen", "Ringgit", "C", "General"],
  ["Which company created the Android operating system?", "Apple", "Microsoft", "Google", "Samsung", "C", "Technology"],
  ["How many players are there in a cricket team?", "9", "10", "11", "12", "C", "Sports"],
  ["What is H2O commonly known as?", "Salt", "Water", "Oxygen", "Hydrogen Peroxide", "B", "Science"],
  ["Which is the tallest mountain in the world?", "K2", "Kangchenjunga", "Mount Everest", "Makalu", "C", "Geography"],
  ["What does 'CPU' stand for?", "Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Control Processing Unit", "A", "Technology"],
  ["Which festival is known as the 'Festival of Lights'?", "Holi", "Diwali", "Eid", "Christmas", "B", "General"],
  ["Who was the first Prime Minister of India?", "Mahatma Gandhi", "Jawaharlal Nehru", "Sardar Patel", "Dr. Rajendra Prasad", "B", "History"],
  ["Which organ pumps blood in the human body?", "Lungs", "Brain", "Heart", "Kidney", "C", "Science"],
  ["What is the capital city of Australia?", "Sydney", "Melbourne", "Canberra", "Perth", "C", "Geography"],
  ["Which shape has three sides?", "Square", "Triangle", "Pentagon", "Hexagon", "B", "General"],
];

// ---------------- Round 2: Truth or Lie (20) ----------------
// [statement, isTrue, category]
const round2 = [
  ["The Great Wall of China is visible to the naked eye from the Moon.", false, "General"],
  ["Python is a programming language named after a snake.", false, "Technology"],
  ["The human body has 206 bones in adulthood.", true, "Science"],
  ["Mount Everest is located in Nepal.", true, "Geography"],
  ["A group of lions is called a pride.", true, "General"],
  ["The Eiffel Tower is located in London.", false, "Geography"],
  ["HTML is a programming language.", false, "Technology"],
  ["The heart has four chambers.", true, "Science"],
  ["India got independence in 1947.", true, "History"],
  ["Sharks are mammals.", false, "Science"],
  ["The currency of the USA is the Dollar.", true, "General"],
  ["Cricket is played with a bat and a shuttlecock.", false, "Sports"],
  ["Google was founded by Larry Page and Sergey Brin.", true, "Technology"],
  ["The Sun rises in the West.", false, "General"],
  ["Water boils at 100 degrees Celsius at sea level.", true, "Science"],
  ["Ottawa is the capital of Canada.", true, "Geography"],
  ["A century in cricket means scoring 100 runs.", true, "Sports"],
  ["Facebook was originally called 'Thefacebook'.", true, "Technology"],
  ["The Sahara is the largest desert in the world.", false, "Geography"],
  ["Albert Einstein developed the theory of relativity.", true, "Science"],
];

// ---------------- Round 3: Connections (30) ----------------
// [clue1, clue2, clue3, clue4, optionA, optionB, optionC, optionD, correctLetter, category]
// The 4 clues share a hidden theme; students pick the theme from 4 options.
const round3 = [
  ["Java", "Python", "Ruby", "Swift", "Types of snakes", "Programming languages", "Yoga poses", "Coffee blends", "B", "Technology"],
  ["Apple", "Windows", "Linux", "Android", "Fruits", "Operating systems", "Companies", "Car brands", "B", "Technology"],
  ["Nile", "Amazon", "Ganga", "Yangtze", "Mountain ranges", "Rivers", "Deserts", "Oceans", "B", "Geography"],
  ["Messi", "Ronaldo", "Neymar", "Mbappe", "Cricketers", "Footballers", "Tennis players", "Chess players", "B", "Sports"],
  ["Mercury", "Venus", "Mars", "Jupiter", "Stars", "Planets", "Moons", "Galaxies", "B", "Science"],
  ["Diwali", "Holi", "Pongal", "Onam", "Indian states", "Indian festivals", "Indian rivers", "Indian dances", "B", "General"],
  ["RAM", "ROM", "CPU", "GPU", "Car parts", "Computer components", "Kitchen appliances", "Musical instruments", "B", "Technology"],
  ["Iron Man", "Thor", "Hulk", "Captain America", "DC characters", "Marvel Avengers", "Star Wars characters", "Anime heroes", "B", "Entertainment"],
  ["Sachin Tendulkar", "Virat Kohli", "MS Dhoni", "Kapil Dev", "Footballers", "Indian cricketers", "Hockey players", "Badminton players", "B", "Sports"],
  ["Twitter", "Instagram", "LinkedIn", "Snapchat", "Search engines", "Social media platforms", "Web browsers", "Email services", "B", "Technology"],
  ["Everest", "K2", "Kangchenjunga", "Lhotse", "Rivers", "Mountains", "Deserts", "Volcanoes", "B", "Geography"],
  ["Gold", "Silver", "Bronze", "Platinum", "Gemstones", "Metals", "Colors", "Currencies", "B", "Science"],
  ["Tokyo", "Paris", "London", "Beijing", "Countries", "Capital cities", "Rivers", "Continents", "B", "Geography"],
  ["Bat", "Ball", "Stumps", "Bails", "Football equipment", "Cricket equipment", "Hockey equipment", "Tennis equipment", "B", "Sports"],
  ["HTTP", "FTP", "SMTP", "TCP", "Programming languages", "Internet protocols", "Database systems", "Operating systems", "B", "Technology"],
  ["Shah Rukh Khan", "Salman Khan", "Aamir Khan", "Akshay Kumar", "Cricketers", "Bollywood actors", "Politicians", "Singers", "B", "Entertainment"],
  ["Nitrogen", "Oxygen", "Carbon Dioxide", "Argon", "Liquids", "Gases in the atmosphere", "Metals", "Minerals", "B", "Science"],
  ["Taj Mahal", "Red Fort", "Qutub Minar", "Gateway of India", "Temples", "Indian monuments", "Indian rivers", "Indian mountains", "B", "General"],
  ["Whale", "Dolphin", "Elephant", "Human", "Reptiles", "Mammals", "Birds", "Fish", "B", "Science"],
  ["Chess", "Carrom", "Ludo", "Snakes and Ladders", "Outdoor sports", "Indoor/board games", "Water sports", "Athletics events", "B", "General"],
  ["Bill Gates", "Steve Jobs", "Jeff Bezos", "Elon Musk", "Actors", "Tech entrepreneurs", "Scientists", "Athletes", "B", "Technology"],
  ["Guitar", "Violin", "Flute", "Tabla", "Sports equipment", "Musical instruments", "Kitchen tools", "Art supplies", "B", "Entertainment"],
  ["Punjab", "Kerala", "Rajasthan", "Assam", "Countries", "Indian states", "Indian cities", "Indian rivers", "B", "Geography"],
  ["Push-up", "Squat", "Plank", "Lunge", "Cricket shots", "Bodyweight exercises", "Dance moves", "Yoga breathing techniques", "B", "General"],
  ["Instagram Reels", "YouTube Shorts", "TikTok", "Snapchat Spotlight", "Video call apps", "Short video platforms", "Photo editing apps", "Music streaming apps", "B", "Technology"],
  ["Rupee", "Dollar", "Euro", "Yen", "Metals", "Currencies", "Countries", "Banks", "B", "General"],
  ["Photosynthesis", "Respiration", "Digestion", "Excretion", "Physics concepts", "Biological processes", "Chemical elements", "Geological events", "B", "Science"],
  ["WhatsApp", "Telegram", "Signal", "Messenger", "Social networks", "Messaging apps", "Video editors", "File storage apps", "B", "Technology"],
  ["Badminton", "Table Tennis", "Squash", "Tennis", "Team sports", "Racket sports", "Water sports", "Combat sports", "B", "Sports"],
  ["Mona Lisa", "The Starry Night", "The Scream", "Girl with a Pearl Earring", "Sculptures", "Famous paintings", "Famous buildings", "Famous photographs", "B", "Art"],
];

function seedQuestions() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM questions').get().c;
  if (count > 0) {
    console.log(`Questions already present (${count}), skipping question seed.`);
    return;
  }
  const insert = db.prepare(`
    INSERT INTO questions (round, type, text, clues, option_a, option_b, option_c, option_d, correct_option, category)
    VALUES (@round, @type, @text, @clues, @a, @b, @c, @d, @correct, @category)
  `);
  const insertMany = db.transaction((rows) => {
    for (const r of rows) insert.run(r);
  });

  const rows = [];

  round1.forEach(([text, a, b, c, d, correct, category]) =>
    rows.push({ round: 1, type: 'mcq', text, clues: null, a, b, c, d, correct, category })
  );

  round2.forEach(([statement, isTrue, category]) =>
    rows.push({
      round: 2, type: 'truefalse', text: statement, clues: null,
      a: 'True', b: 'False', c: '', d: '',
      correct: isTrue ? 'A' : 'B', category,
    })
  );

  round3.forEach(([c1, c2, c3, c4, a, b, c, d, correct, category]) =>
    rows.push({
      round: 3, type: 'connections', text: 'What connects these four?',
      clues: JSON.stringify([c1, c2, c3, c4]),
      a, b, c, d, correct, category,
    })
  );

  insertMany(rows);
  console.log(`Seeded ${rows.length} questions (Round 1 MCQ: ${round1.length}, Round 2 Truth/Lie: ${round2.length}, Round 3 Connections: ${round3.length}).`);
}

seedSettings();
seedOwnerAdmin();
seedQuestions();
console.log('Seeding complete.');
