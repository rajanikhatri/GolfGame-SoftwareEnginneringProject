import { useEffect, useState } from 'react';
import { usePlayerAuth } from '../auth/AuthContext';
import { LandingPage } from './LandingPage';
import { TutorialPage } from './TutorialPage';
import './onboarding.css';

const TUTORIAL_COMPLETE_KEY = 'golfTutorialComplete';

type OnboardingStep = 'landing' | 'tutorial' | 'complete';

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = usePlayerAuth();
  const authenticatedUser = user && !user.isAnonymous ? user : null;
  const [step, setStep] = useState<OnboardingStep>('complete');
  const [hasInitializedStep, setHasInitializedStep] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (authenticatedUser) {
      setStep('complete');
      setHasInitializedStep(true);
      return;
    }

    if (hasInitializedStep) return;

    const completed = window.localStorage.getItem(TUTORIAL_COMPLETE_KEY) === 'true';
    setStep(completed ? 'complete' : 'landing');
    setHasInitializedStep(true);
  }, [authenticatedUser, hasInitializedStep, loading]);

  function goToAuth(rememberChoice = false) {
    if (rememberChoice) {
      window.localStorage.setItem(TUTORIAL_COMPLETE_KEY, 'true');
    }
    setStep('complete');
  }

  if (loading || authenticatedUser || step === 'complete') {
    return <>{children}</>;
  }

  if (step === 'tutorial') {
    return (
      <TutorialPage
        onFinish={goToAuth}
        onSkip={() => goToAuth(false)}
      />
    );
  }

  return (
    <LandingPage
      onStartTutorial={() => setStep('tutorial')}
      onSkip={() => goToAuth(false)}
    />
  );
}
