import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag,
  Grid3X3,
  RotateCcw,
  Shuffle,
  Target,
  Trophy,
} from 'lucide-react';
import { useState } from 'react';

interface TutorialPageProps {
  onFinish: (rememberChoice: boolean) => void;
  onSkip: () => void;
}

const tutorialSteps = [
  {
    title: 'Game Objective',
    icon: Target,
    body: 'Your goal is to finish with the lowest score. Each card has a point value, so players try to replace high cards with lower cards.',
    visual: 'objective',
  },
  {
    title: 'Card Setup',
    icon: Grid3X3,
    body: 'Each player starts with four cards arranged in a 2x2 grid. Most cards stay face down, so you need to remember what you have.',
    visual: 'grid',
  },
  {
    title: 'Turn Actions',
    icon: Shuffle,
    body: 'On your turn, draw from the deck or take the top discard. Then choose to swap it with one of your cards or discard it.',
    visual: 'turn',
  },
  {
    title: 'Memory Aspect',
    icon: Eye,
    body: 'At the start, you get a short look at some cards. After that, memory matters because hidden cards can decide your final score.',
    visual: 'memory',
  },
  {
    title: 'Special Rule',
    icon: RotateCcw,
    body: 'If two cards in the same column match by value, they cancel out and count as 0 points for that column.',
    visual: 'match',
  },
  {
    title: 'Winning Condition',
    icon: Trophy,
    body: 'When a player knocks, the final round begins. At the end, all cards are revealed and the lowest total score wins.',
    visual: 'win',
  },
];

function StepVisual({ type }: { type: string }) {
  if (type === 'grid' || type === 'memory' || type === 'match') {
    return (
      <div className={`tutorial-card-grid ${type === 'match' ? 'tutorial-card-grid-match' : ''}`}>
        <div className="tutorial-mini-card face-down">?</div>
        <div className="tutorial-mini-card face-down">?</div>
        <div className="tutorial-mini-card face-up">{type === 'match' ? '8' : '4'}</div>
        <div className="tutorial-mini-card face-up">{type === 'match' ? '8' : 'K'}</div>
      </div>
    );
  }

  if (type === 'turn') {
    return (
      <div className="tutorial-flow-visual">
        <div className="tutorial-pile">Deck</div>
        <ChevronRight size={26} />
        <div className="tutorial-pile active">Draw</div>
        <ChevronRight size={26} />
        <div className="tutorial-pile">Swap</div>
      </div>
    );
  }

  if (type === 'win') {
    return (
      <div className="tutorial-score-card">
        <Trophy size={36} />
        <span>Lowest score wins</span>
        <strong>12 pts</strong>
      </div>
    );
  }

  return (
    <div className="tutorial-score-card">
      <Flag size={36} />
      <span>Keep your score low</span>
      <strong>Golf</strong>
    </div>
  );
}

export function TutorialPage({ onFinish, onSkip }: TutorialPageProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rememberChoice, setRememberChoice] = useState(false);
  const step = tutorialSteps[stepIndex];
  const Icon = step.icon;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === tutorialSteps.length - 1;

  function goNext() {
    if (isLast) {
      onFinish(rememberChoice);
      return;
    }
    setStepIndex((current) => current + 1);
  }

  return (
    <div className="onboarding-shell font-game">
      <div className="onboarding-bg-pattern" />

      <main className="tutorial-panel">
        <div className="tutorial-top-row">
          <button className="tutorial-text-button" onClick={onSkip}>
            Skip to Sign In
          </button>
          <span>
            Step {stepIndex + 1} of {tutorialSteps.length}
          </span>
        </div>

        <div className="tutorial-progress" aria-label="Tutorial progress">
          {tutorialSteps.map((item, index) => (
            <span
              key={item.title}
              className={index <= stepIndex ? 'active' : ''}
            />
          ))}
        </div>

        <section className="tutorial-content-card">
          <div className="tutorial-icon-badge">
            <Icon size={30} />
          </div>
          <div className="tutorial-copy">
            <h1>{step.title}</h1>
            <p>{step.body}</p>
          </div>
          <StepVisual type={step.visual} />
        </section>

        <label className="tutorial-checkbox">
          <input
            type="checkbox"
            checked={rememberChoice}
            onChange={(event) => setRememberChoice(event.target.checked)}
          />
          Don&apos;t show this tutorial again
        </label>

        <div className="tutorial-actions">
          <button
            className="arcade-btn arcade-btn-purple onboarding-action"
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            disabled={isFirst}
            style={{ opacity: isFirst ? 0.45 : 1 }}
          >
            <ChevronLeft size={18} />
            Previous
          </button>

          <button className="arcade-btn arcade-btn-green onboarding-action" onClick={goNext}>
            {isLast ? 'Finish Tutorial' : 'Next'}
            {!isLast && <ChevronRight size={18} />}
          </button>
        </div>
      </main>
    </div>
  );
}
