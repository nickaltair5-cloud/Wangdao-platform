import { Eye, Heart, Star, BookOpen } from 'lucide-react';
import type { Story } from '../lib/types';

interface StoryCardProps {
  story: Story;
  onClick: () => void;
}

export function StoryCard({ story, onClick }: StoryCardProps) {
  return (
    <button
      onClick={onClick}
      className="group card relative flex flex-col overflow-hidden text-left transition-all duration-300 hover:-translate-y-1 hover:border-cyan/50 hover:shadow-cyan"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-midnight-800">
        {story.cover_image_url ? (
          <img
            src={story.cover_image_url}
            alt={story.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-midnight-800 to-midnight-950">
            <BookOpen size={40} className="text-midnight-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-midnight-950 via-transparent to-transparent opacity-80" />
        {story.tags.slice(0, 1).map((t) => (
          <span key={t} className="absolute left-2 top-2 tag-chip backdrop-blur-sm">
            {t}
          </span>
        ))}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="font-serif text-lg font-semibold leading-snug text-slate-100 transition group-hover:text-cyan-glow">
          {story.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs text-slate-400">{story.description || 'No description'}</p>

        <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Eye size={13} className="text-cyan/70" /> {formatNum(story.total_views)}
          </span>
          <span className="flex items-center gap-1">
            <Heart size={13} className="text-cyan/70" /> {formatNum(story.total_likes)}
          </span>
          <span className="flex items-center gap-1">
            <Star size={13} className="text-gold/70" /> {formatNum(story.total_favorites)}
          </span>
        </div>
      </div>
    </button>
  );
}

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}
