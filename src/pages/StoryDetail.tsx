import { useEffect, useState } from 'react';
import { ArrowLeft, Eye, Heart, Star, BookOpen, Users, Calendar, Tag, Bookmark, BookmarkCheck, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Story, Chapter, Character } from '../lib/types';
import { LoadingState, EmptyState } from '../components/States';

interface StoryDetailProps {
  storyId: string;
  onBack: () => void;
  onReadChapter: (chapterId: string) => void;
  onRequireAuth: (message: string) => void;
}

export function StoryDetail({ storyId, onBack, onReadChapter, onRequireAuth }: StoryDetailProps) {
  const { session } = useAuth();
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const [{ data: s }, { data: chs }, { data: chars }] = await Promise.all([
        supabase.from('stories').select('*, author:profiles!stories_author_id_fkey(username, avatar_url)').eq('id', storyId).maybeSingle(),
        supabase.from('chapters').select('*').eq('story_id', storyId).order('chapter_number', { ascending: true }),
        supabase.from('characters').select('*').eq('story_id', storyId).order('created_at', { ascending: true }),
      ]);
      setStory(s as Story);
      const allChs = (chs as Chapter[]) || [];
      // Public visitors see only published; author sees own drafts too
      const visible = allChs.filter((c) => c.status === 'published' || c.author_id === session?.user?.id);
      setChapters(visible);
      setCharacters((chars as Character[]) || []);
      setLoading(false);
    })();
  }, [storyId, session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('favorites')
        .select('story_id')
        .eq('user_id', session.user.id)
        .eq('story_id', storyId)
        .maybeSingle();
      setIsFav(!!data);
    })();
  }, [session?.user?.id, storyId]);

  const toggleFav = async () => {
    if (!session?.user?.id) {
      onRequireAuth('Sign in to save stories to your library.');
      return;
    }
    setFavBusy(true);
    if (isFav) {
      await supabase.from('favorites').delete().eq('user_id', session.user.id).eq('story_id', storyId);
      setIsFav(false);
      setStory((s) => (s ? { ...s, total_favorites: Math.max(0, s.total_favorites - 1) } : s));
    } else {
      await supabase.from('favorites').insert({ user_id: session.user.id, story_id: storyId });
      setIsFav(true);
      setStory((s) => (s ? { ...s, total_favorites: s.total_favorites + 1 } : s));
    }
    setFavBusy(false);
  };

  const handleChapterClick = (ch: Chapter) => {
    if (!session?.user?.id) {
      onRequireAuth('Sign in to read chapters and enter the e-reader.');
      return;
    }
    onReadChapter(ch.id);
  };

  const handleCharacterClick = (c: Character) => {
    if (!session?.user?.id) {
      onRequireAuth('Sign in to view full character profiles.');
      return;
    }
    setSelectedChar(c);
  };

  if (loading) return <LoadingState label="Loading story…" />;
  if (!story) return <EmptyState icon={<BookOpen size={48} />} title="Story not found" subtitle="It may have been removed." action={<button onClick={onBack} className="btn-ghost">Go back</button>} />;

  const publishedChapters = chapters.filter((c) => c.status === 'published');

  return (
    <div className="animate-fade-in">
      {/* Hero banner */}
      <div className="relative h-64 overflow-hidden sm:h-80">
        {story.cover_image_url ? (
          <img src={story.cover_image_url} alt="" className="h-full w-full object-cover opacity-40" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-midnight-800 to-midnight-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-midnight-950 via-midnight-950/60 to-transparent" />
        <button onClick={onBack} className="absolute left-4 top-4 flex items-center gap-1.5 rounded-lg border border-midnight-700 bg-midnight-950/70 px-3 py-2 text-sm text-slate-200 backdrop-blur transition hover:border-cyan/50 hover:text-cyan-glow">
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="-mt-24 flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="w-32 shrink-0 overflow-hidden rounded-xl border-2 border-gold/40 shadow-gold sm:w-44">
            {story.cover_image_url ? (
              <img src={story.cover_image_url} alt={story.title} className="aspect-[3/4] w-full object-cover" />
            ) : (
              <div className="flex aspect-[3/4] w-full items-center justify-center bg-midnight-800"><BookOpen size={40} className="text-midnight-600" /></div>
            )}
          </div>
          <div className="flex-1 pb-2">
            <h1 className="font-display text-3xl font-bold text-slate-50 sm:text-4xl">{story.title}</h1>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-300">
              by <span className="font-medium text-gold-light">{story.author?.username || 'Unknown'}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Eye size={14} className="text-cyan/70" /> {story.total_views} views</span>
              <span className="flex items-center gap-1"><Heart size={14} className="text-cyan/70" /> {story.total_likes} likes</span>
              <span className="flex items-center gap-1"><Star size={14} className="text-gold/70" /> {story.total_favorites} favorites</span>
              <span className="flex items-center gap-1"><BookOpen size={14} className="text-cyan/70" /> {publishedChapters.length} chapters</span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={toggleFav} disabled={favBusy} className={isFav ? 'btn-gold' : 'btn-primary'}>
              {isFav ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              {isFav ? 'In Library' : 'Save'}
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Left: description + chapters */}
          <div className="lg:col-span-2 space-y-8">
            <section className="card p-5">
              <h2 className="mb-2 font-display text-lg font-semibold text-slate-100">Synopsis</h2>
              <p className="font-serif text-base leading-relaxed text-slate-300">{story.description || 'No description provided.'}</p>
              {story.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Tag size={14} className="text-cyan/60" />
                  {story.tags.map((t) => <span key={t} className="tag-chip">{t}</span>)}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-slate-100">
                <BookOpen size={18} className="text-cyan" /> Chapters
              </h2>
              {chapters.length === 0 ? (
                <EmptyState icon={<BookOpen size={40} />} title="No chapters yet" subtitle="The author hasn't published chapters." />
              ) : (
                <div className="space-y-2">
                  {chapters.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => handleChapterClick(ch)}
                      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-midnight-800 bg-midnight-900/50 p-4 text-left transition hover:border-cyan/50 hover:bg-midnight-800/60"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 font-display text-sm font-semibold text-gold-light">
                          {ch.chapter_number}
                        </span>
                        <div>
                          <p className="font-medium text-slate-100 group-hover:text-cyan-glow">{ch.title}</p>
                          <p className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Eye size={11} /> {ch.views}</span>
                            <span className="flex items-center gap-1"><Heart size={11} /> {ch.likes}</span>
                            {ch.status === 'draft' && <span className="rounded bg-gold/20 px-1.5 py-0.5 text-gold-light">Draft</span>}
                          </p>
                        </div>
                      </div>
                      {!session?.user?.id && <Lock size={16} className="text-slate-600" />}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right: characters */}
          <aside className="space-y-6">
            <section>
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-slate-100">
                <Users size={18} className="text-gold" /> Characters
              </h2>
              {characters.length === 0 ? (
                <p className="rounded-xl border border-dashed border-midnight-700 bg-midnight-900/40 p-4 text-sm text-slate-500">No character profiles yet.</p>
              ) : (
                <div className="space-y-3">
                  {characters.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleCharacterClick(c)}
                      className="group flex w-full items-center gap-3 rounded-xl border border-midnight-800 bg-midnight-900/50 p-3 text-left transition hover:border-gold/50"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gold/20 bg-midnight-800">
                        {c.image_url ? (
                          <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center"><Users size={18} className="text-midnight-600" /></div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-100 group-hover:text-gold-light">{c.name}</p>
                        <p className="truncate text-xs text-slate-400">{c.role || 'No role'}</p>
                      </div>
                      {!session?.user?.id && <Lock size={14} className="text-slate-600" />}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <div className="card flex items-center gap-2 p-4 text-xs text-slate-500">
              <Calendar size={14} className="text-cyan/60" />
              Updated {new Date(story.updated_at).toLocaleDateString()}
            </div>
          </aside>
        </div>
      </div>

      {/* Character detail modal */}
      {selectedChar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedChar(null)}>
          <div className="absolute inset-0 bg-midnight-950/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg animate-scale-in overflow-hidden rounded-2xl border border-gold/30 bg-midnight-900 shadow-gold" onClick={(e) => e.stopPropagation()}>
            {selectedChar.image_url ? (
              <img src={selectedChar.image_url} alt={selectedChar.name} className="h-56 w-full object-cover" />
            ) : (
              <div className="flex h-56 w-full items-center justify-center bg-gradient-to-br from-midnight-800 to-midnight-950"><Users size={48} className="text-midnight-600" /></div>
            )}
            <div className="p-5">
              <h3 className="font-display text-2xl font-semibold text-slate-50">{selectedChar.name}</h3>
              <p className="mt-1 text-sm font-medium text-gold-light">{selectedChar.role}</p>
              <p className="mt-3 font-serif text-base leading-relaxed text-slate-300">{selectedChar.bio || 'No biography provided.'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
