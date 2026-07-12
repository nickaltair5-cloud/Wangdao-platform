import { useEffect, useState, useCallback } from 'react';
import { BookOpen, Feather, Users, Plus, Pencil, Trash2, Eye, Heart, Star, X, Save, Send, Loader2, AlertCircle, FileText, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Story, Chapter, Character } from '../lib/types';
import { LoadingState, EmptyState } from '../components/States';

type Tab = 'stories' | 'chapters' | 'characters';

export function AuthorStudio({ onOpenStory }: { onOpenStory: (id: string) => void }) {
  const { profile, session } = useAuth();
  const [tab, setTab] = useState<Tab>('stories');
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [showStoryForm, setShowStoryForm] = useState(false);

  const loadStories = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase.from('stories').select('*').eq('author_id', session.user.id).order('updated_at', { ascending: false });
    setStories((data as Story[]) || []);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => { loadStories(); }, [loadStories]);

  if (!profile || (profile.role !== 'author' && profile.role !== 'admin')) {
    return <EmptyState icon={<Feather size={40} />} title="Author access required" subtitle="Only authors can access the Studio." />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 animate-fade-in sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-slate-50">Author Studio</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your stories, chapters, and character designs.</p>
      </header>

      <div className="mb-6 inline-flex rounded-xl border border-midnight-700 bg-midnight-900/60 p-1.5">
        {([
          { id: 'stories', label: 'Stories', icon: <BookOpen size={16} /> },
          { id: 'chapters', label: 'Chapters', icon: <FileText size={16} /> },
          { id: 'characters', label: 'Characters', icon: <Users size={16} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t.id ? 'bg-cyan-gradient text-midnight-950 shadow-cyan' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingState /> : (
        <>
          {tab === 'stories' && (
            <StoriesTab stories={stories} onOpenStory={onOpenStory} onEdit={(s) => { setEditingStory(s); setShowStoryForm(true); }} onNew={() => { setEditingStory(null); setShowStoryForm(true); }} onChanged={loadStories} />
          )}
          {tab === 'chapters' && <ChaptersTab stories={stories} onChanged={loadStories} />}
          {tab === 'characters' && <CharactersTab stories={stories} />}
        </>
      )}

      {showStoryForm && (
        <StoryFormModal story={editingStory} onClose={() => setShowStoryForm(false)} onSaved={() => { setShowStoryForm(false); loadStories(); }} />
      )}
    </div>
  );
}

/* -------------------- STORIES TAB -------------------- */
function StoriesTab({ stories, onOpenStory, onEdit, onNew, onChanged }: {
  stories: Story[];
  onOpenStory: (id: string) => void;
  onEdit: (s: Story) => void;
  onNew: () => void;
  onChanged: () => void;
}) {
  const [delBusy, setDelBusy] = useState<string | null>(null);
  const del = async (s: Story) => {
    if (!confirm(`Delete "${s.title}"? This removes all chapters and characters too.`)) return;
    setDelBusy(s.id);
    await supabase.from('stories').delete().eq('id', s.id);
    setDelBusy(null);
    onChanged();
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-slate-400">{stories.length} stor{stories.length === 1 ? 'y' : 'ies'}</p>
        <button onClick={onNew} className="btn-primary"><Plus size={16} /> New Story</button>
      </div>
      {stories.length === 0 ? (
        <EmptyState icon={<BookOpen size={48} />} title="No stories yet" subtitle="Create your first story to start publishing." action={<button onClick={onNew} className="btn-primary"><Plus size={16} /> Create Story</button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((s) => (
            <div key={s.id} className="card overflow-hidden">
              <div className="relative aspect-[3/2] w-full bg-midnight-800">
                {s.cover_image_url ? <img src={s.cover_image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><BookOpen size={32} className="text-midnight-600" /></div>}
                <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${s.status === 'published' ? 'bg-cyan/20 text-cyan-glow' : 'bg-gold/20 text-gold-light'}`}>{s.status}</span>
              </div>
              <div className="p-4">
                <h3 className="font-serif text-lg font-semibold text-slate-100">{s.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{s.description}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Eye size={11} /> {s.total_views}</span>
                  <span className="flex items-center gap-1"><Heart size={11} /> {s.total_likes}</span>
                  <span className="flex items-center gap-1"><Star size={11} /> {s.total_favorites}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => onOpenStory(s.id)} className="btn-ghost flex-1 px-2 py-2 text-xs">View</button>
                  <button onClick={() => onEdit(s)} className="btn-ghost px-2 py-2 text-xs"><Pencil size={14} /></button>
                  <button onClick={() => del(s)} disabled={delBusy === s.id} className="rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-2 text-red-400 transition hover:bg-red-500/20"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- STORY FORM -------------------- */
function StoryFormModal({ story, onClose, onSaved }: { story: Story | null; onClose: () => void; onSaved: () => void }) {
  const { session } = useAuth();
  const [title, setTitle] = useState(story?.title || '');
  const [description, setDescription] = useState(story?.description || '');
  const [tags, setTags] = useState((story?.tags || []).join(', '));
  const [cover, setCover] = useState(story?.cover_image_url || '');
  const [status, setStatus] = useState<'draft' | 'published'>(story?.status || 'draft');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!session?.user?.id) return;
    setBusy(true); setError(null);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      cover_image_url: cover.trim() || null,
      status,
    };
    let res;
    if (story) {
      res = await supabase.from('stories').update(payload).eq('id', story.id);
    } else {
      res = await supabase.from('stories').insert({ ...payload, author_id: session.user.id });
    }
    setBusy(false);
    if (res.error) { setError(res.error.message); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-midnight-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-scale-in card p-6">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"><X size={18} /></button>
        <h3 className="font-display text-xl font-semibold text-slate-100">{story ? 'Edit Story' : 'New Story'}</h3>
        {error && <p className="mt-3 flex items-center gap-1.5 text-sm text-red-400"><AlertCircle size={14} /> {error}</p>}
        <div className="mt-4 space-y-3.5">
          <FormRow label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="Story title" /></FormRow>
          <FormRow label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input-field resize-none" placeholder="Synopsis…" /></FormRow>
          <FormRow label="Tags (comma-separated)"><input value={tags} onChange={(e) => setTags(e.target.value)} className="input-field" placeholder="Fantasy, Adventure" /></FormRow>
          <FormRow label="Cover Image URL"><div className="relative"><ImageIcon size={16} className="absolute left-3 top-3 text-slate-500" /><input value={cover} onChange={(e) => setCover(e.target.value)} className="input-field pl-9" placeholder="https://…" /></div></FormRow>
          <FormRow label="Status">
            <div className="flex gap-2">
              <button onClick={() => setStatus('draft')} className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${status === 'draft' ? 'border-gold bg-gold/15 text-gold-light' : 'border-midnight-700 text-slate-400'}`}>Draft</button>
              <button onClick={() => setStatus('published')} className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${status === 'published' ? 'border-cyan bg-cyan/15 text-cyan-glow' : 'border-midnight-700 text-slate-400'}`}>Published</button>
            </div>
          </FormRow>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={save} disabled={busy} className="btn-primary">{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {story ? 'Save Changes' : 'Create Story'}</button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- CHAPTERS TAB -------------------- */
function ChaptersTab({ stories, onChanged }: { stories: Story[]; onChanged: () => void }) {
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(stories[0]?.id || null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingCh, setLoadingCh] = useState(false);
  const [editing, setEditing] = useState<Chapter | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { if (stories.length && !selectedStoryId) setSelectedStoryId(stories[0].id); }, [stories, selectedStoryId]);

  const loadChapters = useCallback(async () => {
    if (!selectedStoryId) return;
    setLoadingCh(true);
    const { data } = await supabase.from('chapters').select('*').eq('story_id', selectedStoryId).order('chapter_number', { ascending: true });
    setChapters((data as Chapter[]) || []);
    setLoadingCh(false);
  }, [selectedStoryId]);

  useEffect(() => { loadChapters(); }, [loadChapters]);

  if (stories.length === 0) return <EmptyState icon={<FileText size={40} />} title="Create a story first" subtitle="Chapters belong to stories." />;

  const del = async (c: Chapter) => {
    if (!confirm(`Delete chapter "${c.title}"?`)) return;
    await supabase.from('chapters').delete().eq('id', c.id);
    loadChapters(); onChanged();
  };

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <select value={selectedStoryId || ''} onChange={(e) => setSelectedStoryId(e.target.value)} className="input-field sm:w-64">
          {stories.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary"><Plus size={16} /> New Chapter</button>
      </div>

      {loadingCh ? <LoadingState /> : chapters.length === 0 ? (
        <EmptyState icon={<FileText size={40} />} title="No chapters" subtitle="Add your first chapter." />
      ) : (
        <div className="space-y-2">
          {chapters.map((c) => (
            <div key={c.id} className="card flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-sm font-semibold text-gold-light">{c.chapter_number}</span>
                <div>
                  <p className="font-medium text-slate-100">{c.title}</p>
                  <p className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Eye size={11} /> {c.views}</span>
                    <span className="flex items-center gap-1"><Heart size={11} /> {c.likes}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${c.status === 'published' ? 'bg-cyan/20 text-cyan-glow' : 'bg-gold/20 text-gold-light'}`}>{c.status}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(c); setShowForm(true); }} className="btn-ghost px-2 py-2"><Pencil size={14} /></button>
                <button onClick={() => del(c)} className="rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-2 text-red-400 hover:bg-red-500/20"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ChapterFormModal chapter={editing} storyId={selectedStoryId!} nextNumber={(chapters[chapters.length - 1]?.chapter_number || 0) + 1} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); loadChapters(); onChanged(); }} />
      )}
    </div>
  );
}

