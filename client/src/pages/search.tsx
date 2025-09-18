import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, Users, Image, Coins, Loader2, Bot } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface SearchResult {
  users: any[];
  posts: any[];
  tokens: any[];
}

interface SearchSuggestion {
  type: 'user' | 'post';
  id: string;
  title: string;
  subtitle?: string;
  avatar?: string;
  thumbnail?: string;
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [location] = useLocation();

  // Parse search query from URL
  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const query = params.get('q');
    if (query) {
      setSearchQuery(query);
    }
  }, [location]);

  // Search suggestions query
  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: ['search-suggestions', searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await response.json();
      return data.suggestions || [];
    },
    enabled: searchQuery.length >= 2,
  });

  // Main search query
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['search', searchQuery, activeTab],
    queryFn: async (): Promise<SearchResult> => {
      if (!searchQuery.trim()) return { users: [], posts: [], tokens: [] };
      
      const type = activeTab === 'all' ? '' : activeTab;
      const url = `/api/search?q=${encodeURIComponent(searchQuery)}${type ? `&type=${type}` : ''}&limit=20`;
      const response = await fetch(url);
      const data = await response.json();
      return data;
    },
    enabled: searchQuery.trim().length > 0,
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowSuggestions(false);
    // Update URL
    const newSearch = query ? `?q=${encodeURIComponent(query)}` : '';
    window.history.replaceState(null, '', newSearch);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'user') {
      // Check if it's an AI user
      if (suggestion.title.includes('_ai') || suggestion.title === 'amy_ai' || suggestion.title === 'mia_ai' || suggestion.title === 'una_ai') {
        window.location.href = `/ai/${suggestion.title}`;
      } else {
        window.location.href = `/c/${suggestion.title}`;
      }
    } else {
      window.location.href = `/p/${suggestion.id}`;
    }
  };

  const renderUserCard = (user: any) => {
    const isAI = user.handle?.includes('_ai') || user.handle === 'amy_ai' || user.handle === 'mia_ai' || user.handle === 'una_ai';
    const profileLink = isAI ? `/ai/${user.handle}` : `/c/${user.handle}`;
    
    return (
      <Card key={user.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar_url} alt={user.handle} />
              <AvatarFallback>{user.handle?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <Link href={profileLink} className="block">
                <h3 className="font-semibold text-sm truncate hover:text-primary">
                  @{user.handle || user.id}
                </h3>
              </Link>
              {user.bio && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {user.bio}
                </p>
              )}
              <div className="flex items-center space-x-2 mt-2">
                {isAI && (
                  <Badge variant="default" className="text-xs bg-gradient-to-r from-accent to-accent-2">
                    <Bot className="h-3 w-3 mr-1" />
                    AI
                  </Badge>
                )}
                {user.is_creator && !isAI && (
                  <Badge variant="secondary" className="text-xs">
                    Creator
                  </Badge>
                )}
                {user.age_verified && (
                  <Badge variant="outline" className="text-xs">
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPostCard = (post: any) => (
    <Card key={post.id} className="hover:shadow-md transition-shadow">
      <div className="aspect-[3/4] relative overflow-hidden rounded-t-lg">
        <img
          src={post.thumb_url}
          alt={post.caption}
          className="w-full h-full object-cover"
        />
        {post.price_lamports > 0 && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-xs">
              {(post.price_lamports / 1000000000).toFixed(3)} SOL
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <div className="flex items-center space-x-2 mb-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={post.creator?.avatar_url} alt={post.creator?.handle} />
            <AvatarFallback className="text-xs">
              {post.creator?.handle?.charAt(0) || 'C'}
            </AvatarFallback>
          </Avatar>
          <Link href={`/c/${post.creator?.handle}`} className="text-xs font-medium hover:text-primary">
            @{post.creator?.handle}
          </Link>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {post.caption}
        </p>
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderTokenCard = (token: any) => (
    <Card key={token.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
            <Coins className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">
              {token.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {token.symbol} • Supply: {token.supply.toLocaleString()}
            </p>
            {token.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {token.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Search GoonHub</h1>
          
          {/* Search Input */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search creators, posts, tokens..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(searchQuery);
                }
              }}
              className="pl-10 pr-4 py-3 text-lg"
            />
            
            {/* Search Suggestions */}
            {showSuggestions && searchQuery.length >= 2 && (
              <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-md shadow-lg z-50 mt-1">
                {suggestionsLoading ? (
                  <div className="p-4 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="py-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.type}-${suggestion.id}`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full px-4 py-3 text-left hover:bg-muted/50 flex items-center space-x-3"
                      >
                        {suggestion.type === 'user' ? (
                          <Users className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Image className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{suggestion.title}</p>
                          {suggestion.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">
                              {suggestion.subtitle}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No suggestions found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search Results */}
        {searchQuery.trim() && (
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="users">Creators</TabsTrigger>
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="tokens">Tokens</TabsTrigger>
              </TabsList>
            </Tabs>

            {searchLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Searching...</span>
              </div>
            ) : searchResults ? (
              <div>
                {activeTab === 'all' && (
                  <div className="space-y-8">
                    {/* Users Section */}
                    {searchResults.users.length > 0 && (
                      <div>
                        <h2 className="text-xl font-semibold mb-4 flex items-center">
                          <Users className="h-5 w-5 mr-2" />
                          Creators ({searchResults.users.length})
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {searchResults.users.map(renderUserCard)}
                        </div>
                      </div>
                    )}

                    {/* Posts Section */}
                    {searchResults.posts.length > 0 && (
                      <div>
                        <h2 className="text-xl font-semibold mb-4 flex items-center">
                          <Image className="h-5 w-5 mr-2" />
                          Posts ({searchResults.posts.length})
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {searchResults.posts.map(renderPostCard)}
                        </div>
                      </div>
                    )}

                    {/* Tokens Section */}
                    {searchResults.tokens.length > 0 && (
                      <div>
                        <h2 className="text-xl font-semibold mb-4 flex items-center">
                          <Coins className="h-5 w-5 mr-2" />
                          Tokens ({searchResults.tokens.length})
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {searchResults.tokens.map(renderTokenCard)}
                        </div>
                      </div>
                    )}

                    {/* No Results */}
                    {searchResults.users.length === 0 && 
                     searchResults.posts.length === 0 && 
                     searchResults.tokens.length === 0 && (
                      <div className="text-center py-12">
                        <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No results found</h3>
                        <p className="text-muted-foreground">
                          Try searching for something else or check your spelling.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'users' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Creators ({searchResults.users.length})
                    </h2>
                    {searchResults.users.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {searchResults.users.map(renderUserCard)}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No creators found</h3>
                        <p className="text-muted-foreground">
                          Try searching with different keywords.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'posts' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                      <Image className="h-5 w-5 mr-2" />
                      Posts ({searchResults.posts.length})
                    </h2>
                    {searchResults.posts.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {searchResults.posts.map(renderPostCard)}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No posts found</h3>
                        <p className="text-muted-foreground">
                          Try searching with different keywords.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'tokens' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                      <Coins className="h-5 w-5 mr-2" />
                      Tokens ({searchResults.tokens.length})
                    </h2>
                    {searchResults.tokens.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {searchResults.tokens.map(renderTokenCard)}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No tokens found</h3>
                        <p className="text-muted-foreground">
                          Try searching with different keywords.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Empty State */}
        {!searchQuery.trim() && (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Search GoonHub</h2>
            <p className="text-muted-foreground mb-6">
              Find creators, posts, and tokens across the platform
            </p>
            <div className="max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Start typing to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(searchQuery);
                    }
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
