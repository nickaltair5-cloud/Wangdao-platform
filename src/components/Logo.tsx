const LOGO_SRC = '/photo_2026-07-12_21-44-56 copy.jpg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { img: 'h-9 w-9', text: 'text-lg' },
  md: { img: 'h-12 w-12', text: 'text-2xl' },
  lg: { img: 'h-16 w-16', text: 'text-3xl' },
  xl: { img: 'h-44 w-44 sm:h-52 sm:w-52', text: 'text-5xl sm:text-6xl' },
};

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const s = sizeMap[size];
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src={LOGO_SRC}
        alt="Wangdao"
        className={`${s.img} rounded-xl object-contain`}
        style={{ imageRendering: 'auto' }}
      />
      {showText && (
        <span className={`brand-text font-display font-bold ${s.text}`}>Wangdao</span>
      )}
    </div>
  );
}
