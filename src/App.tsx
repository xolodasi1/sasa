import React, { useEffect, useState, useRef } from "react";
import { Search, Star, Trash2, Youtube, Users, Eye, Video, Loader2 } from "lucide-react";
import { SearchResult, ChannelStat } from "./types";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"search" | "favorites">("favorites");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  
  // Array of favorited channel IDs
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("yt_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Stored detailed stats for channels
  const [channelStats, setChannelStats] = useState<Record<string, ChannelStat>>({});
  
  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("yt_favorites", JSON.stringify(favorites));
  }, [favorites]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError("");
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.error) {
        setSearchError(data.error);
        setSearchResults([]);
      } else if (data.items) {
        setSearchResults(data.items);
      } else {
        setSearchResults([]);
      }
    } catch (err: any) {
      console.error("Search failed", err);
      setSearchError("Failed to connect to server");
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFavorite = (channelId: string) => {
    setFavorites((prev) => {
      if (prev.includes(channelId)) {
        return prev.filter((id) => id !== channelId);
      }
      return [...prev, channelId];
    });
  };

  // Poll for channel stats
  useEffect(() => {
    let timeoutId: number;

    const fetchStats = async () => {
      const idsToFetch = new Set<string>([...favorites]);
      if (activeTab === "search") {
        searchResults.forEach(result => {
          if (result.id.channelId) idsToFetch.add(result.id.channelId);
        });
      }

      if (idsToFetch.size === 0) {
        timeoutId = window.setTimeout(fetchStats, 5000);
        return;
      }

      try {
        const idString = Array.from(idsToFetch).join(",");
        const res = await fetch(`/api/channels?ids=${idString}`);
        const data = await res.json();
        
        if (data.items) {
          const newStats: Record<string, ChannelStat> = {};
          data.items.forEach((item: ChannelStat) => {
            newStats[item.id] = item;
          });
          setChannelStats((prev) => ({ ...prev, ...newStats }));
        }
      } catch (err) {
        console.error("Failed to fetch stats", err);
      }

      timeoutId = window.setTimeout(fetchStats, 5000);
    };

    fetchStats();

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [favorites, activeTab, searchResults]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-red-500/30">
      <header className="sticky top-0 z-10 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-2 rounded-xl">
              <Youtube className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-semibold text-lg tracking-tight hidden sm:block">Live Sub Counter</h1>
          </div>
          
          <div className="flex bg-neutral-900 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("favorites")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "favorites" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              Избранное
            </button>
            <button
              onClick={() => { setActiveTab("search"); setTimeout(() => searchInputRef.current?.focus(), 50); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "search" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              Поиск
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {activeTab === "search" && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="max-w-2xl mx-auto">
                <form onSubmit={handleSearch} className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-neutral-500 group-focus-within:text-red-500 transition-colors" />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по названию канала или ID..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all shadow-sm"
                  />
                  <button 
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="absolute inset-y-2 right-2 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Найти"}
                  </button>
                </form>
                {searchError && (
                  <div className="mt-4 p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
                    {searchError}
                  </div>
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((result) => {
                    const channelId = result.id.channelId;
                    const isFav = favorites.includes(channelId);
                    const stats = channelStats[channelId];

                    if (!channelId) return null;

                    return (
                      <div key={channelId} className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 flex gap-4 hover:border-neutral-700 transition-colors">
                        <img 
                          src={result.snippet.thumbnails?.default?.url || 'https://via.placeholder.com/64'} 
                          alt={result.snippet.title} 
                          className="w-16 h-16 rounded-full object-cover bg-neutral-800"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white truncate text-base" dangerouslySetInnerHTML={{ __html: result.snippet.title }} />
                          {stats ? (
                            <p className="text-sm text-neutral-400 mt-1 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              {Number(stats.statistics.subscriberCount).toLocaleString("ru-RU")}
                            </p>
                          ) : (
                            <p className="text-xs text-neutral-500 mt-1">Загрузка статы...</p>
                          )}
                          <button
                            onClick={() => toggleFavorite(channelId)}
                            className={`mt-3 w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                              isFav 
                                ? "bg-neutral-800 text-yellow-500 hover:bg-neutral-700" 
                                : "bg-neutral-100 text-neutral-900 hover:bg-white"
                            }`}
                          >
                            <Star className={`w-4 h-4 ${isFav ? "fill-yellow-500" : ""}`} />
                            {isFav ? "В избранном" : "В избранное"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "favorites" && (
            <motion.div
              key="favorites"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {favorites.length === 0 ? (
                <div className="text-center py-20">
                  <Star className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                  <h2 className="text-xl font-medium text-white mb-2">Избранных каналов нет</h2>
                  <p className="text-neutral-400 max-w-sm mx-auto mb-6">
                    Используйте поиск, чтобы найти любимых блогеров и добавить их в этот список для отслеживания.
                  </p>
                  <button
                    onClick={() => setActiveTab("search")}
                    className="bg-neutral-100 text-neutral-900 px-6 py-2.5 rounded-xl font-medium hover:bg-white transition-colors"
                  >
                    Перейти к поиску
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favorites.map((channelId) => {
                    const stats = channelStats[channelId];
                    if (!stats) {
                      return (
                        <div key={channelId} className="bg-neutral-900 animate-pulse rounded-3xl h-[280px]"></div>
                      );
                    }

                    return (
                      <div key={channelId} className="bg-neutral-900/60 border border-neutral-800/60 rounded-3xl p-6 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => toggleFavorite(channelId)}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2 rounded-full backdrop-blur-md transition-colors"
                            title="Удалить из избранного"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="flex flex-col items-center mt-2">
                          <img 
                            src={stats.snippet.thumbnails?.high?.url || stats.snippet.thumbnails?.medium?.url || 'https://via.placeholder.com/128'} 
                            alt={stats.snippet.title} 
                            className="w-24 h-24 rounded-full object-cover ring-4 ring-neutral-800 bg-neutral-800"
                          />
                          <h2 className="text-lg font-medium text-white mt-4 text-center line-clamp-1" title={stats.snippet.title}>
                            {stats.snippet.title}
                          </h2>
                          
                          <div className="mt-8 mb-6 text-center">
                            <span className="text-neutral-400 text-sm font-medium uppercase tracking-wider">Подписчики</span>
                            <div className="text-5xl font-bold tracking-tighter text-white mt-1 tabular-nums">
                              {Number(stats.statistics.subscriberCount).toLocaleString("ru-RU")}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 w-full gap-2 border-t border-neutral-800/60 pt-4">
                            <div className="flex items-center gap-2 text-neutral-400">
                              <Video className="w-4 h-4 shrink-0" />
                              <span className="text-sm font-medium tabular-nums">{Number(stats.statistics.videoCount).toLocaleString("ru-RU")}</span>
                            </div>
                            <div className="flex items-center gap-2 text-neutral-400 justify-end">
                              <span className="text-sm font-medium tabular-nums text-right break-all line-clamp-1">{Number(stats.statistics.viewCount).toLocaleString("ru-RU")}</span>
                              <Eye className="w-4 h-4 shrink-0" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
