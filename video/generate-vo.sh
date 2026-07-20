#!/usr/bin/env bash
# Generate the Atlas narration track into public/audio/narration.mp3.
#
# Voice priority (best first):
#   1. ElevenLabs      — if ELEVENLABS_API_KEY is set (studio quality)
#   2. Edge Neural TTS — free, no key (Microsoft neural voice; the default)
#   3. macOS `say`     — last-resort fallback
#
# Usage:
#   ./generate-vo.sh                                  # Edge neural (Andrew), free
#   EDGE_VOICE=en-US-BrianMultilingualNeural ./generate-vo.sh
#   ELEVENLABS_API_KEY=sk-... ./generate-vo.sh        # ElevenLabs
set -euo pipefail
cd "$(dirname "$0")"

OUT="public/audio/narration.mp3"
mkdir -p public/audio
TEXT="$(cat narration.txt)"
FILM_SECONDS=112.2

# ---- 1. ElevenLabs -----------------------------------------------------------
if [[ -n "${ELEVENLABS_API_KEY:-}" ]]; then
  VOICE_ID="${ELEVENLABS_VOICE_ID:-21m00Tcm4TlvDq8ikWAM}"
  echo "→ ElevenLabs (voice $VOICE_ID)…"
  BODY="$(python3 - "$TEXT" <<'PY'
import json, sys
print(json.dumps({"text": sys.argv[1], "model_id": "eleven_multilingual_v2",
  "voice_settings": {"stability": 0.42, "similarity_boost": 0.75, "style": 0.15, "use_speaker_boost": True}}))
PY
)"
  curl -sS -X POST "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128" \
    -H "xi-api-key: ${ELEVENLABS_API_KEY}" -H "Content-Type: application/json" \
    -d "$BODY" --output "$OUT"
  head -c 4 "$OUT" | grep -q "{" && { echo "✗ ElevenLabs error:"; cat "$OUT"; rm -f "$OUT"; exit 1; }

# ---- 2. Edge Neural TTS (free, default) --------------------------------------
elif python3 -c "import edge_tts" 2>/dev/null; then
  VOICE="${EDGE_VOICE:-en-US-AndrewMultilingualNeural}"
  RATE="${EDGE_RATE:-+6%}"
  echo "→ Edge Neural TTS (voice $VOICE, rate $RATE)…"
  python3 -m edge_tts --voice "$VOICE" --rate="$RATE" --text "$TEXT" --write-media "$OUT" || {
    echo "✗ edge-tts failed"; exit 1; }

# ---- 3. macOS say fallback ---------------------------------------------------
else
  echo "→ macOS 'say' fallback (install edge-tts for a better voice: pip install edge-tts)…"
  TMP="$(mktemp -t atlasvo).aiff"
  say -v "${SAY_VOICE:-Samantha}" -r "${SAY_RATE:-190}" -o "$TMP" "$TEXT"
  ffmpeg -y -i "$TMP" -codec:a libmp3lame -qscale:a 3 "$OUT" >/dev/null 2>&1
  rm -f "$TMP"
fi

# ---- Time-fit to the film so the VO never runs past the cut -------------------
RAW="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")"
NEED="$(python3 -c "r=$RAW; f=$FILM_SECONDS; print(round(r/(f-1.5),3) if r>(f-1.0) else 1.0)")"
if [[ "$NEED" != "1.0" ]]; then
  echo "→ VO is ${RAW}s; time-fitting by ${NEED}× to fit ${FILM_SECONDS}s film…"
  cp "$OUT" /tmp/_vo_raw.mp3
  ffmpeg -y -i /tmp/_vo_raw.mp3 -filter:a "atempo=${NEED}" -codec:a libmp3lame -qscale:a 3 "$OUT" >/dev/null 2>&1
fi
echo "✓ Wrote $OUT ($(du -h "$OUT" | cut -f1), $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s)"
