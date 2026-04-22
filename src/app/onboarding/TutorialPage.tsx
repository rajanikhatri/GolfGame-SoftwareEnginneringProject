import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag,
  Grid3X3,
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

// ─── Step definitions ─────────────────────────────────────────────────────────

const tutorialSteps = [
  {
    title: 'Game Goal',
    icon: Target,
    body: (
      <p>
        Golf is a <strong>memory card game</strong> where the{' '}
        <strong>lowest total score wins</strong>. Your job is to replace high-value
        cards in your hand with lower ones. King ♠/♣ ={' '}
        <strong style={{ color: '#4CAF50' }}>−2 pts</strong>, Joker ★ ={' '}
        <strong style={{ color: '#4CAF50' }}>−1 pt</strong>. Everything else is
        face value.
      </p>
    ),
    visual: 'objective',
  },
  {
    title: 'Card Setup',
    icon: Grid3X3,
    body: (
      <p>
        Each player starts with <strong>4 cards</strong> arranged in a 2×2 grid.
        All cards begin face-down — nobody can see any cards at the start of the
        game.
      </p>
    ),
    visual: 'grid',
  },
  {
    title: 'Peek Phase',
    icon: Eye,
    body: (
      <>
        <p>
          When the game starts, you get{' '}
          <strong style={{ color: '#FFD600' }}>5 seconds</strong> to peek at
          your <strong>bottom 2 cards only</strong>. Your top 2 remain hidden.
        </p>
        <p style={{ marginTop: 8 }}>
          Use this time to plan which cards you want to replace first.
        </p>
      </>
    ),
    visual: 'memory',
  },
  {
    title: 'Your Turn',
    icon: Shuffle,
    body: (
      <>
        <p>On your turn, choose one option:</p>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <li>
            <strong>Draw from the deck</strong> — an unknown card nobody has seen
          </li>
          <li>
            <strong>Take from the discard pile</strong> — a visible card, but{' '}
            <strong style={{ color: '#EF5350' }}>everyone sees which card you picked</strong>
          </li>
        </ul>
        <p style={{ marginTop: 8 }}>
          After drawing, either swap it into your grid or discard it.
        </p>
      </>
    ),
    visual: 'turn',
  },
  {
    title: 'Matching Window',
    icon: Zap,
    body: (
      <>
        <p>
          Every time a card is discarded, a{' '}
          <strong style={{ color: '#FFD600' }}>3-second Matching Window</strong>{' '}
          opens.
        </p>
        <p style={{ marginTop: 8 }}>
          During that short window, any player can react if they think a card in
          play matches the discarded value.
        </p>
      </>
    ),
    visual: 'reaction',
  },
  {
    title: 'Matching Your Own Card',
    icon: Zap,
    body: (
      <>
        <p>
          If the discarded card matches one of your own cards and you tap it in
          time, that card is removed from your grid.
        </p>
        <p style={{ marginTop: 8 }}>
          You finish with <strong>one less card</strong>, which can help lower
          your final score.
        </p>
      </>
    ),
    visual: 'match',
  },
  {
    title: 'Matching Another Player’s Card',
    icon: Zap,
    body: (
      <>
        <p>
          A card is discarded, and you think another player has that same value in
          their grid. If you tap the correct card, their matching card is removed.
        </p>
        <p style={{ marginTop: 8 }}>
          Then giveaway starts. You must give that player one of your own cards, so
          they go back to the same number of cards, and you finish with{' '}
          <strong>one less card</strong>.
        </p>
      </>
    ),
    visual: 'match',
  },
  {
    title: 'Multiple Players React',
    icon: Zap,
    body: (
      <>
        <p>
          More than one player can react during the same Matching Window.
        </p>
        <p style={{ marginTop: 8 }}>
          The game checks who reacted first. The{' '}
          <strong>fastest correct player wins</strong>, so even a correct choice is
          too late if someone else tapped first.
        </p>
      </>
    ),
    visual: 'reaction',
  },
  {
    title: 'Wrong Match (Your Card)',
    icon: Zap,
    body: (
      <>
        <p>
          If you react with one of your own cards and it is the wrong match, that
          card stays where it is.
        </p>
        <p style={{ marginTop: 8 }}>
          You then take <strong style={{ color: '#EF5350' }}>1 penalty card</strong>.
          That means your hand gets bigger by one card.
        </p>
      </>
    ),
    visual: 'reaction',
  },
  {
    title: 'Wrong Match (Another Player’s Card)',
    icon: Zap,
    body: (
      <>
        <p>
          If you target another player&apos;s card and your guess is wrong, that card
          is added to your hand.
        </p>
        <p style={{ marginTop: 8 }}>
          You also take <strong style={{ color: '#EF5350' }}>1 penalty card</strong>.
          This is a stronger punishment because your hand grows even more.
        </p>
      </>
    ),
    visual: 'reaction',
  },
  {
    title: 'Discard Risk',
    icon: Zap,
    body: (
      <>
        <p>
          Taking a card from the discard pile tells everyone exactly what card you
          picked up.
        </p>
        <p style={{ marginTop: 8 }}>
          That information can help other players guess your hand during the next
          Matching Window.
        </p>
      </>
    ),
    visual: 'turn',
  },
  {
    title: 'Knock Rule',
    icon: Zap,
    body: (
      <>
        <p>
          A player who has already knocked cannot react during a Matching Window.
        </p>
        <p style={{ marginTop: 8 }}>
          Other players also <strong>cannot target the knocker</strong>.
        </p>
      </>
    ),
    visual: 'reaction',
  },
  {
    title: 'Power Cards: Look',
    icon: Eye,
    body: (
      <>
        <p>When you draw and play a power card, you get a special ability:</p>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>
            <strong style={{ color: '#FFD600' }}>7 —</strong> Secretly peek at
            one of your own hidden cards
          </li>
          <li>
            <strong style={{ color: '#FFD600' }}>8 —</strong> Secretly peek at
            one hidden card from any opponent
          </li>
        </ul>
      </>
    ),
    visual: 'peek_spy',
  },
  {
    title: 'Power Cards: Swap',
    icon: ArrowLeftRight,
    body: (
      <>
        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li>
            <strong style={{ color: '#FFD600' }}>9 —</strong> Pick one of your
            own cards and one from an opponent — you see both, then{' '}
            <strong>choose to swap or keep</strong> them as-is. You can also
            pick any two cards from an opponent's hand, see them, and swap.
          </li>
          <li>
            <strong style={{ color: '#FFD600' }}>10 —</strong>{' '}
            <strong>Blind swap</strong> — you do not see the cards before
            swapping.{' '}
            <span style={{ color: 'rgba(255,210,100,0.9)' }}>
              Tip: best used to swap two of an opponent's cards blindly and
              disrupt their hand.
            </span>
          </li>
        </ul>
      </>
    ),
    visual: 'swap_power',
  },
  {
    title: 'Winning',
    icon: Trophy,
    body: (
      <p>
        When a player <strong>knocks</strong>, the final round plays out and all
        cards are revealed.{' '}
        <strong>Lowest total score wins!</strong>
      </p>
    ),
    visual: 'win',
  },
];

