import { useState } from 'react';

interface CategoryChipsProps {
  categories?: string[];
  onCategoryChange?: (category: string) => void;
}

export function CategoryChips({ categories = ['All', 'Videos', 'Photos', 'GOON Coins', 'Live', 'Premium'], onCategoryChange }: CategoryChipsProps) {
  const [activeCategory, setActiveCategory] = useState('All');

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    onCategoryChange?.(category);
  };

  return (
    <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-sm border-b border-border p-2 md:p-4">
      <div className="flex gap-1 md:gap-2 overflow-x-auto scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryClick(category)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium transition-colors ${
              activeCategory === category
                ? 'bg-accent text-accent-foreground'
                : 'bg-card border border-border text-card-foreground hover:bg-accent/10 hover:text-accent-foreground'
            }`}
            data-testid={`chip-${category.toLowerCase().replace(' ', '-')}`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}
