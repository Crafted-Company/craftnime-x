#!/usr/bin/env bash

TITLE="$1"
EP="$2"
LANG_CODE="${3:-jpn}"

if [ -z "$TITLE" ]; then
  echo "ERROR:Missing title"
  exit 1
fi

if [ -z "$EP" ]; then
  EP=1
fi

curl_exe=curl
agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
ciphers="ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305"
tls13_ciphers="TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256"

anidb_curl() {
  $curl_exe -sL -A "$agent" --ciphers "$ciphers" --tls13-ciphers "$tls13_ciphers" --max-time 10 "$@"
}

# 1. Search Anime
QUERY=$(printf '%s' "$TITLE" | tr ' ' '+')
PAGE=$(anidb_curl "https://anidb.app/browse?q=${QUERY}")
ANIME_SLUG=$(printf '%s' "$PAGE" | sed -nE 's|.*anime/([a-z0-9-]+-[0-9]+)".*|\1|p' | head -n 1)

if [ -z "$ANIME_SLUG" ]; then
  echo "ERROR:Anime not found"
  exit 1
fi

ANIME_ID="${ANIME_SLUG##*-}"

# 2. Fetch Episodes
EP_PAGE=$(anidb_curl "https://anidb.app/api/frontend/anime/${ANIME_ID}/episodes")
EP_ID=$(printf '%s' "$EP_PAGE" | sed 's|},{|\n{|g' | sed -nE "s|.*\"id\":([0-9]+).*\"number\":${EP}[^0-9].*|\1|p" | head -n 1)

if [ -z "$EP_ID" ]; then
  EP_ID=$(printf '%s' "$EP_PAGE" | sed 's|},{|\n{|g' | sed -nE "s|.*\"id\":([0-9]+).*\"number\":${EP}\".*|\1|p" | head -n 1)
fi

if [ -z "$EP_ID" ]; then
  EP_ID=$(printf '%s' "$EP_PAGE" | sed 's|},{|\n{|g' | sed -nE 's|.*"id":([0-9]+).*|\1|p' | head -n 1)
fi

if [ -z "$EP_ID" ]; then
  echo "ERROR:Episode not found"
  exit 1
fi

# 3. Fetch Language & Embed
LANG_PAGE=$(anidb_curl "https://anidb.app/api/frontend/episode/${EP_ID}/languages")
EMBED=$(printf '%s' "$LANG_PAGE" | sed 's|},{|\n{|g' | sed -nE "s|.*\"${LANG_CODE}\".*\"embed_url\":\"([^\"]+)\".*|\1|p" | sed 's|\\/|/|g' | head -n 1)

if [ -z "$EMBED" ]; then
  EMBED=$(printf '%s' "$LANG_PAGE" | sed 's|},{|\n{|g' | sed -nE 's|.*"embed_url":"([^"]+)".*|\1|p' | sed 's|\\/|/|g' | head -n 1)
fi

if [ -z "$EMBED" ]; then
  echo "ERROR:Embed not found"
  exit 1
fi

# 4. Extract Direct M3U8 Master
EMBED_PAGE=$(anidb_curl "$EMBED")
M3U8=$(printf '%s' "$EMBED_PAGE" | sed -nE "s|.*file: '([^']*)'.*|\1|p" | head -n 1)

echo "STREAM_URL:${M3U8}"
echo "EMBED_URL:${EMBED}"
