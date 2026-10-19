#!/usr/bin/env sh
# Builds the trimmed, compressed music bundle the app ships with.
# Source:  src/audio/music/<playlist>/track_N.mp3   (your full library, gitignored)
# Output:  src/audio/bundle/<playlist>/track_N.mp3  (gitignored, required by src/constants/playlists.ts)
# Requires ffmpeg. Usage: bun run music
set -e
SRC=src/audio/music
OUT=src/audio/bundle
TRACKS_PER_PLAYLIST=3
BITRATE=64k

for dir in "$SRC"/*/; do
  name=$(basename "$dir")
  mkdir -p "$OUT/$name"
  i=1
  while [ $i -le $TRACKS_PER_PLAYLIST ]; do
    in="$dir/track_$i.mp3"
    out="$OUT/$name/track_$i.mp3"
    if [ -f "$in" ] && [ ! -f "$out" ]; then
      ffmpeg -loglevel error -y -i "$in" -vn -map_metadata -1 -ac 2 -b:a $BITRATE "$out"
      echo "built $out"
    fi
    i=$((i + 1))
  done
done
du -sh "$OUT"
