# Golf Card Game - Multiplayer Edition

A web-based multiplayer card game built for CS 440 Software Engineering (Spring 2026).
Players compete to achieve the lowest cumulative score using memory, strategy, and power cards.

**Team:** Mandeep Aryal, Rajani Khatri, Sushant Dahal, Rita Ghimire, Nitish Baidya, Priyanka Pandit

---

## How to Run Locally

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, custom CSS animations |
| Routing | React Router v7 |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Animations | Motion (motion/react) |
| Icons | Lucide React |

---

## Project Structure

```
src/
  app/
    auth/               # Login, register, auth gate (blocks access until signed in)
    backend/            # Game logic and state (GameContext)
    database/           # Firebase setup, Firestore room functions
    frontend/
      screens/          # UI screens (ModeSelection, Lobby, Game, EndGame)
      components/       # Reusable UI components (GameCard, Confetti)
  main.tsx              # App entry point
  styles/               # Global CSS, Tailwind, fonts, theme, animations

documentation/          # Project proposal and explanation docs
requirements.txt        # List of all packages and install instructions
```

---

## Features

- **Authentication** — Register and login with email/password via Firebase
- **Solo vs AI** — Play against 3 AI opponents offline
- **Multiplayer** — Create or join real-time rooms with up to 4 players
- **Room System** — Public and password-protected rooms
- **Real-time Lobby** — See players join live using Firestore listeners
- **Power Cards** — Special abilities for cards 7, 8, 9, 10
- **Knock Mechanic** — End the game when you think you have the lowest score
- **Match Window** — 3-second reaction window for matching discards
- **Live Chat** — In-lobby chat between players

---

## Game Rules Summary

- Each player gets 4 cards (2×2 grid), face down
- Peek at 2 of your cards for 5 seconds at the start
- On your turn: draw from deck or take top discard, then swap or discard
- **Lowest score wins** — negative values are good
- **Black King = -2 pts**, **Joker = -1 pt**
- Matching column cards cancel out (0 points)
- Power cards (7/8/9/10) activate special abilities when drawn
- Any player can **Knock** to trigger the final round


---

## Firebase Setup

The app uses Firebase project `golfgame-ee8bf`.
Config is stored in `src/app/database/firebase.ts`.

**Required Firebase services:**
- Authentication → Email/Password + Anonymous enabled
- Firestore Database → with security rules for `users` and `rooms` collections
