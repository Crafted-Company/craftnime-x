import React, { useState, useEffect } from 'react';
import { X, Zap, RefreshCw, Film, Volume2, Database, Sparkles, Box } from 'lucide-react';
import { AnimeItem, AnimeEpisode } from '../../types/anime';
import { StremioAddonService, StremioStream } from '../../services/stremioAddon';

interface StreamSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  anime: AnimeItem | null;
  episode: AnimeEpisode | null;
  onSelectStream: (stream: StremioStream) => void;
}

export const StreamSelectModal: React.FC<StreamSelectModalProps> = ({
  isOpen,
  onClose,
  anime,
  episode,
  onSelectStream,
}) => {
  const [streams, setStreams] = useState<StremioStream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'seeders' | 'fastest' | '1080p' | 'dual'>('seeders');

  const fetchStreams = async () => {
    if (!anime || !episode) return;
    setIsLoading(true);
    try {
      const items = await StremioAddonService.getStreams(anime, episode.number);
      setStreams(items);
    } catch (err) {
      console.error('Failed to load Stremio torrent streams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStreams();
    }
  }, [isOpen, anime?.id, episode?.number]);

  if (!isOpen || !anime || !episode) return null;

  const getFilteredStreams = () => {
    let list = [...streams];

    if (filter === 'fastest') {
      const scoreStream = (s: StremioStream) => {
        let sc = 0;
        const full = `${s.title || ''} ${s.name || ''}`.toLowerCase();
        if (!full.includes('s1-s7') && !full.includes('batch')) sc += 500;
        if (full.includes('x264') || full.includes('h264') || full.includes('web-dl') || full.includes('subsplease') || full.includes('erai-raws')) sc += 400;
        if (full.includes('av1')) sc -= 400;
        sc += Math.min(s.seeders || 0, 300);
        return sc;
      };
      return list.sort((a, b) => scoreStream(b) - scoreStream(a));
    }

    if (filter === '1080p') {
      list = list.filter((s) => s.quality === '1080p');
    } else if (filter === 'dual') {
      list = list.filter((s) => s.audioInfo.includes('Dual') || s.audioInfo.includes('Dub') || s.title.toLowerCase().includes('dub'));
    }

    // Default: Sort by Seeders (Descending)
    return list.sort((a, b) => (b.seeders || 0) - (a.seeders || 0));
  };

  const displayList = getFilteredStreams();

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-crafted-surface border border-crafted-border rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden glow-panel">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-crafted-border flex items-center justify-between bg-black/30 shrink-0">
          <div className="space-y-1 min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-crafted-brand-rust text-white text-[10px] font-mono font-bold">
                TORRENTIO + NYAA
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {streams.length} Streams Found
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-bold text-white truncate max-w-md">
              {anime.title?.english || anime.title?.romaji}
            </h2>
            <p className="text-xs font-mono text-crafted-brand-rustLight truncate">
              Episode {episode.number}: {episode.title || `Episode ${episode.number}`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchStreams}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-crafted-panel hover:bg-crafted-border text-white border border-crafted-border transition-colors cursor-pointer"
              title="Refresh Streams"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-crafted-brand-rust' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-crafted-panel hover:bg-rose-500 text-white border border-crafted-border transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-3 sm:px-6 py-2.5 bg-black/40 border-b border-crafted-border/60 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setFilter('seeders')}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition-all cursor-pointer border ${
              filter === 'seeders'
                ? 'bg-crafted-brand-rust text-white border-crafted-brand-rust font-bold shadow-md'
                : 'bg-crafted-panel text-crafted-text-dim border-crafted-border hover:text-white hover:border-white/20'
            }`}
          >
            🔥 Most Seeders ({streams.length})
          </button>
          <button
            onClick={() => setFilter('fastest')}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition-all cursor-pointer border ${
              filter === 'fastest'
                ? 'bg-crafted-brand-rust text-white border-crafted-brand-rust font-bold shadow-md'
                : 'bg-crafted-panel text-crafted-text-dim border-crafted-border hover:text-white hover:border-white/20'
            }`}
          >
            ⚡ Fastest Single Ep
          </button>
          <button
            onClick={() => setFilter('1080p')}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition-all cursor-pointer border ${
              filter === '1080p'
                ? 'bg-crafted-brand-rust text-white border-crafted-brand-rust font-bold shadow-md'
                : 'bg-crafted-panel text-crafted-text-dim border-crafted-border hover:text-white hover:border-white/20'
            }`}
          >
            1080p Master
          </button>
          <button
            onClick={() => setFilter('dual')}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition-all cursor-pointer border ${
              filter === 'dual'
                ? 'bg-crafted-brand-rust text-white border-crafted-brand-rust font-bold shadow-md'
                : 'bg-crafted-panel text-crafted-text-dim border-crafted-border hover:text-white hover:border-white/20'
            }`}
          >
            Dual Audio / Dub
          </button>
        </div>

        {/* Stream Cards List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
          {/* Direct Fast Stream Card */}
          <div
            onClick={() => {
              onSelectStream({
                name: 'Direct Fast Master',
                title: '⚡ Instant Direct Stream (Fast HLS 1080p/720p - No Swarm Wait)',
                magnet: '',
                infoHash: 'direct_hls_fast',
                seeders: 999,
                quality: '1080p Auto',
                releaseGroup: 'DIRECT HLS',
                size: 'Instant HLS',
                audioInfo: 'Multi-Audio (Sub/Dub)',
              });
            }}
            className="p-4 rounded-2xl bg-gradient-to-r from-crafted-brand-rust/20 via-crafted-surface to-crafted-panel border border-crafted-brand-rust/50 hover:border-crafted-brand-rust shadow-xl transition-all cursor-pointer relative overflow-hidden group"
          >
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-crafted-brand-rust text-white text-[11px] font-mono font-bold flex items-center gap-1 shadow-md">
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  INSTANT DIRECT HLS
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-950/90 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                  ⚡ Zero Swarm Wait
                </span>
              </div>
              <span className="text-xs font-mono text-crafted-brand-rustLight font-bold">1080p / 720p / 360p</span>
            </div>
            <p className="text-xs text-white font-mono font-semibold">
              Instant Cloud Stream (Direct Master Playback - Recommended if torrents buffer)
            </p>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-crafted-brand-rust border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono text-crafted-text-dim">
                Querying Torrentio, Nyaa & TokyoTosho mirrors...
              </p>
            </div>
          ) : displayList.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Film className="w-12 h-12 text-crafted-text-dim mx-auto stroke-1" />
              <p className="text-sm font-bold text-white">No Torrent Streams Found</p>
              <p className="text-xs text-crafted-text-dim max-w-sm mx-auto">
                No active seeders found for this specific filter. You can always use the Instant Direct Stream above or switch filters.
              </p>
            </div>
          ) : (
            displayList.map((stream, idx) => {
              const fullText = `${stream.title || ''} ${stream.name || ''}`.toLowerCase();
              const isBatch = fullText.includes('batch') || fullText.includes('s1-s7') || fullText.includes('s01 s02') || fullText.includes('season 07');
              const isH264 = fullText.includes('x264') || fullText.includes('h264') || fullText.includes('h 264') || fullText.includes('avc') || fullText.includes('web-dl');
              const isAV1 = fullText.includes('av1');
              const isHevc = fullText.includes('hevc') || fullText.includes('x265') || fullText.includes('265');

              return (
                <div
                  key={stream.infoHash || idx}
                  onClick={() => onSelectStream(stream)}
                  className="group p-4 rounded-2xl bg-crafted-panel/80 hover:bg-crafted-surface border border-crafted-border hover:border-crafted-brand-rust/60 shadow-lg hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden"
                >
                  {/* Health & Quality Badges */}
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-crafted-brand-rust/20 border border-crafted-brand-rust/40 text-crafted-brand-rustLight text-[11px] font-mono font-bold">
                        {stream.quality}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white/10 text-white text-[11px] font-mono font-bold">
                        {stream.releaseGroup}
                      </span>
                      {isH264 && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold">
                          ⚡ H.264
                        </span>
                      )}
                      {isHevc && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-950/80 border border-blue-500/40 text-blue-300 text-[10px] font-mono font-bold">
                          HEVC
                        </span>
                      )}
                      {isAV1 && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[10px] font-mono font-bold">
                          AV1
                        </span>
                      )}
                      {isBatch && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-mono flex items-center gap-1">
                          <Box className="w-3 h-3" />
                          <span>Multi-File Batch</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                        <Zap className="w-3.5 h-3.5 fill-emerald-400" />
                        {stream.seeders} Seeders
                      </span>
                      <span className="text-xs font-mono text-crafted-text-dim flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        {stream.size}
                      </span>
                    </div>
                  </div>

                  {/* Release Title */}
                  <p className="text-xs text-crafted-text group-hover:text-white font-mono break-all leading-relaxed transition-colors">
                    {stream.title}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-crafted-text-dim">
                    <span className="flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-crafted-brand-rustLight" />
                      {stream.audioInfo}
                    </span>
                    {idx === 0 && filter === 'seeders' && (
                      <span className="text-emerald-400 font-bold flex items-center gap-1 text-[10px]">
                        <Sparkles className="w-3 h-3" />
                        Highest Seeders Swarm
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
