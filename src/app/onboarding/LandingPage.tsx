import { Play, SkipForward, Sparkles, Trophy, Users } from 'lucide-react';

interface LandingPageProps {
  onStartTutorial: () => void;
  onSkip: () => void;
}

export function LandingPage({ onStartTutorial, onSkip }: LandingPageProps) {
  return (
    <div className="onboarding-shell font-game">
      <div className="onboarding-bg-pattern" />
      <div className="onboarding-floating-card onboarding-card-one">A</div>
      <div className="onboarding-floating-card onboarding-card-two">K</div>
      <div className="onboarding-floating-card onboarding-card-three">7</div>

      <main className="landing-hero">
        <section className="landing-copy">
          <div className="landing-kicker">
            <Sparkles size={16} />
            Digital Card Game
          </div>

          <h1>Golf Card Game</h1>
          <p className="landing-tagline">A memory-based card game where the lowest score wins.</p>
          <p className="landing-description">
            Learn the rules in a quick tutorial, then sign in to play solo or join friends in a
            multiplayer room.
          </p>

          <div className="landing-actions">
            <button className="arcade-btn arcade-btn-green onboarding-action" onClick={onStartTutorial}>
              <Play size={18} />
              Start Tutorial
            </button>
            <button className="arcade-btn arcade-btn-blue onboarding-action" onClick={onSkip}>
              <SkipForward size={18} />
              Skip
            </button>
          </div>
        </section>

        <section className="landing-preview" aria-label="Game overview preview">
          <div className="preview-table">
            <div className="preview-card face-down" />
            <div className="preview-card face-down" />
            <div className="preview-card face-up">3</div>
            <div className="preview-card face-up">K</div>
          </div>
          <div className="preview-stats">
            <div>
              <Trophy size={18} />
              Lowest score wins
            </div>
            <div>
              <Users size={18} />
              Solo or multiplayer
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
