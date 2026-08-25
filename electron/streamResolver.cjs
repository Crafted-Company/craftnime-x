const { exec } = require('child_process');

function resolveAnimeStream(title, episodeNumber, isDub = false) {
  return new Promise((resolve) => {
    const cleanTitle = (title || '').replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
    const ep = parseInt(episodeNumber, 10) || 1;
    const targetLang = isDub ? 'eng' : 'jpn';

    const script = `
curl_exe=curl
agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
ciphers="ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305"
tls13_ciphers="TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256"

anidb_curl() {
  $curl_exe -sL -A "$agent" --ciphers "$ciphers" --tls13-ciphers "$tls13_ciphers" --max-time 10 "$@"
}

q=$(printf '%s' "${cleanTitle}" | tr ' ' '+')
page=$(anidb_curl "https://anidb.app/browse?q=$q")
anime_slug=$(echo "$page" | sed -nE 's|.*anime/([a-z0-9-]+-[0-9]+)".*|\\1|p' | head -n 1)

if [ -z "$anime_slug" ]; then
  echo "RESULT:NONE"
  exit 0
fi

anime_id="\${anime_slug##*-}"
ep_page=$(anidb_curl "https://anidb.app/api/frontend/anime/\${anime_id}/episodes")
ep_id=$(echo "$ep_page" | sed 's|},{|\\n{|g' | sed -nE "s|.*\"id\":([0-9]+).*\"number\":${ep}[^0-9].*|\\1|p" | head -n 1)

if [ -z "$ep_id" ]; then
  ep_id=$(echo "$ep_page" | sed 's|},{|\\n{|g' | sed -nE "s|.*\"id\":([0-9]+).*\"number\":${ep}\".*|\\1|p" | head -n 1)
fi

if [ -z "$ep_id" ]; then
  ep_id=$(echo "$ep_page" | sed 's|},{|\\n{|g' | sed -nE 's|.*\"id\":([0-9]+).*|\\1|p' | head -n 1)
fi

if [ -z "$ep_id" ]; then
  echo "RESULT:NONE"
  exit 0
fi

lang_page=$(anidb_curl "https://anidb.app/api/frontend/episode/\${ep_id}/languages")
embed=$(echo "$lang_page" | sed 's|},{|\\n{|g' | sed -nE "s|.*\"${targetLang}\".*\"embed_url\":\"([^\"]+)\".*|\\1|p" | sed 's|\\\\/|/|g' | head -n 1)

if [ -z "$embed" ]; then
  embed=$(echo "$lang_page" | sed 's|},{|\\n{|g' | sed -nE 's|.*\"embed_url\":\"([^\"]+)\".*|\\1|p' | sed 's|\\\\/|/|g' | head -n 1)
fi

if [ -n "$embed" ]; then
  embed_page=$(anidb_curl "$embed")
  m3u8=$(echo "$embed_page" | sed -nE "s|.*file: '([^']*)'.*|\\1|p" | head -n 1)
  echo "RESULT:$m3u8|$embed"
else
  echo "RESULT:NONE"
fi
`;

    exec(script, { shell: '/bin/bash', timeout: 12000 }, (err, stdout) => {
      if (err) {
        return resolve({ m3u8: null, embed: null });
      }
      const line = (stdout || '').split('\n').find((l) => l.startsWith('RESULT:'));
      if (line && !line.includes('RESULT:NONE')) {
        const parts = line.replace('RESULT:', '').split('|');
        resolve({
          m3u8: parts[0] || null,
          embed: parts[1] || null,
        });
      } else {
        resolve({ m3u8: null, embed: null });
      }
    });
  });
}

module.exports = { resolveAnimeStream };
