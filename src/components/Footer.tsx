import { Logo } from './Logo';
import { Github, Twitter, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-midnight-800/80 bg-midnight-950/60">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Logo size="sm" />
          <p className="text-center text-sm text-slate-400 sm:text-right">
            A literary universe where stories breathe.
            <br />
            <span className="text-slate-500">Read. Write. Belong.</span>
          </p>
          <div className="flex items-center gap-3">
            {[Github, Twitter, Mail].map((Icon, i) => (
              <a
                key={i}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-midnight-700 bg-midnight-900/60 text-slate-400 transition hover:border-cyan/50 hover:text-cyan-glow"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>
        <div className="gold-divider mt-8" />
        <p className="mt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Wangdao. Crafted for storytellers.
        </p>
      </div>
    </footer>
  );
}
