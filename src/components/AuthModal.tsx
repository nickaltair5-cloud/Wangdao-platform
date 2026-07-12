import { useEffect, useState } from 'react';
import { X, Mail, Lock, User, KeyRound, Eye, EyeOff, BookOpen, Feather, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Logo } from './Logo';

type Mode = 'login' | 'signup';
type Role = 'reader' | 'author';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
  message?: string;
}

export function AuthModal({ open, onClose, initialMode = 'login', message }: AuthModalProps) {
  const { refreshProfile } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [role, setRole] = useState<Role>('reader');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
      setEmail('');
      setUsername('');
      setPassword('');
      setAccessCode('');
      setShowPw(false);
      setRole('reader');
    }
  }, [open, initialMode]);

  useEffect(() => {
    setError(null);
  }, [mode, role]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);

    try {
      if (mode === 'signup') {
        if (!username.trim()) {
          setError('Please choose a username.');
          setBusy(false);
          return;
        }
        if (role === 'author') {
          if (!accessCode.trim()) {
            setError("Author Access Code is required. Don\u2019t have one? Register as a Reader instead and enjoy the stories.");
            setBusy(false);
            return;
          }
          // Validate code first (without consuming)
          const { error: codeErr } = await supabase.rpc('validate_author_code', { p_code: accessCode.trim() });
          if (codeErr) {
            const msg = codeErr.message.includes('ALREADY_USED')
              ? 'This Author Access Code has already been used. Please obtain a new one, or register as a Reader instead.'
              : 'Invalid Author Access Code. Please check it, or register as a Reader to enjoy the stories.';
            setError(msg);
            setBusy(false);
            return;
          }
        }

        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: username.trim(), role } },
        });

        if (signUpErr) {
          setError(signUpErr.message);
          setBusy(false);
          return;
        }

        if (role === 'author' && data.user) {
          // Consume code + promote profile to author
          const { error: consumeErr } = await supabase.rpc('consume_author_code', { p_code: accessCode.trim() });
          if (consumeErr) {
            // signup succeeded but code consumption failed — warn but don't block
            console.warn('Code consume failed:', consumeErr.message);
          }
        }

        await refreshProfile();
        onClose();
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          setError(signInErr.message);
          setBusy(false);
          return;
        }
        await refreshProfile();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-midnight-950/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md animate-scale-in">
        <div className="card border-gold/20 p-6 shadow-2xl sm:p-8">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-slate-400 transition hover:text-slate-200"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="mb-5 flex flex-col items-center text-center">
            <Logo size="lg" showText={false} />
            <h2 className="mt-3 font-display text-2xl font-bold brand-text">
              {mode === 'login' ? 'Welcome Back' : 'Join Wangdao'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {mode === 'login' ? 'Sign in to continue your journey' : 'Create your account to enter'}
            </p>
          </div>

          {message && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-2 text-sm text-cyan-glow">
              <ShieldCheck size={16} className="mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-300 animate-fade-in">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'signup' && (
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg border border-midnight-700 bg-midnight-950/50 p-1.5">
              <RoleTab active={role === 'reader'} onClick={() => setRole('reader')} icon={<BookOpen size={16} />} label="Reader" />
              <RoleTab active={role === 'author'} onClick={() => setRole('author')} icon={<Feather size={16} />} label="Author" />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <Field icon={<Mail size={16} />}>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                autoComplete="email"
              />
            </Field>

            {mode === 'signup' && (
              <Field icon={<User size={16} />}>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                  autoComplete="username"
                />
              </Field>
            )}

            <Field icon={<Lock size={16} />}>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="text-slate-500 transition hover:text-slate-300"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </Field>

            {mode === 'signup' && role === 'author' && (
              <Field icon={<KeyRound size={16} />} accent="gold">
                <input
                  type="text"
                  placeholder="Author Access Code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="w-full bg-transparent text-sm text-gold-light placeholder-gold-dark/70 focus:outline-none"
                  style={{ textTransform: 'uppercase' }}
                />
              </Field>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === 'login' ? 'Sign In' : `Sign Up as ${role === 'author' ? 'Author' : 'Reader'}`}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-slate-400">
            {mode === 'login' ? (
              <>
                New to Wangdao?{' '}
                <button onClick={() => setMode('signup')} className="font-medium text-cyan-glow hover:underline">
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="font-medium text-cyan-glow hover:underline">
                  Sign in
                </button>
              </>
            )}
          </div>

          {mode === 'signup' && role === 'author' && (
            <p className="mt-4 text-center text-xs text-slate-500">
              Authors need an access code from an administrator. Don&rsquo;t have one? You can still{' '}
              <button onClick={() => setRole('reader')} className="text-cyan-glow hover:underline">
                register as a Reader
              </button>{' '}
              and enjoy every story.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RoleTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-all ${
        active
          ? 'bg-cyan-gradient text-midnight-950 shadow-cyan'
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Field({
  icon,
  children,
  accent = 'cyan',
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  accent?: 'cyan' | 'gold';
}) {
  const border = accent === 'gold' ? 'focus-within:border-gold focus-within:ring-gold/20' : 'focus-within:border-cyan focus-within:ring-cyan/20';
  const iconColor = accent === 'gold' ? 'text-gold' : 'text-cyan';
  return (
    <div className={`flex items-center gap-2.5 rounded-lg border border-midnight-700 bg-midnight-950/50 px-3.5 py-2.5 transition-all focus-within:ring-2 ${border}`}>
      <span className={iconColor}>{icon}</span>
      {children}
    </div>
  );
}
