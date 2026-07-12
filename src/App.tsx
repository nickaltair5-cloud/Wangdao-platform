import { useState, useCallback } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { Header, type Route } from './components/Header';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { Home } from './pages/Home';
import { StoryDetail } from './pages/StoryDetail';
import { Reader } from './pages/Reader';
import { AuthorStudio } from './pages/AuthorStudio';
import { AdminPanel } from './pages/AdminPanel';
import { Logo } from './components/Logo';

function Shell() {
  const { profile, loading } = useAuth();
  const [route, setRoute] = useState<Route>('home');
  const [storyId, setStoryId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authMessage, setAuthMessage] = useState<string | undefined>(undefined);

  const navigate = useCallback((r: Route) => {
    setRoute(r);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openStory = useCallback((id: string) => {
    setStoryId(id);
    setRoute('story');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openChapter = useCallback((id: string) => {
    setChapterId(id);
    setRoute('reader');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const requireAuth = useCallback((message: string) => {
    setAuthMessage(message);
    setAuthMode('signup');
    setAuthOpen(true);
  }, []);

  const openAuth = useCallback((mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthMessage(undefined);
    setAuthOpen(true);
  }, []);

  // Gate protected routes
  const renderRoute = () => {
    if (loading) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <Logo size="lg" showText={false} />
          <div className="h-1 w-32 overflow-hidden rounded-full bg-midnight-800">
            <div className="h-full w-1/2 animate-shimmer rounded-full bg-cyan-gradient" style={{ backgroundSize: '200% 100%' }} />
          </div>
        </div>
      );
    }

    switch (route) {
      case 'home':
        return <Home onOpenStory={openStory} />;
      case 'browse':
        return <Home onOpenStory={openStory} />;
      case 'story':
        return storyId ? (
          <StoryDetail storyId={storyId} onBack={() => navigate('home')} onReadChapter={openChapter} onRequireAuth={requireAuth} />
        ) : <Home onOpenStory={openStory} />;
      case 'reader':
        if (!profile) {
          // Dynamic gate: not logged in → prompt auth
          return <GateScreen onSignIn={() => openAuth('login')} onSignUp={() => openAuth('signup')} message="Sign in to read chapters" />;
        }
        return chapterId ? (
          <Reader chapterId={chapterId} onBack={() => storyId && openStory(storyId)} onOpenChapter={openChapter} />
        ) : <Home onOpenStory={openStory} />;
      case 'studio':
        if (!profile || (profile.role !== 'author' && profile.role !== 'admin')) {
          return <GateScreen onSignIn={() => openAuth('login')} onSignUp={() => openAuth('signup')} message="Author access required" />;
        }
        return <AuthorStudio onOpenStory={openStory} />;
      case 'admin':
        if (!profile || profile.role !== 'admin') {
          return <GateScreen onSignIn={() => openAuth('login')} onSignUp={() => openAuth('signup')} message="Admin access required" />;
        }
        return <AdminPanel />;
      default:
        return <Home onOpenStory={openStory} />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header onNavigate={navigate} onAuthOpen={openAuth} />
      <main className="flex-1">{renderRoute()}</main>
      <Footer />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} message={authMessage} />
    </div>
  );
}

function GateScreen({ onSignIn, onSignUp, message }: { onSignIn: () => void; onSignUp: () => void; message: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center animate-fade-in">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/40 bg-midnight-900 shadow-gold">
        <Logo size="md" showText={false} />
      </div>
      <h2 className="font-display text-2xl font-bold text-slate-100">{message}</h2>
      <p className="mt-2 text-sm text-slate-400">Join Wangdao to continue. Reading and interacting require a free account.</p>
      <div className="mt-6 flex gap-3">
        <button onClick={onSignIn} className="btn-ghost">Sign In</button>
        <button onClick={onSignUp} className="btn-primary">Create Account</button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