function ChapterFormModal({ chapter, storyId, nextNumber, onClose, onSaved }: { chapter: Chapter | null; storyId: string; nextNumber: number; onClose: () => void; onSaved: () => void }) {
  const { session } = useAuth();
  const [title, setTitle] = useState(chapter?.title || '');
  const [content, setContent] = useState(chapter?.content || '');
  const [number, setNumber] = useState(chapter?.chapter_number || nextNumber);
  const [status, setStatus] = useState<'draft' | 'published'>(chapter?.status || 'draft');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (publishNow: boolean) => {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!session?.user?.id) return;
    setBusy(true); setError(null);
    const finalStatus = publishNow ? 'published' : status;
    const payload = { title: title.trim(), content, chapter_number: number, status: finalStatus, story_id: storyId, author_id: session.user.id };
    let res;
    if (chapter) res = await supabase.from('chapters').update({ title: payload.title, content: payload.content, chapter_number: payload.chapter_number, status: finalStatus }).eq('id', chapter.id);
    else res = await supabase.from('chapters').insert(payload);
    setBusy(false);
    if (res.error) { setError(res.error.message); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-midnight-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl animate-scale-in card p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"><X size={18} /></button>
        <h3 className="font-display text-xl font-semibold text-slate-100">{chapter ? 'Edit Chapter' : 'New Chapter'}</h3>
        {error && <p className="mt-3 flex items-center gap-1.5 text-sm text-red-400"><AlertCircle size={14} /> {error}</p>}
        <div className="mt-4 space-y-3.5">
          <div className="flex gap-3">
            <FormRow label="Chapter #" className="w-24"><input type="number" min={1} value={number} onChange={(e) => setNumber(Number(e.target.value))} className="input-field" /></FormRow>
            <FormRow label="Title" className="flex-1"><input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="Chapter title" /></FormRow>
          </div>
          <FormRow label="Content"><textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12} className="input-field resize-y font-serif" placeholder="Write your chapter…" /></FormRow>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => { setStatus('draft'); save(false); }} disabled={busy} className="btn-gold">{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Draft</button>
          <button onClick={() => save(true)} disabled={busy} className="btn-primary">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Publish</button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- CHARACTERS TAB -------------------- */
function CharactersTab({ stories }: { stories: Story[] }) {
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(stories[0]?.id || null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loadingCh, setLoadingCh] = useState(false);
  const [editing, setEditing] = useState<Character | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { if (stories.length && !selectedStoryId) setSelectedStoryId(stories[0].id); }, [stories, selectedStoryId]);

  const loadChars = useCallback(async () => {
    if (!selectedStoryId) return;
    setLoadingCh(true);
    const { data } = await supabase.from('characters').select('*').eq('story_id', selectedStoryId).order('created_at', { ascending: true });
    setCharacters((data as Character[]) || []);
    setLoadingCh(false);
  }, [selectedStoryId]);

  useEffect(() => { loadChars(); }, [loadChars]);

  if (stories.length === 0) return <EmptyState icon={<Users size={40} />} title="Create a story first" subtitle="Characters belong to stories." />;

  const del = async (c: Character) => {
    if (!confirm(`Delete character "${c.name}"?`)) return;
    await supabase.from('characters').delete().eq('id', c.id);
    loadChars();
  };

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <select value={selectedStoryId || ''} onChange={(e) => setSelectedStoryId(e.target.value)} className="input-field sm:w-64">
          {stories.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary"><Plus size={16} /> New Character</button>
      </div>

      {loadingCh ? <LoadingState /> : characters.length === 0 ? (
        <EmptyState icon={<Users size={40} />} title="No characters" subtitle="Design your first character profile." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((c) => (
            <div key={c.id} className="card overflow-hidden">
              <div className="aspect-square w-full bg-midnight-800">
                {c.image_url ? <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Users size={32} className="text-midnight-600" /></div>}
              </div>
              <div className="p-4">
                <h3 className="font-serif text-lg font-semibold text-slate-100">{c.name}</h3>
                <p className="text-xs font-medium text-gold-light">{c.role}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{c.bio}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { setEditing(c); setShowForm(true); }} className="btn-ghost flex-1 px-2 py-2 text-xs"><Pencil size={14} /> Edit</button>
                  <button onClick={() => del(c)} className="rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-2 text-red-400 hover:bg-red-500/20"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CharacterFormModal character={editing} storyId={selectedStoryId!} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); loadChars(); }} />
      )}
    </div>
  );
}

