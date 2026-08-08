# Department Quiz Fest — Full-Stack Quiz Platform

A 3-round, 70-question quiz website built for a college department event:
registration → Round 1 (20 Qs, general MCQ) → unlock Round 2 (20 Qs, Truth or Lie) → unlock Round 3 (30 Qs, Connections finale).

- **Frontend:** React (Vite) + Tailwind CSS
- **Backend:** Node.js + Express + SQLite (better-sqlite3)
- **Auth:** JWT for students and for the admin console (no third-party login needed)

---

## 1. How it works

- **Registration** collects name, class, year, department, college and contact number before anything else is shown, and issues the student a session pass (JWT) stored in their browser.
- **Three different round formats:**
  - **Round 1 — General MCQ:** standard 4-option multiple choice.
  - **Round 2 — Truth or Lie:** a statement with just two options, True or False.
  - **Round 3 — Connections:** four clues are shown and the student picks the hidden theme that connects them, from four candidate answers.
- **Round gating:** each student's progress is tracked on the server. Round 2 only unlocks after the server confirms they hit the Round 1 pass mark; same for Round 3. This is enforced in the API, not just hidden in the UI, so it can't be bypassed by editing the page.
- **One question at a time:** the browser never receives the full question bank. Each question (and its correct answer) lives only on the server; the client asks for "the current question" and gets just that one, with a per-question timer. This is the main anti-copy protection — there is no answer key sitting in the page source to view or share.
- **Per-student shuffling:** both the order of questions and the order of the four options are shuffled differently for every student (deterministically, so a page refresh doesn't reshuffle mid-question). Two students sitting next to each other will not see "the answer is C" mean the same thing.
- **Soft deterrents:** right-click, copy/cut, and common devtools/print shortcuts are blocked while a round is active, and tab-switching is flagged. These deter casual copying but — like any client-side protection — a determined user with devtools can work around them; the real protection is that the server never exposes the answer key.
- **Traffic:** SQLite is run in WAL mode, which handles many simultaneous readers/writers well — comfortable for a few hundred concurrent students on one small server. See "Scaling" below if you expect more.

## 2. Project structure

```
campus-quiz/
  backend/          Express API + SQLite database
    db/             schema (index.js) + seed script (seed.js)
    routes/         register.js, quiz.js, admin.js
    middleware/      auth.js (JWT)
    server.js        entry point (also serves the built frontend)
  frontend/          React app (Vite + Tailwind)
    src/pages/        Register, Quiz (hub + player), admin/*
    src/components/   AntiCopyGuard, Timer
```

## 3. Local setup

**Requirements:** Node.js 18+

```bash
# 1. Backend
cd backend
cp .env.example .env      # edit JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
npm install
npm run seed               # creates the database, admin account, and 70 sample questions
npm start                  # runs on http://localhost:4000

# 2. Frontend (in a second terminal)
cd frontend
npm install
npm run dev                 # runs on http://localhost:5173 and proxies /api to :4000
```

Open `http://localhost:5173` to try the student flow, and `http://localhost:5173/admin/login` for the organiser console (credentials come from your `.env`).

## 4. Replacing the sample questions with your real 70

The database is seeded with 70 sample questions (20 MCQ / 20 Truth-or-Lie / 30 Connections) so the site works out of the box. Replace them with your event's real questions either:

- **One at a time** — Admin console → Questions → pick the round → the form adapts to that round's format.
- **In bulk** — Admin console → Questions → "Bulk import (JSON)", paste an array. The shape depends on the question type:
  ```json
  [
    {
      "round": 1,
      "type": "mcq",
      "text": "Your question?",
      "option_a": "Choice A",
      "option_b": "Choice B",
      "option_c": "Choice C",
      "option_d": "Choice D",
      "correct_option": "B",
      "category": "General"
    },
    {
      "round": 2,
      "type": "truefalse",
      "text": "A statement that is either true or false.",
      "option_a": "True",
      "option_b": "False",
      "correct_option": "A",
      "category": "General"
    },
    {
      "round": 3,
      "type": "connections",
      "clues": ["Clue 1", "Clue 2", "Clue 3", "Clue 4"],
      "option_a": "Wrong theme",
      "option_b": "Correct theme",
      "option_c": "Wrong theme",
      "option_d": "Wrong theme",
      "correct_option": "B",
      "category": "General"
    }
  ]
  ```
  Delete the sample questions for a round first (or just add your own — the app only shows however many you've set in Settings, chosen at random per round).

## 5. Adjusting the rules

Admin console → **Settings**:
- Event name
- Seconds allowed per question
- How many questions each round shows (must have at least that many in the question bank for that round)
- How many correct answers are needed to unlock Round 2 and Round 3

## 6. Deploying it as a live website

The simplest path is a single Node host with a persistent disk (SQLite is a file):

**Render.com / Railway (recommended, free tier available):**
1. Push this folder to a GitHub repo.
2. Create a new **Web Service**, root directory = repo root.
3. Build command: `cd frontend && npm install && npm run build && cd ../backend && npm install`
4. Start command: `cd backend && npm start`
5. Add environment variables from `.env.example` (set a strong `JWT_SECRET` and admin password).
6. Attach a small persistent disk mounted at `backend/data` (Render calls this a "Disk") so the SQLite file survives restarts/deploys.
7. After the first deploy, run `npm run seed` once (Render/Railway both offer a one-off "Shell" command) to create the admin account and sample questions, then replace the sample questions from the admin console.

**Any VPS (DigitalOcean, AWS EC2, etc.):** clone the repo, run the same build/start commands behind a process manager like `pm2`, and put Nginx in front for HTTPS.

Vercel/Netlify are not a good fit here because they don't offer a writable persistent disk for SQLite — only use them if you migrate the database to a hosted Postgres/MySQL instance first.

### Scaling beyond a few hundred concurrent students
SQLite is fine for a single department event. If you expect very heavy simultaneous traffic (e.g. a college-wide event with 1000+ students hitting "Start" at once), swap `better-sqlite3` for a hosted Postgres database (e.g. Supabase/Neon/Railway Postgres) — the query logic in `routes/` stays almost identical, only `db/index.js` changes.

## 7. Organizer logins

There are two kinds of admin accounts:
- **Owner** — the account created by `npm run seed` (from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env`). Only the owner can add or remove other organizer logins, from Admin console → **Organizers**.
- **Organizer** — additional accounts the owner creates for other volunteers running the event. Organizers can manage questions, view/export results, and change settings, but cannot manage other logins.

Set the owner's credentials in `backend/.env` before running `npm run seed`:
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ChangeMe@123
```
Change this password (and add your team's individual organizer logins) before the event, since the admin console can see every student's contact number.

## 8. Notes on the "no copying" requirement

There is no way to make on-screen text 100% impossible to copy (a phone camera always works). What this build does is remove the actual leak points:
- No full answer key is ever sent to the browser.
- No "view source" or network tab reveals upcoming questions or correct answers, because only the current question is fetched.
- Right-click, text selection, copy, and devtools shortcuts are disabled during a round as a deterrent.
- Each student sees a different question order and a different option order, so a shouted-out answer letter doesn't match their neighbour's screen.
