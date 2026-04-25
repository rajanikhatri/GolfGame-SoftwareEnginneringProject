import { useNavigate } from 'react-router';
import { TutorialPage } from '../../onboarding/TutorialPage';
import '../../onboarding/onboarding.css';

const TUTORIAL_COMPLETE_KEY = 'golfTutorialComplete';

export default function Tutorials() {
  const navigate = useNavigate();

  function returnToMenu(rememberChoice = false) {
    if (rememberChoice) {
      window.localStorage.setItem(TUTORIAL_COMPLETE_KEY, 'true');
    }
    navigate('/');
  }

  return (
    <TutorialPage
      onFinish={returnToMenu}
      onSkip={() => returnToMenu(false)}
    />
  );
}