function CharacterFormModal({ character, storyId, onClose, onSaved }: { character: Character | null; storyId: string; onClose: () => void; onSaved: () => void }) {
  const { session } = useAuth();
  const [name, setName] = useState(character?.name || '');
  const [role, setRole] = useState(character?.role || '');
  const [bio, setBio] = useState(character?.bio || '');
  const [image, setImage] = useState(character?.image_url || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!session?.user?.id) return;
    setBusy(true); setError(null);
    const payload = { name: name.trim(), role: role.trim(), bio: bio.trim(), image_url: image.trim() || null, story_id: storyId, author_id: session.user.id };
    let res;
    if (character) res = await supabase.from('characters').update({ name: payload.name, role: payload.role, bio: payload.bio, image_url: payload.image_url }).eq('id', character.id);
    else res = await supabase.from('characters').insert(payload);
    setBusy(false);
    if (res.error) { setError(res.error.message); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-midnight-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-scale-in card p-6 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"><X size={18} /></button>
        <h3 className="font-display text-xl font-semibold text-slate-100">{character ? 'Edit Character' : 'New Character'}</h3>
        {error && <p className="mt-3 flex items-center gap-1.5 text-sm text-red-400"><AlertCircle size={14} /> {error}</p>}
        <div className="mt-4 space-y-3.5">
          <FormRow label="Character Name"><input value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="Full name" /></FormRow>
          <FormRow label="Role / Faction"><input value={role} onChange={(e) => setRole(e.target.value)} className="input-field" placeholder="e.g. Protagonist, Shadow Clan" /></FormRow>
          <FormRow label="Bio / Description"><textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="input-field resize-none font-serif" placeholder="Backstory, personality…" /></FormRow>
          <FormRow label="Character Art Image URL"><div className="relative"><ImageIcon size={16} className="absolute left-3 top-3 text-slate-500" /><input value={image} onChange={(e) => setImage(e.target.value)} className="input-field pl-9" placeholder="https://…" /></div></FormRow>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={save} disabled={busy} className="btn-primary">{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {character ? 'Save Changes' : 'Create Character'}</button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- shared form bits -------------------- */
function FormRow({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}
