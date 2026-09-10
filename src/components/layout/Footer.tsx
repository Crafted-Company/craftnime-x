import React from 'react';
import { Logo } from '../common/Logo';
import { Heart, Shield, Film, Radio, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-crafted-border bg-crafted-panel/60 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Col 1: Brand & Philosophy */}
        <div className="space-y-4 md:col-span-1">
          <Logo size="md" />
          <p className="text-xs text-crafted-text-muted leading-relaxed">
            The flagship anime streaming and tracking suite for the Crafted Co. ecosystem. High-framerate 1080p playback, instant AniSkip, and native MAL auto-scrobbling.
          </p>
        </div>

        {/* Col 2: Integrations */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-crafted-brand-rustLight font-bold">
            Integrations
          </h4>
          <ul className="space-y-2 text-xs text-crafted-text-muted">
            <li className="flex items-center gap-2 hover:text-crafted-text transition-colors cursor-pointer">
              <Radio className="w-3 h-3 text-crafted-brand-rust" />
              <span>AniSkip API (Skip Intro/Outro)</span>
            </li>
            <li className="flex items-center gap-2 hover:text-crafted-text transition-colors cursor-pointer">
              <Shield className="w-3 h-3 text-crafted-brand-lightViolet" />
              <span>MyAnimeList REST OAuth2</span>
            </li>
            <li className="flex items-center gap-2 hover:text-crafted-text transition-colors cursor-pointer">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>AniList GraphQL V2 Catalog</span>
            </li>
            <li className="flex items-center gap-2 hover:text-crafted-text transition-colors cursor-pointer">
              <Film className="w-3 h-3 text-blue-400" />
              <span>Multi-Track Sub & Dub Streams</span>
            </li>
          </ul>
        </div>

        {/* Col 3: Ecosystem & Target Platforms */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-crafted-brand-rustLight font-bold">
            Target Platforms
          </h4>
          <ul className="space-y-2 text-xs text-crafted-text-muted">
            <li className="flex items-center justify-between">
              <span>Linux (Fedora Wayland/X11)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Primary</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Windows 11 / 10 Native</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Supported</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Android Touch & PiP</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">Mobile</span>
            </li>
          </ul>
        </div>

        {/* Col 4: Crafted Co. Specs */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-crafted-brand-rustLight font-bold">
            Design Philosophy
          </h4>
          <p className="text-xs text-crafted-text-dim leading-relaxed">
            Strictly styled with Crafted Co. Warm Obsidian surfaces (`#1B1515`), Rust accents (`#A9452D`), and editorial Instrument Serif typography.
          </p>
          <div className="pt-2 flex items-center gap-1.5 text-[11px] text-crafted-text-dim">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 inline" />
          </div>
        </div>
      </div>
    </footer>
  );
};
