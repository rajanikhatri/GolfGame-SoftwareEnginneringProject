import { createBrowserRouter, Outlet } from 'react-router';
import { GameProvider } from './backend/GameContext';
import ModeSelection from './frontend/screens/ModeSelection';
import Leaderboard from './frontend/screens/Leaderboard';
import Lobby from './frontend/screens/Lobby';
import Game from './frontend/screens/Game';
import EndGame from './frontend/screens/EndGame';

function Root() {
  return (
    <GameProvider>
      <Outlet />
    </GameProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: ModeSelection },
      { path: 'leaderboard', Component: Leaderboard },
      { path: 'lobby', Component: Lobby },
      { path: 'game', Component: Game },
      { path: 'end', Component: EndGame },
    ],
  },
]);
