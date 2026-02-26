import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { getFirebaseAnalytics } from './multiplayer/firebase';
import { AuthGate } from './auth/AuthGate';
import { PlayerAuthProvider } from './auth/AuthContext';

export default function App() {
  useEffect(() => {
    void getFirebaseAnalytics();
  }, []);

  return (
    <PlayerAuthProvider>
      <AuthGate>
        <RouterProvider router={router} />
      </AuthGate>
    </PlayerAuthProvider>
  );
}
