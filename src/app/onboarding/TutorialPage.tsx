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
  Zap,
  ArrowLeftRight,
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
    title: 'Power Cards: Peek & Spy',
    icon: Eye,
    body: 'Drawing a 7 lets you secretly peek at one of your own face-down cards — useful for planning your swaps. Drawing an 8 lets you spy on one face-down card belonging to any opponent.',
    visual: 'peek_spy',
  },
  {
    title: 'Power Cards: Swap',
    icon: ArrowLeftRight,
    body: 'Drawing a 9 lets you swap one of your cards with a card from any opponent\'s hand — choose the highest one you\'ve seen. Drawing a 10 lets you swap any two cards within your own hand.',
    visual: 'swap_power',
  },
  {
    title: 'Reaction Window',
    icon: Zap,
    body: 'When any card is discarded, a brief reaction window opens. Non-knocking players can quickly swap one of their own cards with the discarded card. The fastest player wins the swap.',
    visual: 'reaction',
  },
  {
    title: 'Column Match & Giveaway',
    icon: RotateCcw,
    body: 'Two cards in the same column that share a value cancel out and score 0 together. As a bonus, you can then give one of those matched cards to any opponent — raising their score.',
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

  if (type === 'peek_spy') {
    return (
      <div className="tutorial-card-grid">
        <div className="tutorial-mini-card face-down">?</div>
        <div className="tutorial-mini-card face-down">?</div>
        <div className="tutorial-mini-card face-up" style={{ outline: '2px solid #42A5F5', outlineOffset: 2 }}>4</div>
        <div className="tutorial-mini-card face-down">?</div>
      </div>
    );
  }

  if (type === 'swap_power') {
    return (
      <div className="tutorial-flow-visual">
        <div className="tutorial-mini-card face-up" style={{ fontSize: 18, width: 44, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>Q</div>
        <ArrowLeftRight size={24} style={{ color: '#FFD600', flexShrink: 0 }} />
        <div className="tutorial-mini-card face-up" style={{ fontSize: 18, width: 44, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>2</div>
      </div>
    );
  }

  if (type === 'reaction') {
    return (
      <div className="tutorial-score-card">
        <Zap size={36} color="#FFD600" />
        <span>React fast!</span>
        <strong>Quick swap</strong>
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
