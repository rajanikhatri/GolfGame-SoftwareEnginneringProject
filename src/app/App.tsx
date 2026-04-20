import { RouterProvider } from 'react-router';
import { router } from './routes';
import { PlayerAuthProvider } from './auth/AuthContext';
import { AuthGate } from './auth/AuthGate';
import { OnboardingGate } from './onboarding/OnboardingGate';

export default function App() {
  return (
    <PlayerAuthProvider>
      <OnboardingGate>
        <AuthGate>
          <RouterProvider router={router} />
        </AuthGate>
      </OnboardingGate>
    </PlayerAuthProvider>
  );
}
