import { RouterProvider } from 'react-router';
import { router } from './routes';
import { PlayerAuthProvider } from './auth/AuthContext';
import { AuthGate } from './auth/AuthGate';

export default function App() {
  return (
    <PlayerAuthProvider>
      <AuthGate>
        <RouterProvider router={router} />
      </AuthGate>
    </PlayerAuthProvider>
  );
}
