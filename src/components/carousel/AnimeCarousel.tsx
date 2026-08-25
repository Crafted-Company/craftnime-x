import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimeItem, ContinueWatchingItem } from '../../types/anime';
import { AnimeCard } from './AnimeCard';
import { TopRankedCard } from './TopRankedCard';
import { ContinueWatchingCard } from './ContinueWatchingCard';

interface AnimeCarouselProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  items: (AnimeItem | ContinueWatchingItem)[];
  variant?: 'standard' | 'ranked' | 'continue';
  onViewAll?: () => void;
}

export const AnimeCarousel: React.FC<AnimeCarouselProps> = ({
  title,
  subtitle,
  icon,
  badge,
  items,
  variant = 'standard',
  onViewAll,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -650 : 650;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="relative my-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="flex items-end justify-between mb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            {icon && <span className="text-crafted-brand-rust">{icon}</span>}
            <h2 className="text-xl sm:text-2xl font-bold text-crafted-text font-serif tracking-tight">
              {title}
            </h2>
            {badge && (
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-crafted-brand-rust/20 text-crafted-brand-rustLight border border-crafted-brand-rust/30">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-crafted-text-dim">{subtitle}</p>}
        </div>

        {/* Carousel Navigation Arrows & View All */}
        <div className="flex items-center gap-2">
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs font-medium text-crafted-brand-lightViolet hover:text-white transition-colors mr-2 cursor-pointer"
            >
              View All →
            </button>
          )}
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-xl bg-crafted-surface/80 hover:bg-crafted-surface-hover text-crafted-text-muted hover:text-white border border-crafted-border transition-colors shadow-crafted-card cursor-pointer"
            title="Scroll Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-xl bg-crafted-surface/80 hover:bg-crafted-surface-hover text-crafted-text-muted hover:text-white border border-crafted-border transition-colors shadow-crafted-card cursor-pointer"
            title="Scroll Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scrolling Items Track */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-4 overflow-x-auto no-scrollbar py-2 scroll-smooth"
      >
        {variant === 'ranked'
          ? items.map((item, index) => (
              <TopRankedCard
                key={(item as AnimeItem).id || index}
                anime={item as AnimeItem}
                rank={index + 1}
              />
            ))
          : variant === 'continue'
          ? items.map((item, index) => (
              <ContinueWatchingCard
                key={index}
                item={item as ContinueWatchingItem}
              />
            ))
          : items.map((item, index) => (
              <AnimeCard
                key={(item as AnimeItem).id || index}
                anime={item as AnimeItem}
              />
            ))}
      </div>
    </section>
  );
};
