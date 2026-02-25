import { createBrowserRouter, Outlet } from 'react-router';
import { GameProvider } from './context/GameContext';
import ModeSelection from './screens/ModeSelection';
import Lobby from './screens/Lobby';
import Game from './screens/Game';
import EndGame from './screens/EndGame';

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
      { path: 'lobby', Component: Lobby },
      { path: 'game', Component: Game },
      { path: 'end', Component: EndGame },
    ],
  },
]);