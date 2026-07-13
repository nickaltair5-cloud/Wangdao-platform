import { useEffect, useMemo, useState } from 'react';
import { Search, Sparkles, Flame, ArrowRight, BookOpen, Users, Feather } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Story } from '../lib/types';
import { StoryCard } from '../components/StoryCard';
import { LoadingState, EmptyState } from '../components/States';
import { Logo } from '../components/Logo';

interface HomeProps {
  onOpenStory: (id: string) => void;
}

export function Home({ onOpenStory }: HomeProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [browseMode, setBrowseMode] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('stories')
        .select('*, author:profiles!stories_author_id_fkey(username, avatar_url, role)')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (error) console.warn(error);
      setStories((data as Story[]) || []);
      setLoading(false);
    })();
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    stories.forEach((s) => s.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [stories]);

  const filtered = useMemo(() => {
    return stories.filter((s) => {
      const matchQ = !query || s.title.toLowerCase().includes(query.toLowerCase()) || (s.description || '').toLowerCase().includes(query.toLowerCase());
      const matchT = !activeTag || s.tags.includes(activeTag);
      return matchQ && matchT;
    });
  }, [stories, query, activeTag]);

  const recent = useMemo(
    () => [...filtered].sort((a, b) => (b.latest_chapter_at || b.updated_at).localeCompare(a.latest_chapter_at || a.updated_at)).slice(0, 8),
    [filtered]
  );
  const popular = useMemo(
    () => [...filtered].sort((a, b) => b.total_views + b.total_likes * 2 - (a.total_views + a.total_likes * 2)).slice(0, 8),
    [filtered]
  );

  const showingBrowse = browseMode || query || activeTag;

  return (
    <div className="animate-fade-in bg-midnight-950 font-sans text-slate-100">
      {/* HERO */}
      <section className="relative overflow-hidden bg-midnight-950">
        <div className="absolute inset-0 bg-midnight-radial opacity-100" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-midnight-950" />
        <div className="absolute -left-40 top-20 h-80 w-80 rounded-full bg-cyan/10 blur-3xl" />
        <div className="absolute -right-40 bottom-0 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-12 text-center sm:px-6 lg:px-8 lg:pt-20">
          <div className="flex flex-col items-center">
            <img
              src="https://i.gyazo.com/b1cd2e06b3f7cb460107822b0a2c76f7.png"
              alt="Wangdao"
              className="w-64 object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.75)] sm:w-80 lg:w-96"
            />
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-balance font-sans text-lg leading-relaxed text-slate-300 sm:text-xl">
            A literary universe where stories breathe. Read immersive chapters, explore character designs,
            and join a community of dreamers and storytellers.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => document.getElementById('recent')?.scrollIntoView({ behavior: 'smooth' })} className="btn-primary">
              <Sparkles size={16} /> Explore Stories
            </button>
            <button onClick={() => setBrowseMode(true)} className="btn-ghost">
              <Search size={16} /> Browse All
            </button>
          </div>

          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-3 gap-4">
            {[
              { icon: <BookOpen size={20} />, label: 'Stories', value: stories.length },
              { icon: <Feather size={20} />, label: 'For Authors', value: 'Studio' },
              { icon: <Users size={20} />, label: 'Community', value: 'Readers' },
            ].map((s, i) => (
              <div key={i} className="card flex flex-col items-center gap-1.5 p-4">
                <span className="text-cyan-glow">{s.icon}</span>
                <span className="font-display text-xl font-semibold text-slate-100">{s.value}</span>
                <span className="text-xs uppercase tracking-wider text-slate-400">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEARCH / FILTER */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setBrowseMode(true); }}
              placeholder="Search by title or description…"
              className="input-field pl-11"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setActiveTag(null); setBrowseMode(false); }}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${!activeTag ? 'border-cyan bg-cyan/15 text-cyan-glow' : 'border-midnight-700 text-slate-400 hover:text-slate-200'}`}
            >
              All
            </button>
            {allTags.slice(0, 8).map((t) => (
              <button
                key={t}
                onClick={() => { setActiveTag(t === activeTag ? null : t); setBrowseMode(true); }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${activeTag === t ? 'border-cyan bg-cyan/15 text-cyan-glow' : 'border-midnight-700 text-slate-400 hover:text-slate-200'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <LoadingState />
      ) : showingBrowse ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-slate-100">
              {query ? `Results for “${query}”` : activeTag ? `Tag: ${activeTag}` : 'All Stories'}
            </h2>
            <button onClick={() => { setQuery(''); setActiveTag(null); setBrowseMode(false); }} className="text-sm text-cyan-glow hover:underline">
              Clear
            </button>
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon={<BookOpen size={48} />} title="No stories found" subtitle="Try a different search or tag." />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((s) => (
                <StoryCard key={s.id} story={s} onClick={() => onOpenStory(s.id)} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* RECENTLY UPDATED */}
          <section id="recent" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <SectionHeader icon={<Sparkles size={18} />} title="Recently Updated" subtitle="Fresh chapters from active authors" />
            {recent.length === 0 ? (
              <EmptyState icon={<BookOpen size={48} />} title="No stories yet" subtitle="Be the first — authors can publish from the Studio." />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {recent.map((s) => (
                  <StoryCard key={s.id} story={s} onClick={() => onOpenStory(s.id)} />
                ))}
              </div>
            )}
          </section>

          {/* MOST POPULAR */}
          <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <SectionHeader icon={<Flame size={18} />} title="Most Popular" subtitle="Ranked by views and likes" />
            {popular.length === 0 ? (
              <EmptyState icon={<BookOpen size={48} />} title="Nothing popular yet" />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {popular.map((s) => (
                  <StoryCard key={s.id} story={s} onClick={() => onOpenStory(s.id)} />
                ))}
              </div>
            )}
          </section>

          {/* CTA */}
          <section className="mx-auto max-w-5xl px-4 pb-8 sm:px-6 lg:px-8">
            <div className="card relative overflow-hidden p-8 text-center sm:p-12">
              <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-gold/10 blur-3xl" />
              <h2 className="font-display text-3xl font-semibold text-slate-100">Are you a storyteller?</h2>
              <p className="mx-auto mt-3 max-w-xl text-slate-300">
                Join Wangdao as an Author and publish your universe — stories, chapters, and character designs — to a community of readers.
              </p>
              <div className="mt-6 flex justify-center">
                <button onClick={() => setBrowseMode(true)} className="btn-gold">
                  Discover Stories <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/10 text-cyan-glow">
        {icon}
      </div>
      <div>
        <h2 className="font-display text-2xl font-semibold text-slate-100">{title}</h2>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}
