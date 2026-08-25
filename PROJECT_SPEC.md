# Craftnime — Next-Generation Anime Streaming & Tracking Suite
**Part of the Crafted Co. Ecosystem**  
**Project Directory**: `/media/Storage/Code/Craftnime`  
**Target Platforms**: Linux (Fedora Wayland/X11), Windows, Android  
**Core Stack**: Flutter Desktop & Mobile (or React + Tauri) + Consumet/Aniwatch Streaming Engine + AniSkip API + MyAnimeList Official REST API  

---

## 🎯 Executive Vision
**Craftnime** is the official anime streaming and tracking flagship of the **Crafted Co.** ecosystem. Designed as an ultra-fast, high-framerate desktop and mobile application, Craftnime fuses the cinematic atmosphere of **Netflix** with the rich metadata of **AniLab** and the modern streaming capabilities of **Hayase**.

Featuring an immersive top hero billboard playing trending anime scenes, synchronized MyAnimeList/AniList auto-tracking, and a hardware-accelerated video player with instant **Skip Intro / Skip Outro** controls, Craftnime provides a flawless, ad-free anime experience across Linux, Windows, and Android.

---

## 🎨 Crafted Co. Design System & Aesthetics

Craftnime strictly adheres to the official **Crafted Co.** brand identity defined in `Crafted-Studio`:

### 1. Color Palette & Dark Obsidian Surfaces
* **Background (`crafted.bg`)**: `#1B1515` (Deep Warm Obsidian / Charcoal)
* **Surface (`crafted.surface`)**: `#241E1E` (Card background & dialogs)
* **Surface Hover (`crafted.surface-hover`)**: `#2C2525`
* **Panel Background (`crafted.panel`)**: `#201A1A` (Sidebars & bottom sheets)
* **Borders (`crafted.border`)**: `#312929` (Subtle 1px separators)
* **Border Bright (`crafted.border-bright`)**: `#453B3B` (Focused states)
* **Text Primary (`crafted.text`)**: `#F3EFEF` (Warm Off-White)
* **Text Muted (`crafted.text-muted`)**: `#A19898`
* **Text Dim (`crafted.text-dim`)**: `#6E6666`

### 2. Signature Gradients & Accents
* **Rust Orange (`crafted.brand.rust`)**: `#A9452D`
* **Royal Violet (`crafted.brand.violet`)**: `#433FA9`
* **Electric Light Violet (`crafted.brand.lightViolet`)**: `#6864F6`
* **Brand Gradient**: `linear-gradient(135deg, #433FA9 0%, #A9452D 50%, #4641A9 100%)`
* **Button Glow**: `linear-gradient(90deg, #6864F6 0%, #A9452D 50%, #6E6AF6 100%)`

### 3. Typography
* **Hero Titles & Dramatic Accents**: `Instrument Serif` (Editorial, cinematic headlines).
* **Body, UI & Navigation**: `Inter` / Clean System Sans.
* **Metadata, Timers & Badges**: `JetBrains Mono` (High-legibility episode counters and timestamps).

---

## 🌟 Key Application Features

```
+------------------------------------------------------------------------------------+
|                               CRAFTNIME DESKTOP APP                                |
|  +-------------------------------------------------------------------------------+ |
|  |  [Logo: CRAFTNIME]  Home  Trending  Schedule  Browse  | 🔍 Search | 👤 MAL Profile| |
|  +-------------------------------------------------------------------------------+ |
|  |  [NETFLIX-STYLE HERO BILLBOARD]                                               | |
|  |  • Dynamic Video Teaser Background (Autoplays Scene with Gradient Fade)       | |
|  |  • "SOLO LEVELING: ARISE" (Instrument Serif)                                  | |
|  |  • Rating: ⭐ 8.87 | Action, Fantasy | Season 2 Airing                        | |
|  |  • [▶ Watch Ep 12]  [+ Add to My List]  [🔊 Mute Trailer]                     | |
|  +-------------------------------------------------------------------------------+ |
|  |  [Horizontal Carousels: Top Airing | Popular This Season | Continue Watching]  | |
|  |  +----------------+  +----------------+  +----------------+  +--------------+ | |
|  |  |  Jujutsu Kaisen|  |  Demon Slayer  |  |  Attack on Titan| |  Frieren      | | |
|  |  |  [HD Poster]   |  |  [HD Poster]   |  |  [HD Poster]   |  |  [HD Poster]  | | |
|  |  +----------------+  +----------------+  +----------------+  +--------------+ | |
+------------------------------------------------------------------------------------+
```

### 1. Netflix-Style Hero Billboard
* Dynamic background video preview featuring trending anime with bottom and left gradient vignettes.
* Action buttons: *Play Episode*, *Add to Watchlist*, *Details/Episodes*, and *Audio Mute Toggle*.

### 2. Comprehensive Anime Catalog (AniLab & AniList Inspired)
* **Home Sections**: *Trending Now*, *Top 10 This Week*, *Seasonal Anime Calendar*, *Latest Episodes*, and *Continue Watching*.
* **Detailed Anime Page**: Episode grid (Sub/Dub tabs), character voice actors, related seasons, prequel/sequel relations, and trailers.

### 3. Advanced Custom Video Player
* **Skip Intro / Skip Outro Buttons**: Real-time integration with the **AniSkip API** (`api.aniskip.com`).
* **Sub / Dub Toggle**: Instant switching between Japanese audio with subtitles and English dubs.
* **Subtitle Engine**: Custom font size, opacity, color, and background styling.
* **Auto-Play Next**: Smooth 10-second countdown to the next episode with instant cancel.
* **Hardware GPU Acceleration**: Smooth 1080p/4K 60–144Hz playback on **RTX 4060 GPU**.

### 4. Automatic MyAnimeList (MAL) & AniList Tracking
* **OAuth Authentication**: Direct login with your MyAnimeList account.
* **Auto-Scrobble**: Watches playback; increments watched episodes (e.g. 1/12 ➔ 2/12) once you pass 80% of an episode.
* **Auto-Complete**: Automatically marks the anime status as **"Completed"** on your MAL profile upon finishing the final episode!