// ─── Step visuals ─────────────────────────────────────────────────────────────

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
        <div
          className="tutorial-mini-card face-up"
          style={{ outline: '2px solid #42A5F5', outlineOffset: 2 }}
        >
          4
        </div>
        <div className="tutorial-mini-card face-down">?</div>
      </div>
    );
  }

  if (type === 'swap_power') {
    return (
      <div className="tutorial-flow-visual">
        <div
          className="tutorial-mini-card face-up"
          style={{ fontSize: 18, width: 44, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
        >
          Q
        </div>
        <ArrowLeftRight size={24} style={{ color: '#FFD600', flexShrink: 0 }} />
        <div
          className="tutorial-mini-card face-up"
          style={{ fontSize: 18, width: 44, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
        >
          2
        </div>
      </div>
    );
  }

  if (type === 'reaction') {
    return (
      <div className="tutorial-score-card">
        <Zap size={36} color="#FFD600" />
        <span>React fast!</span>
        <strong>3 seconds</strong>
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

  // default: 'objective'
  return (
    <div className="tutorial-score-card">
      <Flag size={36} />
      <span>Keep your score low</span>
      <strong>Golf</strong>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

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
          <button className="tutorial-skip-btn" onClick={onSkip}>
            Skip for now
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
            {step.body}
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
