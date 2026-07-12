import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Heart, Eye, MessageSquare, Flag, Send, Loader2, AlertCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Chapter, Story, Comment, Profile } from '../lib/types';
import { LoadingState, EmptyState } from '../components/States';

interface ReaderProps {
  chapterId: string;
  onBack: () => void;
  onOpenChapter: (id: string) => void;
}

const SIZES = [
  { label: 'S', cls: 'text-base' },
  { label: 'M', cls: 'text-lg' },
  { label: 'L', cls: 'text-xl' },
  { label: 'XL', cls: 'text-2xl' },
];

export function Reader({ chapterId, onBack, onOpenChapter }: ReaderProps) {
  const { session } = useAuth();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [siblings, setSiblings] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [sizeIdx, setSizeIdx] = useState(1);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [comments, setComments] = useState<(Comment & { author?: Profile })[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [reportTarget, setReportTarget] = useState<Comment | null>(null);

  const loadChapter = useCallback(async () => {
    setLoading(true);
    const { data: ch } = await supabase.from('chapters').select('*').eq('id', chapterId).maybeSingle();
    if (!ch) { setLoading(false); return; }
    setChapter(ch as Chapter);
    const { data: st } = await supabase.from('stories').select('*').eq('id', (ch as Chapter).story_id).maybeSingle();
    setStory(st as Story);
    const { data: sibs } = await supabase.from('chapters').select('*').eq('story_id', (ch as Chapter).story_id).eq('status', 'published').order('chapter_number', { ascending: true });
    setSiblings((sibs as Chapter[]) || []);
    setLoading(false);
  }, [chapterId]);

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, author:profiles!comments_user_id_fkey(username, avatar_url, role)')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: false });
    setComments((data as (Comment & { author?: Profile })[]) || []);
  }, [chapterId]);

  useEffect(() => {
    loadChapter();
    loadComments();
  }, [chapterId, loadChapter, loadComments]);

  // View counter: record a view once per mount/chapter
  useEffect(() => {
    if (!session?.user?.id || !chapterId) return;
    (async () => {
      await supabase.from('chapter_views').insert({ chapter_id: chapterId, user_id: session.user.id });
      // Refresh chapter to reflect new view count
      const { data } = await supabase.from('chapters').select('views').eq('id', chapterId).maybeSingle();
      if (data) setChapter((c) => (c ? { ...c, views: (data as Chapter).views } : c));
    })();
  }, [chapterId, session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id || !chapterId) return;
    (async () => {
      const { data } = await supabase.from('chapter_likes').select('chapter_id').eq('user_id', session.user.id).eq('chapter_id', chapterId).maybeSingle();
      setLiked(!!data);
    })();
  }, [chapterId, session?.user?.id]);

  const toggleLike = async () => {
    if (!session?.user?.id) return;
    setLikeBusy(true);
    if (liked) {
      await supabase.from('chapter_likes').delete().eq('user_id', session.user.id).eq('chapter_id', chapterId);
      setLiked(false);
      setChapter((c) => (c ? { ...c, likes: Math.max(0, c.likes - 1) } : c));
    } else {
      await supabase.from('chapter_likes').insert({ user_id: session.user.id, chapter_id: chapterId });
      setLiked(true);
      setChapter((c) => (c ? { ...c, likes: c.likes + 1 } : c));
    }
    setLikeBusy(false);
  };

  const postComment = async () => {
    if (!newComment.trim() || !session?.user?.id) return;
    setCommentBusy(true);
    const { data } = await supabase
      .from('comments')
      .insert({ chapter_id: chapterId, user_id: session.user.id, content: newComment.trim() })
      .select('*, author:profiles!comments_user_id_fkey(username, avatar_url, role)')
      .single();
    if (data) setComments((cs) => [data as Comment & { author?: Profile }, ...cs]);
    setNewComment('');
    setCommentBusy(false);
  };

  if (loading) return <LoadingState label="Opening chapter…" />;
  if (!chapter) return <EmptyState icon={<AlertCircle size={40} />} title="Chapter not found" action={<button onClick={onBack} className="btn-ghost">Go back</button>} />;

  const idx = siblings.findIndex((s) => s.id === chapter.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 animate-fade-in sm:px-6">
      <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-cyan-glow">
        <ArrowLeft size={16} /> Back to story
      </button>

      <header className="mb-8 text-center">
        <p className="text-xs uppercase tracking-widest text-gold-light/80">{story?.title}</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-slate-50 sm:text-4xl">Chapter {chapter.chapter_number}: {chapter.title}</h1>
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Eye size={13} className="text-cyan/70" /> {chapter.views} views</span>
          <span className="flex items-center gap-1"><Heart size={13} className="text-cyan/70" /> {chapter.likes} likes</span>
        </div>
      </header>

      {/* Text size controls */}
      <div className="mb-6 flex items-center justify-center gap-2">
        <span className="text-xs text-slate-500">Text size:</span>
        {SIZES.map((s, i) => (
          <button
            key={s.label}
            onClick={() => setSizeIdx(i)}
            className={`h-8 w-8 rounded-md border text-xs font-medium transition ${sizeIdx === i ? 'border-cyan bg-cyan/15 text-cyan-glow' : 'border-midnight-700 text-slate-400 hover:text-slate-200'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="gold-divider mb-8" />

      {/* Content */}
      <article className={`reading-prose ${SIZES[sizeIdx].cls} whitespace-pre-wrap`}>
        {chapter.content || 'This chapter has no content yet.'}
      </article>

      <div className="gold-divider my-8" />

      {/* Like + nav */}
      <div className="flex flex-col items-center gap-4">
        <button onClick={toggleLike} disabled={likeBusy} className={`flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-medium transition ${liked ? 'border-cyan bg-cyan/15 text-cyan-glow shadow-cyan' : 'border-midnight-700 text-slate-300 hover:border-cyan/50'}`}>
          <Heart size={18} className={liked ? 'fill-cyan-glow' : ''} /> {liked ? 'Liked' : 'Like this chapter'} ({chapter.likes})
        </button>

        <div className="flex w-full items-center justify-between gap-3">
          <button
            onClick={() => prev && onOpenChapter(prev.id)}
            disabled={!prev}
            className="btn-ghost flex-1 disabled:opacity-30"
          >
            <ArrowLeft size={16} /> Prev
          </button>
          <button
            onClick={() => next && onOpenChapter(next.id)}
            disabled={!next}
            className="btn-primary flex-1 disabled:opacity-30"
          >
            Next <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Comments */}
      <section className="mt-12">
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-slate-100">
          <MessageSquare size={18} className="text-cyan" /> Discussion ({comments.length})
        </h2>

        <div className="mb-6 flex items-start gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts…"
            rows={3}
            className="input-field resize-none"
          />
        </div>
        <button onClick={postComment} disabled={commentBusy || !newComment.trim()} className="btn-primary mb-8">
          {commentBusy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Post Comment
        </button>

        {comments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-midnight-700 bg-midnight-900/40 p-6 text-center text-sm text-slate-500">
            No comments yet. Be the first to discuss this chapter.
          </p>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-gradient text-xs font-bold text-midnight-950">
                      {(c.author?.username || 'A').slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{c.author?.username || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{new Date(c.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  {c.user_id !== session?.user?.id && (
                    <button
                      onClick={() => setReportTarget(c)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 transition hover:text-red-400"
                    >
                      <Flag size={12} /> Report
                    </button>
                  )}
                </div>
                <p className="mt-2.5 font-serif text-sm leading-relaxed text-slate-300">{c.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {reportTarget && (
        <ReportModal comment={reportTarget} onClose={() => setReportTarget(null)} onSubmitted={() => setReportTarget(null)} />
      )}
    </div>
  );
}

function ReportModal({ comment, onClose, onSubmitted }: { comment: Comment; onClose: () => void; onSubmitted: () => void }) {
  const { session } = useAuth();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for reporting.');
      return;
    }
    if (!session?.user?.id) return;
    setBusy(true);
    setError(null);
    const { error: insErr } = await supabase.from('reports').insert({
      comment_id: comment.id,
      reporter_id: session.user.id,
      reason: reason.trim(),
    });
    setBusy(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    // Mark comment flagged for admin visibility
    await supabase.from('comments').update({ is_flagged: true, flag_reason: reason.trim() }).eq('id', comment.id);
    setDone(true);
    setTimeout(onSubmitted, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-midnight-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-scale-in card border-red-500/30 p-6">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"><X size={18} /></button>
        <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-slate-100">
          <Flag size={18} className="text-red-400" /> Report Comment
        </h3>
        <p className="mt-2 text-sm text-slate-400">Tell our moderators why this comment should be reviewed.</p>

        {done ? (
          <div className="mt-4 rounded-lg border border-cyan/30 bg-cyan/10 p-4 text-sm text-cyan-glow">
            Thank you. A moderator will review this comment.
          </div>
        ) : (
          <>
            <div className="mt-4 rounded-lg border border-midnight-700 bg-midnight-950/50 p-3">
              <p className="text-xs text-slate-500">Comment:</p>
              <p className="mt-1 font-serif text-sm text-slate-300">{comment.content}</p>
            </div>
            {error && <p className="mt-3 flex items-center gap-1.5 text-sm text-red-400"><AlertCircle size={14} /> {error}</p>}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for reporting (required)"
              rows={3}
              className="input-field mt-4 resize-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={onClose} className="btn-ghost">Cancel</button>
              <button onClick={submit} disabled={busy} className="btn-primary bg-red-500 shadow-none">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />} Submit Report
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
