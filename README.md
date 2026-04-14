# Golf Card Game

This project is a web-based multiplayer version of the Golf card game. It was built for a software engineering class and focuses on strategy, memory, and real-time play. Players can create or join rooms, play with other people online, or try the game in solo mode.

## Tools Needed

- Node.js
- npm
- A modern browser like Chrome, Edge, or Firefox

This project also uses Firebase for authentication and multiplayer data. The current Firebase setup is already connected in the project files.

## Install Dependencies

Open the project folder in a terminal and run:

```bash
npm install
```

## Run the Project

Start the development server with:

```bash
npm run dev
```

Then open the local link shown in the terminal. In most cases, it will be:

```text
http://localhost:5173
```

## Build the Project

If you want to make a production build, run:

```bash
npm run build
```

## Technologies Used

- React
- TypeScript
- Vite
- Firebase Authentication
- Firebase Firestore
- Firebase Realtime Database
- React Router
- Motion
- Lottie React
- Tailwind CSS
- Custom CSS

## How the Game Works

Each player starts with 4 cards. At the start of the round, players get a short look at their bottom 2 cards and then the cards are hidden again. On each turn, a player draws one card from the deck or takes the top card from the discard pile. After that, they decide whether to swap it with one of their cards or discard it.

The goal is to finish with the lowest score. Some cards have special effects. Power cards let players peek at cards or swap cards in different ways. A player can also knock when they think they have the lowest score, which starts the final round.

## Short Feature Notes

- Email login and registration
- Solo mode and multiplayer mode
- Room creation and room join by code
- Public and password-protected rooms
- Real-time lobby updates
- Real-time multiplayer gameplay
- Power cards for 7, 8, 9, and 10
- Knock and final round system
- Reaction window for matching discards
- Game animations and card movement
- Power-card guidance cues and swap feedback

## Project Notes

The game logic is separated from the UI, which made it easier to manage rules and multiplayer updates. Firebase is used to keep room data and game state synced between players. The project also includes animation work to make card actions easier to understand during gameplay.
