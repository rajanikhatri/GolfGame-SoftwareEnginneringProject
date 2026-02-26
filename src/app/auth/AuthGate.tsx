import { useState } from 'react';
import { usePlayerAuth } from './AuthContext';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, login, register } = usePlayerAuth();
  const authenticatedUser = user && !user.isAnonymous ? user : null;
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading && !authenticatedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center font-game" style={{ background: '#0D2137', color: 'white' }}>
        <div className="player-panel p-6 text-center">
          <div style={{ fontSize: 18, fontWeight: 900 }}>Loading account...</div>
        </div>
      </div>
    );
  }

  if (authenticatedUser) {
    return (
      <>
        {false && profile && (
          <div
            style={{
              position: 'fixed',
              top: 10,
              right: 14,
              zIndex: 200,
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 999,
              padding: '6px 12px',
              color: 'white',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {profile.displayName} • {profile.email ?? 'signed in'}
          </div>
        )}
        {children}
      </>
    );
  }

  const submit = async () => {
    setError(null);
    const cleanedEmail = normalizeEmail(email);
    if (!cleanedEmail || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    if (mode === 'register' && !displayName.trim()) {
      setError('Display name is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'register') {
        await register({
          email: cleanedEmail,
          password,
          displayName: displayName.trim(),
        });
      } else {
        await login({
          email: cleanedEmail,
          password,
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Authentication failed.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-6 font-game"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #1565C0 0%, #0D47A1 30%, #0D2137 70%, #060D1B 100%)',
        fontFamily: 'Nunito, sans-serif',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.25, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '42px 42px' }} />

      <div className="player-panel p-6 relative z-10 w-full max-w-md" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.2em' }}>ACCOUNT REQUIRED</div>
          <div style={{ fontSize: 34, fontWeight: 900, color: 'white', marginTop: 6 }}>Golf Multiplayer</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>
            Register or log in to play and save your player data.
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            className={`arcade-btn ${mode === 'login' ? 'arcade-btn-blue' : 'arcade-btn-purple'} flex-1 py-3`}
            style={{ fontSize: 13, fontWeight: 900, opacity: mode === 'login' ? 1 : 0.75 }}
            onClick={() => setMode('login')}
          >
            LOGIN
          </button>
          <button
            className={`arcade-btn ${mode === 'register' ? 'arcade-btn-green' : 'arcade-btn-purple'} flex-1 py-3`}
            style={{ fontSize: 13, fontWeight: 900, opacity: mode === 'register' ? 1 : 0.75 }}
            onClick={() => setMode('register')}
          >
            REGISTER
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {mode === 'register' && (
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '2px solid rgba(255,255,255,0.15)',
                borderRadius: 12,
                padding: '12px 14px',
                color: 'white',
                outline: 'none',
                fontWeight: 700,
              }}
            />
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '2px solid rgba(255,255,255,0.15)',
              borderRadius: 12,
              padding: '12px 14px',
              color: 'white',
              outline: 'none',
              fontWeight: 700,
            }}
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '2px solid rgba(255,255,255,0.15)',
              borderRadius: 12,
              padding: '12px 14px',
              color: 'white',
              outline: 'none',
              fontWeight: 700,
            }}
          />

          {error && (
            <div
              style={{
                background: 'rgba(229,57,53,0.14)',
                border: '1px solid rgba(229,57,53,0.35)',
                borderRadius: 10,
                padding: '10px 12px',
                color: '#FF8A80',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          <button
            className={`arcade-btn ${mode === 'register' ? 'arcade-btn-green' : 'arcade-btn-blue'} py-4`}
            style={{ fontSize: 15, fontWeight: 900, opacity: submitting ? 0.7 : 1 }}
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? 'PLEASE WAIT...' : mode === 'register' ? 'CREATE ACCOUNT' : 'LOGIN TO PLAY'}
          </button>

          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
            Your account profile is stored in Firebase Firestore (`users/{'{uid}'}`) and used for player access.
          </div>
        </div>
      </div>
    </div>
  );
}
