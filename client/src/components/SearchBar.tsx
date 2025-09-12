import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Search, X, Users, Image, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";

interface SearchSuggestion {
  type: 'user' | 'post';
  id: string;
  title: string;
  subtitle?: string;
  avatar?: string;
  thumbnail?: string;
}

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export default function SearchBar({ 
  className = "", 
  placeholder = "Search creators, posts...",
  onSearch 
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search suggestions query
  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: ['search-suggestions', query],
    queryFn: async () => {
      if (query.length < 2) return [];
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}&limit=5`);
      const data = await response.json();
      return data.suggestions || [];
    },
    enabled: query.length >= 2,
  });

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setIsOpen(value.length >= 2);
  };

  const handleSearch = (searchQuery: string = query) => {
    if (searchQuery.trim()) {
      if (onSearch) {
        onSearch(searchQuery);
      } else {
        setLocation(`/search?q=${encodeURIComponent(searchQuery)}`);
      }
      setIsOpen(false);
      setQuery("");
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'user') {
      // Check if it's an AI user
      if (suggestion.title.includes('_ai') || suggestion.title === 'amy_ai' || suggestion.title === 'mia_ai' || suggestion.title === 'una_ai') {
        setLocation(`/ai/${suggestion.title}`);
      } else {
        setLocation(`/c/${suggestion.title}`);
      }
    } else {
      setLocation(`/p/${suggestion.id}`);
    }
    setIsOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery("");
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="pl-10 pr-10 w-full"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Search Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-md shadow-lg z-50 mt-1 max-h-80 overflow-y-auto">
          {suggestionsLoading ? (
            <div className="p-4 text-center">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Searching...</p>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="py-2">
              {suggestions.map((suggestion) => (
                <button
                  key={`${suggestion.type}-${suggestion.id}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-muted/50 flex items-center space-x-3 transition-colors"
                >
                  {suggestion.type === 'user' ? (
                    <div className="flex-shrink-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={suggestion.avatar} alt={suggestion.title} />
                        <AvatarFallback className="text-xs">
                          {suggestion.title.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  ) : (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                        <Image className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{suggestion.title}</p>
                    {suggestion.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">
                        {suggestion.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {suggestion.type === 'user' ? (
                      <Users className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Image className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </button>
              ))}
              
              {/* Search All Button */}
              <div className="border-t border-border mt-2 pt-2">
                <button
                  onClick={() => handleSearch()}
                  className="w-full px-4 py-2 text-left hover:bg-muted/50 flex items-center space-x-3 transition-colors"
                >
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Search for "{query}"
                  </span>
                </button>
              </div>
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">No suggestions found</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSearch()}
                className="text-xs"
              >
                Search for "{query}"
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
