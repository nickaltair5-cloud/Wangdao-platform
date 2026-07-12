import { useState } from 'react';
import { Home, Compass, Feather, Shield, LogOut, Menu, X, BookMarked } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Logo } from './Logo';

export type Route = 'home' | 'browse' | 'studio' | 'admin' | 'story' | 'reader';

interface HeaderProps {
  onNavigate: (route: Route) => void;
  onAuthOpen: (mode: 'login' | 'signup') => void;
}

export function Header({ onNavigate, onAuthOpen }: HeaderProps) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const isAuthor = profile?.role === 'author';

  const navItems: { label: string; route: Route; icon: React.ReactNode; show: boolean }[] = [
    { label: 'Home', route: 'home', icon: <Home size={16} />, show: true },
    { label: 'Browse', route: 'browse', icon: <Compass size={16} />, show: true },
    { label: 'Author Studio', route: 'studio', icon: <Feather size={16} />, show: isAuthor || isAdmin },
    { label: 'Admin', route: 'admin', icon: <Shield size={16} />, show: isAdmin },
  ];

  const go = (r: Route) => {
    onNavigate(r);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-midnight-800/80 bg-midnight-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button onClick={() => go('home')} className="shrink-0">
          <Logo size="sm" />
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.filter((n) => n.show).map((n) => (
            <button
              key={n.route}
              onClick={() => go(n.route)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-midnight-800/60 hover:text-cyan-glow"
            >
              {n.icon}
              {n.label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {profile ? (
            <>
              <div className="flex items-center gap-2.5 rounded-lg border border-midnight-700 bg-midnight-900/60 px-3 py-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-gradient text-xs font-bold text-midnight-950">
                  {profile.username.slice(0, 1).toUpperCase()}
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-medium text-slate-200">{profile.username}</p>
                  <p className="text-[10px] uppercase tracking-wider text-gold-light/80">{profile.role}</p>
                </div>
              </div>
              <button onClick={signOut} className="btn-ghost px-3" title="Sign out">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onAuthOpen('login')} className="btn-ghost">
                Sign In
              </button>
              <button onClick={() => onAuthOpen('signup')} className="btn-primary">
                <BookMarked size={16} />
                Sign Up
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-lg p-2 text-slate-300 transition hover:bg-midnight-800 md:hidden"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-midnight-800 bg-midnight-950/95 px-4 py-4 md:hidden animate-fade-in">
          <nav className="flex flex-col gap-1">
            {navItems.filter((n) => n.show).map((n) => (
              <button
                key={n.route}
                onClick={() => go(n.route)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-midnight-800 hover:text-cyan-glow"
              >
                {n.icon}
                {n.label}
              </button>
            ))}
          </nav>
          <div className="mt-3 border-t border-midnight-800 pt-3">
            {profile ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{profile.username}</span>
                <button onClick={signOut} className="btn-ghost px-3">
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => { onAuthOpen('login'); setMobileOpen(false); }} className="btn-ghost flex-1">
                  Sign In
                </button>
                <button onClick={() => { onAuthOpen('signup'); setMobileOpen(false); }} className="btn-primary flex-1">
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
