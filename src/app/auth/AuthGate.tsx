import { useState } from 'react';
import { usePlayerAuth } from './AuthContext';
import { Eye, EyeOff } from 'lucide-react';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getAuthErrorMessage(error: unknown, mode: 'login' | 'register') {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (mode === 'login' && (message.includes('invalid-credential') || message.includes('wrong-password') || message.includes('invalid login credentials'))) {
    return 'Incorrect email or password. If you forgot it, click FORGOT PASSWORD? to reset it.';
  }

  if (mode === 'register' && message.includes('email-already-in-use')) {
    return 'That email is already registered. Try logging in or reset your password.';
  }

  if (message.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }

  if (message.includes('weak-password')) {
    return 'Password is too weak. Use at least 6 characters.';
  }

  return error instanceof Error ? error.message : 'Authentication failed.';
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, login, register, forgotPassword } = usePlayerAuth();
  const authenticatedUser = user && !user.isAnonymous ? user : null;
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (loading && !authenticatedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center font-game" style={{ background: '#0D2137', color: 'white' }}>
        <div className="player-panel p-6 text-center">
          <div style={{ fontSize: 18, fontWeight: 900 }}>Loading account...</div>
        </div>
      </div>
    );
  }

  if (authenticatedUser) return <>{children}</>;

  const submit = async () => {
    setError(null);
    setMessage(null);
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
      setError(getAuthErrorMessage(e, mode));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setMessage(null);
    const cleanedEmail = normalizeEmail(email);
    if (!cleanedEmail) {
      setError('Enter your email address first to reset your password.');
      return;
    }

    setSubmitting(true);
    try {
      await forgotPassword(cleanedEmail);
      setMessage('Password reset email sent. Check your inbox for the reset link.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unable to send password reset email.';
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

          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '2px solid rgba(255,255,255,0.15)',
                borderRadius: 12,
                padding: '12px 44px 12px 14px',
                color: 'white',
                outline: 'none',
                fontWeight: 700,
                width: '100%',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                top: '50%',
                right: 12,
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.72)',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

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

          {message && (
            <div
              style={{
                background: 'rgba(67,160,71,0.16)',
                border: '1px solid rgba(67,160,71,0.4)',
                borderRadius: 10,
                padding: '10px 12px',
                color: '#B9F6CA',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {message}
            </div>
          )}

          {mode === 'login' && (
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={submitting}
              style={{
                alignSelf: 'flex-end',
                background: 'transparent',
                border: 'none',
                color: '#90CAF9',
                cursor: submitting ? 'default' : 'pointer',
                fontSize: 12,
                fontWeight: 800,
                padding: 0,
              }}
            >
              FORGOT PASSWORD?
            </button>
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
